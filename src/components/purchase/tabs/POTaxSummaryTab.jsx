import React from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell,
    TableRow, Divider, Chip, Stack, Grid,
} from '@mui/material';
import { InfoOutlined, CheckCircleOutline } from '@mui/icons-material';
import { T } from '../../../theme/moduleTokens';


const fmtAmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SummaryRow = ({ label, value, bold = false, color = '#1e293b' }) => (
    <TableRow>
        <TableCell sx={{ fontSize: '0.9rem', color: '#64748b', border: 'none', py: 1.2, pl: 0 }}>{label}</TableCell>
        <TableCell align="right" sx={{ fontSize: bold ? '1.1rem' : '0.95rem', fontWeight: bold ? 800 : 600, border: 'none', py: 1.2, pr: 0, color: bold ? T.accent : color }}>
            {value}
        </TableCell>
    </TableRow>
);

const GST_TREATMENT_LABEL = {
    INTRA_STATE: 'Intra-State (CGST + SGST)',
    INTER_STATE: 'Inter-State (IGST)',
    EXPORT_WITH_LUT: 'Export with LUT (Zero Rated)',
    EXPORT_WITH_TAX: 'Export with Tax',
    SEZ: 'SEZ (Zero Rated)',
    RCM: 'Reverse Charge (RCM)',
    COMPOSITION: 'Composition Vendor (No ITC)',
    UNREGISTERED: 'Unregistered Vendor',
};

export default function POTaxSummaryTab({ formik }) {
    const v = formik.values;
    const isIntra = v.gstTreatment === 'INTRA_STATE';
    const isInter = v.gstTreatment === 'INTER_STATE';

    const lines = v.items ?? [];
    const estimated = lines.length > 0 && !v.id;

    return (
        <Box>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                                Financial Breakdown
                            </Typography>
                            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${T.rule}`, bgcolor: 'white' }}>
                                <Table size="small">
                                    <TableBody>
                                        <SummaryRow label="Items Subtotal" value={fmtAmt(v.subtotal)} />
                                        {Number(v.totalDiscount) > 0 && (
                                            <SummaryRow label="Direct Discount (-)" value={fmtAmt(v.totalDiscount)} color="#dc2626" />
                                        )}
                                        <SummaryRow label="Net Taxable Value" value={fmtAmt(v.taxableValue)} />
                                        
                                        <TableRow><TableCell colSpan={2} sx={{ border: 'none', py: 1 }}><Divider sx={{ borderStyle: 'dashed' }} /></TableCell></TableRow>

                                        {isIntra && (
                                            <>
                                                <SummaryRow label="Central Tax (CGST)" value={fmtAmt(v.cgstAmount)} />
                                                <SummaryRow label="State Tax (SGST)" value={fmtAmt(v.sgstAmount)} />
                                            </>
                                        )}
                                        {isInter && (
                                            <SummaryRow label="Integrated Tax (IGST)" value={fmtAmt(v.igstAmount)} />
                                        )}
                                        {Number(v.cessAmount) > 0 && (
                                            <SummaryRow label="Cess" value={fmtAmt(v.cessAmount)} />
                                        )}
                                        <SummaryRow label="Round Off" value={fmtAmt(v.roundOff)} />

                                        <TableRow><TableCell colSpan={2} sx={{ border: 'none', py: 1 }}><Divider sx={{ border: '1px solid #e2e8f0' }} /></TableCell></TableRow>
                                        
                                        <SummaryRow label="Payable Amount" value={fmtAmt(v.grandTotal)} bold />
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Box>

                        {v.grandTotalInWords && (
                            <Box sx={{ p: 2, bgcolor: T.ground, borderRadius: 2, border: `1px solid ${T.rule}` }}>
                                <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Amount in Words</Typography>
                                <Typography sx={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, fontStyle: 'italic' }}>
                                    {v.grandTotalInWords}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                                Tax Configuration
                            </Typography>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${T.rule}`, bgcolor: 'white' }}>
                                <Stack spacing={2.5}>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1 }}>GST Treatment</Typography>
                                        <Chip
                                            icon={<CheckCircleOutline sx={{ fontSize: '1rem !important' }} />}
                                            label={GST_TREATMENT_LABEL[v.gstTreatment] ?? v.gstTreatment ?? 'Pending Determination'}
                                            sx={{ 
                                                fontSize: '0.85rem', fontWeight: 700, 
                                                bgcolor: '#f0fdf4', color: '#16a34a', 
                                                border: '1px solid #dcfce7', px: 1
                                            }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1 }}>Place of Supply</Typography>
                                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                            {v.placeOfSupply ? `State Code: ${v.placeOfSupply}` : 'Auto-detected from vendor location'}
                                        </Typography>
                                    </Box>

                                    {estimated && (
                                        <Box sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5', display: 'flex', gap: 1.5 }}>
                                            <InfoOutlined sx={{ color: '#c2410c', fontSize: 20 }} />
                                            <Typography sx={{ fontSize: '0.8rem', color: '#9a3412', lineHeight: 1.4 }}>
                                                These values are <strong>estimated</strong> based on your current items. Final tax splits will be computed by the central tax engine upon submission.
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>
                </Grid>

                {/* Line-wise details at bottom */}
                {lines.length > 0 && (
                    <Grid item xs={12}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: 1, mb: 2, mt: 2 }}>
                            Item-wise Tax Analysis
                        </Typography>
                        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${T.rule}` }}>
                            <Table size="small">
                                <TableBody>
                                    <TableRow sx={{ background: '#f8fafc' }}>
                                        {['#', 'Item Description', 'Taxable Amt', 'GST%', 'CGST', 'SGST', 'IGST', 'Line Total'].map(h => (
                                            <TableCell key={h} sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.accent, py: 1.5, px: 2, textTransform: 'uppercase' }}>
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {lines.map((l, i) => {
                                        const taxable = ((l.quantityOrdered || 0) * (l.unitPrice || 0)) * (1 - (l.discountPct || 0) / 100);
                                        const gst = l.gstRatePct || 0;
                                        const half = gst / 2;
                                        const cgst = isIntra ? taxable * half / 100 : 0;
                                        const sgst = isIntra ? taxable * half / 100 : 0;
                                        const igst = isInter ? taxable * gst / 100 : 0;
                                        return (
                                            <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2, color: '#64748b' }}>{i + 1}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, py: 1.2, px: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {l.description || '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2 }}>{fmtAmt(taxable)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2 }}><Chip label={`${gst}%`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2, color: isIntra ? '#0f172a' : '#cbd5e1' }}>{isIntra ? fmtAmt(cgst) : '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2, color: isIntra ? '#0f172a' : '#cbd5e1' }}>{isIntra ? fmtAmt(sgst) : '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1.2, px: 2, color: isInter ? '#0f172a' : '#cbd5e1' }}>{isInter ? fmtAmt(igst) : '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', fontWeight: 800, py: 1.2, px: 2, color: T.accent }}>{fmtAmt(taxable + cgst + sgst + igst)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
