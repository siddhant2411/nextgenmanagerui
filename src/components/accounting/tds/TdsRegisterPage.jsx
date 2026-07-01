import React, { useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, Paper, Stack, Table, TableBody,
    TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { DownloadOutlined } from "@mui/icons-material";
import { COL_HEAD, COL_NUM, CELL, CELL_NUM, CELL_MONO, StatCard, fmtAmt, fmtDate } from "../gst/gstCommon";
import { FyQuarterSelector } from "./tdsCommon";
import { getTdsRegister, download26Q } from "../../../services/accounting/tdsService";

export default function TdsRegisterPage() {
    const [period, setPeriod] = useState(null);
    const [rows, setRows] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const load = async (p = period) => {
        if (!p?.fy) return;
        setError(""); setRows(null); setLoading(true);
        try {
            setRows(await getTdsRegister(p.fy, p.quarter) || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load TDS register.");
        } finally {
            setLoading(false);
        }
    };

    const onDownload = async () => {
        if (!period?.fy) return;
        setDownloading(true);
        try { await download26Q(period.fy, period.quarter); }
        catch (e) { setError(e?.response?.data?.message || "Download failed."); }
        finally { setDownloading(false); }
    };

    const totalTds = (rows || []).reduce((s, r) => s + Number(r.tdsAmount || 0), 0);
    const totalPaid = (rows || []).reduce((s, r) => s + Number(r.taxableAmount || 0), 0);
    const deposited = (rows || []).filter((r) => r.status === "DEPOSITED").length;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>TDS Register</Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>Deductee-wise TDS for the quarter — the source for the Form 26Q return.</Typography>
                </Box>
                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-end" }} sx={{ mb: 3 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" useFlexGap flexWrap="wrap">
                        <FyQuarterSelector value={period} onChange={setPeriod} />
                        <Button variant="contained" disableElevation onClick={() => load()} disabled={loading || !period}
                            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#0ea371" }, height: 40 }}>
                            {loading ? "Loading…" : "Load"}
                        </Button>
                    </Stack>
                    {rows && (
                        <Button variant="outlined" onClick={onDownload} disabled={downloading || !rows.length}
                            startIcon={downloading ? <CircularProgress size={14} /> : <DownloadOutlined />}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>
                            26Q Excel
                        </Button>
                    )}
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {rows && (
                    <>
                        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                            <StatCard label="Deductions" value={rows.length} accent="#10b981" />
                            <StatCard label="Total Paid" value={fmtAmt(totalPaid)} accent="#6366f1" />
                            <StatCard label="Total TDS" value={fmtAmt(totalTds)} accent="#0f766e" />
                            <StatCard label="Deposited" value={`${deposited} / ${rows.length}`} accent="#f59e0b" />
                        </Stack>

                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={COL_HEAD}>Deductee</TableCell>
                                    <TableCell sx={COL_HEAD}>PAN</TableCell>
                                    <TableCell sx={COL_HEAD}>Section</TableCell>
                                    <TableCell sx={COL_HEAD}>Date</TableCell>
                                    <TableCell sx={COL_NUM}>Amount Paid</TableCell>
                                    <TableCell sx={COL_NUM}>TDS</TableCell>
                                    <TableCell sx={COL_NUM}>Rate %</TableCell>
                                    <TableCell sx={COL_HEAD}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell sx={CELL}>{r.deducteeName || "—"}</TableCell>
                                        <TableCell sx={CELL_MONO}>{r.deducteePan || "—"}</TableCell>
                                        <TableCell sx={{ ...CELL, fontWeight: 600 }}>{r.section}</TableCell>
                                        <TableCell sx={CELL}>{fmtDate(r.deductionDate)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableAmount)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(r.tdsAmount)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{r.rate}</TableCell>
                                        <TableCell sx={CELL}>
                                            <Chip label={r.status} size="small"
                                                sx={{ fontSize: "0.65rem", fontWeight: 700, height: 18, borderRadius: 1,
                                                    bgcolor: r.status === "DEPOSITED" ? "#dcfce7" : "#fef3c7",
                                                    color: r.status === "DEPOSITED" ? "#166534" : "#92400e" }} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!rows.length && (
                                    <TableRow><TableCell colSpan={8} sx={{ ...CELL, color: "#94a3b8", textAlign: "center", py: 3 }}>No TDS deducted in this quarter.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </>
                )}
            </Paper>
        </Box>
    );
}
