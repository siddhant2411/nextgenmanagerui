import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow,
    TextField, Typography, InputAdornment, MenuItem, Tooltip, IconButton, Alert,
} from '@mui/material';
import { Add, Search, Visibility, CheckCircleOutline, CancelOutlined } from '@mui/icons-material';
import {
    getDebitNotes, confirmDebitNote, cancelDebitNote,
} from '../../services/debitNoteService';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';
import { format } from 'date-fns';
import DebitNoteForm from './DebitNoteForm';

const T = {
    primary: '#2563eb', success: '#059669', error: '#dc2626',
    warning: '#d97706', bg: '#f8fafc', text: '#0f172a', textSec: '#64748b',
    border: '#e2e8f0',
};

const STATUS_COLOR = {
    DRAFT:     'default',
    CONFIRMED: 'success',
    CANCELLED: 'error',
};

const REASON_LABEL = {
    DEFECTIVE:          'Defective',
    EXCESS_QUANTITY:    'Excess Qty',
    WRONG_ITEM:         'Wrong Item',
    QUALITY_ISSUE:      'Quality Issue',
    DAMAGED_IN_TRANSIT: 'Damaged in Transit',
    OTHER:              'Other',
};

const fmt = (d) => { try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; } catch { return '—'; } };
const curr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const DebitNoteList = ({ refreshKey, onRefresh }) => {
    const { canAction } = useAuth();
    const canWrite   = canAction(ACTION_KEYS.PURCHASE_WRITE);
    const canConfirm = canAction(ACTION_KEYS.PURCHASE_WRITE);
    const canCancel  = canAction(ACTION_KEYS.PURCHASE_WRITE);

    const [rows,    setRows]    = useState([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(0);
    const [size,    setSize]    = useState(20);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');

    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen,     setFormOpen]     = useState(false);
    const [viewNote,     setViewNote]     = useState(null);  // null = create, object = view

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const resp = await getDebitNotes(page, size);
            setRows(resp.content || []);
            setTotal(resp.totalElements || 0);
        } catch {
            setError('Failed to load debit notes.');
        } finally {
            setLoading(false);
        }
    }, [page, size, refreshKey]);

    useEffect(() => { load(); }, [load]);

    const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

    const handleConfirm = async (id) => {
        try {
            await confirmDebitNote(id);
            flash('Debit note confirmed — stock reduced (goods returned to vendor).');
            load();
            onRefresh?.();   // triggers refreshKey++ in InventoryModule → Stock Register + I/O Register reload
        } catch (e) {
            setError(e?.message || 'Failed to confirm debit note.');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this debit note? If confirmed, the stock adjustment will be reversed.')) return;
        try {
            await cancelDebitNote(id);
            flash('Debit note cancelled.');
            load();
            onRefresh?.();   // reverse stock adjustment also needs to reflect everywhere
        } catch (e) {
            setError(e?.message || 'Failed to cancel debit note.');
        }
    };

    const filtered = statusFilter ? rows.filter(r => r.status === statusFilter) : rows;

    return (
        <Box>
            {/* Toolbar */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={700} color={T.text}>Purchase Returns</Typography>
                    <Chip label={total} size="small" sx={{ bgcolor: '#eff6ff', color: T.primary, fontWeight: 700 }} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        select size="small" value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 140 }}
                        label="Status"
                    >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="DRAFT">Draft</MenuItem>
                        <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </TextField>
                    {canWrite && (
                        <Button
                            variant="contained" startIcon={<Add />} size="small"
                            onClick={() => { setViewNote(null); setFormOpen(true); }}
                            sx={{ bgcolor: T.primary, textTransform: 'none', fontWeight: 600 }}
                        >
                            New Return
                        </Button>
                    )}
                </Stack>
            </Box>

            {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: T.bg }}>
                                <TableRow>
                                    {['DN Number', 'Date', 'Vendor', 'GRN #', 'Return Reason', 'Amount', 'Status', 'Actions'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: T.textSec, py: 1.2 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: T.textSec }}>
                                            No purchase returns found.
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.map((row) => (
                                    <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                        <TableCell sx={{ fontWeight: 600, color: T.primary, fontSize: '0.82rem' }}>
                                            {row.debitNoteNumber}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem' }}>{fmt(row.debitNoteDate)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem' }}>{row.vendorName || '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem' }}>{row.grnNumber || '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem' }}>
                                            <Chip
                                                label={REASON_LABEL[row.returnReason] || row.returnReason}
                                                size="small"
                                                sx={{ fontSize: '0.7rem', bgcolor: '#f1f5f9', color: T.text }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                            {curr(row.totalAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.status}
                                                size="small"
                                                color={STATUS_COLOR[row.status] || 'default'}
                                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title="View Details">
                                                    <IconButton size="small" onClick={() => { setViewNote(row); setFormOpen(true); }}
                                                        sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
                                                        <Visibility fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                                {canConfirm && row.status === 'DRAFT' && (
                                                    <Tooltip title="Confirm & Adjust Stock">
                                                        <IconButton size="small" onClick={() => handleConfirm(row.id)}
                                                            sx={{ border: '1px solid #d1fae5', borderRadius: 1.5, color: T.success }}>
                                                            <CheckCircleOutline fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {canCancel && row.status !== 'CANCELLED' && (
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="small" onClick={() => handleCancel(row.id)}
                                                            sx={{ border: '1px solid #fee2e2', borderRadius: 1.5, color: T.error }}>
                                                            <CancelOutlined fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={size}
                        onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50]}
                        sx={{ borderTop: `1px solid ${T.border}`, fontSize: '0.78rem' }}
                    />
                </Paper>
            )}

            <DebitNoteForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                initialNote={viewNote}
                onSaved={() => { setFormOpen(false); load(); onRefresh?.(); }}
            />
        </Box>
    );
};

export default DebitNoteList;
