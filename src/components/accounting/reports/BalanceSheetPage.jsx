import React, { useEffect, useState } from "react";
import {
    Alert, Button, Chip, CircularProgress, Divider, FormControlLabel, Stack, Switch, TextField,
} from "@mui/material";
import { CheckCircleOutlined, FileDownloadOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { downloadBalanceSheetExcel, getBalanceSheet } from "../../../services/accounting/accountingReportService";
import { StatCard, fmtDate, todayStr, useFinancialYears } from "../gst/gstCommon";
import {
    FySelect, PageHeader, PageShell, StatementSkeleton, StatementTable,
    fmtStmt, fmtStmt0, fyToDate, pickDefaultFy,
} from "./statementCommon";

const BalanceSheetPage = () => {
    const { fys, loading: fyLoading } = useFinancialYears();
    const [fyId, setFyId] = useState(null);
    const [asOf, setAsOf] = useState(todayStr);
    const [showLedgers, setShowLedgers] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const load = async (d) => {
        if (!d) return;
        setError(""); setLoading(true);
        try { setData(await getBalanceSheet(d)); }
        catch (e) { setData(null); setError(e?.response?.data?.message || "Failed to load the Balance Sheet."); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (fyId !== null || fyLoading) return;
        const fy = pickDefaultFy(fys);
        if (fy) { setFyId(fy.id); setAsOf(fyToDate(fy)); load(fyToDate(fy)); }
        else { setFyId("custom"); load(todayStr()); }
    }, [fys, fyLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    const chooseFy = (fy) => {
        if (!fy) { setFyId("custom"); return; }
        setFyId(fy.id); setAsOf(fyToDate(fy)); load(fyToDate(fy));
    };

    const excel = async () => {
        setDownloading(true);
        try { await downloadBalanceSheetExcel(asOf); }
        catch { setError("Excel download failed."); }
        finally { setDownloading(false); }
    };

    // Ledger drill-down covers the financial year the date falls in (or the calendar year when none is set up).
    const ledgerFrom = (() => {
        const d = data?.asOf;
        if (!d) return "";
        const fy = fys.find((f) => f.startDate <= d && d <= f.endDate);
        return fy ? fy.startDate : `${d.slice(0, 4)}-01-01`;
    })();

    return (
        <PageShell>
            <PageHeader
                title="Balance Sheet"
                subtitle="Equity, liabilities and assets as at a date, beside the same date a year earlier"
                right={data && (
                    <Chip
                        icon={data.balanced ? <CheckCircleOutlined sx={{ fontSize: 15 }} /> : <WarningAmberOutlined sx={{ fontSize: 15 }} />}
                        label={data.balanced ? "Balanced" : "Out of Balance"}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.75rem",
                            bgcolor: data.balanced ? "#f0fdf4" : "#fef2f2",
                            color: data.balanced ? "#16a34a" : "#dc2626",
                            border: `1px solid ${data.balanced ? "#bbf7d0" : "#fecaca"}` }} />
                )} />

            <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 3, flexWrap: "wrap", rowGap: 2 }}>
                <FySelect fys={fys} value={fyId} onChange={chooseFy} />
                <TextField label="As at" type="date" size="small" value={asOf} InputLabelProps={{ shrink: true }}
                    onChange={(e) => { setAsOf(e.target.value); setFyId("custom"); }} sx={{ width: 170 }} />
                <Button variant="contained" disableElevation onClick={() => load(asOf)} disabled={loading || !asOf}
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

            {data && !data.balanced && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 1.5 }}>
                    Assets and equity plus liabilities differ by {fmtStmt(data.difference)} as at {fmtDate(data.asOf)}
                    {Number(data.previousDifference) !== 0 && <> (and by {fmtStmt(data.previousDifference)} as at {fmtDate(data.previousAsOf)})</>}.
                    The statement itself adds up correctly. A difference means the books don't balance: check the
                    Trial Balance, usually for an opening balance typed onto a ledger without the other side.
                </Alert>
            )}

            {(data || loading) && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                    <StatCard label="Total Assets" value={fmtStmt0(data?.totalAssets)} accent="#2563eb" loading={loading} />
                    <StatCard label="Equity & Liabilities" value={fmtStmt0(data?.totalEquityAndLiabilities)} accent="#7c3aed" loading={loading} />
                    <StatCard label="Profit not yet closed" value={fmtStmt0(data?.unclosedProfit)} accent="#10b981" loading={loading} />
                    <StatCard label="Difference" value={fmtStmt0(data?.difference)}
                        accent={data?.balanced ? "#10b981" : "#f59e0b"} loading={loading} />
                </Stack>
            )}

            {loading && !data && <StatementSkeleton />}

            {data && (
                <StatementTable
                    sides={[
                        { key: "EQUITY", title: "Equity", line: data.equity },
                        { key: "LIABILITIES", title: "Liabilities", line: data.liabilities },
                        { key: "ASSETS", title: "Assets", line: data.assets },
                    ]}
                    totals={[
                        { label: "Total Equity & Liabilities", amount: data.totalEquityAndLiabilities, previousAmount: data.previousTotalEquityAndLiabilities },
                        { label: "Total Assets", amount: data.totalAssets, previousAmount: data.previousTotalAssets },
                    ]}
                    curLabel={`As at ${fmtDate(data.asOf)}`}
                    prevLabel={`As at ${fmtDate(data.previousAsOf)}`}
                    showLedgers={showLedgers}
                    ledgerFrom={ledgerFrom}
                    ledgerTo={data.asOf} />
            )}
        </PageShell>
    );
};

export default BalanceSheetPage;
