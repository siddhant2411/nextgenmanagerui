import React, { useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Divider, Paper, Skeleton, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { FileDownloadOutlined, CheckCircleOutline, WarningAmberOutlined } from "@mui/icons-material";
import {
    getStockGlReconciliation, downloadStockGlReconciliationExcel,
} from "../../../services/accounting/accountingReportService";

const todayStr = () => new Date().toISOString().split("T")[0];

const fmtAmt = (n) =>
    n == null ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);

const fmtStat = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5, borderBottom: "1px solid #f1f5f9" };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };
const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };

const StockGlReconciliationPage = () => {
    const [asOf, setAsOf] = useState(todayStr);
    const [from, setFrom] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const run = async () => {
        setError("");
        setData(null);
        setLoading(true);
        try {
            setData(await getStockGlReconciliation(asOf, from || undefined));
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load stock-GL reconciliation.");
        } finally {
            setLoading(false);
        }
    };

    const exportExcel = async () => {
        setDownloading(true);
        try {
            await downloadStockGlReconciliationExcel(asOf, from || undefined);
        } catch {
            setError("Failed to download Excel.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            Stock vs GL Reconciliation
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            Perpetual inventory — each stock GL account against its independent inventory-ledger valuation
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* Filters */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                    <TextField label="Cutover (from)" type="date" size="small" value={from}
                        onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 200 }}
                        helperText="Optional — your go-live date; excludes pre-migration history" />
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

                {loading && <Box>{[...Array(4)].map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}</Box>}

                {data && (
                    <>
                        {/* Tie banner */}
                        <Alert
                            severity={data.tiesOut ? "success" : "warning"}
                            icon={data.tiesOut ? <CheckCircleOutline /> : <WarningAmberOutlined />}
                            sx={{ mb: 3, borderRadius: 1.5, fontWeight: 600 }}
                        >
                            {data.tiesOut
                                ? "Inventory ties to the General Ledger — every stock account matches its ledger valuation."
                                : "Variance found — a stock movement may not have posted to the GL. Review the highlighted rows."}
                        </Alert>

                        <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell sx={COL_HEAD}>Code</TableCell>
                                        <TableCell sx={COL_HEAD}>Account</TableCell>
                                        <TableCell sx={COL_NUM}>Stock Value (Ledger)</TableCell>
                                        <TableCell sx={COL_NUM}>GL Balance</TableCell>
                                        <TableCell sx={COL_NUM}>Variance</TableCell>
                                        <TableCell sx={{ ...COL_HEAD, textAlign: "center" }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.rows.map((r) => (
                                        <TableRow key={r.code} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                            <TableCell sx={{ ...CELL, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#64748b" }}>{r.code}</TableCell>
                                            <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{r.name}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.stockValue)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.glBalance)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: r.tiesOut ? 400 : 700, color: r.tiesOut ? "#94a3b8" : "#dc2626" }}>{fmtAmt(r.variance)}</TableCell>
                                            <TableCell sx={{ ...CELL, textAlign: "center" }}>
                                                {r.tiesOut
                                                    ? <CheckCircleOutline sx={{ fontSize: 18, color: "#10b981" }} />
                                                    : <WarningAmberOutlined sx={{ fontSize: 18, color: "#f59e0b" }} />}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* GR/IR clearing */}
                        <Paper elevation={0} sx={{ mt: 3, p: "12px 16px", borderRadius: 1.5, border: "1px solid #e2e8f0", borderLeft: "3px solid #6366f1", bgcolor: "#fff" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>GR/IR Clearing</Typography>
                                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>Goods received but not yet invoiced (open three-way match)</Typography>
                                </Box>
                                <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>
                                    {fmtStat(data.grIrBalance)}
                                </Typography>
                            </Stack>
                        </Paper>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default StockGlReconciliationPage;
