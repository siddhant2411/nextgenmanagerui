import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Button, TextField, Grid,
    IconButton, Tooltip, Alert, CircularProgress, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Autocomplete, Container, FormControl, InputLabel, Select,
} from '@mui/material';
import { ArrowBack, Add, Delete, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import { listPurchaseOrders } from '../../services/purchaseOrderService';
import { getGRNsByPO } from '../../services/grnService';
import { createDebitNote, getNextDebitNoteNumber } from '../../services/debitNoteService';
import { searchInventoryItems } from '../../services/inventoryService';

/* ── Design Tokens (matches Sales UI) ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    bg:      '#f8fafc',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
};

const bd = (v) => parseFloat(v) || 0;

const RETURN_REASONS = [
    { value: 'DEFECTIVE',      label: 'Defective' },
    { value: 'WRONG_QUANTITY', label: 'Wrong Quantity' },
    { value: 'WRONG_ITEM',     label: 'Wrong Item' },
    { value: 'DAMAGED',        label: 'Damaged' },
    { value: 'QUALITY_ISSUE',  label: 'Quality Issue' },
    { value: 'OTHER',          label: 'Other' },
];

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2.5 } };

const SectionCard = ({ title, children }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2.5 }}>
            {title}
        </Typography>
        {children}
    </Paper>
);

const emptyLine = () => ({
    item: null,
    returnedQty: '',
    rate: '',
    gstRate: '',
    warehouseFrom: '',
    remarks: '',
});

export default function AddDebitNote() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        debitNoteDate: new Date().toISOString().slice(0, 10),
        returnReason: 'OTHER',
        remarks: '',
    });

    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [poList, setPoList] = useState([]);
    const [selectedPo, setSelectedPo] = useState(null);
    const [grnList, setGrnList] = useState([]);
    const [selectedGrn, setSelectedGrn] = useState(null);
    const [lines, setLines] = useState([emptyLine()]);
    const [noteNumber, setNoteNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [itemOptions, setItemOptions] = useState([]);

    useEffect(() => {
        apiService.get('/contact', { type: 'VENDOR', size: 200 })
            .then(r => setVendors(r?.content ?? r ?? []))
            .catch(() => {});
        getNextDebitNoteNumber().then(n => setNoteNumber(n)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedVendor) { setPoList([]); setSelectedPo(null); return; }
        listPurchaseOrders({ vendorId: selectedVendor.id, size: 100 })
            .then(r => setPoList(r?.content ?? r ?? []))
            .catch(() => setPoList([]));
    }, [selectedVendor]);

    useEffect(() => {
        if (!selectedPo) { setGrnList([]); setSelectedGrn(null); return; }
        getGRNsByPO(selectedPo.id)
            .then(r => setGrnList(r ?? []))
            .catch(() => setGrnList([]));
        if (selectedPo.items?.length) {
            setLines(selectedPo.items.map(l => ({
                item: l.itemId ? { inventoryItemId: l.itemId, name: l.itemName, itemCode: l.itemCode } : null,
                returnedQty: '',
                rate: String(l.unitPrice ?? ''),
                gstRate: '',
                warehouseFrom: '',
                remarks: '',
            })));
        }
    }, [selectedPo]);

    const handleItemSearch = async (query) => {
        if (!query || query.length < 2) return;
        try {
            const r = await searchInventoryItems({ query, size: 20 });
            setItemOptions(r?.content ?? r ?? []);
        } catch { }
    };

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const setLineField = (idx, key, val) =>
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l));
    const addLine = () => setLines(prev => [...prev, emptyLine()]);
    const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

    const subtotal = lines.reduce((s, l) => s + bd(l.returnedQty) * bd(l.rate), 0);
    const totalGst = lines.reduce((s, l) => s + bd(l.returnedQty) * bd(l.rate) * (bd(l.gstRate) / 100), 0);
    const totalAmount = subtotal + totalGst;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVendor) { setError('Please select a vendor.'); return; }
        const validLines = lines.filter(l => l.item && bd(l.returnedQty) > 0);
        if (!validLines.length) { setError('Add at least one line item with quantity.'); return; }
        setSaving(true); setError('');
        try {
            await createDebitNote({
                vendorId:        selectedVendor.id,
                purchaseOrderId: selectedPo?.id ?? null,
                grnId:           selectedGrn?.id ?? null,
                debitNoteDate:   form.debitNoteDate,
                returnReason:    form.returnReason,
                remarks:         form.remarks || null,
                items: validLines.map((l, i) => ({
                    lineNumber:       i + 1,
                    inventoryItemId:  l.item.inventoryItemId,
                    returnedQty:      bd(l.returnedQty),
                    rate:             bd(l.rate),
                    gstRate:          bd(l.gstRate),
                    warehouseFrom:    l.warehouseFrom || null,
                    remarks:          l.remarks || null,
                })),
            });
            navigate('/purchase/debit-notes');
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Failed to create debit note.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: '#0f172a',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5,150,105,0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 15,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Tooltip title="Back">
                                <IconButton onClick={() => navigate('/purchase/debit-notes')}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 0.5 }}>
                                    New Debit Note
                                </Typography>
                                {noteNumber && (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                        Will be assigned: {noteNumber}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                        <Button variant="contained" disableElevation disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                            onClick={handleSubmit}
                            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 3, bgcolor: T.primary, px: 4, '&:hover': { bgcolor: '#1d4ed8' } }}>
                            {saving ? 'Saving...' : 'Save Debit Note'}
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
                        {/* Header details */}
                        <SectionCard title="Debit Note Details">
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={4}>
                                    <Autocomplete
                                        options={vendors}
                                        getOptionLabel={v => v.companyName ?? `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim()}
                                        value={selectedVendor}
                                        onChange={(_, v) => { setSelectedVendor(v); setSelectedPo(null); setSelectedGrn(null); }}
                                        renderInput={params => (
                                            <TextField {...params} required label="Vendor" sx={fieldSx} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Autocomplete
                                        options={poList}
                                        getOptionLabel={p => p.purchaseOrderNumber ?? String(p.id)}
                                        value={selectedPo}
                                        onChange={(_, v) => setSelectedPo(v)}
                                        disabled={!selectedVendor}
                                        renderInput={params => (
                                            <TextField {...params} label="Purchase Order (optional)" sx={fieldSx} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Autocomplete
                                        options={grnList}
                                        getOptionLabel={g => g.grnNumber ?? String(g.id)}
                                        value={selectedGrn}
                                        onChange={(_, v) => setSelectedGrn(v)}
                                        disabled={!selectedPo}
                                        renderInput={params => (
                                            <TextField {...params} label="GRN (optional)" sx={fieldSx} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Date" type="date"
                                        value={form.debitNoteDate}
                                        onChange={e => setField('debitNoteDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Return Reason</InputLabel>
                                        <Select value={form.returnReason} label="Return Reason"
                                            onChange={e => setField('returnReason', e.target.value)}
                                            sx={{ borderRadius: 2.5 }}>
                                            {RETURN_REASONS.map(r => (
                                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Remarks"
                                        value={form.remarks}
                                        onChange={e => setField('remarks', e.target.value)}
                                        sx={fieldSx} />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* Line items */}
                        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ p: 3, pb: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Return Items
                                    </Typography>
                                    <Button size="small" startIcon={<Add />} variant="outlined" onClick={addLine}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: T.border, color: T.textSec }}>
                                        Add Line
                                    </Button>
                                </Stack>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['Item', 'Qty', 'Rate (₹)', 'GST %', 'GST Amt', 'Line Total', 'Warehouse', ''].map(h => (
                                                <TableCell key={h} sx={{
                                                    fontWeight: 700, fontSize: '0.65rem', color: T.textSec,
                                                    bgcolor: T.bg, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    borderBottom: `1px solid ${T.border}`, py: 1.5,
                                                }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lines.map((line, idx) => {
                                            const base = bd(line.returnedQty) * bd(line.rate);
                                            const gstAmt = base * (bd(line.gstRate) / 100);
                                            const lineTotal = base + gstAmt;
                                            return (
                                                <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                                                    <TableCell sx={{ py: 1, minWidth: 200 }}>
                                                        <Autocomplete size="small"
                                                            options={itemOptions}
                                                            getOptionLabel={i => `${i.name} (${i.itemCode})`}
                                                            value={line.item}
                                                            onChange={(_, v) => setLineField(idx, 'item', v)}
                                                            onInputChange={(_, v) => handleItemSearch(v)}
                                                            renderInput={params => (
                                                                <TextField {...params} placeholder="Search item…"
                                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                            )}
                                                            sx={{ minWidth: 180 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TextField size="small" type="number" value={line.returnedQty}
                                                            onChange={e => setLineField(idx, 'returnedQty', e.target.value)}
                                                            sx={{ width: 70, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TextField size="small" type="number" value={line.rate}
                                                            onChange={e => setLineField(idx, 'rate', e.target.value)}
                                                            sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TextField size="small" type="number" value={line.gstRate}
                                                            onChange={e => setLineField(idx, 'gstRate', e.target.value)}
                                                            sx={{ width: 65, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>
                                                        {gstAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: T.text }}>
                                                        {lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TextField size="small" value={line.warehouseFrom}
                                                            onChange={e => setLineField(idx, 'warehouseFrom', e.target.value)}
                                                            placeholder="e.g. Main"
                                                            sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <Tooltip title="Remove line">
                                                            <IconButton size="small" onClick={() => removeLine(idx)}
                                                                disabled={lines.length === 1}
                                                                sx={{ color: '#94a3b8', '&:hover': { color: T.error } }}>
                                                                <Delete sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Totals footer */}
                            <Box sx={{ p: 3, bgcolor: T.bg, borderTop: `1px solid ${T.border}` }}>
                                <Stack direction="row" spacing={5} justifyContent="flex-end">
                                    {[
                                        { label: 'Subtotal', value: subtotal },
                                        { label: 'GST',      value: totalGst },
                                        { label: 'Total',    value: totalAmount, bold: true },
                                    ].map(c => (
                                        <Box key={c.label} sx={{ textAlign: 'right' }}>
                                            <Typography sx={{ fontSize: '0.65rem', color: T.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {c.label}
                                            </Typography>
                                            <Typography sx={{ fontWeight: c.bold ? 900 : 600, fontSize: c.bold ? '1.15rem' : '0.95rem', color: c.bold ? T.text : '#334155' }}>
                                                ₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        </Paper>
                    </Stack>
                </form>
            </Container>
        </Box>
    );
}
