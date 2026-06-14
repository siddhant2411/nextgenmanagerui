import React, { useEffect, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress,
    Divider, Paper, Skeleton, Stack,
    Table, TableBody, TableCell, TableHead, TableRow,
    TextField, Typography,
} from "@mui/material";
import { getLedgerStatement } from "../../../services/accounting/accountingReportService";
import { listLedgers } from "../../../services/accounting/accountingCoaService";

const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const todayStr    = () => new Date().toISOString().split("T")[0];

const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtAmt = (n) =>
    n == null || n === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Math.abs(n));

const TYPE_META = {
    JOURNAL:    { label: "JNL", color: "#1d4ed8" },
    RECEIPT:    { label: "REC", color: "#059669" },
    PAYMENT:    { label: "PAY", color: "#b45309" },
    CONTRA:     { label: "CTR", color: "#7c3aed" },
    SALES:      { label: "SAL", color: "#0891b2" },
    PURCHASE:   { label: "PUR", color: "#be185d" },
    OPENING:    { label: "OPN", color: "#475569" },
    CLOSING:    { label: "CLO", color: "#475569" },
    CREDIT_NOTE:{ label: "CNT", color: "#9333ea" },
    DEBIT_NOTE: { label: "DNT", color: "#c2410c" },
    DEPRECIATION:{ label: "DEP", color: "#374151" },
    PAYROLL:    { label: "PYR", color: "#065f46" },
};

const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };
const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5 };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };

const BalanceCard = ({ label, amount, drCr, accent }) => (
    <Box sx={{ flex: 1, p: "12px 16px", border: `1px solid #e2e8f0`, borderLeft: `3px solid ${accent}`, borderRadius: 1.5, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>{label}</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {fmtAmt(amount) === "—" ? "₹ 0.00" : `₹ ${fmtAmt(amount)}`}
            </Typography>
            {drCr && (
                <Chip label={drCr} size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800,
                    bgcolor: drCr === "Dr" ? "#eff6ff" : "#fef2f2",
                    color:   drCr === "Dr" ? "#2563eb" : "#dc2626", border: "none" }} />
            )}
        </Stack>
    </Box>
);

const LedgerStatementPage = () => {
    const [ledgers, setLedgers] = useState([]);
    const [account, setAccount] = useState(null);
    const [from, setFrom] = useState(firstOfMonth);
    const [to,   setTo]   = useState(todayStr);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    useEffect(() => { listLedgers().then(setLedgers).catch(() => {}); }, []);

    const run = async () => {
        if (!account) { setError("Please select a ledger account."); return; }
        setError(""); setData(null); setLoading(true);
        try { setData(await getLedgerStatement(account.id, from, to)); }
        catch (e) { setError(e?.response?.data?.message || "Failed to load ledger statement."); }
        finally { setLoading(false); }
    };

    const acOpts = (opts, { inputValue }) => {
        const q = inputValue.toLowerCase();
        return opts.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 60);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        Ledger Statement
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                        Account-wise transaction history with running balance
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* Filters */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" sx={{ mb: 3, flexWrap: "wrap" }}>
                    <Autocomplete
                        size="small" options={ledgers}
                        getOptionLabel={(l) => `${l.code} — ${l.name}`}
                        value={account} onChange={(_, v) => setAccount(v)}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        filterOptions={acOpts}
                        renderOption={(props, o) => (
                            <Box component="li" {...props} key={o.id} sx={{ fontSize: "0.8125rem" }}>
                                <Box component="span" sx={{ color: "#94a3b8", fontFamily: "monospace", mr: 1, fontSize: "0.75rem" }}>{o.code}</Box>
                                {o.name}
                            </Box>
                        )}
                        renderInput={(params) => <TextField {...params} label="Ledger Account" required sx={{ width: { sm: 300 } }} />}
                        sx={{ width: { xs: "100%", sm: 300 } }}
                    />
                    <TextField label="From" type="date" size="small" value={from}
                        onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }} />
                    <TextField label="To" type="date" size="small" value={to}
                        onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }} />
                    <Button variant="contained" disableElevation onClick={run} disabled={loading || !account}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, height: 40,
                            "&:disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" } }}>
                        {loading ? "Loading…" : "Run Report"}
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {loading && [...Array(8)].map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}

                {data && (
                    <>
                        {/* Account header */}
                        <Box sx={{ mb: 2.5, p: "12px 16px", bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box>
                                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                                        {data.accountCode}
                                    </Typography>
                                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{data.accountName}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }} />
                                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                    {fmtDate(data.from)} – {fmtDate(data.to)}
                                </Typography>
                            </Stack>
                        </Box>

                        {/* Opening / Closing balance cards */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                            <BalanceCard label="Opening Balance" amount={data.openingBalance}
                                drCr={data.openingBalanceDrCr} accent="#64748b" />
                            <BalanceCard label="Closing Balance" amount={data.closingBalance}
                                drCr={data.closingBalanceDrCr}
                                accent={data.closingBalanceDrCr === "Dr" ? "#2563eb" : "#dc2626"} />
                        </Stack>

                        {data.lines?.length === 0 ? (
                            <Box sx={{ textAlign: "center", py: 6, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                                <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                                    No transactions in this period.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={COL_HEAD}>Date</TableCell>
                                            <TableCell sx={COL_HEAD}>Voucher #</TableCell>
                                            <TableCell sx={COL_HEAD}>Type</TableCell>
                                            <TableCell sx={COL_HEAD}>Narration</TableCell>
                                            <TableCell sx={COL_NUM}>Dr</TableCell>
                                            <TableCell sx={COL_NUM}>Cr</TableCell>
                                            <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.lines.map((l, i) => {
                                            const tm = TYPE_META[l.voucherType] || { label: l.voucherType?.slice(0, 3) || "?", color: "#64748b" };
                                            return (
                                                <TableRow key={i} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                                    <TableCell sx={{ ...CELL, color: "#64748b" }}>{fmtDate(l.date)}</TableCell>
                                                    <TableCell sx={{ ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                                                        {l.voucherNumber}
                                                    </TableCell>
                                                    <TableCell sx={CELL}>
                                                        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: tm.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                                                            {tm.label}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ ...CELL, color: "#64748b", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {l.narration || "—"}
                                                    </TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, color: l.drAmount ? "#2563eb" : "#cbd5e1" }}>{fmtAmt(l.drAmount)}</TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, color: l.crAmount ? "#dc2626" : "#cbd5e1" }}>{fmtAmt(l.crAmount)}</TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 700 }}>
                                                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.75}>
                                                            <span>{fmtAmt(l.runningBalance)}</span>
                                                            {l.runningBalanceDrCr && (
                                                                <Chip label={l.runningBalanceDrCr} size="small"
                                                                    sx={{ height: 16, fontSize: "0.5625rem", fontWeight: 800,
                                                                        bgcolor: l.runningBalanceDrCr === "Dr" ? "#eff6ff" : "#fef2f2",
                                                                        color:   l.runningBalanceDrCr === "Dr" ? "#2563eb" : "#dc2626",
                                                                        border: "none" }} />
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default LedgerStatementPage;
