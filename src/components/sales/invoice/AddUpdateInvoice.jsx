import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Alert, Box, Button, Chip, CircularProgress,
    Container, Divider, Grid, IconButton, Paper, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography,
} from '@mui/material';
import { ArrowBack, CheckCircle, Send, Cancel, Payment, LocalShipping, Save, Description, Undo } from '@mui/icons-material';
import {
    getTaxInvoice, createTaxInvoice, markInvoiceSent, markInvoicePaid,
    cancelTaxInvoice, getSalesOrder, getNextInvoiceNumber, downloadTaxInvoicePdf,
} from '../../../services/salesOrderService';
import RaiseCreditNoteDialog from './RaiseCreditNoteDialog';

const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const fmtAmt = (n) => n != null
    ? '₹ ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

const today = () => new Date().toISOString().split('T')[0];

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
    accent:  '#f1f5f9',
};

const STATUS_STYLE = {
    DRAFT:     { color: '#64748b', bg: '#f1f5f9' },
    SENT:      { color: '#2563eb', bg: '#eff6ff' },
    PAID:      { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

export default function AddUpdateInvoice() {
    const navigate = useNavigate();
    const { invoiceId } = useParams();
    const [searchParams] = useSearchParams();
    const soId = searchParams.get('soId');

    const isView = Boolean(invoiceId);

    const [loading, setLoading]       = useState(false);
    const [saving, setSaving]         = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError]           = useState(null);
    const [success, setSuccess]       = useState(null);

    const [invoice, setInvoice]       = useState(null);
    const [so, setSo]                 = useState(null);
    const [nextNumber, setNextNumber] = useState('');
    const [paidInput, setPaidInput]   = useState('');
    const [creditOpen, setCreditOpen] = useState(false);

    const [form, setForm] = useState({
        invoiceDate: today(),
        dueDate: '',
    });

    useEffect(() => {
        if (isView) {
            setLoading(true);
            getTaxInvoice(invoiceId)
                .then(data => { setInvoice(data); setPaidInput(data.paidAmount ?? ''); })
                .catch(() => setError('Failed to load invoice.'))
                .finally(() => setLoading(false));
        } else {
            Promise.all([
                soId ? getSalesOrder(soId) : Promise.resolve(null),
                getNextInvoiceNumber(),
            ]).then(([soData, num]) => {
                if (soData) setSo(soData);
                setNextNumber(num);
            }).catch(() => {});
        }
    }, [invoiceId, soId, isView]);

    const handleCreate = async () => {
        if (!soId) { setError('No Sales Order specified.'); return; }
        setSaving(true);
        setError(null);
        try {
            const created = await createTaxInvoice({
                salesOrderId: Number(soId),
                invoiceDate:  form.invoiceDate || null,
                dueDate:      form.dueDate || null,
            });
            navigate(`/sales/sales-order/invoices/view/${created.id}`);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to create invoice.');
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (fn, label) => {
        setActionLoading(true);
        setError(null);
        try {
            const updated = await fn();
            setInvoice(updated);
            setSuccess(`${label} successful.`);
        } catch (e) {
            setError(e?.response?.data?.message ?? `${label} failed.`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <CircularProgress thickness={5} size={48} sx={{ color: T.primary }} />
        </Box>
    );

    const st = invoice ? (STATUS_STYLE[invoice.status] ?? STATUS_STYLE.DRAFT) : STATUS_STYLE.DRAFT;
    const isActive = invoice && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID';

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
            {/* ── Hero Header ── */}
            <Box sx={{ 
                bgcolor: '#0f172a', 
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 14 
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={3} alignItems="center">
                            <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                <ArrowBack />
                            </IconButton>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                    {isView ? `INV-${invoice?.invoiceNumber}` : 'New Tax Invoice'}
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                                    <Chip label={invoice?.status ?? 'DRAFT'} size="small" 
                                        sx={{ fontWeight: 900, bgcolor: `${st.color}20`, color: st.color, border: `1px solid ${st.color}40`, height: 24 }} />
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                        {invoice?.customerName ?? so?.customerName ?? 'No Customer Selected'}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            {isView ? (
                                <>
                                    <Button variant="outlined" startIcon={<LocalShipping />} 
                                        onClick={() => downloadTaxInvoicePdf(invoice.id, invoice.invoiceNumber)}
                                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none', fontWeight: 700, borderRadius: 2.5, px: 3 }}>
                                        Print Invoice
                                    </Button>
                                    <Button variant="contained" disableElevation startIcon={<Save />} 
                                        onClick={() => downloadTaxInvoicePdf(invoice.id, invoice.invoiceNumber)}
                                        sx={{ bgcolor: T.primary, textTransform: 'none', fontWeight: 800, borderRadius: 2.5, px: 4 }}>
                                        Export PDF
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="contained" disableElevation 
                                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                                    onClick={handleCreate} disabled={saving || !soId}
                                    sx={{ bgcolor: T.success, textTransform: 'none', fontWeight: 800, borderRadius: 2.5, px: 6, py: 1.5, fontSize: '1rem', boxShadow: '0 4px 14px 0 rgba(5, 150, 105, 0.4)', '&:hover': { bgcolor: '#047857' } }}
                                >
                                    {saving ? 'Creating...' : 'Generate Invoice'}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Container>
            </Box>


            <Container maxWidth="xl" sx={{ mt: -8 }}>
                {error   && <Alert severity="error"   onClose={() => setError(null)}   sx={{ mb: 4, borderRadius: 4, fontWeight: 700, boxShadow: '0 10px 40px rgba(220,38,38,0.1)' }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 4, borderRadius: 4, fontWeight: 700, boxShadow: '0 10px 40px rgba(5,150,105,0.1)' }}>{success}</Alert>}

                {!isView && (
                    <Paper elevation={0} sx={{ p: 5, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', mb: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 4, color: T.text, display: 'flex', alignItems: 'center' }}>
                            <Description sx={{ mr: 1.5, color: T.primary }} />
                            Configure Invoice Details
                        </Typography>
                        <Grid container spacing={4}>
                            {so && (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 3, borderRadius: 4, bgcolor: `${T.primary}08`, border: `1px solid ${T.primary}15`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: T.primary, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Linked Sales Order</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: T.text }}>{so.orderNumber}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 800 }}>PAYABLE AMOUNT</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: T.primary }}>{fmtAmt(so.totalPayableAmount)}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth type="date" label="Invoice Date" value={form.invoiceDate}
                                    onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                                    InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth type="date" label="Payment Due Date" value={form.dueDate}
                                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                                    InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                {isView && invoice && (
                    <Grid container spacing={5}>
                        {/* ── Left Side: Document Preview ── */}
                        <Grid item xs={12} lg={8.5}>
                            <Paper elevation={0} sx={{ p: 8, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', minHeight: '1000px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.08)', position: 'relative' }}>
                                {/* Watermark for Status */}
                                {invoice.status === 'PAID' && (
                                    <Box sx={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', border: '8px solid #059669', color: '#059669', px: 6, py: 2, borderRadius: 4, opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
                                        <Typography variant="h1" sx={{ fontWeight: 900 }}>PAID</Typography>
                                    </Box>
                                )}

                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 10, position: 'relative', zIndex: 1 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '3rem', fontWeight: 950, color: T.text, lineHeight: 1, letterSpacing: '-0.05em' }}>TAX INVOICE</Typography>
                                        <Typography sx={{ fontWeight: 800, color: T.primary, fontSize: '1.2rem', mt: 2, letterSpacing: '0.05em' }}>NO: {invoice.invoiceNumber}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 900, color: T.text }}>{invoice.companyName || 'NextGen Manager'}</Typography>
                                        <Typography variant="body2" sx={{ color: T.textSec, whiteSpace: 'pre-line', display: 'block', maxWidth: 320, ml: 'auto', mt: 1.5, lineHeight: 1.6, fontWeight: 500 }}>
                                            {invoice.companyAddress}
                                        </Typography>
                                        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
                                            <Box sx={{ px: 2, py: 0.8, bgcolor: T.bg, borderRadius: 2 }}><Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: T.text }}>GSTIN: {invoice.companyGstin || 'N/A'}</Typography></Box>
                                            <Box sx={{ px: 2, py: 0.8, bgcolor: T.bg, borderRadius: 2 }}><Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: T.text }}>PAN: {invoice.companyPan || 'N/A'}</Typography></Box>
                                        </Stack>
                                    </Box>
                                </Stack>

                                <Grid container spacing={4} sx={{ mb: 8, p: 4, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: T.bg }}>
                                    <Grid item xs={6} md={3}>
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date of Issue</Typography>
                                        <Typography sx={{ fontWeight: 800, mt: 1, fontSize: '1.1rem' }}>{fmtDate(invoice.invoiceDate)}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment Due</Typography>
                                        <Typography sx={{ fontWeight: 800, mt: 1, fontSize: '1.1rem', color: invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' ? T.error : 'inherit' }}>{fmtDate(invoice.dueDate)}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Order Ref</Typography>
                                        <Typography sx={{ fontWeight: 800, mt: 1, fontSize: '1.1rem', color: T.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/sales/sales-order/edit/${invoice.salesOrderId}`)}>{invoice.salesOrderNumber}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</Typography>
                                        <Box sx={{ mt: 1 }}><Chip label={invoice.status} size="small" sx={{ fontWeight: 900, bgcolor: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }} /></Box>
                                    </Grid>
                                </Grid>

                                <Grid container spacing={6} sx={{ mb: 10 }}>
                                    <Grid item xs={12} md={6}>
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 950, color: T.textSec, mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>BILL TO</Typography>
                                        <Typography sx={{ fontWeight: 950, fontSize: '1.4rem', color: T.text }}>{invoice.customerName}</Typography>
                                        <Typography sx={{ color: T.textSec, fontSize: '0.95rem', whiteSpace: 'pre-line', mt: 1.5, lineHeight: 1.7, fontWeight: 500 }}>{invoice.customerAddress}</Typography>
                                        {invoice.customerGstin && <Box sx={{ display: 'inline-flex', mt: 3, px: 2, py: 0.8, border: `1.5px solid ${T.border}`, borderRadius: 2 }}><Typography sx={{ fontSize: '0.8rem', fontWeight: 900 }}>GSTIN: {invoice.customerGstin}</Typography></Box>}
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 950, color: T.textSec, mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SHIP TO</Typography>
                                        <Typography sx={{ color: T.textSec, fontSize: '0.95rem', whiteSpace: 'pre-line', lineHeight: 1.7, fontWeight: 500 }}>{invoice.deliveryAddress || 'Same as billing address'}</Typography>
                                    </Grid>
                                </Grid>

                                <TableContainer sx={{ mb: 10 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ borderBottom: `2.5px solid ${T.text}` }}>
                                                <TableCell sx={{ fontWeight: 950, fontSize: '0.8rem', color: T.text, px: 0, pb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 950, fontSize: '0.8rem', color: T.text, pb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 950, fontSize: '0.8rem', color: T.text, pb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Price</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 950, fontSize: '0.8rem', color: T.text, pb: 2.5, pr: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {invoice.items?.map((item, i) => (
                                                <TableRow key={item.id || i} sx={{ '&:hover': { bgcolor: `${T.primary}04` } }}>
                                                    <TableCell sx={{ py: 3.5, px: 0, borderBottom: `1px solid ${T.border}` }}>
                                                        <Typography sx={{ fontWeight: 900, color: T.text, fontSize: '1.05rem' }}>{item.inventoryItemName}</Typography>
                                                        <Typography sx={{ fontSize: '0.85rem', color: T.textSec, mt: 0.8, fontWeight: 500 }}>{item.description || 'Standard high-quality component dispatch.'}</Typography>
                                                        {item.serialNumbers && (
                                                            <Box sx={{ mt: 2, display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: `${T.primary}10`, borderRadius: 1.5 }}>
                                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: T.primary }}>S/N: {item.serialNumbers}</Typography>
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', borderBottom: `1px solid ${T.border}` }}>{item.qty}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', borderBottom: `1px solid ${T.border}` }}>{fmtAmt(item.pricePerUnit)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 950, fontSize: '1rem', borderBottom: `1px solid ${T.border}`, pr: 0 }}>{fmtAmt((item.qty ?? 0) * (item.pricePerUnit ?? 0))}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Box sx={{ mt: 'auto', pt: 6, borderTop: `2.5px solid ${T.text}` }}>
                                    <Grid container spacing={8}>
                                        <Grid item xs={12} md={7}>
                                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 950, color: T.textSec, mb: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Terms & Conditions</Typography>
                                            <Typography variant="body2" sx={{ color: T.textSec, lineHeight: 1.8, fontWeight: 500 }}>
                                                • Please quote the invoice number for all future correspondence.<br />
                                                • Goods once sold will not be accepted back or exchanged.<br />
                                                • Interest at 18% p.a. will be charged if payment is not received by the due date.<br />
                                                • Subject to local jurisdiction and tax regulations.
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={5}>
                                            <Stack spacing={2.5}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography sx={{ color: T.textSec, fontWeight: 800, fontSize: '0.9rem' }}>Taxable Value</Typography>
                                                    <Typography sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{fmtAmt(invoice.taxableValue)}</Typography>
                                                </Stack>
                                                {invoice.cgstAmount > 0 && (
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography sx={{ color: T.textSec, fontWeight: 800, fontSize: '0.9rem' }}>CGST Total</Typography>
                                                        <Typography sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{fmtAmt(invoice.cgstAmount)}</Typography>
                                                    </Stack>
                                                )}
                                                {invoice.sgstAmount > 0 && (
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography sx={{ color: T.textSec, fontWeight: 800, fontSize: '0.9rem' }}>SGST Total</Typography>
                                                        <Typography sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{fmtAmt(invoice.sgstAmount)}</Typography>
                                                    </Stack>
                                                )}
                                                {invoice.igstAmount > 0 && (
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography sx={{ color: T.textSec, fontWeight: 800, fontSize: '0.9rem' }}>IGST Total</Typography>
                                                        <Typography sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{fmtAmt(invoice.igstAmount)}</Typography>
                                                    </Stack>
                                                )}
                                                <Divider sx={{ borderBottomWidth: 2, borderColor: T.text }} />
                                                <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
                                                    <Typography sx={{ fontWeight: 950, fontSize: '1.4rem', color: T.text }}>TOTAL</Typography>
                                                    <Typography sx={{ fontWeight: 950, fontSize: '1.6rem', color: T.primary }}>{fmtAmt(invoice.totalPayableAmount)}</Typography>
                                                </Stack>
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* ── Right Side: Sidebar ── */}
                        <Grid item xs={12} lg={3.5}>
                            <Stack spacing={4} sx={{ position: 'sticky', top: 40 }}>
                                {/* Payment Management Card */}
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Typography sx={{ fontWeight: 900, mb: 3, color: T.text, fontSize: '1.1rem' }}>Payment Status</Typography>
                                    <Stack spacing={3} sx={{ mb: 4 }}>
                                        <Box sx={{ p: 2.5, borderRadius: 4, bgcolor: `${T.success}08`, border: `1px solid ${T.success}20` }}>
                                            <Typography variant="caption" sx={{ color: T.success, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Paid</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 950, color: T.success, mt: 0.5 }}>{fmtAmt(invoice.paidAmount)}</Typography>
                                        </Box>
                                        <Box sx={{ p: 2.5, borderRadius: 4, bgcolor: `${T.error}08`, border: `1px solid ${T.error}20` }}>
                                            <Typography variant="caption" sx={{ color: T.error, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Balance Due</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 950, color: T.error, mt: 0.5 }}>{fmtAmt((invoice.totalPayableAmount ?? 0) - (invoice.paidAmount ?? 0))}</Typography>
                                        </Box>
                                    </Stack>

                                    {isActive && (
                                        <Stack spacing={2}>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Record Transaction</Typography>
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField fullWidth size="small" placeholder="Amount" value={paidInput}
                                                    onChange={e => setPaidInput(e.target.value)}
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: T.bg } }} />
                                                <IconButton disabled={!paidInput || actionLoading} 
                                                    onClick={() => { runAction(() => markInvoicePaid(invoice.id, parseFloat(paidInput)), 'Payment'); setPaidInput(''); }}
                                                    sx={{ bgcolor: T.primary, color: 'white', '&:hover': { bgcolor: '#1d4ed8' }, borderRadius: 3, width: 45, height: 45 }}>
                                                    <Payment />
                                                </IconButton>
                                            </Stack>
                                            <Button fullWidth variant="outlined" sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, py: 1.2, color: T.success, borderColor: T.success, '&:hover': { bgcolor: `${T.success}05`, borderColor: T.success } }}
                                                onClick={() => runAction(() => markInvoicePaid(invoice.id), 'Full Payment')}>
                                                Mark Fully Paid
                                            </Button>
                                        </Stack>
                                    )}
                                </Paper>

                                {/* Workflow Actions */}
                                {isActive && (
                                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                        <Typography sx={{ fontWeight: 900, mb: 3, color: T.text, fontSize: '1.1rem' }}>Workflow Actions</Typography>
                                        <Stack spacing={2.5}>
                                            {invoice.status === 'DRAFT' && (
                                                <Button fullWidth variant="contained" disableElevation startIcon={<Send />}
                                                    onClick={() => runAction(() => markInvoiceSent(invoice.id), 'Mark Sent')}
                                                    sx={{ bgcolor: T.primary, borderRadius: 3, fontWeight: 800, py: 1.5, fontSize: '0.9rem' }}>
                                                    Finalize & Send
                                                </Button>
                                            )}
                                            <Button fullWidth variant="outlined" color="error" startIcon={<Cancel />}
                                                onClick={() => window.confirm('Cancel this invoice?') && runAction(() => cancelTaxInvoice(invoice.id), 'Cancel')}
                                                sx={{ fontWeight: 800, borderRadius: 3, py: 1.5, fontSize: '0.9rem' }}>
                                                Void Invoice
                                            </Button>
                                        </Stack>
                                    </Paper>
                                )}

                                {/* Returns — a credit note can be raised after the invoice is issued (incl. paid) */}
                                {invoice.status !== 'CANCELLED' && (
                                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                        <Typography sx={{ fontWeight: 900, mb: 1, color: T.text, fontSize: '1.1rem' }}>Returns</Typography>
                                        <Typography variant="body2" sx={{ color: T.textSec, mb: 3, fontWeight: 500 }}>
                                            Issue a credit note for returned or short-supplied goods. Posts a reversing entry to the books.
                                        </Typography>
                                        <Button fullWidth variant="outlined" startIcon={<Undo />}
                                            onClick={() => setCreditOpen(true)}
                                            sx={{ fontWeight: 800, borderRadius: 3, py: 1.5, fontSize: '0.9rem', color: T.warning, borderColor: T.warning, '&:hover': { bgcolor: `${T.warning}08`, borderColor: T.warning } }}>
                                            Raise Credit Note
                                        </Button>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </Container>

            {invoice && (
                <RaiseCreditNoteDialog
                    open={creditOpen}
                    onClose={() => setCreditOpen(false)}
                    invoice={invoice}
                    onCreated={(cn) => setSuccess(`Credit note ${cn?.creditNoteNumber ?? ''} issued and posted to the books.`)}
                />
            )}
        </Box>
    );
}
