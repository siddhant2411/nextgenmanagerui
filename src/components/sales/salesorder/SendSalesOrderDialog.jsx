import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Stack, Box, IconButton,
    Alert, Divider, Chip,
} from '@mui/material';
import { Close, Email, Download } from '@mui/icons-material';
import { sendSalesOrder, downloadSOPdf } from '../../../services/salesOrderService';

export default function SendSalesOrderDialog({ open, onClose, orderId, order, onSent }) {
    const [toEmail, setToEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setToEmail(order?.contact?.email ?? order?.email ?? '');
    }, [open, order]);

    const handleSend = async () => {
        if (!toEmail.trim()) { setError('Recipient email is required.'); return; }
        setSending(true);
        setError(null);
        try {
            const updated = await sendSalesOrder(orderId, toEmail.trim());
            onSent?.(updated);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to record send action.');
        } finally {
            setSending(false);
        }
    };

    const handleDownload = () => {
        if (orderId) downloadSOPdf(orderId, order?.orderNumber);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}>

            <DialogTitle sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                bgcolor: '#dbeafe', borderBottom: '1px solid #e2e8f0', py: 1.5, px: 3,
            }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Email sx={{ color: '#2563eb', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Send Sales Order
                    </Typography>
                    {order?.orderNumber && (
                        <Chip label={order.orderNumber} size="small"
                            sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'white' }} />
                    )}
                </Stack>
                <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 2, px: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    This will mark the order as sent. Use the recipient email below to send via your email client.
                </Typography>

                <TextField
                    fullWidth
                    size="small"
                    label="Recipient Email"
                    type="email"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    placeholder="customer@example.com"
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <Divider sx={{ my: 2 }} />

                <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
                        SALES ORDER DETAILS
                    </Typography>
                    <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Order No.</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{order?.orderNumber ?? '—'}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Customer</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{order?.contact?.contactName ?? order?.customerName ?? '—'}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Amount</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {order?.currency ?? 'INR'} {(parseFloat(order?.totalPayableAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button size="small" variant="outlined" startIcon={<Download />}
                        onClick={handleDownload}
                        sx={{ textTransform: 'none', fontSize: '0.78rem', borderColor: '#cbd5e1', color: '#475569' }}>
                        Download PDF to attach
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fafafa' }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
                    Cancel
                </Button>
                <Button variant="contained" disableElevation disabled={sending || !toEmail.trim()}
                    startIcon={<Email />}
                    onClick={handleSend}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>
                    {sending ? 'Recording...' : 'Mark as Sent'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
