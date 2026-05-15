import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert,
} from '@mui/material';
import { ArrowBack, Add, Refresh, CheckCircle, ErrorOutline, Receipt } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getPurchaseOrder } from '../../services/purchaseOrderService';
import { getVendorInvoicesByPO, postVendorInvoice, cancelVendorInvoice } from '../../services/vendorInvoiceService';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';
const PRIMARY_LIGHT = '#f0f7ff';

const STATUS_STYLE = {
    DRAFT:     { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
    POSTED:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    CANCELLED: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAmount = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function VendorInvoiceList() {
    const navigate = useNavigate();
    const { id: poId } = useParams();
    const [po, setPo] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');

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
        } catch (e) {
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    }, [poId]);

    useEffect(() => { load(); }, [load]);

    const handlePost = async (invoiceId) => {
        setActionLoading(invoiceId);
        try {
            await postVendorInvoice(invoiceId);
            await load();
        } catch {
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (invoiceId) => {
        if (!window.confirm('Cancel this invoice?')) return;
        setActionLoading(invoiceId);
        try {
            await cancelVendorInvoice(invoiceId);
            await load();
        } catch {
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Tooltip title="Back to PO">
                        <IconButton onClick={() => navigate(`/purchase/${poId}`)}
                            sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                            <ArrowBack />
                        </IconButton>
                    </Tooltip>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em' }}>
                            Vendor Invoices
                        </Typography>
                        {po && (
                            <Typography sx={{ color: '#64748b', fontSize: '0.88rem' }}>
                                {po.purchaseOrderNumber} · {po.vendorName ?? '—'}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={load} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" disableElevation startIcon={<Add />}
                        sx={{ background: PRIMARY, borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(21,101,192,0.2)', '&:hover': { background: '#0d47a1' } }}
                        onClick={() => navigate(`/purchase/${poId}/invoices/new`)}>
                        Record Invoice
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            {/* PO summary strip */}
            {po && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap">
                        {[
                            { label: 'PO Total', value: fmtAmount(po.grandTotal) },
                            { label: 'PO Status', value: po.status?.replace(/_/g, ' ') },
                            { label: 'Invoices Recorded', value: invoices.filter(i => i.status !== 'CANCELLED').length },
                        ].map(({ label, value }) => (
                            <Box key={label}>
                                <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {label}
                                </Typography>
                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{value}</Typography>
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress thickness={5} sx={{ color: PRIMARY }} />
                </Box>
            ) : invoices.length === 0 ? (
                <Paper elevation={0} sx={{ py: 10, border: `1px dashed ${BORDER}`, borderRadius: 3, bgcolor: 'white', textAlign: 'center' }}>
                    <Receipt sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>No invoices recorded</Typography>
                    <Typography sx={{ color: '#64748b', mb: 3 }}>Record the first vendor invoice against this PO.</Typography>
                    <Button variant="contained" disableElevation startIcon={<Add />}
                        sx={{ background: PRIMARY, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                        onClick={() => navigate(`/purchase/${poId}/invoices/new`)}>
                        Record Invoice
                    </Button>
                </Paper>
            ) : (
                <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2.5, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    {['Invoice #', 'Date', 'GRN', 'Status', 'Amount', 'Qty Match', 'Amount Match', 'Actions'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.8, borderBottom: `1px solid ${BORDER}` }}>
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
                                        <TableRow key={inv.id} sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#0f2744', fontSize: '0.88rem', py: 2 }}>
                                                {inv.invoiceNumber}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {fmtDate(inv.invoiceDate)}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.82rem', color: '#475569' }}>
                                                {inv.grnNumber ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={inv.status} size="small"
                                                    sx={{ bgcolor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                                                {fmtAmount(inv.grandTotal)}
                                            </TableCell>
                                            <TableCell>
                                                {inv.qtyMismatch
                                                    ? <Tooltip title="Quantity mismatch vs GRN"><ErrorOutline sx={{ fontSize: 18, color: '#f59e0b' }} /></Tooltip>
                                                    : <CheckCircle sx={{ fontSize: 18, color: '#22c55e' }} />}
                                            </TableCell>
                                            <TableCell>
                                                {inv.amountMismatch
                                                    ? <Tooltip title="Amount differs from PO total"><ErrorOutline sx={{ fontSize: 18, color: '#f59e0b' }} /></Tooltip>
                                                    : <CheckCircle sx={{ fontSize: 18, color: '#22c55e' }} />}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    {inv.status === 'DRAFT' && (
                                                        <Button size="small" variant="outlined" disableElevation
                                                            disabled={isLoading}
                                                            onClick={() => handlePost(inv.id)}
                                                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5,
                                                                borderColor: '#22c55e', color: '#22c55e', '&:hover': { bgcolor: '#f0fdf4', borderColor: '#22c55e' } }}>
                                                            Post
                                                        </Button>
                                                    )}
                                                    {inv.status !== 'CANCELLED' && (
                                                        <Button size="small" variant="text" disabled={isLoading}
                                                            onClick={() => handleCancel(inv.id)}
                                                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: '#ef4444',
                                                                '&:hover': { bgcolor: '#fef2f2' } }}>
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
}
