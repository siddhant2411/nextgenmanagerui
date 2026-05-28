import React, { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField,
    Typography, Alert, CircularProgress, Divider, Chip, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { Add, DeleteOutline, Payments } from '@mui/icons-material';
import { recordPayment, deletePayment } from '../../../services/salesOrderService';

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
    amount: '',
    paymentMode: 'NEFT',
    referenceNumber: '',
    notes: '',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const RecordPaymentDialog = ({
    open, onClose, orderId, orderNumber, totalPayable,
    payments = [], onPaymentsChanged,
}) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving]   = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [error, setError]     = useState(null);

    const totalPaid   = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const balanceDue  = Math.max(0, parseFloat(totalPayable || 0) - totalPaid);

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await recordPayment(orderId, {
                paymentDate:     form.paymentDate,
                amount:          parseFloat(form.amount),
                paymentMode:     form.paymentMode,
                referenceNumber: form.referenceNumber || null,
                notes:           form.notes || null,
            });
            setForm(EMPTY_FORM);
            onPaymentsChanged?.();
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
            await deletePayment(orderId, paymentId);
            onPaymentsChanged?.();
        } catch {
            setError('Failed to delete payment.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 4, p: 0 } }}>
            <DialogTitle sx={{ fontWeight: 900, fontSize: '1.1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payments sx={{ color: '#2563eb' }} />
                Record Payment — {orderNumber}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                {/* Payment summary */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    {[
                        { label: 'Order Value',   value: totalPayable, color: '#0f172a' },
                        { label: 'Total Received', value: totalPaid,   color: '#059669' },
                        { label: 'Balance Due',    value: balanceDue,  color: balanceDue > 0 ? '#dc2626' : '#059669' },
                    ].map(({ label, value, color }) => (
                        <Stack key={label} alignItems="center" flex={1}
                            sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <Typography sx={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '1rem', color }}>₹{fmt(value)}</Typography>
                        </Stack>
                    ))}
                </Stack>

                {/* Add new payment form */}
                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
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
                            <Select name="paymentMode" value={form.paymentMode} onChange={handleChange} label="Mode of Payment *"
                                sx={{ borderRadius: 2.5 }}>
                                {PAYMENT_MODES.map(m => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Reference / Cheque No." name="referenceNumber"
                            value={form.referenceNumber} onChange={handleChange}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                    </Stack>
                    <TextField fullWidth label="Notes" name="notes" value={form.notes} onChange={handleChange}
                        multiline rows={2}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
                </Stack>

                {/* Payment history */}
                {payments.length > 0 && (
                    <>
                        <Divider sx={{ my: 2.5 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
                            Payment History
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', color: '#64748b', bgcolor: '#f8fafc' } }}>
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
                                        <TableCell sx={{ color: '#64748b' }}>{p.referenceNumber || '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>₹{fmt(p.amount)}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" disabled={deleting === p.id}
                                                onClick={() => handleDelete(p.id)}
                                                sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626' } }}>
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
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>
                    {saving ? 'Saving...' : 'Record Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RecordPaymentDialog;
