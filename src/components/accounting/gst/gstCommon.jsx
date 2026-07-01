import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, Divider, MenuItem, Paper, Skeleton, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import { TaskAltOutlined } from "@mui/icons-material";
import { listFinancialYears } from "../../../services/accounting/accountingFyService";
import { useAuth } from "../../../auth/AuthContext";
import { ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_ACCOUNTS_HEAD } from "../../../auth/roles";

// Mirrors the backend @RequiresAccountsHead gate on the filing endpoints.
export const GST_FILE_ROLES = [ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_ACCOUNTS_HEAD];

// ── Formatting helpers ───────────────────────────────────────────────────────
export const todayStr = () => new Date().toISOString().split("T")[0];

export const fmtAmt = (n) =>
    n == null || Number(n) === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

export const fmtAmtSigned = (n) =>
    n == null
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

export const fmtMoney0 = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const fmtRate = (r) => (r == null ? "—" : `${Number(r)}%`);

// ── Shared table styles (mirrors reports/AgeingReportPage) ───────────────────
export const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };
export const COL_NUM = { ...COL_HEAD, textAlign: "right" };
export const CELL = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
export const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };
export const CELL_MONO = { ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#64748b" };

// ── Stat card ────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, accent = "#1e293b", loading }) => (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 150, p: "11px 14px", borderRadius: 1.5, border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>{label}</Typography>
        {loading
            ? <Skeleton width="60%" height={28} />
            : <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>}
    </Paper>
);

// ── Section header (for the multi-table GSTR previews) ───────────────────────
export const SectionTitle = ({ title, hint }) => (
    <Stack direction="row" alignItems="baseline" spacing={1.25} sx={{ mt: 3, mb: 1 }}>
        <Typography sx={{ fontSize: "0.9375rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>{hint}</Typography>}
    </Stack>
);

export const EmptySection = ({ text = "No records in this section." }) => (
    <Box sx={{ py: 2.5, px: 1.5, border: "1px dashed #e2e8f0", borderRadius: 1.5, bgcolor: "#fafafa" }}>
        <Typography sx={{ fontSize: "0.8125rem", color: "#94a3b8" }}>{text}</Typography>
    </Box>
);

// ── Period selection: FY → month-period ──────────────────────────────────────
// Emits the chosen accounting period: { id, periodLabel, startDate, endDate, fyId, fyLabel }.
const pickDefaultPeriod = (periods = []) => {
    if (!periods.length) return null;
    const today = todayStr();
    const containing = periods.find((p) => p.startDate <= today && today <= p.endDate);
    if (containing) return containing;
    const past = [...periods].filter((p) => p.startDate <= today).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return past[0] || periods[0];
};

export const useFinancialYears = () => {
    const [fys, setFys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const data = await listFinancialYears();
                if (active) setFys(data || []);
            } catch {
                if (active) setError("Failed to load financial years.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    return { fys, loading, error };
};

export const GstPeriodSelector = ({ value, onChange }) => {
    const { fys, loading, error } = useFinancialYears();
    const [fyId, setFyId] = useState("");
    const [periodId, setPeriodId] = useState("");

    const selectedFy = useMemo(() => fys.find((f) => f.id === fyId), [fys, fyId]);
    const periods = useMemo(
        () => (selectedFy?.periods || []).slice().sort((a, b) => (a.startDate < b.startDate ? -1 : 1)),
        [selectedFy]
    );

    const emit = (fy, period) => {
        if (!fy || !period) return;
        onChange?.({
            id: period.id,
            periodLabel: period.periodLabel,
            startDate: period.startDate,
            endDate: period.endDate,
            fyId: fy.id,
            fyLabel: fy.label,
        });
    };

    // Default selection once FYs load.
    useEffect(() => {
        if (loading || !fys.length || fyId) return;
        const activeFy = fys.find((f) => f.status === "ACTIVE") || fys[0];
        const defPeriod = pickDefaultPeriod(activeFy?.periods);
        setFyId(activeFy?.id ?? "");
        setPeriodId(defPeriod?.id ?? "");
        emit(activeFy, defPeriod);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, fys]);

    const onFyChange = (id) => {
        const fy = fys.find((f) => f.id === id);
        const defPeriod = pickDefaultPeriod(fy?.periods);
        setFyId(id);
        setPeriodId(defPeriod?.id ?? "");
        emit(fy, defPeriod);
    };

    const onPeriodChange = (id) => {
        const period = periods.find((p) => p.id === id);
        setPeriodId(id);
        emit(selectedFy, period);
    };

    if (error) return <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>;

    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
            <TextField
                select label="Financial Year" size="small" value={fyId}
                onChange={(e) => onFyChange(e.target.value)} disabled={loading || !fys.length}
                sx={{ minWidth: 180 }}
            >
                {fys.map((f) => (
                    <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                ))}
            </TextField>
            <TextField
                select label="Period" size="small" value={periodId}
                onChange={(e) => onPeriodChange(e.target.value)} disabled={loading || !periods.length}
                sx={{ minWidth: 180 }}
            >
                {periods.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.periodLabel}</MenuItem>
                ))}
            </TextField>
            {value?.startDate && (
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", pb: 1 }}>
                    {fmtDate(value.startDate)} – {fmtDate(value.endDate)}
                </Typography>
            )}
        </Stack>
    );
};

// ── Report shell: header + period selector + load lifecycle + render-prop body
// load(period) -> Promise<data>;  actions({ period, data, busy }) renders the
// right-side button group; children(data, period) renders the result body.
export const GstReportShell = ({ title, subtitle, accent = "#10b981", load, actions, children }) => {
    const [period, setPeriod] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = async (p = period) => {
        if (!p) return;
        setError("");
        setData(null);
        setLoading(true);
        try {
            setData(await load(p));
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || `Failed to load ${title}.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</Typography>
                        {subtitle && <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>{subtitle}</Typography>}
                    </Box>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-end" }} sx={{ mb: 3 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" useFlexGap flexWrap="wrap">
                        <GstPeriodSelector value={period} onChange={setPeriod} />
                        <Button
                            variant="contained" disableElevation onClick={() => run()} disabled={loading || !period}
                            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: accent, "&:hover": { bgcolor: accent, filter: "brightness(0.93)" }, height: 40 }}
                        >
                            {loading ? "Loading…" : "Load"}
                        </Button>
                    </Stack>
                    {actions && <Box>{actions({ period, data, busy: loading })}</Box>}
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {loading && <Box>{[...Array(6)].map((_, i) => <Skeleton key={i} height={38} sx={{ mb: 0.5 }} />)}</Box>}

                {data && !loading && children(data, period)}
            </Paper>
        </Box>
    );
};

// ── File-return control (Head/Admin only) ────────────────────────────────────
// Renders nothing for users without the role. onFile() should return a Promise.
export const FileReturnButton = ({ label, periodLabel, warning, disabled, onFile, onFiled }) => {
    const { hasAnyRole } = useAuth();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [filing, setFiling] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    if (!hasAnyRole(GST_FILE_ROLES)) return null;

    const doFile = async () => {
        setFiling(true);
        try {
            const result = await onFile();
            setConfirmOpen(false);
            setSnack({ open: true, message: `${label} recorded for ${periodLabel}.`, severity: "success" });
            onFiled?.(result);
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || e?.message || "Filing failed.", severity: "error" });
        } finally {
            setFiling(false);
        }
    };

    return (
        <>
            <Button
                variant="contained" disableElevation disabled={disabled}
                onClick={() => setConfirmOpen(true)}
                startIcon={<TaskAltOutlined sx={{ fontSize: 18 }} />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}
            >
                {label}
            </Button>

            <Dialog open={confirmOpen} onClose={() => !filing && setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>{label} — {periodLabel}</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                        This records a filing snapshot of the figures currently in the books for {periodLabel}.
                    </Typography>
                    {warning && <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>{warning}</Alert>}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setConfirmOpen(false)} disabled={filing} size="small" sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>Cancel</Button>
                    <Button onClick={doFile} variant="contained" disableElevation size="small" disabled={filing}
                        startIcon={filing ? <CircularProgress size={13} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                        Confirm Filing
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
            </Snackbar>
        </>
    );
};
