import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Button, TextField, Grid,
    IconButton, Tooltip, Alert, CircularProgress, FormControl,
    InputLabel, Select, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Container,
} from '@mui/material';
import { ArrowBack, Add, Delete, Save } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getPurchaseOrder } from '../../services/purchaseOrderService';
import { getGRNsByPO } from '../../services/grnService';
import { createVendorInvoice } from '../../services/vendorInvoiceService';
import { T, STATUS, SHELL } from '../../theme/moduleTokens';

/* ── Design Tokens (matches Sales UI) ── */

const bd = (v) => parseFloat(v) || 0;
const fmtAmount = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2.5 } };

const SectionCard = ({ title, children }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2.5 }}>
            {title}
        </Typography>
        {children}
    </Paper>
);

const emptyItem = () => ({
    itemId: '', itemName: '', hsnCode: '', uom: '',
    invoicedQty: '', unitPrice: '', taxableValue: '',
    cgstAmount: '', sgstAmount: '', igstAmount: '', cessAmount: '', lineTotal: '',
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
        subtotal: '', cgstAmount: '', sgstAmount: '', igstAmount: '', cessAmount: '', grandTotal: '',
        remarks: '',
    });
    const [items, setItems] = useState([emptyItem()]);

    useEffect(() => {
        Promise.all([getPurchaseOrder(poId), getGRNsByPO(poId)])
            .then(([poData, grnData]) => {
                setPo(poData);
                setGrns(grnData ?? []);
                if (poData?.items?.length) {
                    setItems(poData.items.map(l => ({
                        itemId:       l.itemId ?? '',
                        itemName:     l.itemName ?? l.item?.name ?? '',
                        hsnCode:      l.hsnCode ?? '',
                        uom:          l.uom ?? '',
                        invoicedQty:  String(l.quantityOrdered ?? ''),
                        unitPrice:    String(l.unitPrice ?? ''),
                        taxableValue: String(l.taxableValue ?? ''),
                        cgstAmount:   String(l.cgstAmount ?? ''),
                        sgstAmount:   String(l.sgstAmount ?? ''),
                        igstAmount:   String(l.igstAmount ?? ''),
                        cessAmount:   String(l.cessAmount ?? ''),
                        lineTotal:    String(l.lineTotal ?? ''),
                    })));
                }
                setForm(f => ({
                    ...f,
                    subtotal:    String(poData.subtotal ?? ''),
                    cgstAmount:  String(poData.cgstAmount ?? ''),
                    sgstAmount:  String(poData.sgstAmount ?? ''),
                    igstAmount:  String(poData.igstAmount ?? ''),
                    cessAmount:  String(poData.cessAmount ?? ''),
                    grandTotal:  String(poData.grandTotal ?? ''),
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
        e?.preventDefault();
        if (!form.invoiceNumber.trim()) { setError('Invoice number is required.'); return; }
        setSaving(true); setError('');
        try {
            await createVendorInvoice({
                poId:          Number(poId),
                grnId:         form.grnId ? Number(form.grnId) : null,
                invoiceNumber: form.invoiceNumber.trim(),
                invoiceDate:   form.invoiceDate || null,
                subtotal:      bd(form.subtotal),
                cgstAmount:    bd(form.cgstAmount),
                sgstAmount:    bd(form.sgstAmount),
                igstAmount:    bd(form.igstAmount),
                cessAmount:    bd(form.cessAmount),
                grandTotal:    bd(form.grandTotal),
                remarks:       form.remarks || null,
                items: items.filter(it => it.invoicedQty !== '').map(it => ({
                    itemId:       it.itemId ? Number(it.itemId) : null,
                    itemName:     it.itemName || null,
                    hsnCode:      it.hsnCode || null,
                    uom:          it.uom || null,
                    invoicedQty:  bd(it.invoicedQty),
                    unitPrice:    bd(it.unitPrice),
                    taxableValue: bd(it.taxableValue),
                    cgstAmount:   bd(it.cgstAmount),
                    sgstAmount:   bd(it.sgstAmount),
                    igstAmount:   bd(it.igstAmount),
                    cessAmount:   bd(it.cessAmount),
                    lineTotal:    bd(it.lineTotal),
                })),
            });
            navigate(`/purchase/${poId}/invoices`);
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Failed to save invoice.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh', pb: 10 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: SHELL.heroBg,
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 15,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Tooltip title="Back to Invoices">
                                <IconButton onClick={() => navigate(`/purchase/${poId}/invoices`)}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 0.5 }}>
                                    Record Vendor Invoice
                                </Typography>
                                {po && (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                        {po.purchaseOrderNumber} · {po.vendorName ?? '—'} · PO Total: {fmtAmount(po.grandTotal)}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                        <Button variant="contained" disableElevation disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                            onClick={handleSubmit}
                            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 3, bgcolor: T.accent, px: 4, '&:hover': { bgcolor: '#1d4ed8' } }}>
                            {saving ? 'Saving...' : 'Save Invoice'}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -8 }}>
                {error && (
                    <Alert severity="error" variant="filled" onClose={() => setError('')}
                        sx={{ mb: 4, borderRadius: 4, fontWeight: 700 }}>{error}</Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        {/* Invoice header */}
                        <SectionCard title="Invoice Details">
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={4}>
                                    <TextField required fullWidth label="Invoice Number"
                                        value={form.invoiceNumber}
                                        onChange={e => setField('invoiceNumber', e.target.value)}
                                        sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Invoice Date" type="date"
                                        value={form.invoiceDate}
                                        onChange={e => setField('invoiceDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Link to GRN (optional)</InputLabel>
                                        <Select value={form.grnId} label="Link to GRN (optional)"
                                            onChange={e => setField('grnId', e.target.value)}
                                            sx={{ borderRadius: 2.5 }}>
                                            <MenuItem value="">— No GRN —</MenuItem>
                                            {grns.filter(g => g.status === 'COMPLETED' || g.status === 'SUBMITTED').map(g => (
                                                <MenuItem key={g.id} value={g.id}>
                                                    {g.grnNumber} ({g.status})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Remarks" multiline rows={2}
                                        value={form.remarks}
                                        onChange={e => setField('remarks', e.target.value)}
                                        sx={fieldSx} />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* Line items */}
                        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ p: 3, pb: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Line Items
                                    </Typography>
                                    <Button size="small" startIcon={<Add />} variant="outlined" onClick={addItem}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: T.rule, color: T.ink2 }}>
                                        Add Line
                                    </Button>
                                </Stack>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Item Name', 'HSN', 'UOM', 'Qty', 'Unit Price', 'Taxable', 'CGST', 'SGST', 'IGST', 'Line Total', ''].map(h => (
                                                <TableCell key={h} sx={{
                                                    fontWeight: 700, fontSize: '0.65rem', color: T.ink2,
                                                    bgcolor: T.ground, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    borderBottom: `1px solid ${T.rule}`, py: 1.5,
                                                }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((it, idx) => (
                                            <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell sx={{ py: 1 }}>
                                                    <TextField size="small" value={it.itemName}
                                                        onChange={e => setItemField(idx, 'itemName', e.target.value)}
                                                        placeholder="Item name"
                                                        sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                </TableCell>
                                                {['hsnCode', 'uom', 'invoicedQty', 'unitPrice', 'taxableValue', 'cgstAmount', 'sgstAmount', 'igstAmount', 'lineTotal'].map(key => (
                                                    <TableCell key={key} sx={{ py: 1 }}>
                                                        <TextField size="small" value={it[key]}
                                                            onChange={e => setItemField(idx, key, e.target.value)}
                                                            sx={{ width: key === 'hsnCode' || key === 'uom' ? 70 : 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ py: 1 }}>
                                                    <Tooltip title="Remove">
                                                        <IconButton size="small" onClick={() => removeItem(idx)}
                                                            disabled={items.length === 1}
                                                            sx={{ color: '#94a3b8', '&:hover': { color: STATUS.critical } }}>
                                                            <Delete sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* Totals */}
                        <SectionCard title="Invoice Totals">
                            <Grid container spacing={2.5}>
                                {[
                                    { key: 'subtotal',   label: 'Subtotal' },
                                    { key: 'cgstAmount', label: 'CGST' },
                                    { key: 'sgstAmount', label: 'SGST' },
                                    { key: 'igstAmount', label: 'IGST' },
                                    { key: 'cessAmount', label: 'Cess' },
                                ].map(({ key, label }) => (
                                    <Grid item xs={6} sm={4} md={2} key={key}>
                                        <TextField fullWidth label={label} type="number"
                                            value={form[key]}
                                            onChange={e => setField(key, e.target.value)}
                                            sx={fieldSx} />
                                    </Grid>
                                ))}
                                <Grid item xs={12} sm={4} md={2}>
                                    <TextField fullWidth label="Grand Total" type="number"
                                        value={form.grandTotal}
                                        onChange={e => setField('grandTotal', e.target.value)}
                                        sx={fieldSx} />
                                </Grid>
                            </Grid>

                            {po && (
                                <Box sx={{ mt: 2.5, p: 2, bgcolor: '#eff6ff', borderRadius: 2.5, border: '1px solid #bfdbfe' }}>
                                    <Typography sx={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 500 }}>
                                        PO Grand Total: <strong>{fmtAmount(po.grandTotal)}</strong>
                                        {form.grandTotal && Math.abs(bd(form.grandTotal) - bd(po.grandTotal)) > 1 && (
                                            <span style={{ color: STATUS.warning ?? '#d97706', marginLeft: 12, fontWeight: 700 }}>
                                                ⚠ Amount differs from PO — will be flagged as mismatch
                                            </span>
                                        )}
                                    </Typography>
                                </Box>
                            )}
                        </SectionCard>
                    </Stack>
                </form>
            </Container>
        </Box>
    );
}
