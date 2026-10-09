import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Stack, IconButton,
    Alert, Chip, Autocomplete,
} from '@mui/material';
import { Close, Email, Download, AttachFile } from '@mui/icons-material';
import apiService from '../../../services/apiService';
import { sendSalesOrder } from '../../../services/salesOrderService';
import { contactEmails, getSendFrom, safeFileName, saveBlob, sendEmail } from '../../../utils/emailCompose';
import { EMAIL_SEND_HINT, EmailSendButtons, SendFromField } from '../../common/EmailSend';

const fmtDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const defaultBody = (order, contact) => {
    const person = (contact?.personDetails ?? []).find(p => p.isPrimary)?.personName;
    const amount = (parseFloat(order?.totalPayableAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return [
        `Dear ${person || contact?.companyName || order?.contact?.companyName || 'Sir/Madam'},`,
        '',
        `Please find attached Sales Order ${order?.orderNumber ?? ''} dated ${fmtDate(order?.orderDate)} for ${order?.currency ?? 'INR'} ${amount}.`,
        ...(order?.poNumber ? [`This is against your PO ${order.poNumber}.`] : []),
        '',
        'Kindly review the order and confirm. Please let us know if anything needs to be changed.',
        '',
        'Regards',
    ].join('\r\n');
};

export default function SendSalesOrderDialog({ open, onClose, orderId, order, onSent }) {
    const [toEmail, setToEmail] = useState('');
    const [emailOptions, setEmailOptions] = useState([]);
    const [fromEmail, setFromEmail] = useState(getSendFrom);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const customerId = order?.contact?.id ?? order?.contact?.contactId;

    useEffect(() => {
        if (!open) return;
        setError(null);
        setSubject(`Sales Order ${order?.orderNumber ?? ''}`.trim());
        setBody(defaultBody(order, order?.contact));
        const known = contactEmails(order?.contact);
        setEmailOptions(known);
        setToEmail(known[0] ?? '');
        if (!customerId) return;

        // The order carries only the customer's id and name, so the saved email comes from the contact.
        let live = true;
        apiService.get(`/contact/${customerId}`)
            .then(contact => {
                if (!live) return;
                const emails = contactEmails(contact);
                setEmailOptions(emails);
                setToEmail(prev => prev || emails[0] || '');
                setBody(defaultBody(order, contact));
            })
            .catch(() => {});
        return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, customerId]);

    const pdfName = `SalesOrder-${safeFileName(order?.orderNumber || orderId)}.pdf`;

    const fetchPdf = async () => (await apiService.fetchBlob(`/sales-orders/${orderId}/pdf`)).blob;

    const handleSend = async (via) => {
        const to = toEmail.trim();
        if (!to) { setError('Recipient email is required.'); return; }
        setSending(true);
        setError(null);

        try {
            await sendEmail(via, { to, subject, body, from: fromEmail }, fetchPdf, pdfName);
        } catch {
            setError('The email was opened, but the PDF could not be prepared. Download it and attach it manually.');
            setSending(false);
            return;
        }

        try {
            const updated = await sendSalesOrder(orderId, to);
            onSent?.(updated);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to record send action.');
        } finally {
            setSending(false);
        }
    };

    const handleDownload = async () => {
        try { saveBlob(await fetchPdf(), pdfName); }
        catch { setError('Failed to download the PDF.'); }
    };

    const canSend = !sending && Boolean(toEmail.trim());
    const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } };

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

                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Autocomplete freeSolo size="small" options={emailOptions}
                        inputValue={toEmail}
                        onInputChange={(_, v) => setToEmail(v)}
                        renderInput={(p) => (
                            <TextField {...p} label="To (Customer Email)" type="email"
                                placeholder="customer@example.com"
                                helperText={emailOptions.length === 0 ? 'No email saved on this contact — enter one.' : undefined}
                                sx={fieldSx} />
                        )}
                    />
                    <SendFromField value={fromEmail} onChange={setFromEmail} />
                    <TextField fullWidth size="small" label="Subject"
                        value={subject} onChange={e => setSubject(e.target.value)} sx={fieldSx} />
                    <TextField fullWidth multiline minRows={7} label="Message"
                        value={body} onChange={e => setBody(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem', lineHeight: 1.6 } }} />

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip icon={<AttachFile sx={{ fontSize: 16 }} />} label={pdfName} size="small" variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                        <Button size="small" startIcon={<Download />} onClick={handleDownload}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#475569' }}>
                            Download
                        </Button>
                    </Stack>

                    <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                        {EMAIL_SEND_HINT}
                    </Alert>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fafafa' }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b', mr: 'auto' }}>
                    Cancel
                </Button>
                <EmailSendButtons onSend={handleSend} disabled={!canSend} busy={sending} withPdf />
            </DialogActions>
        </Dialog>
    );
}
