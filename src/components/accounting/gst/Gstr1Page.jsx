import React from "react";
import {
    Box, Button, CircularProgress, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
} from "@mui/material";
import { FileDownloadOutlined, DataObjectOutlined } from "@mui/icons-material";
import {
    getGstr1, downloadGstr1Excel, downloadGstr1Json, fileGstr1,
} from "../../../services/accounting/gstService";
import {
    GstReportShell, StatCard, SectionTitle, EmptySection, FileReturnButton,
    COL_HEAD, COL_NUM, CELL, CELL_NUM, CELL_MONO,
    fmtAmt, fmtMoney0, fmtDate, fmtRate,
} from "./gstCommon";

// Sum the rate-wise lines of a document into one tax tuple.
const sumLines = (items = []) =>
    items.reduce(
        (a, l) => ({
            taxable: a.taxable + Number(l.taxableValue || 0),
            cgst: a.cgst + Number(l.cgst || 0),
            sgst: a.sgst + Number(l.sgst || 0),
            igst: a.igst + Number(l.igst || 0),
            cess: a.cess + Number(l.cess || 0),
        }),
        { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 }
    );

const rateList = (items = []) => items.map((l) => `${Number(l.rate)}%`).join(", ") || "—";

const Shell = ({ children }) => (
    <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto" }}>
        <Table size="small" stickyHeader>{children}</Table>
    </TableContainer>
);

// ── Invoice-style sections (B2B / B2CL / CDNR / CDNUR) ───────────────────────
const InvoiceSection = ({ rows, title, hint, showGstin, isNote }) => {
    if (!rows?.length) return (<><SectionTitle title={title} hint={hint} /><EmptySection /></>);
    return (
        <>
            <SectionTitle title={title} hint={`${rows.length} document${rows.length === 1 ? "" : "s"}`} />
            <Shell>
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        {showGstin && <TableCell sx={COL_HEAD}>GSTIN</TableCell>}
                        <TableCell sx={COL_HEAD}>Party</TableCell>
                        <TableCell sx={COL_HEAD}>{isNote ? "Note No" : "Invoice No"}</TableCell>
                        <TableCell sx={COL_HEAD}>Date</TableCell>
                        <TableCell sx={COL_HEAD}>POS</TableCell>
                        <TableCell sx={COL_HEAD}>Rates</TableCell>
                        <TableCell sx={COL_NUM}>Taxable</TableCell>
                        <TableCell sx={COL_NUM}>CGST</TableCell>
                        <TableCell sx={COL_NUM}>SGST</TableCell>
                        <TableCell sx={COL_NUM}>IGST</TableCell>
                        <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>{isNote ? "Note Value" : "Invoice Value"}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r, i) => {
                        const s = sumLines(r.items);
                        const no = r.invoiceNo || r.noteNo;
                        const dt = r.invoiceDate || r.noteDate;
                        const val = r.invoiceValue ?? r.noteValue;
                        return (
                            <TableRow key={`${no}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                {showGstin && <TableCell sx={CELL_MONO}>{r.ctin || "—"}</TableCell>}
                                <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{r.partyName || "—"}</TableCell>
                                <TableCell sx={{ ...CELL_MONO, color: "#0f172a", fontWeight: 600 }}>{no}</TableCell>
                                <TableCell sx={CELL}>{fmtDate(dt)}</TableCell>
                                <TableCell sx={CELL}>{r.placeOfSupply || "—"}</TableCell>
                                <TableCell sx={CELL}>{rateList(r.items)}</TableCell>
                                <TableCell sx={CELL_NUM}>{fmtAmt(s.taxable)}</TableCell>
                                <TableCell sx={CELL_NUM}>{fmtAmt(s.cgst)}</TableCell>
                                <TableCell sx={CELL_NUM}>{fmtAmt(s.sgst)}</TableCell>
                                <TableCell sx={CELL_NUM}>{fmtAmt(s.igst)}</TableCell>
                                <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(val)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Shell>
        </>
    );
};

const B2csSection = ({ rows }) => {
    if (!rows?.length) return (<><SectionTitle title="B2C (Small)" hint="Consolidated by place of supply & rate" /><EmptySection /></>);
    return (
        <>
            <SectionTitle title="B2C (Small)" hint="Consolidated by place of supply & rate" />
            <Shell>
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={COL_HEAD}>Type</TableCell>
                        <TableCell sx={COL_HEAD}>POS</TableCell>
                        <TableCell sx={COL_NUM}>Rate</TableCell>
                        <TableCell sx={COL_NUM}>Taxable</TableCell>
                        <TableCell sx={COL_NUM}>CGST</TableCell>
                        <TableCell sx={COL_NUM}>SGST</TableCell>
                        <TableCell sx={COL_NUM}>IGST</TableCell>
                        <TableCell sx={COL_NUM}>Cess</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r, i) => (
                        <TableRow key={`${r.placeOfSupply}-${r.rate}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                            <TableCell sx={CELL}>{r.type || "OE"}</TableCell>
                            <TableCell sx={CELL}>{r.placeOfSupply || "—"}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtRate(r.rate)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableValue)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cgst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.sgst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.igst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cess)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Shell>
        </>
    );
};

const HsnSection = ({ hsn }) => {
    const rows = hsn?.rows || [];
    if (!rows.length) return (<><SectionTitle title="HSN Summary" hint="Table 12" /><EmptySection /></>);
    return (
        <>
            <SectionTitle title="HSN Summary" hint="Table 12 — net of credit notes" />
            <Shell>
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={COL_HEAD}>HSN/SAC</TableCell>
                        <TableCell sx={COL_HEAD}>UQC</TableCell>
                        <TableCell sx={COL_NUM}>Qty</TableCell>
                        <TableCell sx={COL_NUM}>Rate</TableCell>
                        <TableCell sx={COL_NUM}>Taxable</TableCell>
                        <TableCell sx={COL_NUM}>CGST</TableCell>
                        <TableCell sx={COL_NUM}>SGST</TableCell>
                        <TableCell sx={COL_NUM}>IGST</TableCell>
                        <TableCell sx={COL_NUM}>Cess</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r, i) => (
                        <TableRow key={`${r.hsnCode}-${r.rate}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                            <TableCell sx={{ ...CELL_MONO, color: "#0f172a", fontWeight: 600 }}>{r.hsnCode}</TableCell>
                            <TableCell sx={CELL}>{r.uqc || "—"}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.quantity)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtRate(r.rate)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableValue)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cgst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.sgst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.igst)}</TableCell>
                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cess)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Shell>
        </>
    );
};

const DocsSection = ({ docs }) => {
    if (!docs?.length) return (<><SectionTitle title="Documents Issued" hint="Table 13" /><EmptySection /></>);
    return (
        <>
            <SectionTitle title="Documents Issued" hint="Table 13" />
            <Shell>
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={COL_HEAD}>Nature</TableCell>
                        <TableCell sx={COL_HEAD}>From</TableCell>
                        <TableCell sx={COL_HEAD}>To</TableCell>
                        <TableCell sx={COL_NUM}>Count</TableCell>
                        <TableCell sx={COL_NUM}>Cancelled</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {docs.map((d, i) => (
                        <TableRow key={`${d.nature}-${i}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                            <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{d.nature}</TableCell>
                            <TableCell sx={CELL_MONO}>{d.fromNo || "—"}</TableCell>
                            <TableCell sx={CELL_MONO}>{d.toNo || "—"}</TableCell>
                            <TableCell sx={CELL_NUM}>{d.totalCount}</TableCell>
                            <TableCell sx={CELL_NUM}>{d.cancelled}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Shell>
        </>
    );
};

const Gstr1Page = () => (
    <GstReportShell
        title="GSTR-1"
        subtitle="Outward supplies return — preview, export, and file"
        accent="#2563eb"
        load={(p) => getGstr1(p.startDate, p.endDate)}
        actions={({ period, data, busy }) => (
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" disabled={busy || !data} onClick={() => downloadGstr1Excel(period.startDate, period.endDate)}
                    startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>Excel</Button>
                <Button variant="outlined" disabled={busy || !data} onClick={() => downloadGstr1Json(period.startDate, period.endDate)}
                    startIcon={<DataObjectOutlined sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40 }}>JSON</Button>
                <FileReturnButton
                    label="File GSTR-1" periodLabel={period?.periodLabel} disabled={busy || !data}
                    onFile={() => fileGstr1(period.id)} />
            </Stack>
        )}
    >
        {(data) => {
            const t = data.totals;
            return (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 1, flexWrap: "wrap" }} useFlexGap>
                        <StatCard label="Documents" value={t?.documentCount ?? 0} accent="#2563eb" />
                        <StatCard label="Taxable Value" value={fmtMoney0(t?.taxableValue)} accent="#10b981" />
                        <StatCard label="CGST" value={fmtMoney0(t?.cgst)} accent="#0ea5e9" />
                        <StatCard label="SGST" value={fmtMoney0(t?.sgst)} accent="#0ea5e9" />
                        <StatCard label="IGST" value={fmtMoney0(t?.igst)} accent="#6366f1" />
                        <StatCard label="Cess" value={fmtMoney0(t?.cess)} accent="#f59e0b" />
                    </Stack>

                    <InvoiceSection rows={data.b2b} title="B2B" hint="Registered recipients" showGstin />
                    <InvoiceSection rows={data.b2cl} title="B2C (Large)" hint="Inter-state, unregistered, value > ₹2.5L" />
                    <B2csSection rows={data.b2cs} />
                    <InvoiceSection rows={data.cdnr} title="Credit Notes (Registered)" isNote showGstin />
                    <InvoiceSection rows={data.cdnur} title="Credit Notes (Unregistered)" isNote />
                    <HsnSection hsn={data.hsn} />
                    <DocsSection docs={data.docs} />
                </>
            );
        }}
    </GstReportShell>
);

export default Gstr1Page;
