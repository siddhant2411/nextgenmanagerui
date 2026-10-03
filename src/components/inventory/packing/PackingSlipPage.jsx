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
    ChevronRight,
    DoneAll,
    Inventory2Outlined,
    LocalShippingOutlined,
    PendingActions,
    Refresh,
    VerifiedOutlined,
    Warning,
} from "@mui/icons-material";
import {
    boxUnits,
    createPackingSlip,
    isLiveSlip,
    listPackingSlips,
    resolveApiErrorMessage,
    slipStatusMeta,
    SLIP_STATUSES,
} from "../../../services/packingSlipService";
import { listPickLists } from "../../../services/pickListService";
import { listInspectionLots, lotBlocksClosing } from "../../../services/inspectionLotService";
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

const RailPanel = ({ border, wash, head, headColor, icon: Icon, iconColor, title, children }) => (
    <Paper elevation={0} sx={alertPanelSx(border, wash)}>
        <Box
            sx={{
                p: 2,
                bgcolor: head,
                borderBottom: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 1,
            }}
        >
            <Icon sx={{ color: iconColor, fontSize: 18 }} />
            <Typography sx={{ fontWeight: 800, color: headColor, fontSize: "0.85rem" }}>{title}</Typography>
        </Box>
        {children}
    </Paper>
);

const RailRow = ({ border, hover, title, subtitle, action, onClick }) => (
    <Box
        onClick={onClick}
        sx={{ p: 2, borderBottom: `1px solid ${border}`, cursor: "pointer", "&:hover": { bgcolor: hover } }}
    >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{title}</Typography>
                <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>{subtitle}</Typography>
            </Box>
            {action}
        </Stack>
    </Box>
);

const railButtonSx = (bg) => ({
    borderRadius: 1.5,
    fontSize: "0.65rem",
    textTransform: "none",
    bgcolor: bg,
    height: 24,
    flexShrink: 0,
});

const PackingSlipPage = () => {
    const navigate = useNavigate();

    const [slips, setSlips] = useState([]);
    const [allSlips, setAllSlips] = useState([]);
    const [pickedPicks, setPickedPicks] = useState([]);
    const [packageLots, setPackageLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [newSlip, setNewSlip] = useState({ pick: null, remarks: "" });
    const [createError, setCreateError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);

    // The rail and stat cards describe the whole desk, so they always come from the unfiltered set.
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [everything, picks, lots] = await Promise.all([
                listPackingSlips({}),
                listPickLists({ status: "PICKED" }),
                // QC is a side panel here; a failure to load it should not blank the whole desk.
                listInspectionLots({ source: "PACKAGE" }).catch(() => []),
            ]);
            const all = Array.isArray(everything) ? everything : [];
            setAllSlips(all);
            setSlips(statusFilter ? all.filter((s) => s.status === statusFilter) : all);
            setPickedPicks(Array.isArray(picks) ? picks : []);
            setPackageLots(Array.isArray(lots) ? lots : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load packing slips."));
            setSlips([]);
            setAllSlips([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const lotsByBox = useMemo(() => {
        const out = {};
        packageLots.forEach((l) => {
            if (l.packageBoxId == null) return;
            (out[l.packageBoxId] = out[l.packageBoxId] || []).push(l);
        });
        return out;
    }, [packageLots]);

    const blockingLots = useCallback(
        (slip) =>
            (slip.boxes || []).flatMap((b) => (lotsByBox[b.id] || []).filter(lotBlocksClosing)),
        [lotsByBox]
    );

    const stats = useMemo(() => {
        // A pick is waiting to be packed while it is PICKED and no live slip holds it.
        const heldPicks = new Set(allSlips.filter(isLiveSlip).map((s) => s.pickListId));
        const waiting = pickedPicks.filter((p) => !heldPicks.has(p.id));
        const packed = allSlips.filter((s) => s.status === "PACKED");
        return {
            waiting,
            draft: allSlips.filter((s) => s.status === "DRAFT"),
            blocked: packed.filter((s) => blockingLots(s).length > 0),
            readyToClose: packed.filter((s) => blockingLots(s).length === 0),
            // Closed and not yet on a delivery note: packed, waiting for a lorry.
            readyToShip: allSlips.filter((s) => s.status === "CLOSED" && !s.deliveryNoteId),
            shipped: allSlips.filter((s) => s.status === "CLOSED" && s.deliveryNoteId).length,
        };
    }, [allSlips, pickedPicks, blockingLots]);

    const openCreate = (pick = null) => {
        setNewSlip({ pick, remarks: "" });
        setCreateError(null);
        setCreateOpen(true);
    };

    const submitCreate = async () => {
        if (!newSlip.pick?.id) return;
        setCreating(true);
        setCreateError(null);
        try {
            const created = await createPackingSlip({
                pickListId: newSlip.pick.id,
                remarks: newSlip.remarks || undefined,
            });
            setCreateOpen(false);
            setToast({ severity: "success", message: `${created.slipNumber} opened` });
            if (created?.id) navigate(`/inventory/packing-slips/${created.id}`);
            else await load();
        } catch (e) {
            setCreateError(resolveApiErrorMessage(e, "Could not open a packing slip for this pick."));
        } finally {
            setCreating(false);
        }
    };

    const term = search.trim().toLowerCase();
    const visible = term
        ? slips.filter(
              (s) =>
                  s.slipNumber?.toLowerCase().includes(term) ||
                  s.salesOrderNumber?.toLowerCase().includes(term) ||
                  s.pickNumber?.toLowerCase().includes(term)
          )
        : slips;

    const railVisible =
        stats.waiting.length > 0 ||
        stats.blocked.length > 0 ||
        stats.readyToClose.length > 0 ||
        stats.readyToShip.length > 0;

    const statCards = [
        { label: "To Pack", value: stats.waiting.length, icon: PendingActions, color: "#3b82f6", tag: "Picked, no slip" },
        { label: "Being Packed", value: stats.draft.length, icon: Inventory2Outlined, color: "#f59e0b", tag: "Draft" },
        { label: "QC Blocking", value: stats.blocked.length, icon: Warning, color: "#ef4444", tag: stats.blocked.length ? "Investigate" : "Clear" },
        { label: "Ready To Ship", value: stats.readyToShip.length, icon: DoneAll, color: "#10b981", tag: `${stats.shipped} shipped` },
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
                                Packing Desk
                            </Typography>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                What went into which box, and whether it passed inspection before it closed.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton aria-label="Refresh" onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={<Add />}
                                onClick={() => openCreate()}
                                sx={primaryButtonSx}
                            >
                                New Packing Slip
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
                                {stats.blocked.length > 0 && (
                                    <RailPanel
                                        border="#fecaca"
                                        wash="#fff5f5"
                                        head="#fee2e2"
                                        headColor="#991b1b"
                                        icon={Warning}
                                        iconColor={T.error}
                                        title={`QC Blocking Close (${stats.blocked.length})`}
                                    >
                                        {stats.blocked.slice(0, 5).map((s) => {
                                            const lots = blockingLots(s);
                                            const failed = lots.filter((l) => l.status === "FAILED").length;
                                            return (
                                                <RailRow
                                                    key={s.id}
                                                    border="#fecaca"
                                                    hover="#fef2f2"
                                                    onClick={() => navigate(`/inventory/packing-slips/${s.id}`)}
                                                    title={s.slipNumber}
                                                    subtitle={`${s.salesOrderNumber} · ${
                                                        failed
                                                            ? `${failed} failed`
                                                            : `${lots.length} not yet judged`
                                                    }`}
                                                />
                                            );
                                        })}
                                    </RailPanel>
                                )}

                                {stats.waiting.length > 0 && (
                                    <RailPanel
                                        border="#bfdbfe"
                                        wash="#f5f9ff"
                                        head="#dbeafe"
                                        headColor="#1e40af"
                                        icon={PendingActions}
                                        iconColor="#2563eb"
                                        title={`Picked, Waiting To Be Packed (${stats.waiting.length})`}
                                    >
                                        {stats.waiting.slice(0, 5).map((p) => (
                                            <RailRow
                                                key={p.id}
                                                border="#bfdbfe"
                                                hover="#eff6ff"
                                                onClick={() => navigate(`/inventory/pick-lists/${p.id}`)}
                                                title={p.pickNumber}
                                                subtitle={`${p.salesOrderNumber} · ${p.warehouseCode}`}
                                                action={
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openCreate(p);
                                                        }}
                                                        sx={railButtonSx("#2563eb")}
                                                    >
                                                        Pack
                                                    </Button>
                                                }
                                            />
                                        ))}
                                    </RailPanel>
                                )}

                                {stats.readyToShip.length > 0 && (
                                    <RailPanel
                                        border="#bbf7d0"
                                        wash="#f0fdf4"
                                        head="#dcfce7"
                                        headColor="#166534"
                                        icon={LocalShippingOutlined}
                                        iconColor={T.success}
                                        title={`Closed, Waiting To Ship (${stats.readyToShip.length})`}
                                    >
                                        {stats.readyToShip.slice(0, 5).map((s) => (
                                            <RailRow
                                                key={s.id}
                                                border="#bbf7d0"
                                                hover="#f7fef9"
                                                onClick={() => navigate(`/inventory/packing-slips/${s.id}`)}
                                                title={s.slipNumber}
                                                subtitle={`${s.salesOrderNumber} · ${(s.boxes || []).length} box(es), waiting for a challan`}
                                                action={
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/sales/sales-order/delivery-notes/add?soId=${s.salesOrderId}&pickListId=${s.pickListId}`);
                                                        }}
                                                        sx={railButtonSx(T.success)}
                                                    >
                                                        Ship
                                                    </Button>
                                                }
                                            />
                                        ))}
                                    </RailPanel>
                                )}

                                {stats.readyToClose.length > 0 && (
                                    <RailPanel
                                        border="#bbf7d0"
                                        wash="#f0fdf4"
                                        head="#dcfce7"
                                        headColor="#166534"
                                        icon={VerifiedOutlined}
                                        iconColor={T.success}
                                        title={`Packed, Ready To Close (${stats.readyToClose.length})`}
                                    >
                                        {stats.readyToClose.slice(0, 5).map((s) => (
                                            <RailRow
                                                key={s.id}
                                                border="#bbf7d0"
                                                hover="#f7fef9"
                                                onClick={() => navigate(`/inventory/packing-slips/${s.id}`)}
                                                title={s.slipNumber}
                                                subtitle={`${s.salesOrderNumber} · ${(s.boxes || []).length} box(es), nothing blocking`}
                                                action={
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/inventory/packing-slips/${s.id}`);
                                                        }}
                                                        sx={railButtonSx(T.success)}
                                                    >
                                                        Close
                                                    </Button>
                                                }
                                            />
                                        ))}
                                    </RailPanel>
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
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Packing Registry</Typography>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <TextField
                                        size="small"
                                        placeholder="Search slip, order or pick"
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
                                        {SLIP_STATUSES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {slipStatusMeta(s).label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Box>

                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Slip No</TableCell>
                                            <TableCell sx={headerCellSx}>Sales Order</TableCell>
                                            <TableCell sx={headerCellSx}>Pick</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Boxes</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Status</TableCell>
                                            <TableCell sx={headerCellSx} align="center" />
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
                                                        {slips.length === 0
                                                            ? "No packing slips yet. A slip is opened against a picked pick list."
                                                            : "Nothing matches that search."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((s) => {
                                                const cfg = slipStatusMeta(s.status);
                                                const boxes = s.boxes || [];
                                                const units = boxes.reduce((a, b) => a + boxUnits(b), 0);
                                                const blocking = s.status === "PACKED" ? blockingLots(s).length : 0;
                                                const when = fmtDate(s.closedDate || s.packedDate);
                                                return (
                                                    <TableRow
                                                        key={s.id}
                                                        hover
                                                        sx={clickableRowSx}
                                                        onClick={() => navigate(`/inventory/packing-slips/${s.id}`)}
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
                                                                    <Inventory2Outlined sx={{ fontSize: 16 }} />
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                                        {s.slipNumber}
                                                                    </Typography>
                                                                    {when && (
                                                                        <Typography variant="caption" sx={{ color: MUTED }}>
                                                                            {when}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ color: T.primary, fontWeight: 600, fontSize: "0.8125rem" }}
                                                            >
                                                                {s.salesOrderNumber}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {s.pickNumber}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: INK_SOFT }}>
                                                                {boxes.length}
                                                            </Typography>
                                                            {units > 0 && (
                                                                <Typography variant="caption" sx={{ color: MUTED }}>
                                                                    {units} units
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Stack spacing={0.5} alignItems="center">
                                                                <Chip label={cfg.label} size="small" sx={chipSx(cfg)} />
                                                                {s.deliveryNoteNumber && (
                                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                                        {s.deliveryNoteNumber}
                                                                    </Typography>
                                                                )}
                                                                {blocking > 0 && (
                                                                    <Chip
                                                                        label={`${blocking} QC blocking`}
                                                                        size="small"
                                                                        sx={chipSx({ color: "#b91c1c", bg: "#fee2e2" })}
                                                                    />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <ChevronRight sx={{ fontSize: 18, color: MUTED }} />
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
                <DialogTitle>New packing slip</DialogTitle>
                <DialogContent dividers>
                    {createError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {createError}
                        </Alert>
                    )}
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        {stats.waiting.length === 0 && (
                            <Alert severity="info">
                                Nothing is waiting to be packed. A slip packs one confirmed pick — confirm a
                                pick list first, and it will appear here until a slip holds it.
                            </Alert>
                        )}
                        <Autocomplete
                            options={stats.waiting}
                            value={newSlip.pick}
                            onChange={(_, v) => setNewSlip((s) => ({ ...s, pick: v }))}
                            getOptionLabel={(o) => (o ? `${o.pickNumber} — ${o.salesOrderNumber} · ${o.warehouseCode}` : "")}
                            isOptionEqualToValue={(a, b) => a?.id === b?.id}
                            disabled={stats.waiting.length === 0}
                            noOptionsText="No picked pick lists without a slip"
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Pick list"
                                    required
                                    helperText="Only confirmed (picked) picks that no other slip holds"
                                />
                            )}
                        />
                        <TextField
                            label="Remarks"
                            value={newSlip.remarks}
                            onChange={(e) => setNewSlip((s) => ({ ...s, remarks: e.target.value }))}
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
                        startIcon={<LocalShippingOutlined />}
                        onClick={submitCreate}
                        disabled={creating || !newSlip.pick?.id}
                    >
                        {creating ? "Opening…" : "Open slip"}
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

export default PackingSlipPage;
