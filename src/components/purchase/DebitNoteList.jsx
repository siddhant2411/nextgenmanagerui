import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, TextField, InputAdornment, Pagination,
    Container,
} from '@mui/material';
import {
    Add, Refresh, Search, NoteAlt, CheckCircleOutline, Cancel, OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDebitNotes, confirmDebitNote, cancelDebitNote } from '../../services/debitNoteService';

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
    CONFIRMED: { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};
const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
const fmtReason = (r) => r ? r.replace(/_/g, ' ') : '—';

export default function DebitNoteList() {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getDebitNotes(page, 20);
            setNotes(data?.content ?? data ?? []);
            setTotalPages(data?.totalPages ?? 0);
        } catch {
            setError('Failed to load debit notes.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirm this debit note? This will reduce inventory stock.')) return;
        setActionLoading(id);
        try {
            await confirmDebitNote(id);
            await load();
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to confirm debit note.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this debit note?')) return;
        setActionLoading(id);
        try {
            await cancelDebitNote(id);
            await load();
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to cancel debit note.');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = notes.filter(n =>
        !search ||
        n.debitNoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
        n.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        n.purchaseOrderNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* Dark hero header */}
            <Box sx={{
                bgcolor: '#0f172a',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5,150,105,0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 12,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                Debit Notes
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                Vendor returns and purchase adjustments
                            </Typography>
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
                                onClick={() => navigate('/purchase/debit-notes/new')}
                                sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 3, fontWeight: 700,
                                    textTransform: 'none', '&:hover': { bgcolor: '#1d4ed8' } }}>
                                New Debit Note
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                    {/* Toolbar */}
                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextField size="small" placeholder="Search by note #, vendor, or PO…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>,
                            }} />
                        {totalPages > 1 && (
                            <Pagination count={totalPages} page={page + 1}
                                onChange={(_, v) => setPage(v - 1)}
                                color="primary" shape="rounded" size="small" />
                        )}
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                            <CircularProgress />
                        </Box>
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 12, textAlign: 'center' }}>
                            <NoteAlt sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>
                                {search ? 'No matching debit notes' : 'No debit notes yet'}
                            </Typography>
                            <Typography sx={{ color: T.textSec, mb: 3 }}>
                                {search ? 'Try a different search term.' : 'Create a debit note to record vendor returns.'}
                            </Typography>
                            {!search && (
                                <Button variant="contained" disableElevation startIcon={<Add />}
                                    sx={{ bgcolor: T.primary, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                                    onClick={() => navigate('/purchase/debit-notes/new')}>
                                    New Debit Note
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Note #', 'Date', 'Vendor', 'PO', 'Reason', 'Total', 'Status', 'Actions'].map(h => (
                                            <TableCell key={h} sx={{
                                                fontWeight: 700, fontSize: '0.65rem', color: T.textSec,
                                                bgcolor: T.bg, borderBottom: `1px solid ${T.border}`,
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                            }}>
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map(dn => {
                                        const ss = STATUS_STYLE[dn.status] ?? STATUS_STYLE.DRAFT;
                                        const isLoading = actionLoading === dn.id;
                                        return (
                                            <TableRow key={dn.id} hover
                                                onClick={() => navigate(`/purchase/debit-notes/${dn.id}`)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.1s', '&:last-child td': { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: T.text, fontSize: '0.8rem' }}>
                                                        {dn.debitNoteNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>
                                                    {fmtDate(dn.debitNoteDate)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', fontSize: '0.78rem' }}>
                                                        {dn.vendorName ?? '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>
                                                    {dn.purchaseOrderNumber
                                                        ? <Typography variant="body2" sx={{ color: T.primary, fontWeight: 600, fontSize: '0.75rem' }}>{dn.purchaseOrderNumber}</Typography>
                                                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.textSec }}>
                                                    {fmtReason(dn.returnReason)}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
                                                    ₹ {fmt(dn.totalAmount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={dn.status} size="small"
                                                        sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, bgcolor: ss.bg, color: ss.color }} />
                                                </TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="View details">
                                                            <IconButton size="small"
                                                                onClick={() => navigate(`/purchase/debit-notes/${dn.id}`)}
                                                                sx={{ color: T.textSec, '&:hover': { color: T.primary } }}>
                                                                <OpenInNew sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {dn.status === 'DRAFT' && (
                                                            <Tooltip title="Confirm — reduces stock">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handleConfirm(dn.id)}
                                                                    sx={{ color: T.textSec, '&:hover': { color: T.success } }}>
                                                                    {isLoading
                                                                        ? <CircularProgress size={14} />
                                                                        : <CheckCircleOutline sx={{ fontSize: 16 }} />}
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {dn.status !== 'CANCELLED' && (
                                                            <Tooltip title="Cancel">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handleCancel(dn.id)}
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
        </Box>
    );
}
