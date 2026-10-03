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
    Divider,
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
    Add,
    ArrowBack,
    BlockOutlined,
    DoneAll,
    Inventory2Outlined,
    LocalShippingOutlined,
    LockOutlined,
    PictureAsPdfOutlined,
    Refresh,
    ScaleOutlined,
    VerifiedOutlined,
    Warning,
} from "@mui/icons-material";
import {
    addPackageBox,
    boxDimensions,
    boxUnits,
    cancelPackingSlip,
    closePackingSlip,
    downloadPackingListPdf,
    getPackingSlip,
    packedByPickLine,
    packPackingSlip,
    resolveApiErrorMessage,
    slipStatusMeta,
} from "../../../services/packingSlipService";
import { getPickList } from "../../../services/pickListService";
import {
    cancelInspectionLot,
    judgeInspectionLot,
    listInspectionLots,
    lotBlocksClosing,
    lotStatusMeta,
    raisePackageInspection,
    waiveInspectionLot,
} from "../../../services/inspectionLotService";
import AddBoxDialog from "./AddBoxDialog";
import PackageQcDialog from "./PackageQcDialog";
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
        : `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString(
              "en-IN",
              { hour: "2-digit", minute: "2-digit" }
          )}`;
};

const fmtNum = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));

const StatTile = ({ label, value, tag, color, icon: Icon }) => (
    <Paper elevation={0} sx={statCardSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color, display: "flex" }}>
                <Icon />
            </Box>
            <Typography
                sx={{ color, fontSize: "0.7rem", fontWeight: 800, bgcolor: `${color}10`, px: 1, borderRadius: 1 }}
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

const outlinedHeroButtonSx = {
    color: "white",
    borderColor: "rgba(255,255,255,0.25)",
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 2.5,
    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" },
};

const Meta = ({ label, children }) => (
    <Box>
        <Typography
            variant="caption"
            sx={{ color: MUTED, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}
        >
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
            {children}
        </Typography>
    </Box>
);

const PackingSlipDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [slip, setSlip] = useState(null);
    const [pick, setPick] = useState(null);
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null);
    const [ask, setAsk] = useState(null);

    const [boxOpen, setBoxOpen] = useState(false);
    const [boxError, setBoxError] = useState(null);
    const [boxSaving, setBoxSaving] = useState(false);

    // { mode: "raise" | "judge" | "waive", box, lot }
    const [qc, setQc] = useState(null);
    const [qcError, setQcError] = useState(null);
    const [qcSaving, setQcSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const s = await getPackingSlip(id);
            setSlip(s);
            const [p, allLots] = await Promise.all([
                getPickList(s.pickListId),
                listInspectionLots({ source: "PACKAGE" }).catch(() => null),
            ]);
            setPick(p);
            const boxIds = new Set((s.boxes || []).map((b) => b.id));
            setLots(Array.isArray(allLots) ? allLots.filter((l) => boxIds.has(l.packageBoxId)) : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load this packing slip."));
            setSlip(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const lotsByBox = useMemo(() => {
        const out = {};
        lots.forEach((l) => (out[l.packageBoxId] = out[l.packageBoxId] || []).push(l));
        return out;
    }, [lots]);

    const blocking = useMemo(() => lots.filter(lotBlocksClosing), [lots]);

    const totals = useMemo(() => {
        const packed = packedByPickLine(slip);
        const pickLines = (pick?.lines || []).map((l) => ({
            ...l,
            packed: packed[l.id] || 0,
            remaining: Math.max(0, Number(l.quantityPicked || 0) - (packed[l.id] || 0)),
        }));
        const picked = pickLines.reduce((a, l) => a + Number(l.quantityPicked || 0), 0);
        const inBoxes = (slip?.boxes || []).reduce((a, b) => a + boxUnits(b), 0);
        const gross = (slip?.boxes || []).reduce((a, b) => a + Number(b.grossWeightKg || 0), 0);
        const unweighed = (slip?.boxes || []).filter((b) => b.grossWeightKg == null).length;
        return {
            pickLines,
            picked,
            inBoxes,
            unpacked: pickLines.reduce((a, l) => a + l.remaining, 0),
            pct: picked > 0 ? Math.min(100, Math.round((inBoxes / picked) * 100)) : 0,
            gross,
            unweighed,
        };
    }, [slip, pick]);

    const run = async (fn, label) => {
        setBusy(true);
        try {
            await fn();
            setToast({ severity: "success", message: `${slip.slipNumber} ${label}` });
            await load();
        } catch (e) {
            setToast({ severity: "error", message: resolveApiErrorMessage(e, "That action could not be completed.") });
        } finally {
            setBusy(false);
        }
    };

    const submitBox = async (payload) => {
        setBoxSaving(true);
        setBoxError(null);
        try {
            const saved = await addPackageBox(id, payload);
            setBoxOpen(false);
            setToast({ severity: "success", message: `Box ${saved?.boxNumber ?? ""} added` });
            await load();
        } catch (e) {
            setBoxError(resolveApiErrorMessage(e, "Could not add this box."));
        } finally {
            setBoxSaving(false);
        }
    };

    const submitQc = async (payload) => {
        setQcSaving(true);
        setQcError(null);
        try {
            if (qc.mode === "raise") await raisePackageInspection(payload);
            else if (qc.mode === "judge") await judgeInspectionLot(qc.lot.id, payload);
            else await waiveInspectionLot(qc.lot.id, payload);
            setQc(null);
            setToast({
                severity: "success",
                message:
                    qc.mode === "raise"
                        ? `Inspection raised on box ${qc.box.boxNumber}`
                        : qc.mode === "judge"
                        ? `${qc.lot.lotNumber} recorded`
                        : `${qc.lot.lotNumber} waived`,
            });
            await load();
        } catch (e) {
            setQcError(resolveApiErrorMessage(e, "That inspection action could not be completed."));
        } finally {
            setQcSaving(false);
        }
    };

    const openQc = (mode, box, lot = null) => {
        setQcError(null);
        setQc({ mode, box, lot });
    };

    const downloadPdf = async () => {
        try {
            await downloadPackingListPdf(slip.id, slip.slipNumber);
        } catch (e) {
            setToast({ severity: "error", message: resolveApiErrorMessage(e, "Could not generate the packing list.") });
        }
    };

    if (loading && !slip) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pt: 10, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !slip) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/inventory/packing-slips")}>
                    Back to packing slips
                </Button>
                <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                    {error || "Packing slip not found."}
                </Alert>
            </Box>
        );
    }

    const cfg = slipStatusMeta(slip.status);
    const boxes = slip.boxes || [];
    const isDraft = slip.status === "DRAFT";
    const isPacked = slip.status === "PACKED";
    const qcOpen = isDraft || isPacked;
    const canCancel = isDraft || isPacked;
    // A closed slip with no delivery note is packed and waiting for a lorry.
    const canShip = slip.status === "CLOSED" && !slip.deliveryNoteId;
    const closeBlocked = blocking.length > 0;

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate("/inventory/packing-slips")}
                        sx={{ color: "rgba(255,255,255,0.7)", mb: 2, textTransform: "none" }}
                    >
                        Packing Slips
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
                                    {slip.slipNumber}
                                </Typography>
                                <Chip label={cfg.label} size="small" sx={chipSx(cfg)} />
                                {closeBlocked && qcOpen && (
                                    <Chip
                                        label={`${blocking.length} QC blocking`}
                                        size="small"
                                        sx={chipSx({ color: "#fca5a5", bg: "rgba(220,38,38,0.15)" })}
                                    />
                                )}
                            </Stack>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, mt: 1 }}>
                                {slip.salesOrderNumber} ·{" "}
                                <Box
                                    component="span"
                                    onClick={() => navigate(`/inventory/pick-lists/${slip.pickListId}`)}
                                    sx={{ cursor: "pointer", textDecoration: "underline dotted" }}
                                >
                                    packs {slip.pickNumber}
                                </Box>
                                {pick?.warehouseCode ? ` from ${pick.warehouseCode}` : ""}
                                {slip.closedBy ? ` · closed by ${slip.closedBy}` : slip.packedBy ? ` · packed by ${slip.packedBy}` : ""}
                                {slip.deliveryNoteNumber ? ` · shipped on ${slip.deliveryNoteNumber}` : ""}
                            </Typography>
                            {slip.remarks && (
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                    {slip.remarks}
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Tooltip title="Refresh">
                                <IconButton aria-label="Refresh" onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={boxes.length ? "Download the packing list" : "Add a box first"}>
                                <span>
                                    <IconButton aria-label="Download packing list" onClick={downloadPdf} disabled={!boxes.length} sx={heroIconButtonSx}>
                                        <PictureAsPdfOutlined />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            {isDraft && (
                                <Button
                                    variant="outlined"
                                    startIcon={<Add />}
                                    disabled={busy || totals.unpacked <= 0}
                                    onClick={() => {
                                        setBoxError(null);
                                        setBoxOpen(true);
                                    }}
                                    sx={outlinedHeroButtonSx}
                                >
                                    Add Box
                                </Button>
                            )}
                            {isDraft && (
                                <Tooltip
                                    title={
                                        !boxes.length
                                            ? "Add at least one box first"
                                            : totals.unpacked > 0
                                            ? `${fmtNum(totals.unpacked)} picked units are not in a box yet. Box the rest, or cancel the slip.`
                                            : ""
                                    }
                                >
                                    <span>
                                        <Button
                                            variant="contained"
                                            disableElevation
                                            startIcon={<DoneAll />}
                                            disabled={busy || !boxes.length || totals.unpacked > 0}
                                            onClick={() => run(() => packPackingSlip(id), "packed")}
                                            sx={primaryButtonSx}
                                        >
                                            Mark Packed
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                            {isPacked && (
                                <Tooltip title={closeBlocked ? "A box has a failed or unjudged inspection" : ""}>
                                    <span>
                                        <Button
                                            variant="contained"
                                            disableElevation
                                            startIcon={<LockOutlined />}
                                            disabled={busy || closeBlocked}
                                            onClick={() => run(() => closePackingSlip(id), "closed")}
                                            sx={primaryButtonSx}
                                        >
                                            Close Slip
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                            {canShip && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<LocalShippingOutlined />}
                                    onClick={() => navigate(`/sales/sales-order/delivery-notes/add?soId=${slip.salesOrderId}&pickListId=${slip.pickListId}`)}
                                    sx={primaryButtonSx}
                                >
                                    Create Delivery Note
                                </Button>
                            )}
                            {canCancel && (
                                <Tooltip title="Abandon this slip and release its boxes' units">
                                    <span>
                                        <IconButton
                                            aria-label="Cancel slip"
                                            disabled={busy}
                                            sx={{ ...heroIconButtonSx, color: "#fca5a5" }}
                                            onClick={() =>
                                                setAsk({
                                                    title: `Cancel ${slip.slipNumber}?`,
                                                    body:
                                                        "Every unit in its boxes is released, and the pick can be packed again on a new slip. The slip itself is kept as a record.",
                                                    confirm: "Cancel slip",
                                                    danger: true,
                                                    onConfirm: () => run(() => cancelPackingSlip(id), "cancelled"),
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
                            <StatTile label="Boxes" value={boxes.length} tag="On this slip" color="#3b82f6" icon={Inventory2Outlined} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Units Packed"
                                value={`${fmtNum(totals.inBoxes)} / ${fmtNum(totals.picked)}`}
                                tag={`${totals.pct}%`}
                                color="#10b981"
                                icon={DoneAll}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Gross Weight"
                                value={`${fmtNum(totals.gross)} kg`}
                                tag={totals.unweighed ? `${totals.unweighed} unweighed` : "All weighed"}
                                color="#8b5cf6"
                                icon={ScaleOutlined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Package QC"
                                value={lots.length}
                                tag={blocking.length ? `${blocking.length} blocking` : "Clear"}
                                color={blocking.length ? "#ef4444" : "#f59e0b"}
                                icon={blocking.length ? Warning : VerifiedOutlined}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {isPacked && closeBlocked && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                            This slip cannot close yet
                        </Typography>
                        {blocking.map((l) => {
                            const b = boxes.find((x) => x.id === l.packageBoxId);
                            return (
                                <Typography variant="body2" key={l.id}>
                                    Box {b?.boxNumber}: {l.lotNumber} ({l.itemCode}){" "}
                                    {l.status === "FAILED"
                                        ? `failed${l.remarks ? ` — ${l.remarks}` : ""}`
                                        : "has not been judged yet"}
                                </Typography>
                            );
                        })}
                    </Alert>
                )}

                <Grid container spacing={4}>
                    <Grid item xs={12} lg={4}>
                        <Paper elevation={0} sx={surfaceSx}>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}` }}>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>From the Pick</Typography>
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    {fmtNum(totals.inBoxes)} of {fmtNum(totals.picked)} picked units are in a box
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={totals.pct}
                                    sx={{
                                        mt: 2,
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: "#e2e8f0",
                                        "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: T.success },
                                    }}
                                />
                            </Box>
                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Item</TableCell>
                                            <TableCell sx={headerCellSx} align="right">Picked</TableCell>
                                            <TableCell sx={headerCellSx} align="right">Boxed</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {totals.pickLines.map((l) => (
                                            <TableRow key={l.id}>
                                                <TableCell sx={{ py: 1.25 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                        {l.itemCode}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                        {l.itemName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                        {l.quantityPicked}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {l.remaining > 0 ? (
                                                        <Chip
                                                            label={`${fmtNum(l.packed)} · ${fmtNum(l.remaining)} left`}
                                                            size="small"
                                                            sx={chipSx({ color: "#b45309", bg: "#fffbeb" })}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: T.success }}>
                                                            {fmtNum(l.packed)}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ p: 3, borderTop: `1px solid ${T.border}` }}>
                                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                                    <Meta label="Packed">{fmtDateTime(slip.packedDate)}</Meta>
                                    <Meta label="Closed">{fmtDateTime(slip.closedDate)}</Meta>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} lg={8}>
                        <Stack spacing={3}>
                            {boxes.length === 0 && (
                                <Paper elevation={0} sx={{ ...surfaceSx, p: 6, textAlign: "center" }}>
                                    <Inventory2Outlined sx={{ fontSize: 40, color: MUTED }} />
                                    <Typography sx={{ fontWeight: 700, color: INK, mt: 1 }}>No boxes yet</Typography>
                                    <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
                                        Record each physical box: what went in, its size and its weight.
                                    </Typography>
                                    {isDraft && (
                                        <Button
                                            variant="contained"
                                            disableElevation
                                            startIcon={<Add />}
                                            onClick={() => {
                                                setBoxError(null);
                                                setBoxOpen(true);
                                            }}
                                            sx={primaryButtonSx}
                                        >
                                            Add first box
                                        </Button>
                                    )}
                                </Paper>
                            )}

                            {boxes.map((b) => {
                                const boxLots = lotsByBox[b.id] || [];
                                const dims = boxDimensions(b);
                                return (
                                    <Paper elevation={0} sx={surfaceSx} key={b.id}>
                                        <Box sx={{ p: 2.5, borderBottom: `1px solid ${T.border}` }}>
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="flex-start"
                                                flexWrap="wrap"
                                                gap={2}
                                            >
                                                <Box>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography sx={{ fontWeight: 800, color: T.text }}>
                                                            Box {b.boxNumber}
                                                        </Typography>
                                                        {b.boxType && (
                                                            <Chip
                                                                label={b.boxType}
                                                                size="small"
                                                                sx={chipSx({ color: "#475569", bg: "#f1f5f9" })}
                                                            />
                                                        )}
                                                    </Stack>
                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                        {[
                                                            dims,
                                                            b.grossWeightKg != null ? `gross ${Number(b.grossWeightKg)} kg` : null,
                                                            b.netWeightKg != null ? `net ${Number(b.netWeightKg)} kg` : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ") || "No size or weight recorded"}
                                                    </Typography>
                                                    {b.shippingMarks && (
                                                        <Typography variant="caption" sx={{ display: "block", color: INK_SOFT }}>
                                                            Marks: {b.shippingMarks}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                    {boxLots.length === 0 && (
                                                        <Typography variant="caption" sx={{ color: MUTED }}>
                                                            No inspection
                                                        </Typography>
                                                    )}
                                                    {qcOpen && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<VerifiedOutlined sx={{ fontSize: 16 }} />}
                                                            onClick={() => openQc("raise", b)}
                                                            sx={{ textTransform: "none", borderRadius: 2 }}
                                                        >
                                                            Inspect
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Box>

                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={headerCellSx}>Item</TableCell>
                                                    <TableCell sx={headerCellSx} align="right">Quantity</TableCell>
                                                    <TableCell sx={headerCellSx}>Units</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(b.lines || []).map((l) => (
                                                    <TableRow key={l.id}>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                                {l.itemCode}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: MUTED }}>
                                                                {l.itemName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                                {l.quantity}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ color: INK_SOFT }}>
                                                                {(l.instanceIds || []).length
                                                                    ? l.instanceIds.map((x) => `#${x}`).join(", ")
                                                                    : "—"}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        {boxLots.length > 0 && (
                                            <>
                                                <Divider />
                                                <Stack spacing={1} sx={{ p: 2 }}>
                                                    {boxLots.map((lot) => {
                                                        const m = lotStatusMeta(lot.status);
                                                        return (
                                                            <Stack
                                                                key={lot.id}
                                                                direction="row"
                                                                alignItems="center"
                                                                justifyContent="space-between"
                                                                flexWrap="wrap"
                                                                gap={1}
                                                            >
                                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                                    <Chip label={m.label} size="small" sx={chipSx(m)} />
                                                                    <Typography
                                                                        variant="body2"
                                                                        onClick={() => navigate(`/quality/inspections/${lot.id}`)}
                                                                        sx={{
                                                                            fontWeight: 600,
                                                                            color: T.primary,
                                                                            cursor: "pointer",
                                                                            "&:hover": { textDecoration: "underline" },
                                                                        }}
                                                                    >
                                                                        {lot.lotNumber}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                                        {lot.itemCode} · {lot.quantityOffered} offered
                                                                        {lot.status !== "PENDING"
                                                                            ? ` · ${lot.quantityAccepted} accepted, ${lot.quantityRejected} rejected`
                                                                            : ""}
                                                                        {lot.inspectedBy ? ` · ${lot.inspectedBy}` : ""}
                                                                        {lot.status === "WAIVED" && lot.waiverReason
                                                                            ? ` · waived: ${lot.waiverReason}`
                                                                            : lot.remarks
                                                                            ? ` · ${lot.remarks}`
                                                                            : ""}
                                                                    </Typography>
                                                                </Stack>
                                                                {qcOpen && (
                                                                    <Stack direction="row" spacing={0.5}>
                                                                        {lot.status === "PENDING" && (
                                                                            <Button
                                                                                size="small"
                                                                                onClick={() => openQc("judge", b, lot)}
                                                                                sx={{ textTransform: "none" }}
                                                                            >
                                                                                Record result
                                                                            </Button>
                                                                        )}
                                                                        {lotBlocksClosing(lot) && (
                                                                            <Button
                                                                                size="small"
                                                                                color="warning"
                                                                                onClick={() => openQc("waive", b, lot)}
                                                                                sx={{ textTransform: "none" }}
                                                                            >
                                                                                Waive
                                                                            </Button>
                                                                        )}
                                                                        {lot.status === "PENDING" && (
                                                                            <Button
                                                                                size="small"
                                                                                color="inherit"
                                                                                onClick={() =>
                                                                                    setAsk({
                                                                                        title: `Cancel ${lot.lotNumber}?`,
                                                                                        body: "Withdraws this inspection before anyone judged it. The box stops blocking the slip.",
                                                                                        confirm: "Cancel inspection",
                                                                                        danger: true,
                                                                                        onConfirm: () =>
                                                                                            run(() => cancelInspectionLot(lot.id), `— ${lot.lotNumber} withdrawn`),
                                                                                    })
                                                                                }
                                                                                sx={{ textTransform: "none", color: MUTED }}
                                                                            >
                                                                                Withdraw
                                                                            </Button>
                                                                        )}
                                                                    </Stack>
                                                                )}
                                                            </Stack>
                                                        );
                                                    })}
                                                </Stack>
                                            </>
                                        )}
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            <AddBoxDialog
                open={boxOpen}
                slip={slip}
                pick={pick}
                onClose={() => setBoxOpen(false)}
                onSubmit={submitBox}
                saving={boxSaving}
                error={boxError}
            />

            <PackageQcDialog
                open={Boolean(qc)}
                mode={qc?.mode}
                box={qc?.box}
                lot={qc?.lot}
                onClose={() => setQc(null)}
                onSubmit={submitQc}
                saving={qcSaving}
                error={qcError}
            />

            <Dialog open={Boolean(ask)} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{ask?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{ask?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAsk(null)}>Go back</Button>
                    <Button
                        color={ask?.danger ? "error" : "primary"}
                        variant="contained"
                        onClick={async () => {
                            const action = ask?.onConfirm;
                            setAsk(null);
                            if (action) await action();
                        }}
                    >
                        {ask?.confirm}
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

export default PackingSlipDetailPage;
