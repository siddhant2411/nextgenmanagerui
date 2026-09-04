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
    AssignmentTurnedInOutlined,
    ChecklistOutlined,
    ChevronRight,
    DoneAll,
    LocalShippingOutlined,
    PendingActions,
    Refresh,
    Warning,
} from "@mui/icons-material";
import {
    createPickList,
    isShortPick,
    listPickLists,
    pickStatusMeta,
    PICK_STATUSES,
    releasePickList,
    resolveApiErrorMessage,
} from "../../../services/pickListService";
import { listWarehouses } from "../../../services/warehouseService";
import { listSalesOrders } from "../../../services/salesOrderService";
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

const PickListPage = () => {
    const navigate = useNavigate();

    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [soLoading, setSoLoading] = useState(false);
    const [newPick, setNewPick] = useState({ salesOrder: null, warehouseCode: "", remarks: "" });
    const [createError, setCreateError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);

    // The rail and the stat cards describe the whole desk, so they are always computed from the
    // unfiltered set — a status filter should narrow the table, not rewrite the headline.
    const [allPicks, setAllPicks] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [filtered, everything] = await Promise.all([
                listPickLists({ status: statusFilter || undefined }),
                statusFilter ? listPickLists({}) : Promise.resolve(null),
            ]);
            const list = Array.isArray(filtered) ? filtered : [];
            setPicks(list);
            setAllPicks(everything ? (Array.isArray(everything) ? everything : []) : list);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load pick lists."));
            setPicks([]);
            setAllPicks([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        const byStatus = (s) => allPicks.filter((p) => p.status === s);
        const shortLines = allPicks.reduce(
            (a, p) => a + (p.lines || []).filter(isShortPick).length,
            0
        );
        return {
            draft: byStatus("DRAFT").length,
            released: byStatus("RELEASED"),
            picked: byStatus("PICKED"),
            shortLines,
            shortPicks: allPicks.filter((p) => (p.lines || []).some(isShortPick)),
        };
    }, [allPicks]);

    const openCreate = async () => {
        setNewPick({ salesOrder: null, warehouseCode: "", remarks: "" });
        setCreateError(null);
        setCreateOpen(true);
        setSoLoading(true);
        try {
            const [whRows, soRows] = await Promise.all([
                listWarehouses(true),
                listSalesOrders({ page: 0, size: 200 }),
            ]);
            const whList = Array.isArray(whRows) ? whRows : [];
            setWarehouses(whList);
            const def = whList.find((w) => w.isDefault);
            if (def) setNewPick((p) => ({ ...p, warehouseCode: def.code }));

            const content = Array.isArray(soRows) ? soRows : soRows?.content || [];
            setSalesOrders(content.filter((so) => so.status !== "DRAFT" && so.status !== "CANCELLED"));
        } catch (e) {
            setCreateError(resolveApiErrorMessage(e, "Could not load orders or warehouses."));
        } finally {
            setSoLoading(false);
        }
    };

    const submitCreate = async () => {
        if (!newPick.salesOrder?.id) return;
        setCreating(true);
        setCreateError(null);
        try {
            const created = await createPickList({
                salesOrderId: newPick.salesOrder.id,
                warehouseCode: newPick.warehouseCode || undefined,
                remarks: newPick.remarks || undefined,
            });
            setCreateOpen(false);
            setToast({ severity: "success", message: `${created.pickNumber} created` });
            if (created?.id) navigate(`/inventory/pick-lists/${created.id}`);
            else await load();
        } catch (e) {
            setCreateError(resolveApiErrorMessage(e, "Could not create this pick list."));
        } finally {
            setCreating(false);
        }
    };

    const release = async (pick) => {
        setBusyId(pick.id);
        try {
            await releasePickList(pick.id);
            setToast({ severity: "success", message: `${pick.pickNumber} released` });
            await load();
        } catch (e) {
            setToast({ severity: "error", message: resolveApiErrorMessage(e, "Could not release this pick.") });
        } finally {
            setBusyId(null);
        }
    };

    const term = search.trim().toLowerCase();
    const visible = term
        ? picks.filter(
              (p) =>
                  p.pickNumber?.toLowerCase().includes(term) ||
                  p.salesOrderNumber?.toLowerCase().includes(term) ||
                  p.warehouseCode?.toLowerCase().includes(term)
          )
        : picks;

    const railVisible =
        stats.released.length > 0 || stats.shortPicks.length > 0 || stats.picked.length > 0;

    const statCards = [
        { label: "Draft", value: stats.draft, icon: ChecklistOutlined, color: "#3b82f6", tag: "Not issued" },
        { label: "On The Floor", value: stats.released.length, icon: PendingActions, color: "#f59e0b", tag: "Released" },
        { label: "Picked", value: stats.picked.length, icon: DoneAll, color: "#10b981", tag: "Ready to ship" },
        { label: "Short Lines", value: stats.shortLines, icon: Warning, color: "#8b5cf6", tag: stats.shortLines ? "Investigate" : "Clear" },
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
                                Picking Desk
                            </Typography>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                What is on the floor, what has been taken, and what came up short.
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
                                New Pick List
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
                                {stats.shortPicks.length > 0 && (
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
                                            <Typography sx={{ fontWeight: 800, color: "#991b1b", fontSize: "0.85rem" }}>
                                                Short Picks ({stats.shortPicks.length})
                                            </Typography>
                                        </Box>
                                        {stats.shortPicks.slice(0, 5).map((p) => (
                                            <Box
                                                key={p.id}
                                                onClick={() => navigate(`/inventory/pick-lists/${p.id}`)}
                                                sx={{
                                                    p: 2,
                                                    borderBottom: "1px solid #fecaca",
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "#fef2f2" },
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                        {p.pickNumber}
                                                    </Typography>
                                                    <Typography
                                                        sx={{ color: T.error, fontWeight: 700, fontSize: "0.75rem" }}
                                                    >
                                                        {(p.lines || []).filter(isShortPick).length} line(s)
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                    {p.salesOrderNumber} · less was found than ordered
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {stats.released.length > 0 && (
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
                                            <PendingActions sx={{ color: T.warning, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: "#92400e", fontSize: "0.85rem" }}>
                                                Awaiting Confirmation ({stats.released.length})
                                            </Typography>
                                        </Box>
                                        {stats.released.slice(0, 5).map((p) => (
                                            <Box
                                                key={p.id}
                                                onClick={() => navigate(`/inventory/pick-lists/${p.id}`)}
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
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                            {p.pickNumber}
                                                        </Typography>
                                                        <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                            {p.salesOrderNumber} · {p.warehouseCode}
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/inventory/pick-lists/${p.id}`);
                                                        }}
                                                        sx={{
                                                            borderRadius: 1.5,
                                                            fontSize: "0.65rem",
                                                            textTransform: "none",
                                                            bgcolor: T.warning,
                                                            height: 24,
                                                        }}
                                                    >
                                                        Confirm
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {stats.picked.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx("#bbf7d0", "#f0fdf4")}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "#dcfce7",
                                                borderBottom: "1px solid #bbf7d0",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <LocalShippingOutlined sx={{ color: T.success, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: "#166534", fontSize: "0.85rem" }}>
                                                Ready To Ship ({stats.picked.length})
                                            </Typography>
                                        </Box>
                                        {stats.picked.slice(0, 5).map((p) => (
                                            <Box
                                                key={p.id}
                                                onClick={() => navigate(`/inventory/pick-lists/${p.id}`)}
                                                sx={{
                                                    p: 2,
                                                    borderBottom: "1px solid #bbf7d0",
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "#f7fef9" },
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                >
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                            {p.pickNumber}
                                                        </Typography>
                                                        <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                            {p.salesOrderNumber} · off the shelf, waiting for a
                                                            challan
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(
                                                                `/sales/sales-order/delivery-notes/add?soId=${p.salesOrderId}&pickListId=${p.id}`
                                                            );
                                                        }}
                                                        sx={{
                                                            borderRadius: 1.5,
                                                            fontSize: "0.65rem",
                                                            textTransform: "none",
                                                            bgcolor: T.success,
                                                            height: 24,
                                                        }}
                                                    >
                                                        Ship
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
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Pick Registry</Typography>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <TextField
                                        size="small"
                                        placeholder="Search pick, order or warehouse"
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
                                        {PICK_STATUSES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {pickStatusMeta(s).label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Box>

                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Pick No</TableCell>
                                            <TableCell sx={headerCellSx}>Sales Order</TableCell>
                                            <TableCell sx={headerCellSx}>Warehouse</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Progress</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Status</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Actions</TableCell>
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
                                                        {picks.length === 0
                                                            ? "No pick lists yet."
                                                            : "Nothing matches that search."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((p) => {
                                                const cfg = pickStatusMeta(p.status);
                                                const lines = p.lines || [];
                                                const done = lines.filter(
                                                    (l) => Number(l.quantityPicked) >= Number(l.quantityToPick)
                                                ).length;
                                                const shorts = lines.filter(isShortPick).length;
                                                const when = fmtDate(p.pickedDate || p.releasedDate);
                                                return (
                                                    <TableRow
                                                        key={p.id}
                                                        hover
                                                        sx={clickableRowSx}
                                                        onClick={() => navigate(`/inventory/pick-lists/${p.id}`)}
                                                    >
                                                        <TableCell sx={{ py: 1.5 }}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        bgcolor: `${cfg.color}15`,
                                                                        color: cfg.color,
                                                                    }}
                                                                >
                                                                    <ChecklistOutlined sx={{ fontSize: 16 }} />
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 700, color: INK }}
                                                                    >
                                                                        {p.pickNumber}
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
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: T.primary,
                                                                    fontWeight: 600,
                                                                    fontSize: "0.8125rem",
                                                                }}
                                                            >
                                                                {p.salesOrderNumber}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {p.warehouseCode}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Stack spacing={0.25} alignItems="center">
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 600, color: INK_SOFT }}
                                                                >
                                                                    {done}/{lines.length}
                                                                </Typography>
                                                                {shorts > 0 && (
                                                                    <Chip
                                                                        label={`${shorts} short`}
                                                                        size="small"
                                                                        sx={chipSx({ color: "#b45309", bg: "#fffbeb" })}
                                                                    />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={cfg.label} size="small" sx={chipSx(cfg)} />
                                                        </TableCell>
                                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                                {p.status === "DRAFT" && (
                                                                    <Tooltip title="Release to the floor">
                                                                        <span>
                                                                            <IconButton
                                                                                size="small"
                                                                                disabled={busyId === p.id}
                                                                                sx={{
                                                                                    color: MUTED,
                                                                                    "&:hover": { color: T.warning },
                                                                                }}
                                                                                onClick={() => release(p)}
                                                                            >
                                                                                <AssignmentTurnedInOutlined
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
                                                                            navigate(`/inventory/pick-lists/${p.id}`)
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
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>New pick list</DialogTitle>
                <DialogContent dividers>
                    {createError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {createError}
                        </Alert>
                    )}
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        {!soLoading && salesOrders.length === 0 && (
                            <Alert severity="info">
                                No order is ready to pick. Stock is only picked against an approved sales
                                order, so drafts and cancelled orders are not listed — approve an order
                                first and it will appear here.
                            </Alert>
                        )}
                        <Autocomplete
                            options={salesOrders}
                            loading={soLoading}
                            value={newPick.salesOrder}
                            onChange={(_, v) => setNewPick((p) => ({ ...p, salesOrder: v }))}
                            getOptionLabel={(o) => (o ? `${o.orderNumber} — ${o.status}` : "")}
                            isOptionEqualToValue={(a, b) => a?.id === b?.id}
                            disabled={!soLoading && salesOrders.length === 0}
                            noOptionsText="No approved orders"
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Sales order"
                                    required
                                    helperText="Draft and cancelled orders cannot be picked"
                                />
                            )}
                        />
                        <TextField
                            select
                            label="Pick from warehouse"
                            value={newPick.warehouseCode}
                            onChange={(e) => setNewPick((p) => ({ ...p, warehouseCode: e.target.value }))}
                            helperText="An order spanning two warehouses needs two pick lists"
                        >
                            {warehouses.map((w) => (
                                <MenuItem key={w.id} value={w.code}>
                                    {w.code} — {w.name}
                                    {w.isDefault ? " (default)" : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Remarks"
                            value={newPick.remarks}
                            onChange={(e) => setNewPick((p) => ({ ...p, remarks: e.target.value }))}
                            multiline
                            minRows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)} disabled={creating}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={submitCreate}
                        disabled={creating || !newPick.salesOrder?.id}
                    >
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

export default PickListPage;
