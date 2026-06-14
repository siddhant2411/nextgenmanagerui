import React, { useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Divider,
    Paper, Skeleton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { CheckCircleOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { getTrialBalance } from "../../../services/accounting/accountingReportService";

const todayStr = () => new Date().toISOString().split("T")[0];

const fmtAmt = (n) =>
    n == null || n === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

const fmtDate = (s) =>
    !s ? "" : new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const NATURE_META = {
    ASSET:     { label: "Assets",      color: "#2563eb", bg: "#eff6ff", order: 0 },
    LIABILITY: { label: "Liabilities", color: "#dc2626", bg: "#fef2f2", order: 1 },
    EQUITY:    { label: "Equity",      color: "#7c3aed", bg: "#f5f3ff", order: 2 },
    INCOME:    { label: "Income",      color: "#16a34a", bg: "#f0fdf4", order: 3 },
    EXPENSE:   { label: "Expenses",    color: "#ea580c", bg: "#fff7ed", order: 4 },
};

const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5, borderBottom: "1px solid #f1f5f9" };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };
const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };
const CELL_ZERO = { ...CELL_NUM, color: "#cbd5e1" };

const AmtCell = ({ value, sx }) => (
    <TableCell sx={value ? CELL_NUM : { ...CELL_ZERO, ...sx }}>{fmtAmt(value)}</TableCell>
);

const StatCard = ({ label, value, accent, loading }) => (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 160, p: "11px 14px", borderRadius: 1.5, border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>{label}</Typography>
        {loading ? <Skeleton width="60%" height={32} /> : (
            <Typography sx={{ fontSize: "1.375rem", fontWeight: 600, color: "#1e293b", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
        )}
    </Paper>
);

const fmtStat = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TrialBalancePage = () => {
    const [asOf, setAsOf] = useState(todayStr);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = async () => {
        setError("");
        setData(null);
        setLoading(true);
        try {
            setData(await getTrialBalance(asOf));
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load trial balance.");
        } finally {
            setLoading(false);
        }
    };

    // Group lines by nature, sorted by NATURE_META.order
    const grouped = data ? Object.entries(
        data.lines.reduce((acc, l) => {
            const key = l.nature || "ASSET";
            (acc[key] = acc[key] || []).push(l);
            return acc;
        }, {})
    ).sort(([a], [b]) => (NATURE_META[a]?.order ?? 9) - (NATURE_META[b]?.order ?? 9)) : [];

    const subtotal = (lines) => lines.reduce(
        (s, l) => ({ dr: s.dr + (l.closingDr || 0), cr: s.cr + (l.closingCr || 0) }),
        { dr: 0, cr: 0 }
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            Trial Balance
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            Closing Dr and Cr balances per ledger account — must net to zero
                        </Typography>
                    </Box>
                    {data && (
                        <Chip
                            icon={data.balanced ? <CheckCircleOutlined sx={{ fontSize: 15 }} /> : <WarningAmberOutlined sx={{ fontSize: 15 }} />}
                            label={data.balanced ? "Balanced" : "Out of Balance"}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: "0.75rem",
                                bgcolor: data.balanced ? "#f0fdf4" : "#fef2f2",
                                color:  data.balanced ? "#16a34a" : "#dc2626",
                                border: `1px solid ${data.balanced ? "#bbf7d0" : "#fecaca"}`,
                            }}
                        />
                    )}
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
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {/* Stats */}
                {(data || loading) && (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                        <StatCard label="Total Debit"  value={fmtStat(data?.totalDr)}  accent="#2563eb" loading={loading} />
                        <StatCard label="Total Credit" value={fmtStat(data?.totalCr)}  accent="#dc2626" loading={loading} />
                        <StatCard label="Difference"
                            value={data ? fmtStat(Math.abs((data.totalDr || 0) - (data.totalCr || 0))) : "—"}
                            accent={data?.balanced ? "#10b981" : "#f59e0b"} loading={loading} />
                        <StatCard label="As of Date"   value={data ? fmtDate(data.asOf) : "—"} accent="#64748b" loading={loading} />
                    </Stack>
                )}

                {/* Table */}
                {loading && (
                    <Box>
                        {[...Array(8)].map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}
                    </Box>
                )}

                {data && data.lines.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No posted transactions found as of this date.</Typography>
                    </Box>
                )}

                {data && data.lines.length > 0 && (
                    <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={COL_HEAD}>Code</TableCell>
                                    <TableCell sx={COL_HEAD}>Account Name</TableCell>
                                    <TableCell sx={COL_HEAD}>Group</TableCell>
                                    <TableCell sx={COL_NUM}>Opening Dr</TableCell>
                                    <TableCell sx={COL_NUM}>Opening Cr</TableCell>
                                    <TableCell sx={COL_NUM}>Movement Dr</TableCell>
                                    <TableCell sx={COL_NUM}>Movement Cr</TableCell>
                                    <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Closing Dr</TableCell>
                                    <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Closing Cr</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {grouped.map(([nature, lines]) => {
                                    const meta = NATURE_META[nature] || { label: nature, color: "#64748b", bg: "#f8fafc" };
                                    const sub = subtotal(lines);
                                    return (
                                        <React.Fragment key={nature}>
                                            {/* Nature section header */}
                                            <TableRow>
                                                <TableCell colSpan={9}
                                                    sx={{ bgcolor: meta.bg, py: 0.75, px: 1.5, borderBottom: `1px solid #e2e8f0` }}>
                                                    <Typography sx={{ fontSize: "0.6875rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: 0.7 }}>
                                                        {meta.label}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>

                                            {lines.map((l) => (
                                                <TableRow key={l.accountId} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                                    <TableCell sx={{ ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#64748b" }}>{l.accountCode}</TableCell>
                                                    <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{l.accountName}</TableCell>
                                                    <TableCell sx={{ ...CELL, color: "#64748b" }}>{l.groupName}</TableCell>
                                                    <AmtCell value={l.openingDr} />
                                                    <AmtCell value={l.openingCr} />
                                                    <AmtCell value={l.movementDr} />
                                                    <AmtCell value={l.movementCr} />
                                                    <AmtCell value={l.closingDr} />
                                                    <AmtCell value={l.closingCr} />
                                                </TableRow>
                                            ))}

                                            {/* Nature subtotal */}
                                            <TableRow sx={{ bgcolor: "#fafafa" }}>
                                                <TableCell colSpan={7} sx={{ ...CELL, fontWeight: 700, color: meta.color, fontSize: "0.75rem" }}>
                                                    {meta.label} Subtotal
                                                </TableCell>
                                                <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(sub.dr) || "—"}</TableCell>
                                                <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(sub.cr) || "—"}</TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Grand total */}
                                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                    <TableCell colSpan={7} sx={{ ...CELL, fontWeight: 800, fontSize: "0.8125rem", color: "#0f172a", py: 1.5 }}>
                                        Grand Total
                                    </TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, fontSize: "0.875rem", color: data.balanced ? "#16a34a" : "#dc2626", py: 1.5 }}>
                                        {fmtAmt(data.totalDr)}
                                    </TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, fontSize: "0.875rem", color: data.balanced ? "#16a34a" : "#dc2626", py: 1.5 }}>
                                        {fmtAmt(data.totalCr)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default TrialBalancePage;
