import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, Container,
} from '@mui/material';
import {
    ArrowBack, Add, Refresh, CheckCircle, ErrorOutline, Receipt,
    Cancel, CheckCircleOutline, Payments, OpenInNew,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getPurchaseOrder } from '../../services/purchaseOrderService';
import { getVendorInvoicesByPO, postVendorInvoice, cancelVendorInvoice } from '../../services/vendorInvoiceService';
import RecordPaymentDialog from './RecordPaymentDialog';

/* ── Design Tokens (matches Sales UI) ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
};

const STATUS_STYLE = {
    DRAFT:     { color: '#64748b', bg: '#f1f5f9' },
    POSTED:    { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Main Component ────────────────────────────────────────────────────────────
export default function VendorInvoiceList() {
    const navigate = useNavigate();
    const { id: poId } = useParams();
    const [po, setPo] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');
    const [paymentInvoice, setPaymentInvoice] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [poData, invData] = await Promise.all([
                getPurchaseOrder(poId),
                getVendorInvoicesByPO(poId),
            ]);
            setPo(poData);
            setInvoices(invData ?? []);
        } catch {
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    }, [poId]);

    useEffect(() => { load(); }, [load]);

    const handlePost = async (invoiceId) => {
        setActionLoading(invoiceId);
        try { await postVendorInvoice(invoiceId); await load(); }
        catch { } finally { setActionLoading(null); }
    };

    const handleCancel = async (invoiceId) => {
        if (!window.confirm('Cancel this invoice?')) return;
        setActionLoading(invoiceId);
        try { await cancelVendorInvoice(invoiceId); await load(); }
        catch { } finally { setActionLoading(null); }
    };

    const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED');

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: '#0f172a',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.1) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 12,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                <Tooltip title="Back to PO">
                                    <IconButton onClick={() => navigate(`/purchase/${poId}`)}
                                        sx={{ border: '1px solid rgba(255,255,255,0.15)', color: 'white',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
                                        <ArrowBack />
                                    </IconButton>
                                </Tooltip>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        Vendor Invoices
                                    </Typography>
                                    {po && (
                                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                            {po.purchaseOrderNumber} · {po.vendorName ?? '—'}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton onClick={load}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button variant="contained" disableElevation startIcon={<Add />}
                                onClick={() => navigate(`/purchase/${poId}/invoices/new`)}
                                sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 3, fontWeight: 700,
                                    textTransform: 'none', '&:hover': { bgcolor: '#1d4ed8' } }}>
                                Record Invoice
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                {/* PO summary strip */}
                {po && (
                    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                            {[
                                { label: 'PO Total',           value: `₹${fmt(po.grandTotal)}` },
                                { label: 'PO Status',          value: po.status?.replace(/_/g, ' ') },
                                { label: 'Active Invoices',    value: activeInvoices.length },
                            ].map(({ label, value }) => (
                                <Box key={label}>
                                    <Typography sx={{ fontSize: '0.65rem', color: T.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                                        {label}
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, color: T.text, fontSize: '1rem' }}>{value}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                )}

                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                            <CircularProgress />
                        </Box>
                    ) : invoices.length === 0 ? (
                        <Box sx={{ py: 12, textAlign: 'center' }}>
                            <Receipt sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>No invoices recorded</Typography>
                            <Typography sx={{ color: T.textSec, mb: 3 }}>Record the first vendor invoice against this PO.</Typography>
                            <Button variant="contained" disableElevation startIcon={<Add />}
                                sx={{ bgcolor: T.primary, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                                onClick={() => navigate(`/purchase/${poId}/invoices/new`)}>
                                Record Invoice
                            </Button>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Invoice #', 'Date', 'GRN', 'Status', 'Amount', 'Qty Match', 'Amt Match', 'Actions'].map(h => (
                                            <TableCell key={h} sx={{
                                                fontWeight: 700, fontSize: '0.65rem', color: T.textSec,
                                                bgcolor: T.bg, borderBottom: `1px solid ${T.border}`,
                                                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                                            }}>
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {invoices.map(inv => {
                                        const ss = STATUS_STYLE[inv.status] ?? STATUS_STYLE.DRAFT;
                                        const isLoading = actionLoading === inv.id;
                                        return (
                                            <TableRow key={inv.id} hover
                                                onClick={() => navigate(`/purchase/${poId}/invoices/${inv.id}`)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.1s', '&:last-child td': { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: T.text, fontSize: '0.8rem' }}>
                                                        {inv.invoiceNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>
                                                    {fmtDate(inv.invoiceDate)}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: '#475569' }}>
                                                    {inv.grnNumber ?? <Typography component="span" color="text.disabled">—</Typography>}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={inv.status} size="small"
                                                        sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, bgcolor: ss.bg, color: ss.color }} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.text }}>
                                                    ₹{fmt(inv.grandTotal)}
                                                </TableCell>
                                                <TableCell>
                                                    {inv.qtyMismatch
                                                        ? <Tooltip title="Quantity mismatch vs GRN"><ErrorOutline sx={{ fontSize: 16, color: T.warning }} /></Tooltip>
                                                        : <CheckCircle sx={{ fontSize: 16, color: T.success }} />}
                                                </TableCell>
                                                <TableCell>
                                                    {inv.amountMismatch
                                                        ? <Tooltip title="Amount differs from PO total"><ErrorOutline sx={{ fontSize: 16, color: T.warning }} /></Tooltip>
                                                        : <CheckCircle sx={{ fontSize: 16, color: T.success }} />}
                                                </TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="View details">
                                                            <IconButton size="small"
                                                                onClick={() => navigate(`/purchase/${poId}/invoices/${inv.id}`)}
                                                                sx={{ color: T.textSec, '&:hover': { color: T.primary } }}>
                                                                <OpenInNew sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {inv.status === 'DRAFT' && (
                                                            <Tooltip title="Post Invoice">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handlePost(inv.id)}
                                                                    sx={{ color: T.textSec, '&:hover': { color: T.success } }}>
                                                                    {isLoading
                                                                        ? <CircularProgress size={14} />
                                                                        : <CheckCircleOutline sx={{ fontSize: 16 }} />}
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {inv.status === 'POSTED' && (
                                                            <Tooltip title="Record Payment">
                                                                <IconButton size="small"
                                                                    onClick={() => setPaymentInvoice(inv)}
                                                                    sx={{ color: T.textSec, '&:hover': { color: T.primary } }}>
                                                                    <Payments sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {inv.status !== 'CANCELLED' && (
                                                            <Tooltip title="Cancel Invoice">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handleCancel(inv.id)}
                                                                    sx={{ color: T.textSec, '&:hover': { color: T.error } }}>
                                                                    <Cancel sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            </Container>

            <RecordPaymentDialog
                open={!!paymentInvoice}
                invoice={paymentInvoice}
                onClose={() => setPaymentInvoice(null)}
                onChanged={load}
            />
        </Box>
    );
}
