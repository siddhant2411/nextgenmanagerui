import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, Divider, Container, Grid,
} from '@mui/material';
import {
    ArrowBack, CheckCircleOutline, Cancel, Payments, AttachFile,
    DeleteOutline, Download, Refresh, CloudUpload,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getVendorInvoice, postVendorInvoice, cancelVendorInvoice,
    getInvoiceAttachments, uploadInvoiceAttachment, deleteInvoiceAttachment, downloadInvoiceAttachment,
} from '../../services/vendorInvoiceService';
import { getPaymentsForInvoice, getPaymentSummary, recordVendorPayment, deleteVendorPayment } from '../../services/vendorPaymentService';
import RecordPaymentDialog from './RecordPaymentDialog';

/* ── Design Tokens ── */
const T = {
    primary: '#2563eb', success: '#059669', error: '#dc2626', warning: '#d97706',
    bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a', textSec: '#64748b',
};

const STATUS_STYLE = {
    DRAFT:     { color: '#64748b', bg: '#f1f5f9' },
    POSTED:    { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fileIcon = (name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return '🖼';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    return '📎';
};

const SectionCard = ({ title, children, action }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title}
            </Typography>
            {action}
        </Stack>
        {children}
    </Paper>
);

export default function VendorInvoiceDetail() {
    const navigate = useNavigate();
    const { id: poId, invoiceId } = useParams();

    const [invoice, setInvoice] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const fileInputRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            // Load invoice first — this is essential
            const inv = await getVendorInvoice(invoiceId);
            setInvoice(inv);

            // Load secondary data independently so a failing endpoint doesn't blank the page
            const [atts, pmts, summary] = await Promise.allSettled([
                getInvoiceAttachments(invoiceId),
                getPaymentsForInvoice(invoiceId),
                getPaymentSummary(invoiceId),
            ]);
            setAttachments(atts.status === 'fulfilled' ? (atts.value ?? []) : []);
            setPayments(pmts.status === 'fulfilled' ? (pmts.value ?? []) : []);
            setPaymentSummary(summary.status === 'fulfilled' ? summary.value : null);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to load invoice details.');
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => { load(); }, [load]);

    const handlePost = async () => {
        if (!window.confirm('Post this invoice? This records an AP voucher in accounting.')) return;
        setActionLoading('post');
        try { await postVendorInvoice(invoiceId); await load(); }
        catch (e) { setError(e?.response?.data?.message ?? 'Failed to post invoice.'); }
        finally { setActionLoading(''); }
    };

    const handleCancel = async () => {
        if (!window.confirm('Cancel this invoice?')) return;
        setActionLoading('cancel');
        try { await cancelVendorInvoice(invoiceId); await load(); }
        catch (e) { setError(e?.response?.data?.message ?? 'Failed to cancel invoice.'); }
        finally { setActionLoading(''); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadLoading(true);
        try {
            await uploadInvoiceAttachment(invoiceId, file);
            await load();
        } catch {
            setError('Failed to upload attachment.');
        } finally {
            setUploadLoading(false);
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        if (!window.confirm('Delete this attachment?')) return;
        try {
            await deleteInvoiceAttachment(invoiceId, fileId);
            setAttachments(prev => prev.filter(a => a.id !== fileId));
        } catch {
            setError('Failed to delete attachment.');
        }
    };

    const handleDownload = (att) => {
        downloadInvoiceAttachment(invoiceId, att.id, att.originalName ?? att.fileName);
    };

    const handleDeletePayment = async (paymentId) => {
        if (!window.confirm('Delete this payment entry?')) return;
        try {
            await deleteVendorPayment(invoiceId, paymentId);
            await load();
        } catch { setError('Failed to delete payment.'); }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!invoice) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}
                    <Button startIcon={<ArrowBack />} onClick={() => navigate(`/purchase/${poId}/invoices`)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Back to Invoices
                    </Button>
                </Box>
            </Box>
        );
    }

    const ss = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.DRAFT;
    const totalPaid = Number(paymentSummary?.totalPaid ?? 0);
    const balanceDue = Math.max(0, Number(invoice.grandTotal ?? 0) - totalPaid);

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: '#0f172a',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 15,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Tooltip title="Back to Invoices">
                                <IconButton onClick={() => navigate(`/purchase/${poId}/invoices`)}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        {invoice.invoiceNumber}
                                    </Typography>
                                    <Chip label={invoice.status} size="small"
                                        sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, bgcolor: ss.bg, color: ss.color }} />
                                </Stack>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                    {invoice.vendorName ?? '—'} · PO: {invoice.purchaseOrderNumber ?? '—'} · {fmtDate(invoice.invoiceDate)}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            {invoice.status === 'DRAFT' && (
                                <Button variant="contained" disableElevation
                                    startIcon={actionLoading === 'post' ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline />}
                                    disabled={!!actionLoading} onClick={handlePost}
                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 3, bgcolor: T.success, px: 3,
                                        '&:hover': { bgcolor: '#047857' } }}>
                                    Post Invoice
                                </Button>
                            )}
                            {invoice.status === 'POSTED' && (
                                <Button variant="contained" disableElevation startIcon={<Payments />}
                                    onClick={() => setShowPaymentDialog(true)}
                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 3, bgcolor: T.primary, px: 3,
                                        '&:hover': { bgcolor: '#1d4ed8' } }}>
                                    Record Payment
                                </Button>
                            )}
                            {invoice.status !== 'CANCELLED' && (
                                <Tooltip title="Cancel Invoice">
                                    <IconButton disabled={!!actionLoading} onClick={handleCancel}
                                        sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                                            '&:hover': { color: '#fca5a5', bgcolor: 'rgba(220,38,38,0.1)' } }}>
                                        {actionLoading === 'cancel' ? <CircularProgress size={18} color="inherit" /> : <Cancel />}
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -8 }}>
                {error && (
                    <Alert severity="error" variant="filled" onClose={() => setError('')}
                        sx={{ mb: 4, borderRadius: 4, fontWeight: 700 }}>{error}</Alert>
                )}

                <Stack spacing={4}>
                    {/* Invoice info + totals */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <SectionCard title="Invoice Details">
                                <Grid container spacing={2}>
                                    {[
                                        { label: 'Invoice Number',  value: invoice.invoiceNumber },
                                        { label: 'Invoice Date',    value: fmtDate(invoice.invoiceDate) },
                                        { label: 'Vendor',          value: invoice.vendorName ?? '—' },
                                        { label: 'Purchase Order',  value: invoice.purchaseOrderNumber ?? '—' },
                                        { label: 'Linked GRN',      value: invoice.grnNumber ?? '—' },
                                        { label: 'Created By',      value: invoice.createdBy ?? '—' },
                                    ].map(({ label, value }) => (
                                        <Grid item xs={6} key={label}>
                                            <Typography sx={{ fontSize: '0.7rem', color: T.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.3 }}>
                                                {label}
                                            </Typography>
                                            <Typography sx={{ fontWeight: 600, color: T.text, fontSize: '0.88rem' }}>{value}</Typography>
                                        </Grid>
                                    ))}
                                    {invoice.remarks && (
                                        <Grid item xs={12}>
                                            <Typography sx={{ fontSize: '0.7rem', color: T.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.3 }}>
                                                Remarks
                                            </Typography>
                                            <Typography sx={{ color: T.textSec, fontSize: '0.85rem' }}>{invoice.remarks}</Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </SectionCard>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <SectionCard title="Amount Summary">
                                <Stack spacing={1.5}>
                                    {[
                                        { label: 'Subtotal',   value: invoice.subtotal },
                                        { label: 'CGST',       value: invoice.cgstAmount },
                                        { label: 'SGST',       value: invoice.sgstAmount },
                                        { label: 'IGST',       value: invoice.igstAmount },
                                        { label: 'Cess',       value: invoice.cessAmount },
                                    ].map(({ label, value }) => (
                                        <Stack key={label} direction="row" justifyContent="space-between">
                                            <Typography sx={{ color: T.textSec, fontSize: '0.85rem' }}>{label}</Typography>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>₹{fmt(value)}</Typography>
                                        </Stack>
                                    ))}
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.text }}>Grand Total</Typography>
                                        <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: T.text }}>₹{fmt(invoice.grandTotal)}</Typography>
                                    </Stack>
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: T.success, fontWeight: 700, fontSize: '0.88rem' }}>Total Paid</Typography>
                                        <Typography sx={{ color: T.success, fontWeight: 800, fontSize: '0.88rem' }}>₹{fmt(totalPaid)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: balanceDue > 0 ? T.error : T.success, fontWeight: 700, fontSize: '0.88rem' }}>
                                            Balance Due
                                        </Typography>
                                        <Typography sx={{ color: balanceDue > 0 ? T.error : T.success, fontWeight: 800, fontSize: '0.88rem' }}>
                                            ₹{fmt(balanceDue)}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </SectionCard>
                        </Grid>
                    </Grid>

                    {/* Line items */}
                    {invoice.items?.length > 0 && (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ p: 3, pb: 0 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
                                    Line Items
                                </Typography>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['#', 'Item', 'HSN', 'UOM', 'Qty', 'Unit Price', 'Taxable', 'CGST', 'SGST', 'IGST', 'Cess', 'Line Total'].map(h => (
                                                <TableCell key={h} sx={{
                                                    fontWeight: 700, fontSize: '0.65rem', color: T.textSec,
                                                    bgcolor: T.bg, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    borderBottom: `1px solid ${T.border}`, py: 1.5, whiteSpace: 'nowrap',
                                                }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invoice.items.map((it, idx) => (
                                            <TableRow key={it.id ?? idx}
                                                sx={{ '&:hover': { bgcolor: '#f8fafc' }, '&:last-child td': { border: 0 } }}>
                                                <TableCell sx={{ color: T.textSec, fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: T.text }}>
                                                        {it.itemName ?? '—'}
                                                    </Typography>
                                                    {it.itemCode && (
                                                        <Typography sx={{ fontSize: '0.7rem', color: T.textSec }}>{it.itemCode}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>{it.hsnCode ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>{it.uom ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{it.invoicedQty}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.unitPrice)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.taxableValue)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.cgstAmount)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.sgstAmount)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.igstAmount)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.cessAmount)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>
                                                    ₹{fmt(it.lineTotal)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {/* Attachments */}
                    <SectionCard title={`Attachments (${attachments.length})`}
                        action={
                            <>
                                <input ref={fileInputRef} type="file" hidden onChange={handleUpload} />
                                <Button size="small" variant="outlined" startIcon={uploadLoading ? <CircularProgress size={14} /> : <CloudUpload />}
                                    disabled={uploadLoading} onClick={() => fileInputRef.current?.click()}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, borderColor: T.border, color: T.textSec,
                                        '&:hover': { borderColor: T.primary, color: T.primary } }}>
                                    {uploadLoading ? 'Uploading…' : 'Attach File'}
                                </Button>
                            </>
                        }>
                        {attachments.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <AttachFile sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                                <Typography sx={{ color: T.textSec, fontSize: '0.85rem' }}>
                                    No attachments yet. Attach the vendor's invoice PDF or any supporting document.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={1}>
                                {attachments.map(att => (
                                    <Stack key={att.id} direction="row" alignItems="center" justifyContent="space-between"
                                        sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${T.border}`, bgcolor: T.bg,
                                            '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f1f5f9' }, transition: 'all 0.1s' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Typography sx={{ fontSize: '1.2rem' }}>{fileIcon(att.originalName ?? att.fileName)}</Typography>
                                            <Box>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: T.text }}>
                                                    {att.originalName ?? att.fileName}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.7rem', color: T.textSec }}>
                                                    {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}{att.uploadedBy ? ` · ${att.uploadedBy}` : ''}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Download">
                                                <IconButton size="small" onClick={() => handleDownload(att)}
                                                    sx={{ color: T.textSec, '&:hover': { color: T.primary } }}>
                                                    <Download sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDeleteAttachment(att.id)}
                                                    sx={{ color: T.textSec, '&:hover': { color: T.error } }}>
                                                    <DeleteOutline sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </SectionCard>

                    {/* Payment history */}
                    {payments.length > 0 && (
                        <SectionCard title={`Payment History (${payments.length})`}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Date', 'Mode', 'Reference', 'Notes', 'Amount', ''].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.65rem', color: T.textSec, bgcolor: T.bg, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.map(p => (
                                        <TableRow key={p.id} sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{fmtDate(p.paymentDate)}</TableCell>
                                            <TableCell>
                                                <Chip label={p.paymentMode} size="small"
                                                    sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18, borderRadius: 1 }} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: T.textSec }}>{p.referenceNumber || '—'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: T.textSec }}>{p.notes || '—'}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>₹{fmt(p.amount)}</TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Delete payment">
                                                    <IconButton size="small" onClick={() => handleDeletePayment(p.id)}
                                                        sx={{ color: '#94a3b8', '&:hover': { color: T.error } }}>
                                                        <DeleteOutline sx={{ fontSize: 15 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </SectionCard>
                    )}
                </Stack>
            </Container>

            <RecordPaymentDialog
                open={showPaymentDialog}
                invoice={invoice}
                onClose={() => setShowPaymentDialog(false)}
                onChanged={load}
            />
        </Box>
    );
}
