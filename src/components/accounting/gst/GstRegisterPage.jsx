import React from "react";
import {
    Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import {
    getOutwardRegister, getInwardRegister,
    downloadOutwardRegisterExcel, downloadInwardRegisterExcel,
} from "../../../services/accounting/gstService";
import {
    GstReportShell, StatCard, EmptySection,
    COL_HEAD, COL_NUM, CELL, CELL_NUM, CELL_MONO,
    fmtAmt, fmtMoney0, fmtDate, fmtRate,
} from "./gstCommon";

const VARIANTS = {
    OUTWARD: {
        title: "Outward Supplies Register",
        subtitle: "Tax invoices and credit notes — the source of GSTR-1",
        accent: "#2563eb",
        partyHeader: "Customer",
        fetch: getOutwardRegister,
        download: downloadOutwardRegisterExcel,
        docColors: { INV: { c: "#2563eb", bg: "#eff6ff" }, CRN: { c: "#dc2626", bg: "#fef2f2" } },
    },
    INWARD: {
        title: "Inward Supplies & ITC Register",
        subtitle: "Vendor bills and debit notes — eligible input tax credit",
        accent: "#7c3aed",
        partyHeader: "Vendor",
        fetch: getInwardRegister,
        download: downloadInwardRegisterExcel,
        docColors: { BILL: { c: "#7c3aed", bg: "#f5f3ff" }, DBN: { c: "#dc2626", bg: "#fef2f2" } },
    },
};

const DocChip = ({ type, colors }) => {
    const col = colors[type] || { c: "#64748b", bg: "#f1f5f9" };
    return <Chip label={type} size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: col.c, bgcolor: col.bg, "& .MuiChip-label": { px: 0.75 } }} />;
};

const GstRegisterPage = ({ variant = "OUTWARD" }) => {
    const cfg = VARIANTS[variant] || VARIANTS.OUTWARD;
    const isInward = variant === "INWARD";

    return (
        <GstReportShell
            title={cfg.title}
            subtitle={cfg.subtitle}
            accent={cfg.accent}
            load={(p) => cfg.fetch(p.startDate, p.endDate)}
            actions={({ period, data, busy }) => (
                <Button
                    variant="outlined" disabled={busy || !data || !data.rows?.length}
                    onClick={() => cfg.download(period.startDate, period.endDate)}
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
                            <StatCard label="Documents" value={data.rows.length} accent={cfg.accent} />
                            <StatCard label="Taxable Value" value={fmtMoney0(t?.taxableValue)} accent="#10b981" />
                            <StatCard label="CGST" value={fmtMoney0(t?.cgst)} accent="#0ea5e9" />
                            <StatCard label="SGST" value={fmtMoney0(t?.sgst)} accent="#0ea5e9" />
                            <StatCard label="IGST" value={fmtMoney0(t?.igst)} accent="#6366f1" />
                            <StatCard label="Total" value={fmtMoney0(t?.total)} accent={cfg.accent} />
                        </Stack>

                        {data.rows.length === 0 ? (
                            <EmptySection text="No documents in this period." />
                        ) : (
                            <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto" }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={COL_HEAD}>Type</TableCell>
                                            <TableCell sx={COL_HEAD}>Doc No</TableCell>
                                            <TableCell sx={COL_HEAD}>Date</TableCell>
                                            <TableCell sx={COL_HEAD}>GSTIN</TableCell>
                                            <TableCell sx={COL_HEAD}>{cfg.partyHeader}</TableCell>
                                            <TableCell sx={COL_HEAD}>POS</TableCell>
                                            <TableCell sx={COL_NUM}>Taxable</TableCell>
                                            <TableCell sx={COL_NUM}>Rate</TableCell>
                                            <TableCell sx={COL_NUM}>CGST</TableCell>
                                            <TableCell sx={COL_NUM}>SGST</TableCell>
                                            <TableCell sx={COL_NUM}>IGST</TableCell>
                                            <TableCell sx={COL_NUM}>Cess</TableCell>
                                            <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Total</TableCell>
                                            {isInward && <TableCell sx={COL_HEAD}>ITC</TableCell>}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.rows.map((r, i) => (
                                            <TableRow key={`${r.docType}-${r.docNo}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                                <TableCell sx={CELL}><DocChip type={r.docType} colors={cfg.docColors} /></TableCell>
                                                <TableCell sx={{ ...CELL_MONO, color: "#0f172a", fontWeight: 600 }}>{r.docNo}</TableCell>
                                                <TableCell sx={CELL}>{fmtDate(r.docDate)}</TableCell>
                                                <TableCell sx={CELL_MONO}>{r.gstin || "—"}</TableCell>
                                                <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{r.partyName}</TableCell>
                                                <TableCell sx={CELL}>{r.placeOfSupply || "—"}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableValue)}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtRate(r.rate)}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtAmt(r.cgst)}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtAmt(r.sgst)}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtAmt(r.igst)}</TableCell>
                                                <TableCell sx={CELL_NUM}>{fmtAmt(r.cess)}</TableCell>
                                                <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(r.total)}</TableCell>
                                                {isInward && (
                                                    <TableCell sx={CELL}>
                                                        {r.reverseCharge
                                                            ? <Chip label="RCM" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: "#b45309", bgcolor: "#fffbeb" }} />
                                                            : r.itcEligible
                                                                ? <Chip label="Eligible" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: "#16a34a", bgcolor: "#f0fdf4" }} />
                                                                : <Chip label="Blocked" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, color: "#dc2626", bgcolor: "#fef2f2" }} />}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                            <TableCell colSpan={6} sx={{ ...CELL, fontWeight: 800, color: "#0f172a", py: 1.5 }}>Totals</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.taxableValue)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, py: 1.5 }} />
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.cgst)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.sgst)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.igst)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5 }}>{fmtAmt(t?.cess)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, py: 1.5, color: cfg.accent }}>{fmtAmt(t?.total)}</TableCell>
                                            {isInward && <TableCell sx={{ ...CELL, py: 1.5 }} />}
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
};

export default GstRegisterPage;
