import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Add,
    ArrowForward,
    ChevronRight,
    DeleteOutline,
    DoneAll,
    LocalShippingOutlined,
    MoveDownOutlined,
    Refresh,
    Warning,
} from "@mui/icons-material";
import {
    createStockTransfer,
    dispatchStockTransfer,
    listStockTransfers,
    resolveApiErrorMessage,
    strandedQuantity,
    transferStatusMeta,
    TRANSFER_STATUSES,
} from "../../../services/stockTransferService";
import { getWarehouseStock, listWarehouses } from "../../../services/warehouseService";
import { searchInventoryItems } from "../../../services/inventoryService";
import {
    alertPanelSx,
    chipSx,
    clickableRowSx,
    headerCellSx,
    heroIconButtonSx,
    heroSx,
    INK,
    INK_SOFT,
    MUTED,
    primaryButtonSx,
    statCardSx,
    surfaceSx,
    T,
} from "../warehouse/listStyles";

const fmtDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const num = (v) => Number(v ?? 0) || 0;

const totalQty = (transfer) => (transfer.lines || []).reduce((a, l) => a + num(l.quantity), 0);

const emptyLine = () => ({
    key: Math.random().toString(36).slice(2),
    item: null,
    quantity: "",
    remarks: "",
});

const StockTransferPage = () => {
    const navigate = useNavigate();

    const [transfers, setTransfers] = useState([]);
    const [allTransfers, setAllTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [draft, setDraft] = useState({ from: "", to: "", remarks: "", lines: [emptyLine()] });
    const [createError, setCreateError] = useState(null);
    const [creating, setCreating] = useState(false);

    // On-hand at the chosen source, keyed by item id. Advisory only: the backend re-checks at
    // dispatch, but warning here saves a round trip and a rejected dispatch.
    const [sourceStock, setSourceStock] = useState({});
    const [itemOptions, setItemOptions] = useState([]);
    const [itemQuery, setItemQuery] = useState("");
    const [itemLoading, setItemLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [filtered, everything] = await Promise.all([
                listStockTransfers({ status: statusFilter || undefined }),
                statusFilter ? listStockTransfers({}) : Promise.resolve(null),
            ]);
            const list = Array.isArray(filtered) ? filtered : [];
            setTransfers(list);
            setAllTransfers(everything ? (Array.isArray(everything) ? everything : []) : list);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load stock transfers."));
            setTransfers([]);
            setAllTransfers([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    // The headline describes the whole desk, so it ignores the status filter — filtering the
    // table should narrow what is listed, not rewrite what is true.
    const stats = useMemo(() => {
        const byStatus = (s) => allTransfers.filter((t) => t.status === s);
        const stranded = allTransfers
            .map((t) => ({ transfer: t, units: strandedQuantity(t) }))
            .filter((r) => r.units > 0);
        return {
            draft: byStatus("DRAFT").length,
            inTransit: byStatus("DISPATCHED"),
            received: byStatus("RECEIVED").length,
            stranded,
            strandedUnits: stranded.reduce((a, r) => a + r.units, 0),
        };
    }, [allTransfers]);

    // ── Create ────────────────────────────────────────────────────────────────

    const openCreate = async () => {
        setDraft({ from: "", to: "", remarks: "", lines: [emptyLine()] });
        setSourceStock({});
        setItemOptions([]);
        setCreateError(null);
        setCreateOpen(true);
        try {
            const rows = await listWarehouses(true);
            const list = Array.isArray(rows) ? rows : [];
            setWarehouses(list);
            const def = list.find((w) => w.isDefault);
            if (def) setDraft((d) => ({ ...d, from: def.code }));
        } catch (e) {
            setCreateError(resolveApiErrorMessage(e, "Could not load warehouses."));
        }
    };

    // Refresh the on-hand hints whenever the source changes.
    useEffect(() => {
        if (!createOpen || !draft.from) {
            setSourceStock({});
            return undefined;
        }
        const wh = warehouses.find((w) => w.code === draft.from);
        if (!wh) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const rows = await getWarehouseStock(wh.id);
                if (cancelled) return;
                const map = {};
                (Array.isArray(rows) ? rows : []).forEach((r) => {
                    map[r.itemId] = num(r.onHand);
                });
                setSourceStock(map);
            } catch {
                if (!cancelled) setSourceStock({});
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [createOpen, draft.from, warehouses]);

    // Options come from a search over every item rather than only what the source holds: a
    // warehouse that is empty today still has to be transferable once stock lands in it.
    useEffect(() => {
        if (!createOpen) return undefined;
        const term = itemQuery.trim();
        if (term.length < 2) {
            setItemOptions([]);
            return undefined;
        }
        const timer = setTimeout(async () => {
            setItemLoading(true);
            try {
                const result = await searchInventoryItems({ query: term, page: 0, size: 15 });
                setItemOptions(result?.content || []);
            } catch {
                setItemOptions([]);
            } finally {
                setItemLoading(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [itemQuery, createOpen]);

    const setLine = (key, patch) =>
        setDraft((d) => ({
            ...d,
            lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
        }));

    const addLine = () => setDraft((d) => ({ ...d, lines: [...d.lines, emptyLine()] }));

    const removeLine = (key) =>
        setDraft((d) => ({
            ...d,
            lines: d.lines.length === 1 ? [emptyLine()] : d.lines.filter((l) => l.key !== key),
        }));

    const usableLines = draft.lines.filter((l) => l.item?.inventoryItemId && num(l.quantity) > 0);
    const sameWarehouse = Boolean(draft.from) && draft.from === draft.to;
    const canCreate = usableLines.length > 0 && draft.from && draft.to && !sameWarehouse;

    const submitCreate = async () => {
        if (!canCreate) return;
        setCreating(true);
        setCreateError(null);
        try {
            const created = await createStockTransfer({
                fromWarehouseCode: draft.from,
                toWarehouseCode: draft.to,
                remarks: draft.remarks || undefined,
                lines: usableLines.map((l) => ({
                    inventoryItemId: l.item.inventoryItemId,
                    quantity: Number(l.quantity),
                    remarks: l.remarks || undefined,
                })),
            });
            setCreateOpen(false);
            setToast({ severity: "success", message: `${created.transferNumber} created` });
            if (created?.id) navigate(`/inventory/stock-transfers/${created.id}`);
            else await load();
        } catch (e) {
            setCreateError(resolveApiErrorMessage(e, "Could not create this transfer."));
        } finally {
            setCreating(false);
        }
    };

    const dispatch = async (transfer) => {
        setBusyId(transfer.id);
        try {
            await dispatchStockTransfer(transfer.id);
            setToast({ severity: "success", message: `${transfer.transferNumber} dispatched` });
            await load();
        } catch (e) {
            setToast({
                severity: "error",
                message: resolveApiErrorMessage(e, "Could not dispatch this transfer."),
            });
        } finally {
            setBusyId(null);
        }
    };

    const term = search.trim().toLowerCase();
    const visible = term
        ? transfers.filter(
              (t) =>
                  t.transferNumber?.toLowerCase().includes(term) ||
                  t.fromWarehouseCode?.toLowerCase().includes(term) ||
                  t.toWarehouseCode?.toLowerCase().includes(term)
          )
        : transfers;

    const railVisible = stats.inTransit.length > 0 || stats.stranded.length > 0;

    const statCards = [
        { label: "Draft", value: stats.draft, icon: MoveDownOutlined, color: "#3b82f6", tag: "Not sent" },
        {
            label: "In Transit",
            value: stats.inTransit.length,
            icon: LocalShippingOutlined,
            color: "#f59e0b",
            tag: "On the move",
        },
        { label: "Received", value: stats.received, icon: DoneAll, color: "#10b981", tag: "Landed" },
        {
            label: "Never Arrived",
            value: stats.strandedUnits,
            icon: Warning,
            color: "#8b5cf6",
            tag: stats.strandedUnits ? "Investigate" : "Clear",
        },
    ];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={2}
                        mb={6}
                    >
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em", mb: 1 }}>
                                Stock Transfers
                            </Typography>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                Stock moving between warehouses — what has left, what is on the road, and
                                what never arrived.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={<Add />}
                                onClick={openCreate}
                                sx={primaryButtonSx}
                            >
                                New Transfer
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        {statCards.map((stat) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label}>
                                <Paper elevation={0} sx={statCardSx}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: `${stat.color}20`,
                                                color: stat.color,
                                                display: "flex",
                                            }}
                                        >
                                            <stat.icon />
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: stat.color,
                                                fontSize: "0.7rem",
                                                fontWeight: 800,
                                                bgcolor: `${stat.color}10`,
                                                px: 1,
                                                borderRadius: 1,
                                            }}
                                        >
                                            {stat.tag}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
                                        {loading ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "rgba(255,255,255,0.5)",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={4}>
                    {railVisible && (
                        <Grid item xs={12} lg={4}>
                            <Stack spacing={3}>
                                {stats.stranded.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx("#fecaca", "#fff5f5")}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "#fee2e2",
                                                borderBottom: "1px solid #fecaca",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Warning sx={{ color: T.error, fontSize: 18 }} />
                                            <Typography
                                                sx={{ fontWeight: 800, color: "#991b1b", fontSize: "0.85rem" }}
                                            >
                                                Never Arrived ({stats.stranded.length})
                                            </Typography>
                                        </Box>
                                        {stats.stranded.slice(0, 5).map(({ transfer, units }) => (
                                            <Box
                                                key={transfer.id}
                                                onClick={() =>
                                                    navigate(`/inventory/stock-transfers/${transfer.id}`)
                                                }
                                                sx={{
                                                    p: 2,
                                                    borderBottom: "1px solid #fecaca",
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "#fef2f2" },
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                        {transfer.transferNumber}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            color: T.error,
                                                            fontWeight: 700,
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        {units} unit(s)
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                    left {transfer.fromWarehouseCode} · still counted in
                                                    transit there
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {stats.inTransit.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx("#fde68a", "#fffbeb")}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "#fef3c7",
                                                borderBottom: "1px solid #fde68a",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <LocalShippingOutlined sx={{ color: T.warning, fontSize: 18 }} />
                                            <Typography
                                                sx={{ fontWeight: 800, color: "#92400e", fontSize: "0.85rem" }}
                                            >
                                                Awaiting Receipt ({stats.inTransit.length})
                                            </Typography>
                                        </Box>
                                        {stats.inTransit.slice(0, 5).map((t) => (
                                            <Box
                                                key={t.id}
                                                onClick={() => navigate(`/inventory/stock-transfers/${t.id}`)}
                                                sx={{
                                                    p: 2,
                                                    borderBottom: "1px solid #fde68a",
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "#fffaf0" },
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                >
                                                    <Box>
                                                        <Typography
                                                            sx={{ fontWeight: 700, fontSize: "0.85rem" }}
                                                        >
                                                            {t.transferNumber}
                                                        </Typography>
                                                        <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                            {t.fromWarehouseCode} → {t.toWarehouseCode} ·{" "}
                                                            {fmtDate(t.dispatchedDate) || "dispatched"}
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/inventory/stock-transfers/${t.id}`);
                                                        }}
                                                        sx={{
                                                            borderRadius: 1.5,
                                                            fontSize: "0.65rem",
                                                            textTransform: "none",
                                                            bgcolor: T.warning,
                                                            height: 24,
                                                        }}
                                                    >
                                                        Receive
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    )}

                    <Grid item xs={12} lg={railVisible ? 8 : 12}>
                        <Paper elevation={0} sx={surfaceSx}>
                            <Box
                                sx={{
                                    p: 3,
                                    borderBottom: `1px solid ${T.border}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 2,
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, color: T.text }}>
                                    Transfer Registry
                                </Typography>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <TextField
                                        size="small"
                                        placeholder="Search transfer or warehouse"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        sx={{ minWidth: 220 }}
                                    />
                                    <TextField
                                        select
                                        size="small"
                                        label="Status"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        sx={{ minWidth: 150 }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {TRANSFER_STATUSES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {transferStatusMeta(s).label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Box>

                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Transfer No</TableCell>
                                            <TableCell sx={headerCellSx}>Route</TableCell>
                                            <TableCell sx={headerCellSx} align="center">
                                                Lines
                                            </TableCell>
                                            <TableCell sx={headerCellSx} align="right">
                                                Quantity
                                            </TableCell>
                                            <TableCell sx={headerCellSx} align="center">
                                                Status
                                            </TableCell>
                                            <TableCell sx={headerCellSx} align="center">
                                                Actions
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                                    <CircularProgress size={32} />
                                                </TableCell>
                                            </TableRow>
                                        ) : visible.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="body2" sx={{ color: MUTED }}>
                                                        {transfers.length === 0
                                                            ? "No stock transfers yet."
                                                            : "Nothing matches that search."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((t) => {
                                                const cfg = transferStatusMeta(t.status);
                                                const stranded = strandedQuantity(t);
                                                const when = fmtDate(t.receivedDate || t.dispatchedDate);
                                                return (
                                                    <TableRow
                                                        key={t.id}
                                                        hover
                                                        sx={clickableRowSx}
                                                        onClick={() =>
                                                            navigate(`/inventory/stock-transfers/${t.id}`)
                                                        }
                                                    >
                                                        <TableCell sx={{ py: 1.5 }}>
                                                            <Stack
                                                                direction="row"
                                                                spacing={1.5}
                                                                alignItems="center"
                                                            >
                                                                <Avatar
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        bgcolor: `${cfg.color}15`,
                                                                        color: cfg.color,
                                                                    }}
                                                                >
                                                                    <MoveDownOutlined sx={{ fontSize: 16 }} />
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 700, color: INK }}
                                                                    >
                                                                        {t.transferNumber}
                                                                    </Typography>
                                                                    {when && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{ color: MUTED }}
                                                                        >
                                                                            {when}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack
                                                                direction="row"
                                                                spacing={0.75}
                                                                alignItems="center"
                                                            >
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 600, color: INK_SOFT }}
                                                                >
                                                                    {t.fromWarehouseCode}
                                                                </Typography>
                                                                <ArrowForward
                                                                    sx={{ fontSize: 14, color: MUTED }}
                                                                />
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 600, color: T.primary }}
                                                                >
                                                                    {t.toWarehouseCode}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {(t.lines || []).length}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Stack spacing={0.25} alignItems="flex-end">
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 600, color: INK_SOFT }}
                                                                >
                                                                    {totalQty(t)}
                                                                </Typography>
                                                                {stranded > 0 && (
                                                                    <Chip
                                                                        label={`${stranded} never arrived`}
                                                                        size="small"
                                                                        sx={chipSx({
                                                                            color: "#b45309",
                                                                            bg: "#fffbeb",
                                                                        })}
                                                                    />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={cfg.label}
                                                                size="small"
                                                                sx={chipSx(cfg)}
                                                            />
                                                        </TableCell>
                                                        <TableCell
                                                            align="center"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Stack
                                                                direction="row"
                                                                spacing={0.5}
                                                                justifyContent="center"
                                                            >
                                                                {t.status === "DRAFT" && (
                                                                    <Tooltip title="Send it — stock leaves the source now">
                                                                        <span>
                                                                            <IconButton
                                                                                size="small"
                                                                                disabled={busyId === t.id}
                                                                                sx={{
                                                                                    color: MUTED,
                                                                                    "&:hover": {
                                                                                        color: T.warning,
                                                                                    },
                                                                                }}
                                                                                onClick={() => dispatch(t)}
                                                                            >
                                                                                <LocalShippingOutlined
                                                                                    sx={{ fontSize: 16 }}
                                                                                />
                                                                            </IconButton>
                                                                        </span>
                                                                    </Tooltip>
                                                                )}
                                                                <Tooltip title="Open">
                                                                    <IconButton
                                                                        size="small"
                                                                        sx={{
                                                                            color: MUTED,
                                                                            "&:hover": { color: T.primary },
                                                                        }}
                                                                        onClick={() =>
                                                                            navigate(
                                                                                `/inventory/stock-transfers/${t.id}`
                                                                            )
                                                                        }
                                                                    >
                                                                        <ChevronRight sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            <Dialog
                open={createOpen}
                onClose={creating ? undefined : () => setCreateOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>New stock transfer</DialogTitle>
                <DialogContent dividers>
                    {createError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {createError}
                        </Alert>
                    )}
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                            <TextField
                                select
                                label="From"
                                value={draft.from}
                                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                                fullWidth
                                required
                                helperText=" "
                            >
                                {warehouses.map((w) => (
                                    <MenuItem key={w.id} value={w.code}>
                                        {w.code} — {w.name}
                                        {w.isDefault ? " (default)" : ""}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <ArrowForward
                                sx={{ color: MUTED, mt: 2, display: { xs: "none", sm: "block" } }}
                            />
                            <TextField
                                select
                                label="To"
                                value={draft.to}
                                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                                fullWidth
                                required
                                error={sameWarehouse}
                                helperText={sameWarehouse ? "Pick a different destination" : " "}
                            >
                                {warehouses.map((w) => (
                                    <MenuItem key={w.id} value={w.code}>
                                        {w.code} — {w.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        <Box>
                            <Typography
                                variant="caption"
                                sx={{ color: MUTED, fontWeight: 700, textTransform: "uppercase" }}
                            >
                                Lines
                            </Typography>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {draft.lines.map((line) => {
                                    const onHand = line.item
                                        ? sourceStock[line.item.inventoryItemId] ?? 0
                                        : null;
                                    const over =
                                        Boolean(line.item) &&
                                        num(line.quantity) > 0 &&
                                        num(line.quantity) > onHand;
                                    return (
                                        <Stack
                                            key={line.key}
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1.5}
                                            alignItems="flex-start"
                                        >
                                            <Autocomplete
                                                sx={{ flex: 2, minWidth: 220, width: "100%" }}
                                                options={itemOptions}
                                                loading={itemLoading}
                                                value={line.item}
                                                onChange={(_, v) => setLine(line.key, { item: v })}
                                                onInputChange={(_, v) => setItemQuery(v)}
                                                getOptionLabel={(o) => (o ? `${o.itemCode} — ${o.name}` : "")}
                                                isOptionEqualToValue={(a, b) =>
                                                    a?.inventoryItemId === b?.inventoryItemId
                                                }
                                                filterOptions={(x) => x}
                                                noOptionsText={
                                                    itemQuery.trim().length < 2
                                                        ? "Type at least two characters"
                                                        : "No matching item"
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Item"
                                                        size="small"
                                                        helperText=" "
                                                    />
                                                )}
                                            />
                                            <TextField
                                                label="Qty"
                                                size="small"
                                                type="number"
                                                value={line.quantity}
                                                onChange={(e) =>
                                                    setLine(line.key, { quantity: e.target.value })
                                                }
                                                sx={{ width: 160 }}
                                                error={over}
                                                helperText={
                                                    line.item
                                                        ? over
                                                            ? `Only ${onHand} at ${draft.from}`
                                                            : `${onHand} on hand at ${draft.from}`
                                                        : " "
                                                }
                                            />
                                            <TextField
                                                label="Remarks"
                                                size="small"
                                                value={line.remarks}
                                                onChange={(e) =>
                                                    setLine(line.key, { remarks: e.target.value })
                                                }
                                                sx={{ flex: 1, minWidth: 140 }}
                                                helperText=" "
                                            />
                                            <Tooltip title="Remove line">
                                                <IconButton
                                                    onClick={() => removeLine(line.key)}
                                                    sx={{ color: MUTED, mt: 0.25 }}
                                                >
                                                    <DeleteOutline fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                            <Button
                                startIcon={<Add />}
                                onClick={addLine}
                                size="small"
                                sx={{ mt: 1, textTransform: "none" }}
                            >
                                Add line
                            </Button>
                        </Box>

                        <TextField
                            label="Remarks"
                            value={draft.remarks}
                            onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                            multiline
                            minRows={2}
                        />

                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            This is created as a draft — nothing leaves {draft.from || "the source"} until
                            you dispatch it.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)} disabled={creating}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={submitCreate} disabled={creating || !canCreate}>
                        {creating ? "Creating…" : "Create"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={toast?.severity || "info"} onClose={() => setToast(null)}>
                    {toast?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default StockTransferPage;
