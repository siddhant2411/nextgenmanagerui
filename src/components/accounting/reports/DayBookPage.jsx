import React, { useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse,
    Divider, IconButton, Paper, Skeleton, Stack,
    Table, TableBody, TableCell, TableHead, TableRow,
    TextField, Tooltip, Typography,
} from "@mui/material";
import { ExpandMoreOutlined, ExpandLessOutlined } from "@mui/icons-material";
import { getDayBook } from "../../../services/accounting/accountingReportService";

const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const todayStr    = () => new Date().toISOString().split("T")[0];

const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtAmt = (n) =>
    n == null || n === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

const fmtStat = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TYPE_META = {
    JOURNAL:    { label: "JNL", color: "#1d4ed8", bg: "#dbeafe" },
    RECEIPT:    { label: "REC", color: "#059669", bg: "#d1fae5" },
    PAYMENT:    { label: "PAY", color: "#b45309", bg: "#fef3c7" },
    CONTRA:     { label: "CTR", color: "#7c3aed", bg: "#ede9fe" },
    SALES:      { label: "SAL", color: "#0891b2", bg: "#cffafe" },
    PURCHASE:   { label: "PUR", color: "#be185d", bg: "#fce7f3" },
    OPENING:    { label: "OPN", color: "#475569", bg: "#f1f5f9" },
    CLOSING:    { label: "CLO", color: "#475569", bg: "#f1f5f9" },
    CREDIT_NOTE:{ label: "CNT", color: "#9333ea", bg: "#f3e8ff" },
    DEBIT_NOTE: { label: "DNT", color: "#c2410c", bg: "#ffedd5" },
    DEPRECIATION:{ label: "DEP", color: "#374151", bg: "#e5e7eb" },
    PAYROLL:    { label: "PAY", color: "#065f46", bg: "#d1fae5" },
};

const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || { label: type?.slice(0, 3), color: "#64748b", bg: "#f1f5f9" };
    return (
        <Chip label={m.label} size="small"
            sx={{ height: 20, fontSize: "0.625rem", fontWeight: 800, bgcolor: m.bg, color: m.color, border: "none", fontFamily: "'IBM Plex Mono', monospace" }} />
    );
};

const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };
const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5 };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };

const StatCard = ({ label, value, accent }) => (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: "11px 14px", borderRadius: 1.5, border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>{label}</Typography>
        <Typography sx={{ fontSize: "1.375rem", fontWeight: 600, color: "#1e293b", lineHeight: 1 }}>{value}</Typography>
    </Paper>
);

const VoucherRow = ({ v }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TableRow
                onClick={() => setOpen(!open)}
                sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f8fafc" }, bgcolor: open ? "#fafafa" : "white" }}>
                <TableCell sx={{ ...CELL, py: 1.25 }}>
                    <Tooltip title={open ? "Collapse" : "Expand lines"}>
                        <IconButton size="small" sx={{ mr: 0.5, color: "#94a3b8" }}>
                            {open ? <ExpandLessOutlined sx={{ fontSize: 16 }} /> : <ExpandMoreOutlined sx={{ fontSize: 16 }} />}
                        </IconButton>
                    </Tooltip>
                </TableCell>
                <TableCell sx={{ ...CELL, color: "#94a3b8" }}>{fmtDate(v.date)}</TableCell>
                <TableCell sx={{ ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>{v.voucherNumber}</TableCell>
                <TableCell sx={CELL}><TypeBadge type={v.voucherType} /></TableCell>
                <TableCell sx={{ ...CELL, color: "#64748b", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.narration || "—"}</TableCell>
                <TableCell sx={{ ...CELL_NUM, color: "#2563eb", fontWeight: 600 }}>{fmtAmt(v.totalDr)}</TableCell>
                <TableCell sx={{ ...CELL_NUM, color: "#dc2626", fontWeight: 600 }}>{fmtAmt(v.totalCr)}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, border: "none" }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: "#f8fafc", px: 3, py: 1.5, borderBottom: "1px solid #e2e8f0" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ ...COL_HEAD, bgcolor: "transparent", border: "none" }}>Code</TableCell>
                                        <TableCell sx={{ ...COL_HEAD, bgcolor: "transparent", border: "none" }}>Account</TableCell>
                                        <TableCell sx={{ ...COL_NUM, bgcolor: "transparent", border: "none" }}>Dr</TableCell>
                                        <TableCell sx={{ ...COL_NUM, bgcolor: "transparent", border: "none" }}>Cr</TableCell>
                                        <TableCell sx={{ ...COL_HEAD, bgcolor: "transparent", border: "none" }}>Narration</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(v.lines || []).map((l, i) => (
                                        <TableRow key={i}>
                                            <TableCell sx={{ ...CELL, border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem", color: "#94a3b8" }}>{l.accountCode}</TableCell>
                                            <TableCell sx={{ ...CELL, border: "none", fontWeight: 500 }}>{l.accountName}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, border: "none", color: l.drAmount ? "#2563eb" : "#cbd5e1" }}>{fmtAmt(l.drAmount)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, border: "none", color: l.crAmount ? "#dc2626" : "#cbd5e1" }}>{fmtAmt(l.crAmount)}</TableCell>
                                            <TableCell sx={{ ...CELL, border: "none", color: "#64748b", fontSize: "0.75rem" }}>{l.lineNarration || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const DayBookPage = () => {
    const [from, setFrom] = useState(firstOfMonth);
    const [to,   setTo]   = useState(todayStr);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const run = async () => {
        setError(""); setData(null); setLoading(true);
        try { setData(await getDayBook(from, to)); }
        catch (e) { setError(e?.response?.data?.message || "Failed to load day book."); }
        finally { setLoading(false); }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        Day Book
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                        All posted vouchers in chronological order — click a row to expand lines
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                    <TextField label="From" type="date" size="small" value={from}
                        onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }} />
                    <TextField label="To" type="date" size="small" value={to}
                        onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }} />
                    <Button variant="contained" disableElevation onClick={run} disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, height: 40 }}>
                        {loading ? "Loading…" : "Run Report"}
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {data && (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                        <StatCard label="Vouchers"     value={data.vouchers?.length ?? 0}  accent="#10b981" />
                        <StatCard label="Total Debit"  value={fmtStat(data.grandTotalDr)}  accent="#2563eb" />
                        <StatCard label="Total Credit" value={fmtStat(data.grandTotalCr)}  accent="#dc2626" />
                        <StatCard label="Period"       value={`${fmtDate(data.from)} – ${fmtDate(data.to)}`} accent="#64748b" />
                    </Stack>
                )}

                {loading && [...Array(6)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}

                {data && data.vouchers?.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No posted vouchers in this date range.</Typography>
                    </Box>
                )}

                {data && data.vouchers?.length > 0 && (
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={{ ...COL_HEAD, width: 40 }} />
                                    <TableCell sx={COL_HEAD}>Date</TableCell>
                                    <TableCell sx={COL_HEAD}>Voucher #</TableCell>
                                    <TableCell sx={COL_HEAD}>Type</TableCell>
                                    <TableCell sx={COL_HEAD}>Narration</TableCell>
                                    <TableCell sx={COL_NUM}>Dr</TableCell>
                                    <TableCell sx={COL_NUM}>Cr</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.vouchers.map((v) => <VoucherRow key={v.voucherId} v={v} />)}
                                {/* Grand total */}
                                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                    <TableCell colSpan={5} sx={{ ...CELL, fontWeight: 800, fontSize: "0.8125rem", color: "#0f172a", py: 1.5 }}>Grand Total</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, color: "#2563eb", fontSize: "0.875rem", py: 1.5 }}>{fmtAmt(data.grandTotalDr)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, color: "#dc2626", fontSize: "0.875rem", py: 1.5 }}>{fmtAmt(data.grandTotalCr)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default DayBookPage;
