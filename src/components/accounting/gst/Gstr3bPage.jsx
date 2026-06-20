import React from "react";
import {
    Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import {
    FileDownloadOutlined, DataObjectOutlined, CheckCircleOutline, ReportProblemOutlined,
} from "@mui/icons-material";
import {
    getGstr3b, downloadGstr3bExcel, downloadGstr3bJson, fileGstr3b,
} from "../../../services/accounting/gstService";
import {
    GstReportShell, FileReturnButton,
    COL_HEAD, COL_NUM, CELL, CELL_NUM,
    fmtAmt, fmtMoney0,
} from "./gstCommon";

const totalTax = (a) => a == null ? 0 : Number(a.igst || 0) + Number(a.cgst || 0) + Number(a.sgst || 0) + Number(a.cess || 0);

const SECTIONS = [
    { key: "outwardTaxable", code: "3.1(a)", label: "Outward taxable supplies", accent: "#2563eb" },
    { key: "inwardRcm", code: "3.1(d)", label: "Inward supplies (reverse charge)", accent: "#f59e0b" },
    { key: "itcAvailable", code: "4(A)", label: "ITC available (eligible)", accent: "#16a34a" },
    { key: "itcIneligible", code: "4(D)", label: "ITC ineligible / blocked", accent: "#dc2626" },
];

const ReconBanner = ({ recon }) => {
    if (!recon) return null;
    const ok = recon.tiesOut;
    return (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: `1px solid ${ok ? "#bbf7d0" : "#fde68a"}`, bgcolor: ok ? "#f0fdf4" : "#fffbeb" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                {ok ? <CheckCircleOutline sx={{ fontSize: 20, color: "#16a34a" }} /> : <ReportProblemOutlined sx={{ fontSize: 20, color: "#d97706" }} />}
                <Typography sx={{ fontSize: "0.9375rem", fontWeight: 800, color: ok ? "#15803d" : "#b45309" }}>
                    {ok ? "Return ties to the General Ledger" : "Return does not tie to the General Ledger"}
                </Typography>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ flexWrap: "wrap" }} useFlexGap>
                <ReconPair label="Output Tax" ledger={recon.ledgerOutput} ret={recon.returnOutput} variance={recon.outputVariance} />
                <ReconPair label="Input Tax Credit" ledger={recon.ledgerItc} ret={recon.returnItc} variance={recon.itcVariance} />
            </Stack>
        </Paper>
    );
};

const ReconPair = ({ label, ledger, ret, variance }) => {
    const off = Math.abs(Number(variance || 0)) > 1;
    return (
        <Box sx={{ minWidth: 280 }}>
            <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>{label}</Typography>
            <Stack direction="row" spacing={3}>
                <Box><Typography sx={LBL}>Ledger</Typography><Typography sx={NUM}>{fmtAmt(ledger)}</Typography></Box>
                <Box><Typography sx={LBL}>Return</Typography><Typography sx={NUM}>{fmtAmt(ret)}</Typography></Box>
                <Box><Typography sx={LBL}>Variance</Typography><Typography sx={{ ...NUM, color: off ? "#dc2626" : "#16a34a" }}>{fmtAmt(variance)}</Typography></Box>
            </Stack>
        </Box>
    );
};

const LBL = { fontSize: "0.625rem", color: "#94a3b8", fontWeight: 600 };
const NUM = { fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" };

const Gstr3bPage = () => (
    <GstReportShell
        title="GSTR-3B"
        subtitle="Summary return reconciled to the General Ledger — preview, export, and file"
        accent="#7c3aed"
        load={(p) => getGstr3b(p.startDate, p.endDate)}
        actions={({ period, data, busy }) => (
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" disabled={busy || !data} onClick={() => downloadGstr3bExcel(period.startDate, period.endDate)}
                    startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>Excel</Button>
                <Button variant="outlined" disabled={busy || !data} onClick={() => downloadGstr3bJson(period.startDate, period.endDate)}
                    startIcon={<DataObjectOutlined sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>JSON</Button>
                <FileReturnButton
                    label="File GSTR-3B" periodLabel={period?.periodLabel} disabled={busy || !data}
                    warning={data && !data.reconciliation?.tiesOut
                        ? "This return does not tie to the General Ledger. Filing will still lock the period."
                        : "Filing GSTR-3B locks this accounting period — no further postings or edits until it is unlocked."}
                    onFile={() => fileGstr3b(period.id)} />
            </Stack>
        )}
    >
        {(data) => {
            const net = data.netTaxPayable;
            return (
                <>
                    <ReconBanner recon={data.reconciliation} />

                    <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={COL_HEAD}>§</TableCell>
                                    <TableCell sx={COL_HEAD}>Section</TableCell>
                                    <TableCell sx={COL_NUM}>Taxable</TableCell>
                                    <TableCell sx={COL_NUM}>IGST</TableCell>
                                    <TableCell sx={COL_NUM}>CGST</TableCell>
                                    <TableCell sx={COL_NUM}>SGST</TableCell>
                                    <TableCell sx={COL_NUM}>Cess</TableCell>
                                    <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Total Tax</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {SECTIONS.map((s) => {
                                    const a = data[s.key];
                                    return (
                                        <TableRow key={s.key} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                            <TableCell sx={CELL}>
                                                <Chip label={s.code} size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: s.accent, bgcolor: `${s.accent}14`, "& .MuiChip-label": { px: 0.75 } }} />
                                            </TableCell>
                                            <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{s.label}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(a?.taxableValue)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(a?.igst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(a?.cgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(a?.sgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(a?.cess)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(totalTax(a))}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow sx={{ bgcolor: "#ecfdf5" }}>
                                    <TableCell sx={CELL}>
                                        <Chip label="5 / 6" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: "#047857", bgcolor: "#d1fae5", "& .MuiChip-label": { px: 0.75 } }} />
                                    </TableCell>
                                    <TableCell sx={{ ...CELL, fontWeight: 800, color: "#065f46" }}>Net tax payable</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, py: 1.5 }} />
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(net?.igst)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(net?.cgst)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(net?.sgst)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(net?.cess)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5, color: "#047857", fontSize: "0.875rem" }}>{fmtAmt(totalTax(net))}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            Net tax payable = outward liability − eligible ITC, floored at zero per head. Cess and RCM handled per applicable section.
                        </Typography>
                    </Stack>

                    {data.reconciliation && !data.reconciliation.tiesOut && (
                        <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
                            The return figures differ from the GL Output/Input tax movement for this period. Review postings before filing —
                            a common cause is an ITC-ineligible bill still posted to the Input-tax ledger.
                        </Alert>
                    )}
                </>
            );
        }}
    </GstReportShell>
);

export default Gstr3bPage;
