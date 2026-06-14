import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Divider,
    Stack, Typography, Alert, TextField, FormControl, InputLabel,
    Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Button, Box, CircularProgress,
} from '@mui/material';
import { Add, DeleteOutline, Payments } from '@mui/icons-material';
import { getPaymentsForInvoice, getPaymentSummary, recordVendorPayment, deleteVendorPayment } from '../../services/vendorPaymentService';

const T = {
    primary: '#2563eb', success: '#059669', error: '#dc2626',
    bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a', textSec: '#64748b',
};

const PAYMENT_MODES = [
    { value: 'CASH',   label: 'Cash' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'NEFT',   label: 'NEFT' },
    { value: 'RTGS',   label: 'RTGS' },
    { value: 'UPI',    label: 'UPI' },
    { value: 'OTHER',  label: 'Other' },
];

const EMPTY_FORM = {
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '', paymentMode: 'NEFT', referenceNumber: '', notes: '',
};

const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

export default function RecordPaymentDialog({ open, invoice, onClose, onChanged }) {
    const [payments, setPayments] = useState([]);
    const [totalPaid, setTotalPaid] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [error, setError] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const load = useCallback(async () => {
        if (!invoice) return;
        setLoading(true);
        try {
            const [pmts, summary] = await Promise.all([
                getPaymentsForInvoice(invoice.id),
                getPaymentSummary(invoice.id),
            ]);
            setPayments(pmts ?? []);
            setTotalPaid(Number(summary?.totalPaid ?? 0));
        } catch {
        } finally {
            setLoading(false);
        }
    }, [invoice]);

    useEffect(() => {
        if (open) load();
        else { setForm(EMPTY_FORM); setError(null); }
    }, [open, load]);

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) { setError('Please enter a valid amount.'); return; }
        setSaving(true); setError(null);
        try {
            await recordVendorPayment(invoice.id, {
                paymentDate:     form.paymentDate,
                amount:          parseFloat(form.amount),
                paymentMode:     form.paymentMode,
                referenceNumber: form.referenceNumber || null,
                notes:           form.notes || null,
            });
            setForm(EMPTY_FORM);
            await load();
            onChanged?.();
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (paymentId) => {
        if (!window.confirm('Delete this payment entry?')) return;
        setDeleting(paymentId);
        try {
            await deleteVendorPayment(invoice.id, paymentId);
            await load();
            onChanged?.();
        } catch {
            setError('Failed to delete payment.');
        } finally {
            setDeleting(null);
        }
    };

    const totalPayable = Number(invoice?.grandTotal ?? 0);
    const balanceDue = Math.max(0, totalPayable - totalPaid);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 4, p: 0 } }}>
            <DialogTitle sx={{ fontWeight: 900, fontSize: '1.1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payments sx={{ color: T.primary }} />
                Record Payment — {invoice?.invoiceNumber}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                {/* Summary */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    {[
                        { label: 'Invoice Total', value: totalPayable, color: T.text },
                        { label: 'Total Paid',    value: totalPaid,    color: T.success },
                        { label: 'Balance Due',   value: balanceDue,   color: balanceDue > 0 ? T.error : T.success },
                    ].map(({ label, value, color }) => (
                        <Stack key={label} alignItems="center" flex={1}
                            sx={{ p: 1.5, borderRadius: 3, bgcolor: T.bg, border: `1px solid ${T.border}` }}>
                            <Typography sx={{ fontSize: '0.65rem', color: T.textSec, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '1rem', color }}>₹{fmt(value)}</Typography>
                        </Stack>
                    ))}
                </Stack>

                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
                    Add New Payment
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField fullWidth label="Payment Date *" type="date" name="paymentDate"
                            value={form.paymentDate} onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                        <TextField fullWidth label="Amount (₹) *" type="number" name="amount"
                            value={form.amount} onChange={handleChange}
                            inputProps={{ min: 0.01, step: 0.01 }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>Mode of Payment *</InputLabel>
                            <Select name="paymentMode" value={form.paymentMode} onChange={handleChange}
                                label="Mode of Payment *" sx={{ borderRadius: 2.5 }}>
                                {PAYMENT_MODES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Reference / Cheque No." name="referenceNumber"
                            value={form.referenceNumber} onChange={handleChange}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                    </Stack>
                    <TextField fullWidth label="Notes" name="notes" value={form.notes} onChange={handleChange}
                        multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                </Stack>

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : payments.length > 0 && (
                    <>
                        <Divider sx={{ my: 2.5 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
                            Payment History
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', color: T.textSec, bgcolor: T.bg } }}>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Mode</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payments.map(p => (
                                    <TableRow key={p.id} sx={{ '& td': { fontSize: '0.8rem' } }}>
                                        <TableCell>{p.paymentDate}</TableCell>
                                        <TableCell>
                                            <Chip label={p.paymentMode} size="small"
                                                sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18, borderRadius: 1 }} />
                                        </TableCell>
                                        <TableCell sx={{ color: T.textSec }}>{p.referenceNumber || '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>₹{fmt(p.amount)}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" disabled={deleting === p.id}
                                                onClick={() => handleDelete(p.id)}
                                                sx={{ color: '#94a3b8', '&:hover': { color: T.error } }}>
                                                {deleting === p.id
                                                    ? <CircularProgress size={12} />
                                                    : <DeleteOutline sx={{ fontSize: 15 }} />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Close</Button>
                <Button variant="contained" disableElevation disabled={saving}
                    startIcon={saving ? <CircularProgress size={15} color="inherit" /> : <Add />}
                    onClick={handleSubmit}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' } }}>
                    {saving ? 'Saving...' : 'Record Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
