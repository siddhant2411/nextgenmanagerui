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
    ArrowBack,
    AssignmentLateOutlined,
    BlockOutlined,
    DoneAll,
    FactCheckOutlined,
    HighlightOff,
    PendingActions,
    Refresh,
    ReportProblemOutlined,
} from "@mui/icons-material";
import {
    cancelInspectionLot,
    decideNcr,
    getInspectionLot,
    judgeInspectionLotWithChecks,
    listNcrsForLot,
    LOT_STATUS_SHORT,
    lotDocumentLabel,
    lotSourceMeta,
    lotStatusMeta,
    NCR_DISPOSITIONS,
    ncrDispositionLabel,
    raiseNcr,
    resolveApiErrorMessage,
    waiveInspectionLot,
} from "../../services/inspectionLotService";
import InspectionJudgeDialog from "./InspectionJudgeDialog";
import PackageQcDialog from "../inventory/packing/PackageQcDialog";
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
} from "../inventory/warehouse/listStyles";

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

const RESULT_META = {
    PASS: { label: "Pass", color: "#15803d", bg: "#dcfce7" },
    FAIL: { label: "Fail", color: "#b91c1c", bg: "#fee2e2" },
    PENDING: { label: "Not decided", color: "#a16207", bg: "#fef9c3" },
};

const StatTile = ({ label, value, tag, color, icon: Icon }) => (
    <Paper elevation={0} sx={statCardSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color, display: "flex" }}>
                <Icon />
            </Box>
            <Typography sx={{ color, fontSize: "0.7rem", fontWeight: 800, bgcolor: `${color}10`, px: 1, borderRadius: 1 }}>
                {tag}
            </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
            {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase" }}>
            {label}
        </Typography>
    </Paper>
);

const Meta = ({ label, children }) => (
    <Box sx={{ minWidth: 140 }}>
        <Typography variant="caption" sx={{ color: MUTED, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: INK_SOFT, fontWeight: 500 }}>
            {children}
        </Typography>
    </Box>
);

const outlinedHeroButtonSx = {
    color: "white",
    borderColor: "rgba(255,255,255,0.25)",
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 2.5,
    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" },
};

/** Raise a report against a failed lot, or close one with a decision. */
const NcrDialog = ({ open, mode, lot, ncr, onClose, onSubmit, saving, error }) => {
    const [form, setForm] = useState({});

    useEffect(() => {
        if (!open) return;
        setForm(
            mode === "raise"
                ? { quantity: String(lot?.quantityRejected > 0 ? lot.quantityRejected : lot?.quantityOffered ?? ""), problem: "", remarks: "" }
                : { disposition: "", approvedBy: "", notes: "" }
        );
    }, [open, mode, lot]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const problem = useMemo(() => {
        if (mode === "raise") {
            const q = Number(form.quantity);
            if (form.quantity === "" || !Number.isFinite(q) || q <= 0) return "Enter the quantity affected";
            if (q > Number(lot?.quantityOffered ?? 0)) return `More than the ${lot?.quantityOffered} offered on this lot`;
            if (!form.problem?.trim()) return "Describe what is wrong";
            return null;
        }
        if (!form.disposition) return "Choose what happens to these goods";
        if (form.disposition === "USE_AS_IS" && !form.approvedBy?.trim())
            return "Use as is needs a named approver — someone has to own accepting the deviation";
        return null;
    }, [mode, form, lot]);

    const chosen = NCR_DISPOSITIONS.find((d) => d.value === form.disposition);

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{mode === "raise" ? "Raise a non-conformance report" : `Decide ${ncr?.ncrNumber || ""}`}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Stack spacing={2}>
                    {mode === "raise" ? (
                        <>
                            <TextField
                                size="small"
                                type="number"
                                label="Quantity affected"
                                value={form.quantity ?? ""}
                                onChange={set("quantity")}
                                inputProps={{ min: 0, step: "any" }}
                            />
                            <TextField
                                size="small"
                                label="What is wrong"
                                required
                                value={form.problem ?? ""}
                                onChange={set("problem")}
                                multiline
                                minRows={3}
                            />
                            <TextField size="small" label="Remarks" value={form.remarks ?? ""} onChange={set("remarks")} />
                        </>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                {ncr?.quantity} of {ncr?.itemCode} — {ncr?.problem}
                            </Typography>
                            <TextField select size="small" label="Disposition" value={form.disposition ?? ""} onChange={set("disposition")}>
                                {NCR_DISPOSITIONS.map((d) => (
                                    <MenuItem key={d.value} value={d.value}>
                                        {d.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {chosen && <Alert severity="info">{chosen.hint}.</Alert>}
                            {form.disposition === "USE_AS_IS" && (
                                <TextField size="small" label="Approved by" required value={form.approvedBy ?? ""} onChange={set("approvedBy")} />
                            )}
                            <TextField size="small" label="Notes" value={form.notes ?? ""} onChange={set("notes")} multiline minRows={2} />
                        </>
                    )}
                    {problem && <Alert severity="warning">{problem}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={saving || Boolean(problem)}
                    onClick={() =>
                        onSubmit(
                            mode === "raise"
                                ? {
                                      inspectionLotId: lot.id,
                                      quantity: Number(form.quantity),
                                      problem: form.problem.trim(),
                                      remarks: form.remarks?.trim() || undefined,
                                  }
                                : {
                                      disposition: form.disposition,
                                      approvedBy: form.approvedBy?.trim() || undefined,
                                      notes: form.notes?.trim() || undefined,
                                  }
                        )
                    }
                >
                    {saving ? "Saving…" : mode === "raise" ? "Raise report" : "Record decision"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const InspectionLotDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [lot, setLot] = useState(null);
    const [ncrs, setNcrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null);
    const [ask, setAsk] = useState(null);

    // { kind: "judge" | "waive" | "ncr-raise" | "ncr-decide", ncr }
    const [dialog, setDialog] = useState(null);
    const [dialogError, setDialogError] = useState(null);
    const [dialogSaving, setDialogSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const l = await getInspectionLot(id);
            setLot(l);
            const reports = await listNcrsForLot(id).catch(() => []);
            setNcrs(Array.isArray(reports) ? reports : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load this inspection."));
            setLot(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const openDialog = (kind, ncr = null) => {
        setDialogError(null);
        setDialog({ kind, ncr });
    };

    const submitDialog = async (payload) => {
        setDialogSaving(true);
        setDialogError(null);
        try {
            let message;
            if (dialog.kind === "judge") {
                const saved = await judgeInspectionLotWithChecks(id, payload);
                message = `${lot.lotNumber} recorded as ${LOT_STATUS_SHORT[saved?.status] || "judged"}`;
            } else if (dialog.kind === "waive") {
                await waiveInspectionLot(id, payload);
                message = `${lot.lotNumber} waived`;
            } else if (dialog.kind === "ncr-raise") {
                const saved = await raiseNcr(payload);
                message = `${saved?.ncrNumber || "Report"} raised`;
            } else {
                await decideNcr(dialog.ncr.id, payload);
                message = `${dialog.ncr.ncrNumber} closed`;
            }
            setDialog(null);
            setToast({ severity: "success", message });
            await load();
        } catch (e) {
            setDialogError(resolveApiErrorMessage(e, "That action could not be completed."));
        } finally {
            setDialogSaving(false);
        }
    };

    const withdraw = async () => {
        setBusy(true);
        try {
            await cancelInspectionLot(id);
            navigate("/quality/inspections");
        } catch (e) {
            setToast({ severity: "error", message: resolveApiErrorMessage(e, "Could not withdraw this inspection.") });
            setBusy(false);
        }
    };

    if (loading && !lot) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pt: 10, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !lot) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/quality/inspections")}>
                    Back to inspections
                </Button>
                <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                    {error || "Inspection not found."}
                </Alert>
            </Box>
        );
    }

    const st = lotStatusMeta(lot.status);
    const src = lotSourceMeta(lot.source);
    const results = lot.results || [];
    const failedChecks = results.filter((r) => r.result === "FAIL");
    const isPending = lot.status === "PENDING";
    const isFailed = lot.status === "FAILED";
    const blocks = isPending || isFailed;
    const openNcrs = ncrs.filter((n) => n.status === "OPEN");

    const gateMessage = {
        FINAL: "its work order cannot produce finished stock",
        PACKAGE: "its packing slip cannot close",
        INCOMING: "the goods it covers are held",
        IN_PROCESS: "the operation is flagged",
    }[lot.source];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate("/quality/inspections")}
                        sx={{ color: "rgba(255,255,255,0.7)", mb: 2, textTransform: "none" }}
                    >
                        Quality Desk
                    </Button>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                        mb={5}
                    >
                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                                    {lot.lotNumber}
                                </Typography>
                                <Chip label={LOT_STATUS_SHORT[lot.status] || lot.status} size="small" sx={chipSx(st)} />
                                <Chip label={src.label} size="small" sx={chipSx(src)} />
                            </Stack>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, mt: 1 }}>
                                {lot.itemCode} — {lot.itemName} · against {lotDocumentLabel(lot)}
                                {lot.inspectedBy ? ` · inspected by ${lot.inspectedBy}` : ""}
                            </Typography>
                            {lot.remarks && (
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                    {lot.remarks}
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Tooltip title="Refresh">
                                <IconButton aria-label="Refresh" onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            {isPending && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<FactCheckOutlined />}
                                    disabled={busy}
                                    onClick={() => openDialog("judge")}
                                    sx={primaryButtonSx}
                                >
                                    Record Result
                                </Button>
                            )}
                            {isFailed && (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<ReportProblemOutlined />}
                                    disabled={busy}
                                    onClick={() => openDialog("ncr-raise")}
                                    sx={primaryButtonSx}
                                >
                                    Raise Report
                                </Button>
                            )}
                            {blocks && (
                                <Button
                                    variant="outlined"
                                    startIcon={<DoneAll />}
                                    disabled={busy}
                                    onClick={() => openDialog("waive")}
                                    sx={outlinedHeroButtonSx}
                                >
                                    Waive
                                </Button>
                            )}
                            {isPending && (
                                <Tooltip title="Withdraw this inspection before anyone judges it">
                                    <span>
                                        <IconButton
                                            aria-label="Withdraw inspection"
                                            disabled={busy}
                                            sx={{ ...heroIconButtonSx, color: "#fca5a5" }}
                                            onClick={() =>
                                                setAsk({
                                                    title: `Withdraw ${lot.lotNumber}?`,
                                                    body: "Removes this inspection before it was judged, so it stops blocking. A lot that has a verdict cannot be withdrawn — the verdict is the record.",
                                                    onConfirm: withdraw,
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
                            <StatTile label="Offered" value={lot.quantityOffered} tag="For inspection" color="#3b82f6" icon={PendingActions} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Accepted"
                                value={isPending ? "—" : lot.quantityAccepted}
                                tag={isPending ? "Not judged" : "Released"}
                                color="#10b981"
                                icon={DoneAll}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Rejected"
                                value={isPending ? "—" : lot.quantityRejected}
                                tag={Number(lot.quantityRejected) > 0 ? "Held" : "None"}
                                color="#ef4444"
                                icon={HighlightOff}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatTile
                                label="Reports"
                                value={ncrs.length}
                                tag={openNcrs.length ? `${openNcrs.length} open` : "None open"}
                                color="#8b5cf6"
                                icon={AssignmentLateOutlined}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {blocks && (
                    <Alert severity={isFailed ? "error" : "warning"} sx={{ mb: 3, borderRadius: 3 }}>
                        {isFailed ? "This inspection failed" : "This inspection has not been judged yet"} — until it
                        passes or is waived, {gateMessage}.
                    </Alert>
                )}
                {lot.status === "WAIVED" && (
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
                        Waived by {lot.waivedBy || "—"}: {lot.waiverReason || "no reason recorded"}
                    </Alert>
                )}

                <Grid container spacing={4}>
                    <Grid item xs={12} lg={8}>
                        <Paper elevation={0} sx={surfaceSx}>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}` }}>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Check Sheet</Typography>
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    {lot.source === "IN_PROCESS"
                                        ? "In-process readings live on the work order operation, not here."
                                        : results.length
                                        ? `${results.length} check(s), ${failedChecks.length} failed`
                                        : "No checks recorded — judged on quantities alone."}
                                </Typography>
                            </Box>
                            {results.length > 0 && (
                                <TableContainer component={Box}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={headerCellSx}>Check</TableCell>
                                                <TableCell sx={headerCellSx}>Limits</TableCell>
                                                <TableCell sx={headerCellSx} align="right">Observed</TableCell>
                                                <TableCell sx={headerCellSx} align="center">Result</TableCell>
                                                <TableCell sx={headerCellSx}>Remarks</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {results.map((r) => {
                                                const m = RESULT_META[r.result] || RESULT_META.PENDING;
                                                const limits =
                                                    r.minValue != null || r.maxValue != null
                                                        ? `${r.minValue ?? "…"} – ${r.maxValue ?? "…"}${r.unit ? ` ${r.unit}` : ""}`
                                                        : "—";
                                                return (
                                                    <TableRow key={r.id}>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                                    {r.parameterName}
                                                                </Typography>
                                                                {r.critical && (
                                                                    <Chip label="Critical" size="small" sx={chipSx({ color: "#b91c1c", bg: "#fee2e2" })} />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {limits}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: INK }}>
                                                                {r.observedValue ?? r.observedText ?? "—"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={m.label} size="small" sx={chipSx(m)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ color: MUTED }}>
                                                                {r.remarks || "—"}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            <Box sx={{ p: 3, borderTop: results.length ? `1px solid ${T.border}` : "none" }}>
                                <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                                    <Meta label="Raised by">{lot.createdBy || "—"}</Meta>
                                    <Meta label="Inspected by">{lot.inspectedBy || "—"}</Meta>
                                    <Meta label="Inspected">{fmtDateTime(lot.inspectedDate)}</Meta>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} lg={4}>
                        <Paper elevation={0} sx={surfaceSx}>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}` }}>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Non-Conformance Reports</Typography>
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    What was wrong, and what was decided about it.
                                </Typography>
                            </Box>
                            {ncrs.length === 0 ? (
                                <Box sx={{ p: 3 }}>
                                    <Typography variant="body2" sx={{ color: MUTED }}>
                                        {isFailed
                                            ? "Nothing written up yet. Raise a report to record what failed and decide what happens to the goods."
                                            : "None. A report can be raised once an inspection has failed."}
                                    </Typography>
                                </Box>
                            ) : (
                                ncrs.map((n) => (
                                    <Box key={n.id} sx={{ p: 2.5, borderBottom: `1px solid ${T.border}` }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                {n.ncrNumber}
                                            </Typography>
                                            <Chip
                                                label={n.status === "OPEN" ? "Open" : ncrDispositionLabel(n.disposition)}
                                                size="small"
                                                sx={chipSx(
                                                    n.status === "OPEN"
                                                        ? { color: "#7c3aed", bg: "#f5f3ff" }
                                                        : { color: "#475569", bg: "#f1f5f9" }
                                                )}
                                            />
                                        </Stack>
                                        <Typography variant="body2" sx={{ color: INK_SOFT, mt: 0.5 }}>
                                            {n.quantity} affected — {n.problem || "no description"}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: MUTED, display: "block" }}>
                                            Raised by {n.raisedBy || "—"} · {fmtDateTime(n.creationDate)}
                                        </Typography>
                                        {n.status !== "OPEN" && (
                                            <Typography variant="caption" sx={{ color: MUTED, display: "block" }}>
                                                Decided by {n.dispositionedBy || "—"}
                                                {n.approvedBy ? `, approved by ${n.approvedBy}` : ""}
                                                {n.dispositionNotes ? ` — ${n.dispositionNotes}` : ""}
                                            </Typography>
                                        )}
                                        {n.status === "OPEN" && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => openDialog("ncr-decide", n)}
                                                sx={{ mt: 1, textTransform: "none", borderRadius: 2 }}
                                            >
                                                Decide
                                            </Button>
                                        )}
                                    </Box>
                                ))
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            <InspectionJudgeDialog
                open={dialog?.kind === "judge"}
                lot={lot}
                onClose={() => setDialog(null)}
                onSubmit={submitDialog}
                saving={dialogSaving}
                error={dialogError}
            />

            <PackageQcDialog
                open={dialog?.kind === "waive"}
                mode={dialog?.kind === "waive" ? "waive" : null}
                lot={lot}
                onClose={() => setDialog(null)}
                onSubmit={submitDialog}
                saving={dialogSaving}
                error={dialogError}
            />

            <NcrDialog
                open={dialog?.kind === "ncr-raise" || dialog?.kind === "ncr-decide"}
                mode={dialog?.kind === "ncr-decide" ? "decide" : "raise"}
                lot={lot}
                ncr={dialog?.ncr}
                onClose={() => setDialog(null)}
                onSubmit={submitDialog}
                saving={dialogSaving}
                error={dialogError}
            />

            <Dialog open={Boolean(ask)} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{ask?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{ask?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAsk(null)}>Go back</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            const action = ask?.onConfirm;
                            setAsk(null);
                            if (action) await action();
                        }}
                    >
                        Withdraw
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

export default InspectionLotDetailPage;
