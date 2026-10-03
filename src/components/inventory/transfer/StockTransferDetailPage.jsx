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
    ArrowForward,
    BlockOutlined,
    DoneAll,
    Inventory2Outlined,
    LocalShippingOutlined,
    MoveDownOutlined,
    Refresh,
    Warning,
} from "@mui/icons-material";
import {
    cancelStockTransfer,
    dispatchStockTransfer,
    getStockTransfer,
    isShortReceipt,
    receiveStockTransfer,
    resolveApiErrorMessage,
    strandedQuantity,
    transferStatusMeta,
} from "../../../services/stockTransferService";
import TransferReceiveDialog from "./TransferReceiveDialog";
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

const num = (v) => Number(v ?? 0) || 0;

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

const StockTransferDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [transfer, setTransfer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receiveError, setReceiveError] = useState(null);
    const [receiveSaving, setReceiveSaving] = useState(false);

    const [ask, setAsk] = useState(null);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setTransfer(await getStockTransfer(id));
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load this transfer."));
            setTransfer(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const totals = useMemo(() => {
        const lines = transfer?.lines || [];
        const sent = lines.reduce((a, l) => a + num(l.quantity), 0);
        const landed = lines.reduce((a, l) => a + num(l.receivedQuantity), 0);
        return {
            lines: lines.length,
            sent,
            landed,
            stranded: strandedQuantity(transfer),
            shortLines: lines.filter((l) => isShortReceipt(transfer, l)).length,
            pct: sent > 0 ? Math.min(100, Math.round((landed / sent) * 100)) : 0,
        };
    }, [transfer]);

    const run = async (fn, label) => {
        setBusy(true);
        try {
            await fn();
            setToast({ severity: "success", message: `${transfer.transferNumber} ${label}` });
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

    const submitReceive = async (payload) => {
        setReceiveSaving(true);
        setReceiveError(null);
        try {
            await receiveStockTransfer(id, payload);
            setReceiveOpen(false);
            setToast({ severity: "success", message: `${transfer.transferNumber} received` });
            await load();
        } catch (e) {
            setReceiveError(resolveApiErrorMessage(e, "Could not receive this transfer."));
        } finally {
            setReceiveSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pt: 10, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !transfer) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/inventory/stock-transfers")}>
                    Back to transfers
                </Button>
                <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                    {error || "Transfer not found."}
                </Alert>
            </Box>
        );
    }

    const cfg = transferStatusMeta(transfer.status);
    const canDispatch = transfer.status === "DRAFT";
    const canReceive = transfer.status === "DISPATCHED";
    const canCancel = transfer.status === "DRAFT";
    const received = transfer.status === "RECEIVED";

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate("/inventory/stock-transfers")}
                        sx={{ color: "rgba(255,255,255,0.7)", mb: 2, textTransform: "none" }}
                    >
                        Stock Transfers
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
                                    {transfer.transferNumber}
                                </Typography>
                                <Chip label={cfg.label} size="small" sx={chipSx(cfg)} />
                                {totals.stranded > 0 && (
                                    <Chip
                                        label={`${totals.stranded} never arrived`}
                                        size="small"
                                        sx={chipSx({ color: "#fca5a5", bg: "rgba(220,38,38,0.15)" })}
                                    />
                                )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <Typography
                                    variant="body1"
                                    sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}
                                >
                                    {transfer.fromWarehouseCode}
                                </Typography>
                                <ArrowForward sx={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }} />
                                <Typography
                                    variant="body1"
                                    sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}
                                >
                                    {transfer.toWarehouseCode}
                                </Typography>
                                {transfer.createdBy && (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "rgba(255,255,255,0.5)", pl: 1 }}
                                    >
                                        · raised by {transfer.createdBy}
                                    </Typography>
                                )}
                            </Stack>
                            {transfer.remarks && (
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                    {transfer.remarks}
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            {canDispatch && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<LocalShippingOutlined />}
                                    disabled={busy}
                                    onClick={() =>
                                        setAsk({
                                            title: `Dispatch ${transfer.transferNumber}?`,
                                            body: `The stock leaves ${transfer.fromWarehouseCode} now and counts as in transit until it is received at ${transfer.toWarehouseCode}. A dispatched transfer cannot be cancelled.`,
                                            confirmLabel: "Dispatch",
                                            danger: false,
                                            onConfirm: () =>
                                                run(() => dispatchStockTransfer(id), "dispatched"),
                                        })
                                    }
                                    sx={primaryButtonSx}
                                >
                                    Dispatch
                                </Button>
                            )}
                            {canReceive && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<DoneAll />}
                                    disabled={busy}
                                    onClick={() => {
                                        setReceiveError(null);
                                        setReceiveOpen(true);
                                    }}
                                    sx={primaryButtonSx}
                                >
                                    Receive
                                </Button>
                            )}
                            {canCancel && (
                                <Tooltip title="Abandon this draft — nothing has moved yet">
                                    <span>
                                        <IconButton
                                            disabled={busy}
                                            sx={{ ...heroIconButtonSx, color: "#fca5a5" }}
                                            onClick={() =>
                                                setAsk({
                                                    title: `Cancel ${transfer.transferNumber}?`,
                                                    body: "Nothing has left the source yet, so nothing moves back. The transfer is kept as a record.",
                                                    confirmLabel: "Cancel transfer",
                                                    danger: true,
                                                    onConfirm: () =>
                                                        run(() => cancelStockTransfer(id), "cancelled"),
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
                                tag="On this transfer"
                                color="#3b82f6"
                                icon={MoveDownOutlined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Dispatched"
                                value={totals.sent}
                                tag={canDispatch ? "Not sent yet" : "Units sent"}
                                color="#f59e0b"
                                icon={LocalShippingOutlined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Received"
                                value={totals.landed}
                                tag={received ? `${totals.pct}%` : "Awaiting"}
                                color="#10b981"
                                icon={Inventory2Outlined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Never Arrived"
                                value={totals.stranded}
                                tag={totals.stranded ? "Investigate" : "Clear"}
                                color="#8b5cf6"
                                icon={Warning}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {totals.stranded > 0 && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
                        {totals.stranded} unit(s) left {transfer.fromWarehouseCode} and never arrived at{" "}
                        {transfer.toWarehouseCode}. They are still counted as in transit at the source —
                        settle them with a stock count once you know what happened.
                    </Alert>
                )}

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
                                <Typography sx={{ fontWeight: 800, color: T.text }}>
                                    Transfer Lines
                                </Typography>
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    {totals.landed} of {totals.sent} units received
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
                                        Dispatched
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
                                        {fmtDateTime(transfer.dispatchedDate)}
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
                                        Received
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
                                        {fmtDateTime(transfer.receivedDate)}
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
                                    bgcolor: totals.stranded > 0 ? T.warning : T.success,
                                },
                            }}
                        />
                    </Box>

                    <TableContainer component={Box}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Item</TableCell>
                                    <TableCell sx={headerCellSx}>Remarks</TableCell>
                                    <TableCell sx={headerCellSx} align="right">
                                        Dispatched
                                    </TableCell>
                                    <TableCell sx={headerCellSx} align="right">
                                        Received
                                    </TableCell>
                                    <TableCell sx={headerCellSx} align="right">
                                        Shortfall
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(transfer.lines || []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body2" sx={{ color: MUTED }}>
                                                This transfer has no lines.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transfer.lines.map((l) => {
                                        const short = isShortReceipt(transfer, l);
                                        const gap = Math.max(0, num(l.quantity) - num(l.receivedQuantity));
                                        return (
                                            <TableRow key={l.id} hover>
                                                <TableCell sx={{ py: 1.25 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: INK }}
                                                    >
                                                        {l.itemCode}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                        {l.itemName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                        {l.remarks || "—"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                        {l.quantity}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {received ? (
                                                        short ? (
                                                            <Tooltip title="Less arrived than was dispatched">
                                                                <Chip
                                                                    label={l.receivedQuantity}
                                                                    size="small"
                                                                    sx={chipSx({
                                                                        color: "#b45309",
                                                                        bg: "#fffbeb",
                                                                    })}
                                                                />
                                                            </Tooltip>
                                                        ) : (
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 700, color: INK }}
                                                            >
                                                                {l.receivedQuantity}
                                                            </Typography>
                                                        )
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: MUTED }}>
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: short ? T.error : MUTED,
                                                            fontWeight: short ? 700 : 400,
                                                        }}
                                                    >
                                                        {received && gap > 0 ? gap : "—"}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>

            <TransferReceiveDialog
                open={receiveOpen}
                transfer={transfer}
                onClose={() => setReceiveOpen(false)}
                onSubmit={submitReceive}
                saving={receiveSaving}
                error={receiveError}
            />

            <Dialog open={Boolean(ask)} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{ask?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{ask?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAsk(null)}>Not now</Button>
                    <Button
                        color={ask?.danger ? "error" : "primary"}
                        variant="contained"
                        onClick={async () => {
                            const action = ask?.onConfirm;
                            setAsk(null);
                            if (action) await action();
                        }}
                    >
                        {ask?.confirmLabel || "Confirm"}
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

export default StockTransferDetailPage;
