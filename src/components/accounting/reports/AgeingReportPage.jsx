import React, { useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Divider, Paper, Skeleton, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import {
    getDebtorsAgeing, getCreditorsAgeing,
    downloadDebtorsAgeingExcel, downloadCreditorsAgeingExcel,
} from "../../../services/accounting/accountingReportService";

const todayStr = () => new Date().toISOString().split("T")[0];

const fmtAmt = (n) =>
    n == null || n === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

const fmtStat = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5, borderBottom: "1px solid #f1f5f9" };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };
const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };

const VARIANTS = {
    DEBTORS: {
        title: "Debtors Ageing",
        subtitle: "Outstanding receivables per customer, bucketed by age (FIFO open-item)",
        partyHeader: "Customer",
        accent: "#2563eb",
        fetch: getDebtorsAgeing,
        download: downloadDebtorsAgeingExcel,
    },
    CREDITORS: {
        title: "Creditors Ageing",
        subtitle: "Outstanding payables per vendor, bucketed by age (FIFO open-item)",
        partyHeader: "Vendor",
        accent: "#dc2626",
        fetch: getCreditorsAgeing,
        download: downloadCreditorsAgeingExcel,
    },
};

const StatCard = ({ label, value, accent, loading }) => (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: "11px 14px", borderRadius: 1.5, border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>{label}</Typography>
        {loading ? <Skeleton width="60%" height={28} /> : (
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
        )}
    </Paper>
);

const AgeingReportPage = ({ variant = "DEBTORS" }) => {
    const cfg = VARIANTS[variant] || VARIANTS.DEBTORS;
    const [asOf, setAsOf] = useState(todayStr);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const run = async () => {
        setError("");
        setData(null);
        setLoading(true);
        try {
            setData(await cfg.fetch(asOf));
        } catch (e) {
            setError(e?.response?.data?.message || `Failed to load ${cfg.title.toLowerCase()}.`);
        } finally {
            setLoading(false);
        }
    };

    const exportExcel = async () => {
        setDownloading(true);
        try {
            await cfg.download(asOf);
        } catch {
            setError("Failed to download Excel.");
        } finally {
            setDownloading(false);
        }
    };

    const t = data?.totals;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            {cfg.title}
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>{cfg.subtitle}</Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* Filters */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                    <TextField label="As of Date" type="date" size="small" value={asOf}
                        onChange={(e) => setAsOf(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }} />
                    <Button variant="contained" disableElevation onClick={run} disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, height: 40 }}>
                        {loading ? "Loading…" : "Run Report"}
                    </Button>
                    <Button variant="outlined" onClick={exportExcel} disabled={downloading || !data}
                        startIcon={downloading ? <CircularProgress size={14} /> : <FileDownloadOutlined sx={{ fontSize: 18 }} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>
                        Export Excel
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {/* Stats */}
                {(data || loading) && (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                        <StatCard label="Total Outstanding" value={fmtStat(t?.total)} accent={cfg.accent} loading={loading} />
                        <StatCard label="Current (0-30)" value={fmtStat(t?.current)} accent="#10b981" loading={loading} />
                        <StatCard label="31-60 days" value={fmtStat(t?.days31_60)} accent="#f59e0b" loading={loading} />
                        <StatCard label="61-90 days" value={fmtStat(t?.days61_90)} accent="#ea580c" loading={loading} />
                        <StatCard label="90+ days" value={fmtStat(t?.days90Plus)} accent="#dc2626" loading={loading} />
                    </Stack>
                )}

                {loading && <Box>{[...Array(6)].map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)}</Box>}

                {data && data.rows.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No outstanding balances as of this date.</Typography>
                    </Box>
                )}

                {data && data.rows.length > 0 && (
                    <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={COL_HEAD}>Code</TableCell>
                                    <TableCell sx={COL_HEAD}>{cfg.partyHeader}</TableCell>
                                    <TableCell sx={COL_NUM}>Current (0-30)</TableCell>
                                    <TableCell sx={COL_NUM}>31-60</TableCell>
                                    <TableCell sx={COL_NUM}>61-90</TableCell>
                                    <TableCell sx={COL_NUM}>90+</TableCell>
                                    <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.rows.map((r) => (
                                    <TableRow key={r.ledgerId} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                        <TableCell sx={{ ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#64748b" }}>{r.code}</TableCell>
                                        <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{r.partyName}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(r.current)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(r.days31_60)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(r.days61_90)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, color: r.days90Plus ? "#dc2626" : "#cbd5e1", fontWeight: r.days90Plus ? 700 : 400 }}>{fmtAmt(r.days90Plus)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(r.total)}</TableCell>
                                    </TableRow>
                                ))}

                                {/* Grand total */}
                                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                    <TableCell colSpan={2} sx={{ ...CELL, fontWeight: 800, fontSize: "0.8125rem", color: "#0f172a", py: 1.5 }}>Grand Total</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.current)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.days31_60)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.days61_90)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5, color: "#dc2626" }}>{fmtAmt(t?.days90Plus)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, fontSize: "0.875rem", py: 1.5, color: cfg.accent }}>{fmtAmt(t?.total)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default AgeingReportPage;
