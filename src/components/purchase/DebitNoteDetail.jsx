import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, Divider, Container, Grid,
} from '@mui/material';
import { ArrowBack, CheckCircleOutline, Cancel, Refresh, NoteAlt } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getDebitNote, confirmDebitNote, cancelDebitNote } from '../../services/debitNoteService';
import { T, STATUS, SHELL } from '../../theme/moduleTokens';


const STATUS_STYLE = {
    DRAFT:     { color: '#64748b', bg: '#f1f5f9' },
    CONFIRMED: { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtReason = (r) => r ? r.replace(/_/g, ' ') : '—';

const SectionCard = ({ title, children }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2.5 }}>
            {title}
        </Typography>
        {children}
    </Paper>
);

export default function DebitNoteDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await getDebitNote(id);
            setNote(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to load debit note.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleConfirm = async () => {
        if (!window.confirm('Confirm this debit note? This will reduce inventory stock.')) return;
        setActionLoading('confirm');
        try { await confirmDebitNote(id); await load(); }
        catch (e) { setError(e?.response?.data?.message ?? 'Failed to confirm.'); }
        finally { setActionLoading(''); }
    };

    const handleCancel = async () => {
        if (!window.confirm('Cancel this debit note?')) return;
        setActionLoading('cancel');
        try { await cancelDebitNote(id); await load(); }
        catch (e) { setError(e?.response?.data?.message ?? 'Failed to cancel.'); }
        finally { setActionLoading(''); }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!note) {
        return (
            <Box sx={{ bgcolor: T.ground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}
                    <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchase/debit-notes')}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Back to Debit Notes
                    </Button>
                </Box>
            </Box>
        );
    }

    const ss = STATUS_STYLE[note.status] ?? STATUS_STYLE.DRAFT;

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh', pb: 10 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: SHELL.heroBg,
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 15,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Tooltip title="Back to Debit Notes">
                                <IconButton onClick={() => navigate('/purchase/debit-notes')}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                                    <NoteAlt sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }} />
                                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        {note.debitNoteNumber}
                                    </Typography>
                                    <Chip label={note.status} size="small"
                                        sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, bgcolor: ss.bg, color: ss.color }} />
                                </Stack>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                    {note.vendorName ?? '—'} · {fmtDate(note.debitNoteDate)} · {fmtReason(note.returnReason)}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Tooltip title="Refresh">
                                <IconButton onClick={load}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            {note.status === 'DRAFT' && (
                                <Button variant="contained" disableElevation
                                    startIcon={actionLoading === 'confirm' ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline />}
                                    disabled={!!actionLoading} onClick={handleConfirm}
                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 3, bgcolor: STATUS.good, px: 3,
                                        '&:hover': { bgcolor: '#047857' } }}>
                                    Confirm
                                </Button>
                            )}
                            {note.status !== 'CANCELLED' && (
                                <Tooltip title="Cancel Debit Note">
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
                    {/* Details + Totals */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <SectionCard title="Debit Note Details">
                                <Grid container spacing={2}>
                                    {[
                                        { label: 'Debit Note #',    value: note.debitNoteNumber },
                                        { label: 'Date',            value: fmtDate(note.debitNoteDate) },
                                        { label: 'Vendor',          value: note.vendorName ?? '—' },
                                        { label: 'Purchase Order',  value: note.purchaseOrderNumber ?? '—' },
                                        { label: 'Linked GRN',      value: note.grnNumber ?? '—' },
                                        { label: 'Return Reason',   value: fmtReason(note.returnReason) },
                                        { label: 'Created By',      value: note.createdBy ?? '—' },
                                        { label: 'Created Date',    value: fmtDate(note.createdDate) },
                                    ].map(({ label, value }) => (
                                        <Grid item xs={6} key={label}>
                                            <Typography sx={{ fontSize: '0.7rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.3 }}>
                                                {label}
                                            </Typography>
                                            <Typography sx={{ fontWeight: 600, color: T.ink, fontSize: '0.88rem' }}>{value}</Typography>
                                        </Grid>
                                    ))}
                                    {note.remarks && (
                                        <Grid item xs={12}>
                                            <Typography sx={{ fontSize: '0.7rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.3 }}>
                                                Remarks
                                            </Typography>
                                            <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>{note.remarks}</Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </SectionCard>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <SectionCard title="Amount Summary">
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Subtotal</Typography>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>₹{fmt(note.subtotal)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Total GST</Typography>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>₹{fmt(note.totalGstAmount)}</Typography>
                                    </Stack>
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.ink }}>Total Amount</Typography>
                                        <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: T.ink }}>₹{fmt(note.totalAmount)}</Typography>
                                    </Stack>
                                </Stack>
                            </SectionCard>
                        </Grid>
                    </Grid>

                    {/* Line items */}
                    {note.items?.length > 0 && (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ p: 3, pb: 0 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
                                    Returned Items ({note.items.length})
                                </Typography>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['#', 'Item', 'Code', 'Qty', 'Rate', 'GST %', 'GST Amt', 'Total', 'Warehouse', 'Remarks'].map(h => (
                                                <TableCell key={h} sx={{
                                                    fontWeight: 700, fontSize: '0.65rem', color: T.ink2,
                                                    bgcolor: T.ground, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    borderBottom: `1px solid ${T.rule}`, py: 1.5, whiteSpace: 'nowrap',
                                                }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {note.items.map((it, idx) => (
                                            <TableRow key={it.id ?? idx}
                                                sx={{ '&:hover': { bgcolor: '#f8fafc' }, '&:last-child td': { border: 0 } }}>
                                                <TableCell sx={{ color: T.ink2, fontSize: '0.75rem' }}>{it.lineNumber ?? idx + 1}</TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: T.ink }}>
                                                        {it.itemName ?? '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', color: T.ink2 }}>{it.itemCode ?? '—'}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{it.returnedQty}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.rate)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.ink2 }}>{it.gstRate}%</TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>₹{fmt(it.gstAmount)}</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: T.ink }}>₹{fmt(it.totalAmount)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', color: T.ink2 }}>{it.warehouseFrom ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', color: T.ink2, maxWidth: 140 }}>{it.remarks ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
