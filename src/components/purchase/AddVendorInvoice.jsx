import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Button, TextField, Grid,
    IconButton, Tooltip, Alert, CircularProgress, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
} from '@mui/material';
import { ArrowBack, Add, Delete } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getPurchaseOrder } from '../../services/purchaseOrderService';
import { getGRNsByPO } from '../../services/grnService';
import { createVendorInvoice } from '../../services/vendorInvoiceService';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';
const PRIMARY_LIGHT = '#f0f7ff';
const HEADER_TEXT = '#075985';

const zero = (v) => (v === '' || v == null) ? '0' : v;
const bd = (v) => parseFloat(v) || 0;
const fmtAmount = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const SectionHeader = ({ children }) => (
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: HEADER_TEXT, textTransform: 'uppercase', letterSpacing: 0.8, mb: 2 }}>
        {children}
    </Typography>
);

const emptyItem = () => ({
    itemId: '',
    hsnCode: '',
    uom: '',
    invoicedQty: '',
    unitPrice: '',
    taxableValue: '',
    cgstAmount: '',
    sgstAmount: '',
    igstAmount: '',
    cessAmount: '',
    lineTotal: '',
});

export default function AddVendorInvoice() {
    const navigate = useNavigate();
    const { id: poId } = useParams();

    const [po, setPo] = useState(null);
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        grnId: '',
        subtotal: '',
        cgstAmount: '',
        sgstAmount: '',
        igstAmount: '',
        cessAmount: '',
        grandTotal: '',
        remarks: '',
    });
    const [items, setItems] = useState([emptyItem()]);

    useEffect(() => {
        Promise.all([getPurchaseOrder(poId), getGRNsByPO(poId)])
            .then(([poData, grnData]) => {
                setPo(poData);
                setGrns(grnData ?? []);
                // Pre-populate items from PO lines
                if (poData?.items?.length) {
                    setItems(poData.items.map(l => ({
                        itemId: l.itemId ?? '',
                        hsnCode: l.hsnCode ?? '',
                        uom: l.uom ?? '',
                        invoicedQty: String(l.quantityOrdered ?? ''),
                        unitPrice: String(l.unitPrice ?? ''),
                        taxableValue: String(l.taxableValue ?? ''),
                        cgstAmount: String(l.cgstAmount ?? ''),
                        sgstAmount: String(l.sgstAmount ?? ''),
                        igstAmount: String(l.igstAmount ?? ''),
                        cessAmount: String(l.cessAmount ?? ''),
                        lineTotal: String(l.lineTotal ?? ''),
                    })));
                }
                // Pre-populate totals from PO
                setForm(f => ({
                    ...f,
                    subtotal: String(poData.subtotal ?? ''),
                    cgstAmount: String(poData.cgstAmount ?? ''),
                    sgstAmount: String(poData.sgstAmount ?? ''),
                    igstAmount: String(poData.igstAmount ?? ''),
                    cessAmount: String(poData.cessAmount ?? ''),
                    grandTotal: String(poData.grandTotal ?? ''),
                }));
            })
            .catch(() => setError('Failed to load PO details.'))
            .finally(() => setLoading(false));
    }, [poId]);

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const setItemField = (idx, key, val) =>
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.invoiceNumber.trim()) { setError('Invoice number is required.'); return; }
        setSaving(true);
        setError('');
        try {
            await createVendorInvoice({
                poId: Number(poId),
                grnId: form.grnId ? Number(form.grnId) : null,
                invoiceNumber: form.invoiceNumber.trim(),
                invoiceDate: form.invoiceDate || null,
                subtotal: bd(form.subtotal),
                cgstAmount: bd(form.cgstAmount),
                sgstAmount: bd(form.sgstAmount),
                igstAmount: bd(form.igstAmount),
                cessAmount: bd(form.cessAmount),
                grandTotal: bd(form.grandTotal),
                remarks: form.remarks || null,
                items: items.filter(it => it.invoicedQty !== '').map(it => ({
                    itemId: it.itemId ? Number(it.itemId) : null,
                    hsnCode: it.hsnCode || null,
                    uom: it.uom || null,
                    invoicedQty: bd(it.invoicedQty),
                    unitPrice: bd(it.unitPrice),
                    taxableValue: bd(it.taxableValue),
                    cgstAmount: bd(it.cgstAmount),
                    sgstAmount: bd(it.sgstAmount),
                    igstAmount: bd(it.igstAmount),
                    cessAmount: bd(it.cessAmount),
                    lineTotal: bd(it.lineTotal),
                })),
            });
            navigate(`/purchase/${poId}/invoices`);
        } catch (err) {
            setError(err?.message ?? 'Failed to save invoice.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress thickness={5} sx={{ color: PRIMARY }} />
            </Box>
        );
    }

    const inputSx = { borderRadius: 1.5, bgcolor: '#f8fafc' };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
                <Tooltip title="Cancel">
                    <IconButton onClick={() => navigate(`/purchase/${poId}/invoices`)}
                        sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                        <ArrowBack />
                    </IconButton>
                </Tooltip>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em' }}>
                        Record Vendor Invoice
                    </Typography>
                    {po && (
                        <Typography sx={{ color: '#64748b', fontSize: '0.88rem' }}>
                            {po.purchaseOrderNumber} · {po.vendorName ?? '—'} · PO Total: {fmtAmount(po.grandTotal)}
                        </Typography>
                    )}
                </Box>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Invoice header */}
                    <Grid item xs={12}>
                        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2.5 }}>
                            <SectionHeader>Invoice Details</SectionHeader>
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={4}>
                                    <TextField required fullWidth size="small" label="Invoice Number"
                                        value={form.invoiceNumber} onChange={e => setField('invoiceNumber', e.target.value)}
                                        InputProps={{ sx: inputSx }} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" label="Invoice Date" type="date"
                                        value={form.invoiceDate} onChange={e => setField('invoiceDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }} InputProps={{ sx: inputSx }} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField select fullWidth size="small" label="Link to GRN (optional)"
                                        value={form.grnId} onChange={e => setField('grnId', e.target.value)}
                                        InputProps={{ sx: inputSx }}>
                                        <MenuItem value="">— No GRN —</MenuItem>
                                        {grns.filter(g => g.status === 'COMPLETED' || g.status === 'SUBMITTED').map(g => (
                                            <MenuItem key={g.id} value={g.id}>
                                                {g.grnNumber} ({g.status})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth size="small" label="Remarks" multiline rows={2}
                                        value={form.remarks} onChange={e => setField('remarks', e.target.value)}
                                        InputProps={{ sx: { ...inputSx, bgcolor: '#f8fafc' } }} />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Line items */}
                    <Grid item xs={12}>
                        <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2.5, overflow: 'hidden' }}>
                            <Box sx={{ p: 2.5, pb: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <SectionHeader>Line Items</SectionHeader>
                                    <Button size="small" startIcon={<Add />} variant="outlined"
                                        onClick={addItem}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: BORDER, color: '#475569', fontSize: '0.8rem' }}>
                                        Add Line
                                    </Button>
                                </Stack>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                            {['HSN', 'UOM', 'Qty', 'Unit Price', 'Taxable', 'CGST', 'SGST', 'IGST', 'Line Total', ''].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', py: 1.5, whiteSpace: 'nowrap' }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((it, idx) => (
                                            <TableRow key={idx}>
                                                {['hsnCode', 'uom', 'invoicedQty', 'unitPrice', 'taxableValue', 'cgstAmount', 'sgstAmount', 'igstAmount', 'lineTotal'].map(key => (
                                                    <TableCell key={key} sx={{ py: 1 }}>
                                                        <TextField size="small" value={it[key]}
                                                            onChange={e => setItemField(idx, key, e.target.value)}
                                                            sx={{ width: key === 'hsnCode' || key === 'uom' ? 70 : 90 }}
                                                            InputProps={{ sx: { fontSize: '0.82rem', borderRadius: 1 } }} />
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ py: 1 }}>
                                                    <IconButton size="small" onClick={() => removeItem(idx)}
                                                        disabled={items.length === 1}
                                                        sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                                                        <Delete sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>

                    {/* Totals */}
                    <Grid item xs={12}>
                        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2.5 }}>
                            <SectionHeader>Invoice Totals</SectionHeader>
                            <Grid container spacing={2.5}>
                                {[
                                    { key: 'subtotal', label: 'Subtotal' },
                                    { key: 'cgstAmount', label: 'CGST' },
                                    { key: 'sgstAmount', label: 'SGST' },
                                    { key: 'igstAmount', label: 'IGST' },
                                    { key: 'cessAmount', label: 'Cess' },
                                ].map(({ key, label }) => (
                                    <Grid item xs={6} sm={4} md={2} key={key}>
                                        <TextField fullWidth size="small" label={label} type="number"
                                            value={form[key]} onChange={e => setField(key, e.target.value)}
                                            InputProps={{ sx: inputSx }} />
                                    </Grid>
                                ))}
                                <Grid item xs={12} sm={4} md={2}>
                                    <TextField fullWidth size="small" label="Grand Total" type="number"
                                        value={form.grandTotal} onChange={e => setField('grandTotal', e.target.value)}
                                        InputProps={{ sx: { ...inputSx, fontWeight: 700 } }} />
                                </Grid>
                            </Grid>

                            {po && (
                                <Box sx={{ mt: 2, p: 1.5, bgcolor: PRIMARY_LIGHT, borderRadius: 1.5, border: `1px solid #bfdbfe` }}>
                                    <Typography sx={{ fontSize: '0.8rem', color: '#1e40af' }}>
                                        PO Grand Total: <strong>{fmtAmount(po.grandTotal)}</strong>
                                        {form.grandTotal && Math.abs(bd(form.grandTotal) - bd(po.grandTotal)) > 1 && (
                                            <span style={{ color: '#f59e0b', marginLeft: 12 }}>
                                                ⚠ Amount differs from PO — will be flagged as mismatch
                                            </span>
                                        )}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                    <Button variant="outlined" onClick={() => navigate(`/purchase/${poId}/invoices`)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: BORDER, color: '#475569', px: 3 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disableElevation disabled={saving}
                        sx={{ background: PRIMARY, borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 4,
                            boxShadow: '0 4px 12px rgba(21,101,192,0.2)', '&:hover': { background: '#0d47a1' } }}>
                        {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Invoice'}
                    </Button>
                </Stack>
            </form>
        </Box>
    );
}
