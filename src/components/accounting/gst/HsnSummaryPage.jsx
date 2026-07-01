import React from "react";
import {
    Box, Button, CircularProgress, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import { getHsnSummary, downloadHsnSummaryExcel } from "../../../services/accounting/gstService";
import {
    GstReportShell, StatCard, EmptySection,
    COL_HEAD, COL_NUM, CELL, CELL_NUM, CELL_MONO,
    fmtAmt, fmtMoney0, fmtRate,
} from "./gstCommon";

const HsnSummaryPage = () => (
    <GstReportShell
        title="HSN / SAC Summary"
        subtitle="GSTR-1 Table 12 — outward supplies grouped by HSN/SAC and rate, net of credit notes"
        accent="#0891b2"
        load={(p) => getHsnSummary(p.startDate, p.endDate)}
        actions={({ period, data, busy }) => (
            <Button
                variant="outlined" disabled={busy || !data || !data.rows?.length}
                onClick={() => downloadHsnSummaryExcel(period.startDate, period.endDate)}
                startIcon={busy ? <CircularProgress size={14} /> : <FileDownloadOutlined sx={{ fontSize: 18 }} />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}
            >
                Export Excel
            </Button>
        )}
    >
        {(data) => {
            const t = data.totals;
            return (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }} useFlexGap>
                        <StatCard label="HSN/SAC Lines" value={data.rows.length} accent="#0891b2" />
                        <StatCard label="Taxable Value" value={fmtMoney0(t?.taxableValue)} accent="#10b981" />
                        <StatCard label="Total Tax" value={fmtMoney0((Number(t?.cgst || 0) + Number(t?.sgst || 0) + Number(t?.igst || 0) + Number(t?.cess || 0)))} accent="#6366f1" />
                        <StatCard label="Total Value" value={fmtMoney0(t?.totalValue)} accent="#0891b2" />
                    </Stack>

                    {data.rows.length === 0 ? (
                        <EmptySection text="No outward supplies in this period." />
                    ) : (
                        <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto" }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell sx={COL_HEAD}>HSN/SAC</TableCell>
                                        <TableCell sx={COL_HEAD}>Description</TableCell>
                                        <TableCell sx={COL_HEAD}>UQC</TableCell>
                                        <TableCell sx={COL_NUM}>Qty</TableCell>
                                        <TableCell sx={COL_NUM}>Rate</TableCell>
                                        <TableCell sx={COL_NUM}>Taxable</TableCell>
                                        <TableCell sx={COL_NUM}>CGST</TableCell>
                                        <TableCell sx={COL_NUM}>SGST</TableCell>
                                        <TableCell sx={COL_NUM}>IGST</TableCell>
                                        <TableCell sx={COL_NUM}>Cess</TableCell>
                                        <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.rows.map((r, i) => (
                                        <TableRow key={`${r.hsnCode}-${r.rate}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                            <TableCell sx={{ ...CELL_MONO, color: "#0f172a", fontWeight: 600 }}>{r.hsnCode}</TableCell>
                                            <TableCell sx={{ ...CELL, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description || "—"}</TableCell>
                                            <TableCell sx={CELL}>{r.uqc || "—"}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.quantity)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtRate(r.rate)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableValue)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.sgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.igst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cess)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(r.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                        <TableCell colSpan={5} sx={{ ...CELL, fontWeight: 800, color: "#0f172a", py: 1.5 }}>Totals</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.taxableValue)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.cgst)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.sgst)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.igst)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.cess)}</TableCell>
                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5, color: "#0891b2" }}>{fmtAmt(t?.totalValue)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            );
        }}
    </GstReportShell>
);

export default HsnSummaryPage;
