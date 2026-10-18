import React, { useEffect, useState } from "react";
import {
    Alert, Button, Chip, CircularProgress, Divider, FormControlLabel, Stack, Switch, TextField,
} from "@mui/material";
import { FileDownloadOutlined, TrendingDownOutlined, TrendingUpOutlined } from "@mui/icons-material";
import { downloadProfitLossExcel, getProfitLoss } from "../../../services/accounting/accountingReportService";
import { StatCard, useFinancialYears } from "../gst/gstCommon";
import {
    FySelect, PageHeader, PageShell, StatementSkeleton, StatementTable,
    fmtStmt0, fyToDate, pickDefaultFy, rangeLabel,
} from "./statementCommon";

const ProfitLossPage = () => {
    const { fys, loading: fyLoading } = useFinancialYears();
    const [fyId, setFyId] = useState(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [showLedgers, setShowLedgers] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const load = async (f, t) => {
        if (!f || !t) return;
        setError(""); setLoading(true);
        try { setData(await getProfitLoss(f, t)); }
        catch (e) { setData(null); setError(e?.response?.data?.message || "Failed to load the Profit & Loss statement."); }
        finally { setLoading(false); }
    };

    // Open on the running financial year.
    useEffect(() => {
        if (fyId !== null || !fys.length) return;
        const fy = pickDefaultFy(fys);
        if (!fy) return;
        setFyId(fy.id); setFrom(fy.startDate); setTo(fyToDate(fy));
        load(fy.startDate, fyToDate(fy));
    }, [fys]); // eslint-disable-line react-hooks/exhaustive-deps

    const chooseFy = (fy) => {
        if (!fy) { setFyId("custom"); return; }
        setFyId(fy.id); setFrom(fy.startDate); setTo(fyToDate(fy));
        load(fy.startDate, fyToDate(fy));
    };

    const excel = async () => {
        setDownloading(true);
        try { await downloadProfitLossExcel(from, to); }
        catch { setError("Excel download failed."); }
        finally { setDownloading(false); }
    };

    const profit = data ? Number(data.netProfit) : 0;
    const curLabel = data ? rangeLabel(data.from, data.to) : "Current";
    const prevLabel = data ? rangeLabel(data.previousFrom, data.previousTo) : "Previous";

    return (
        <PageShell>
            <PageHeader
                title="Profit & Loss"
                subtitle="Income and expenses for the period, laid out by the chart of accounts, beside the same period a year earlier"
                right={data && (
                    <Chip
                        icon={profit >= 0 ? <TrendingUpOutlined sx={{ fontSize: 15 }} /> : <TrendingDownOutlined sx={{ fontSize: 15 }} />}
                        label={profit >= 0 ? "Profit" : "Loss"}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.75rem",
                            bgcolor: profit >= 0 ? "#f0fdf4" : "#fef2f2",
                            color: profit >= 0 ? "#16a34a" : "#dc2626",
                            border: `1px solid ${profit >= 0 ? "#bbf7d0" : "#fecaca"}` }} />
                )} />

            <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 3, flexWrap: "wrap", rowGap: 2 }}>
                <FySelect fys={fys} value={fyId} onChange={chooseFy} />
                <TextField label="From" type="date" size="small" value={from} InputLabelProps={{ shrink: true }}
                    onChange={(e) => { setFrom(e.target.value); setFyId("custom"); }} sx={{ width: 170 }} />
                <TextField label="To" type="date" size="small" value={to} InputLabelProps={{ shrink: true }}
                    onChange={(e) => { setTo(e.target.value); setFyId("custom"); }} sx={{ width: 170 }} />
                <Button variant="contained" disableElevation onClick={() => load(from, to)} disabled={loading || !from || !to}
                    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, height: 40 }}>
                    {loading ? "Loading…" : "Run Report"}
                </Button>
                <FormControlLabel
                    control={<Switch size="small" checked={showLedgers} onChange={(e) => setShowLedgers(e.target.checked)} />}
                    label="Show ledgers" sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.8125rem", color: "#475569" } }} />
                <Button variant="outlined" onClick={excel} disabled={!data || downloading}
                    startIcon={downloading ? <CircularProgress size={14} /> : <FileDownloadOutlined />}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, height: 40, ml: { sm: "auto !important" } }}>
                    Excel
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}
            {!fyLoading && !fys.length && !loading && !data && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }}>
                    No financial year is set up yet. Pick dates above, or create one under Setup → Financial Years.
                </Alert>
            )}

            {(data || loading) && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                    <StatCard label="Total Income" value={fmtStmt0(data?.totalIncome)} accent="#16a34a" loading={loading} />
                    <StatCard label="Total Expenses" value={fmtStmt0(data?.totalExpenses)} accent="#ea580c" loading={loading} />
                    <StatCard label={profit >= 0 ? "Net Profit" : "Net Loss"} value={fmtStmt0(data?.netProfit)}
                        accent={profit >= 0 ? "#10b981" : "#dc2626"} loading={loading} />
                    <StatCard label="Previous Period" value={fmtStmt0(data?.previousNetProfit)} accent="#64748b" loading={loading} />
                </Stack>
            )}

            {loading && !data && <StatementSkeleton />}

            {data && (
                <StatementTable
                    sides={[
                        { key: "INCOME", title: "Income", line: data.income },
                        { key: "EXPENSES", title: "Expenses", line: data.expenses },
                    ]}
                    totals={[{
                        label: profit >= 0 ? "Net Profit" : "Net Loss",
                        amount: data.netProfit,
                        previousAmount: data.previousNetProfit,
                        tone: profit >= 0 ? "#16a34a" : "#dc2626",
                    }]}
                    curLabel={curLabel}
                    prevLabel={prevLabel}
                    showLedgers={showLedgers}
                    ledgerFrom={data.from}
                    ledgerTo={data.to} />
            )}
        </PageShell>
    );
};

export default ProfitLossPage;
