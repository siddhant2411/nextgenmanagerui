import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert,
} from '@mui/material';
import {
    Add, Refresh, CheckCircle, ErrorOutline, Receipt,
    Cancel, CheckCircleOutline, Payments, OpenInNew,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getPurchaseOrder } from '../../services/purchaseOrderService';
import { getVendorInvoicesByPO, postVendorInvoice, cancelVendorInvoice } from '../../services/vendorInvoiceService';
import RecordPaymentDialog from './RecordPaymentDialog';
import {
    T, STATUS, TABLE, chipSx, heroButtonSx, heroCtaSx,
    fmtDate, humanize,
} from '../../theme/moduleTokens';
import ModuleHero from '../ui/moduleshell/ModuleHero';
import ModuleBody from '../ui/moduleshell/ModuleBody';

const STATUS_STYLE = {
    DRAFT:     { color: T.ink2,          bg: T.ruleSoft },
    POSTED:    { color: STATUS.good,     bg: STATUS.goodBg },
    CANCELLED: { color: STATUS.critical, bg: STATUS.criticalBg },
};

/** Paise matter on an invoice line, so this is the two-decimal formatter, not the Cr/L one. */
const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

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
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Vendor Invoices"
                subtitle={po ? `${po.purchaseOrderNumber} · ${po.vendorName ?? 'Unknown vendor'}` : 'Invoices recorded against this purchase order'}
                onBack={() => navigate(`/purchase/${poId}`)}
                backLabel="Back to the purchase order"
                actions={
                    <>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={heroButtonSx}>
                            Refresh
                        </Button>
                        <Button
                            variant="contained" disableElevation startIcon={<Add />}
                            onClick={() => navigate(`/purchase/${poId}/invoices/new`)}
                            sx={heroCtaSx}
                        >
                            Record Invoice
                        </Button>
                    </>
                }
            />

            <ModuleBody>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                {/* PO summary strip */}
                {po && (
                    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                            {[
                                { label: 'PO Total',           value: `₹${fmt(po.grandTotal)}` },
                                { label: 'PO Status',          value: humanize(po.status) },
                                { label: 'Active Invoices',    value: activeInvoices.length },
                            ].map(({ label, value }) => (
                                <Box key={label}>
                                    <Typography sx={{ fontSize: '0.65rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                                        {label}
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, color: T.ink, fontSize: '1rem' }}>{value}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                )}

                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                            <CircularProgress />
                        </Box>
                    ) : invoices.length === 0 ? (
                        <Box sx={{ py: 12, textAlign: 'center' }}>
                            <Receipt sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: T.ink, mb: 0.5 }}>No invoices recorded</Typography>
                            <Typography sx={{ color: T.ink2, mb: 3 }}>Record the first vendor invoice against this PO.</Typography>
                            <Button variant="contained" disableElevation startIcon={<Add />}
                                sx={{ bgcolor: T.accent, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
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
                                            <TableCell key={h} sx={TABLE.head}>
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
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: T.ink, fontSize: '0.8rem' }}>
                                                        {inv.invoiceNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.ink2 }}>
                                                    {fmtDate(inv.invoiceDate)}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: '#475569' }}>
                                                    {inv.grnNumber ?? <Typography component="span" color="text.disabled">—</Typography>}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={humanize(inv.status)} size="small" sx={chipSx(ss.color, ss.bg)} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.ink }}>
                                                    ₹{fmt(inv.grandTotal)}
                                                </TableCell>
                                                <TableCell>
                                                    {inv.qtyMismatch
                                                        ? <Tooltip title="Quantity mismatch vs GRN"><ErrorOutline sx={{ fontSize: 16, color: STATUS.warning }} /></Tooltip>
                                                        : <CheckCircle sx={{ fontSize: 16, color: STATUS.good }} />}
                                                </TableCell>
                                                <TableCell>
                                                    {inv.amountMismatch
                                                        ? <Tooltip title="Amount differs from PO total"><ErrorOutline sx={{ fontSize: 16, color: STATUS.warning }} /></Tooltip>
                                                        : <CheckCircle sx={{ fontSize: 16, color: STATUS.good }} />}
                                                </TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="View details">
                                                            <IconButton size="small"
                                                                onClick={() => navigate(`/purchase/${poId}/invoices/${inv.id}`)}
                                                                sx={{ color: T.ink2, '&:hover': { color: T.accent } }}>
                                                                <OpenInNew sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {inv.status === 'DRAFT' && (
                                                            <Tooltip title="Post Invoice">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handlePost(inv.id)}
                                                                    sx={{ color: T.ink2, '&:hover': { color: STATUS.good } }}>
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
                                                                    sx={{ color: T.ink2, '&:hover': { color: T.accent } }}>
                                                                    <Payments sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {inv.status !== 'CANCELLED' && (
                                                            <Tooltip title="Cancel Invoice">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handleCancel(inv.id)}
                                                                    sx={{ color: T.ink2, '&:hover': { color: STATUS.critical } }}>
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
            </ModuleBody>

            <RecordPaymentDialog
                open={!!paymentInvoice}
                invoice={paymentInvoice}
                onClose={() => setPaymentInvoice(null)}
                onChanged={load}
            />
        </Box>
    );
}
