import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, TextField, InputAdornment, Pagination,
} from '@mui/material';
import {
    Add, Refresh, Search, NoteAlt, CheckCircleOutline, Cancel, OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDebitNotes, confirmDebitNote, cancelDebitNote } from '../../services/debitNoteService';
import { useViewState } from '../../commonTools/useViewState';
import {
    T, STATUS, TABLE, chipSx, heroButtonSx, heroCtaSx,
    fmtDate, humanize,
} from '../../theme/moduleTokens';
import ModuleHero from '../ui/moduleshell/ModuleHero';
import ModuleBody from '../ui/moduleshell/ModuleBody';

const STATUS_STYLE = {
    DRAFT:     { color: T.ink2,          bg: T.ruleSoft },
    CONFIRMED: { color: STATUS.good,     bg: STATUS.goodBg },
    CANCELLED: { color: STATUS.critical, bg: STATUS.criticalBg },
};

/** Paise matter on a debit note, so this is the two-decimal formatter, not the Cr/L one. */
const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

/* Route namespace for preserved search/page — see commonTools/useViewState. */
const VIEW_STATE_NS = '/purchase/debit-notes';

export default function DebitNoteList() {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useViewState(VIEW_STATE_NS, 'search', '');
    const [page, setPage] = useViewState(VIEW_STATE_NS, 'page', 0);
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
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Debit Notes"
                subtitle="Vendor returns and purchase adjustments."
                onBack={() => navigate('/purchase')}
                backLabel="Back to purchase orders"
                actions={
                    <>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={heroButtonSx}>
                            Refresh
                        </Button>
                        <Button
                            variant="contained" disableElevation startIcon={<Add />}
                            onClick={() => navigate('/purchase/debit-notes/new')}
                            sx={heroCtaSx}
                        >
                            New Debit Note
                        </Button>
                    </>
                }
            />

            <ModuleBody>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.rule}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                    {/* Toolbar */}
                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${T.rule}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: T.ink, mb: 0.5 }}>
                                {search ? 'No matching debit notes' : 'No debit notes yet'}
                            </Typography>
                            <Typography sx={{ color: T.ink2, mb: 3 }}>
                                {search ? 'Try a different search term.' : 'Create a debit note to record vendor returns.'}
                            </Typography>
                            {!search && (
                                <Button variant="contained" disableElevation startIcon={<Add />}
                                    sx={{ bgcolor: T.accent, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
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
                                            <TableCell key={h} sx={TABLE.head}>
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
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: T.ink, fontSize: '0.8rem' }}>
                                                        {dn.debitNoteNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.ink2 }}>
                                                    {fmtDate(dn.debitNoteDate)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', fontSize: '0.78rem' }}>
                                                        {dn.vendorName ?? '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem' }}>
                                                    {dn.purchaseOrderNumber
                                                        ? <Typography variant="body2" sx={{ color: T.accent, fontWeight: 600, fontSize: '0.75rem' }}>{dn.purchaseOrderNumber}</Typography>
                                                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.78rem', color: T.ink2 }}>
                                                    {humanize(dn.returnReason)}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
                                                    ₹ {fmt(dn.totalAmount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={humanize(dn.status)} size="small" sx={chipSx(ss.color, ss.bg)} />
                                                </TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="View details">
                                                            <IconButton size="small"
                                                                onClick={() => navigate(`/purchase/debit-notes/${dn.id}`)}
                                                                sx={{ color: T.ink2, '&:hover': { color: T.accent } }}>
                                                                <OpenInNew sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {dn.status === 'DRAFT' && (
                                                            <Tooltip title="Confirm — reduces stock">
                                                                <IconButton size="small" disabled={isLoading}
                                                                    onClick={() => handleConfirm(dn.id)}
                                                                    sx={{ color: T.ink2, '&:hover': { color: STATUS.good } }}>
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
        </Box>
    );
}
