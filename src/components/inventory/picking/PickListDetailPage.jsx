import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    ArrowBack,
    AssignmentTurnedInOutlined,
    BlockOutlined,
    Inventory2Outlined,
    DoneAll,
    LocalShippingOutlined,
    PendingActions,
    PlayArrowOutlined,
    Refresh,
    Warning,
} from "@mui/icons-material";
import {
    cancelPickList,
    confirmPickList,
    getPickList,
    isShortPick,
    pickStatusMeta,
    releasePickList,
    resolveApiErrorMessage,
} from "../../../services/pickListService";
import PickConfirmDialog from "./PickConfirmDialog";
import { createPackingSlip, isLiveSlip, listPackingSlips } from "../../../services/packingSlipService";
import {
    chipSx,
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

const fmtDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "—"
        : `${d.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
};

const StatTile = ({ label, value, tag, color, icon: Icon }) => (
    <Paper elevation={0} sx={statCardSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color, display: "flex" }}>
                <Icon />
            </Box>
            <Typography
                sx={{
                    color,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    bgcolor: `${color}10`,
                    px: 1,
                    borderRadius: 1,
                }}
            >
                {tag}
            </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
            {value}
        </Typography>
        <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase" }}
        >
            {label}
        </Typography>
    </Paper>
);

const PickListDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [pick, setPick] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmError, setConfirmError] = useState(null);
    const [confirmSaving, setConfirmSaving] = useState(false);

    const [ask, setAsk] = useState(null);
    const [liveSlip, setLiveSlip] = useState(null);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const p = await getPickList(id);
            setPick(p);
            // The slip packing this pick, if any. Optional: the pick page still works without it.
            const slips = await listPackingSlips({ salesOrderId: p.salesOrderId }).catch(() => []);
            setLiveSlip(
                (Array.isArray(slips) ? slips : []).find(
                    (s) => s.pickListId === p.id && isLiveSlip(s)
                ) || null
            );
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load this pick list."));
            setPick(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const totals = useMemo(() => {
        const lines = pick?.lines || [];
        const asked = lines.reduce((a, l) => a + Number(l.quantityToPick ?? 0), 0);
        const picked = lines.reduce((a, l) => a + Number(l.quantityPicked ?? 0), 0);
        return {
            asked,
            picked,
            short: lines.filter(isShortPick).length,
            lines: lines.length,
            pct: asked > 0 ? Math.min(100, Math.round((picked / asked) * 100)) : 0,
        };
    }, [pick]);

    const run = async (fn, label) => {
        setBusy(true);
        try {
            await fn();
            setToast({ severity: "success", message: `${pick.pickNumber} ${label}` });
            await load();
        } catch (e) {
            setToast({
                severity: "error",
                message: resolveApiErrorMessage(e, "That action could not be completed."),
            });
        } finally {
            setBusy(false);
        }
    };

    const submitConfirm = async (payload) => {
        setConfirmSaving(true);
        setConfirmError(null);
        try {
            await confirmPickList(id, payload);
            setConfirmOpen(false);
            setToast({ severity: "success", message: `${pick.pickNumber} picked` });
            await load();
        } catch (e) {
            setConfirmError(resolveApiErrorMessage(e, "Could not confirm this pick."));
        } finally {
            setConfirmSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pt: 10, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !pick) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/inventory/pick-lists")}>
                    Back to pick lists
                </Button>
                <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                    {error || "Pick list not found."}
                </Alert>
            </Box>
        );
    }

    const cfg = pickStatusMeta(pick.status);
    const canRelease = pick.status === "DRAFT";
    const canConfirm = pick.status === "DRAFT" || pick.status === "RELEASED";
    const canShip = pick.status === "PICKED";
    // A dispatched pick is spent: its units are on a lorry, and releasing the allocation would
    // put them back on the shelf while the delivery note still says they left.
    const canCancel = pick.status !== "CANCELLED" && pick.status !== "DISPATCHED";

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate("/inventory/pick-lists")}
                        sx={{ color: "rgba(255,255,255,0.7)", mb: 2, textTransform: "none" }}
                    >
                        Pick Lists
                    </Button>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                        mb={5}
                    >
                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                                    {pick.pickNumber}
                                </Typography>
                                <Chip label={cfg.label} size="small" sx={chipSx(cfg)} />
                                {totals.short > 0 && (
                                    <Chip
                                        label={`${totals.short} short`}
                                        size="small"
                                        sx={chipSx({ color: "#fca5a5", bg: "rgba(220,38,38,0.15)" })}
                                    />
                                )}
                            </Stack>
                            <Typography
                                variant="body1"
                                sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, mt: 1 }}
                            >
                                {pick.salesOrderNumber} · picked from {pick.warehouseCode}
                                {pick.pickedBy ? ` · by ${pick.pickedBy}` : ""}
                                {pick.deliveryNoteNumber ? ` · shipped on ${pick.deliveryNoteNumber}` : ""}
                            </Typography>
                            {pick.remarks && (
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                    {pick.remarks}
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            {canRelease && (
                                <Button
                                    variant="outlined"
                                    startIcon={<PlayArrowOutlined />}
                                    disabled={busy}
                                    onClick={() => run(() => releasePickList(id), "released")}
                                    sx={{
                                        color: "white",
                                        borderColor: "rgba(255,255,255,0.25)",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" },
                                    }}
                                >
                                    Release
                                </Button>
                            )}
                            {canConfirm && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<AssignmentTurnedInOutlined />}
                                    disabled={busy}
                                    onClick={() => {
                                        setConfirmError(null);
                                        setConfirmOpen(true);
                                    }}
                                    sx={primaryButtonSx}
                                >
                                    Confirm Pick
                                </Button>
                            )}
                            {liveSlip ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<Inventory2Outlined />}
                                    onClick={() => navigate(`/inventory/packing-slips/${liveSlip.id}`)}
                                    sx={{
                                        color: "white",
                                        borderColor: "rgba(255,255,255,0.25)",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" },
                                    }}
                                >
                                    {liveSlip.slipNumber}
                                </Button>
                            ) : (
                                canShip && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<Inventory2Outlined />}
                                        disabled={busy}
                                        onClick={async () => {
                                            setBusy(true);
                                            try {
                                                const created = await createPackingSlip({ pickListId: pick.id });
                                                navigate(`/inventory/packing-slips/${created.id}`);
                                            } catch (e) {
                                                setToast({
                                                    severity: "error",
                                                    message: resolveApiErrorMessage(e, "Could not open a packing slip."),
                                                });
                                                setBusy(false);
                                            }
                                        }}
                                        sx={{
                                            color: "white",
                                            borderColor: "rgba(255,255,255,0.25)",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            borderRadius: 2.5,
                                            "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" },
                                        }}
                                    >
                                        Pack
                                    </Button>
                                )
                            )}
                            {canShip && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<LocalShippingOutlined />}
                                    disabled={busy}
                                    onClick={() =>
                                        navigate(
                                            `/sales/sales-order/delivery-notes/add?soId=${pick.salesOrderId}&pickListId=${pick.id}`
                                        )
                                    }
                                    sx={primaryButtonSx}
                                >
                                    Create Delivery Note
                                </Button>
                            )}
                            {canCancel && (
                                <Tooltip title="Release every allocation and abandon this pick">
                                    <span>
                                        <IconButton
                                            disabled={busy}
                                            sx={{ ...heroIconButtonSx, color: "#fca5a5" }}
                                            onClick={() =>
                                                setAsk({
                                                    title: `Cancel ${pick.pickNumber}?`,
                                                    body:
                                                        "Every allocated unit goes back to being pickable. The pick list itself is kept as a record.",
                                                    onConfirm: () => run(() => cancelPickList(id), "cancelled"),
                                                })
                                            }
                                        >
                                            <BlockOutlined />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Lines"
                                value={totals.lines}
                                tag="On this pick"
                                color="#3b82f6"
                                icon={AssignmentTurnedInOutlined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Ordered"
                                value={totals.asked}
                                tag="Units asked"
                                color="#8b5cf6"
                                icon={PendingActions}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Picked"
                                value={totals.picked}
                                tag={`${totals.pct}%`}
                                color="#10b981"
                                icon={DoneAll}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Short Lines"
                                value={totals.short}
                                tag={totals.short ? "Investigate" : "Clear"}
                                color="#f59e0b"
                                icon={Warning}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                <Paper elevation={0} sx={surfaceSx}>
                    <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}` }}>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            flexWrap="wrap"
                            gap={2}
                        >
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Pick Lines</Typography>
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    {totals.picked} of {totals.asked} units picked
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={3}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: MUTED,
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        Released
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
                                        {fmtDateTime(pick.releasedDate)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: MUTED,
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        Picked
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
                                        {fmtDateTime(pick.pickedDate)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={totals.pct}
                            sx={{
                                mt: 2,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: "#e2e8f0",
                                "& .MuiLinearProgress-bar": {
                                    borderRadius: 3,
                                    bgcolor: totals.short > 0 ? T.warning : T.success,
                                },
                            }}
                        />
                    </Box>

                    <TableContainer component={Box}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Item</TableCell>
                                    <TableCell sx={headerCellSx}>Location</TableCell>
                                    <TableCell sx={headerCellSx} align="right">Asked</TableCell>
                                    <TableCell sx={headerCellSx} align="right">Picked</TableCell>
                                    <TableCell sx={headerCellSx} align="center">Units Allocated</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(pick.lines || []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body2" sx={{ color: MUTED }}>
                                                This pick has no lines.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pick.lines.map((l) => (
                                        <TableRow key={l.id} hover>
                                            <TableCell sx={{ py: 1.25 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: INK }}
                                                    >
                                                        {l.itemCode}
                                                    </Typography>
                                                    {l.tracked && (
                                                        <Tooltip title="Batch or serial tracked — the units picked must be named">
                                                            <Chip
                                                                label="Tracked"
                                                                size="small"
                                                                sx={chipSx({ color: "#7c3aed", bg: "#f5f3ff" })}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: MUTED }}>
                                                    {l.itemName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                    {l.storageLocationCode || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                    {l.quantityToPick}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {isShortPick(l) ? (
                                                    <Tooltip title="Short pick — less was found than the order asked for">
                                                        <Chip
                                                            label={l.quantityPicked}
                                                            size="small"
                                                            sx={chipSx({ color: "#b45309", bg: "#fffbeb" })}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: INK }}
                                                    >
                                                        {l.quantityPicked}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                    {l.allocatedInstanceIds?.length || "—"}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>

            <PickConfirmDialog
                open={confirmOpen}
                pick={pick}
                onClose={() => setConfirmOpen(false)}
                onSubmit={submitConfirm}
                saving={confirmSaving}
                error={confirmError}
            />

            <Dialog open={Boolean(ask)} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{ask?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{ask?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAsk(null)}>Keep it</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            const action = ask?.onConfirm;
                            setAsk(null);
                            if (action) await action();
                        }}
                    >
                        Cancel pick
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

export default PickListDetailPage;
