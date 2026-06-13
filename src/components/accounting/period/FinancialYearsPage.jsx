import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AddCircleOutline,
    CalendarTodayOutlined,
    ChevronRight,
    ExpandMore,
    LockOpenOutlined,
    LockOutlined,
} from "@mui/icons-material";
import {
    createFinancialYear,
    listFinancialYears,
    lockPeriod,
    unlockPeriod,
} from "../../../services/accounting/accountingFyService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const PERIOD_META = {
    OPEN:   { label: "Open",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    LOCKED: { label: "Locked", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    CLOSED: { label: "Closed", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
};

const FY_STATUS_META = {
    ACTIVE: { label: "Active", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    CLOSED: { label: "Closed", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, accent = "#1e293b", loading }) => (
    <Paper
        elevation={0}
        sx={{
            flex: 1,
            minWidth: 140,
            p: "11px 14px",
            borderRadius: 1.5,
            border: "1px solid #e2e8f0",
            borderLeft: `3px solid ${accent}`,
            bgcolor: "#fff",
            transition: "box-shadow 0.15s",
            "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.07)" },
        }}
    >
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>
            {label}
        </Typography>
        {loading ? (
            <Skeleton width="55%" height={32} />
        ) : (
            <Typography sx={{ fontSize: "1.625rem", fontWeight: 500, color: "#1e293b", lineHeight: 1 }}>
                {value}
            </Typography>
        )}
    </Paper>
);

// ─── Period card ──────────────────────────────────────────────────────────────

const PeriodCard = ({ period, onLock, onUnlock, loadingId }) => {
    const meta = PERIOD_META[period.status] || PERIOD_META.OPEN;
    const isLoading = loadingId === period.id;

    return (
        <Box
            sx={{
                border: `1px solid ${meta.border}`,
                borderRadius: 1.5,
                p: "10px 12px",
                bgcolor: meta.bg,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                transition: "box-shadow 0.15s",
                "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
            }}
        >
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                {period.periodLabel}
            </Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                {fmtDate(period.startDate)} – {fmtDate(period.endDate)}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.25 }}>
                <Chip
                    label={meta.label}
                    size="small"
                    sx={{
                        height: 18,
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        color: meta.color,
                        bgcolor: "transparent",
                        border: `1px solid ${meta.border}`,
                        "& .MuiChip-label": { px: 0.75 },
                    }}
                />
                {isLoading ? (
                    <CircularProgress size={14} sx={{ color: "#64748b" }} />
                ) : period.status === "OPEN" ? (
                    <Tooltip title="Lock period" placement="top">
                        <IconButton
                            size="small"
                            onClick={() => onLock(period.id)}
                            sx={{ p: 0.375, color: "#94a3b8", "&:hover": { color: "#d97706", bgcolor: "#fffbeb" } }}
                        >
                            <LockOutlined sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                ) : period.status === "LOCKED" ? (
                    <Tooltip title="Unlock period" placement="top">
                        <IconButton
                            size="small"
                            onClick={() => onUnlock(period.id)}
                            sx={{ p: 0.375, color: "#94a3b8", "&:hover": { color: "#10b981", bgcolor: "#f0fdf4" } }}
                        >
                            <LockOpenOutlined sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Box>
        </Box>
    );
};

// ─── FY card ──────────────────────────────────────────────────────────────────

const FyCard = ({ fy, expanded, onToggle, onLock, onUnlock, loadingPeriodId }) => {
    const statusMeta = FY_STATUS_META[fy.status] || FY_STATUS_META.ACTIVE;
    const openCount = fy.periods?.filter((p) => p.status === "OPEN").length ?? 0;
    const lockedCount = fy.periods?.filter((p) => p.status === "LOCKED").length ?? 0;

    return (
        <Paper
            elevation={0}
            sx={{
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                overflow: "hidden",
                "&:hover": { borderColor: "#cbd5e1" },
                transition: "border-color 0.15s",
            }}
        >
            {/* FY header row */}
            <Box
                onClick={onToggle}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2.5,
                    py: 1.75,
                    cursor: "pointer",
                    bgcolor: expanded ? "#f8fafc" : "#fff",
                    borderBottom: expanded ? "1px solid #f1f5f9" : "none",
                    gap: 2,
                    "&:hover": { bgcolor: "#f8fafc" },
                }}
            >
                {/* Expand icon */}
                <Box sx={{ color: "#94a3b8", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {expanded
                        ? <ExpandMore sx={{ fontSize: 20 }} />
                        : <ChevronRight sx={{ fontSize: 20 }} />
                    }
                </Box>

                {/* FY label + dates */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>
                        {fy.label}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25 }}>
                        {fmtDate(fy.startDate)} – {fmtDate(fy.endDate)}
                        {fy.openingDate && (
                            <> &nbsp;·&nbsp; <span style={{ color: "#2563eb" }}>Opening: {fmtDate(fy.openingDate)}</span></>
                        )}
                    </Typography>
                </Box>

                {/* Period summary chips */}
                <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                    {openCount > 0 && (
                        <Chip label={`${openCount} Open`} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 600, bgcolor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }} />
                    )}
                    {lockedCount > 0 && (
                        <Chip label={`${lockedCount} Locked`} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 600, bgcolor: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }} />
                    )}
                </Stack>

                {/* FY status */}
                <Chip
                    label={statusMeta.label}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: statusMeta.color,
                        bgcolor: statusMeta.bg,
                        border: `1px solid ${statusMeta.border}`,
                        flexShrink: 0,
                    }}
                />
            </Box>

            {/* Period grid */}
            {expanded && (
                <Box sx={{ p: 2.5, bgcolor: "#fafafa" }}>
                    {fy.periods?.length ? (
                        <Grid container spacing={1.25}>
                            {fy.periods.map((p) => (
                                <Grid item xs={4} key={p.id}>
                                    <PeriodCard
                                        period={p}
                                        onLock={onLock}
                                        onUnlock={onUnlock}
                                        loadingId={loadingPeriodId}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography sx={{ fontSize: "0.8125rem", color: "#94a3b8", textAlign: "center", py: 2 }}>
                            No periods found for this financial year.
                        </Typography>
                    )}
                </Box>
            )}
        </Paper>
    );
};

// ─── Add FY Dialog ────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getMonth() >= 3
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

const AddFyDialog = ({ open, onClose, onSave }) => {
    const [startYear, setStartYear] = useState(String(CURRENT_YEAR));
    const [openingDate, setOpeningDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        setStartYear(String(CURRENT_YEAR));
        setOpeningDate("");
        setError("");
    }, [open]);

    const yr = parseInt(startYear, 10);
    const isValidYear = !isNaN(yr) && yr >= 2000 && yr <= 2100;
    const previewLabel = isValidYear
        ? `FY ${yr}-${String(yr + 1).slice(-2)}  (1 Apr ${yr} – 31 Mar ${yr + 1})`
        : "";

    const handleSubmit = async () => {
        if (!isValidYear) { setError("Enter a valid 4-digit start year."); return; }
        setSaving(true);
        setError("");
        try {
            await onSave({ startYear: yr, openingDate: openingDate || null });
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to create financial year.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: "0.9375rem", pb: 1.5 }}>
                Add Financial Year
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField
                        label="Start Year"
                        size="small"
                        fullWidth
                        required
                        type="number"
                        value={startYear}
                        onChange={(e) => { setStartYear(e.target.value); setError(""); }}
                        inputProps={{ min: 2000, max: 2100, step: 1 }}
                        placeholder="e.g. 2025"
                        helperText={previewLabel}
                        FormHelperTextProps={{ sx: { color: "#10b981", fontWeight: 600, mt: 0.5 } }}
                    />
                    <TextField
                        label="Opening Date (optional)"
                        size="small"
                        fullWidth
                        type="date"
                        value={openingDate}
                        onChange={(e) => setOpeningDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="For mid-year go-live. Leave blank for a fresh start."
                        FormHelperTextProps={{ sx: { mt: 0.5 } }}
                    />
                    {error && <Alert severity="error" sx={{ borderRadius: 1.5, py: 0.5 }}>{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={onClose}
                    size="small"
                    sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disableElevation
                    size="small"
                    disabled={saving || !isValidYear}
                    startIcon={saving ? <CircularProgress size={13} color="inherit" /> : null}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}
                >
                    Create Financial Year
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const FinancialYearsPage = () => {
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [loadingPeriodId, setLoadingPeriodId] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const showSnack = useCallback(
        (message, severity = "success") => setSnack({ open: true, message, severity }),
        []
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listFinancialYears();
            setYears(data || []);
            // Auto-expand the first ACTIVE year
            const active = (data || []).find((y) => y.status === "ACTIVE");
            if (active) setExpandedIds(new Set([active.id]));
        } catch {
            setError("Failed to load financial years. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const toggleExpand = useCallback((id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const handleLock = useCallback(async (periodId) => {
        setLoadingPeriodId(periodId);
        try {
            const updated = await lockPeriod(periodId);
            setYears((prev) =>
                prev.map((fy) => ({
                    ...fy,
                    periods: fy.periods?.map((p) => (p.id === periodId ? updated : p)),
                }))
            );
            showSnack("Period locked.");
        } catch {
            showSnack("Failed to lock period.", "error");
        } finally {
            setLoadingPeriodId(null);
        }
    }, [showSnack]);

    const handleUnlock = useCallback(async (periodId) => {
        setLoadingPeriodId(periodId);
        try {
            const updated = await unlockPeriod(periodId);
            setYears((prev) =>
                prev.map((fy) => ({
                    ...fy,
                    periods: fy.periods?.map((p) => (p.id === periodId ? updated : p)),
                }))
            );
            showSnack("Period unlocked.");
        } catch {
            showSnack("Failed to unlock period.", "error");
        } finally {
            setLoadingPeriodId(null);
        }
    }, [showSnack]);

    const handleAddFy = useCallback(async (dto) => {
        await createFinancialYear(dto);
        showSnack(`Financial year created.`);
        await loadData();
    }, [loadData, showSnack]);

    // Stats
    const stats = useMemo(() => {
        const allPeriods = years.flatMap((y) => y.periods || []);
        return {
            total: years.length,
            active: years.filter((y) => y.status === "ACTIVE").length,
            open: allPeriods.filter((p) => p.status === "OPEN").length,
            locked: allPeriods.filter((p) => p.status === "LOCKED").length,
        };
    }, [years]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    width: "100%",
                    borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    bgcolor: "white",
                }}
            >
                {/* ── Header ── */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            Financial Years
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            Manage fiscal years and lock or unlock accounting periods
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={<AddCircleOutline sx={{ fontSize: 17 }} />}
                        onClick={() => setAddDialogOpen(true)}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: "0.8125rem",
                            textTransform: "none",
                            px: 2,
                            py: 0.875,
                            bgcolor: "#10b981",
                            "&:hover": { bgcolor: "#059669" },
                            flexShrink: 0,
                        }}
                    >
                        Add Financial Year
                    </Button>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* ── Stats ── */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                    <StatCard label="Total Years" value={stats.total} accent="#1e293b" loading={loading} />
                    <StatCard label="Active Year" value={stats.active} accent="#10b981" loading={loading} />
                    <StatCard label="Open Periods" value={stats.open} accent="#2563eb" loading={loading} />
                    <StatCard label="Locked Periods" value={stats.locked} accent="#d97706" loading={loading} />
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>{error}</Alert>}

                {/* ── FY list ── */}
                {loading ? (
                    <Stack spacing={1.5}>
                        {[...Array(2)].map((_, i) => (
                            <Paper key={i} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Skeleton variant="circular" width={20} height={20} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton width="30%" height={20} />
                                        <Skeleton width="45%" height={16} sx={{ mt: 0.5 }} />
                                    </Box>
                                    <Skeleton width={60} height={22} />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                ) : years.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8, color: "#94a3b8" }}>
                        <CalendarTodayOutlined sx={{ fontSize: 40, mb: 1.5, opacity: 0.3 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#64748b" }}>
                            No financial years configured yet.
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#cbd5e1", display: "block", mt: 0.5 }}>
                            Add your current financial year to start posting transactions.
                        </Typography>
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<AddCircleOutline />}
                            onClick={() => setAddDialogOpen(true)}
                            sx={{ mt: 3, borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}
                        >
                            Add Financial Year
                        </Button>
                    </Box>
                ) : (
                    <Stack spacing={1.5}>
                        {years.map((fy) => (
                            <FyCard
                                key={fy.id}
                                fy={fy}
                                expanded={expandedIds.has(fy.id)}
                                onToggle={() => toggleExpand(fy.id)}
                                onLock={handleLock}
                                onUnlock={handleUnlock}
                                loadingPeriodId={loadingPeriodId}
                            />
                        ))}
                    </Stack>
                )}
            </Paper>

            <AddFyDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onSave={handleAddFy}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default FinancialYearsPage;
