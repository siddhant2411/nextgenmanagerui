import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow,
    TextField, Typography, InputAdornment, MenuItem, Tooltip, IconButton,
} from '@mui/material';
import { Add, Search, Visibility } from '@mui/icons-material';
import { searchGRNs, resolveApiErrorMessage } from '../../services/grnService';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';
import { format } from 'date-fns';
import GRNForm from './GRNForm';

const statusColor = (s) => {
    switch (s) {
        case 'COMPLETED': return 'success';
        case 'SUBMITTED': return 'warning';
        case 'DRAFT':     return 'default';
        case 'CANCELLED': return 'error';
        default:          return 'default';
    }
};

const GRNList = ({ refreshKey }) => {
    const { canAction } = useAuth();
    const canWrite = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [grnFilter, setGrnFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [viewGrn, setViewGrn] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await searchGRNs({
                grnNumber: grnFilter || undefined,
                status: statusFilter || undefined,
                page,
                size,
            });
            setRows(resp.content || []);
            setTotal(resp.totalElements || 0);
        } catch (err) {
            setError(resolveApiErrorMessage(err, 'Failed to load GRNs.'));
        } finally {
            setLoading(false);
        }
    }, [grnFilter, statusFilter, page, size, refreshKey]);

    useEffect(() => { load(); }, [load]);

    const handleNewGRN = () => {
        setViewGrn(null);
        setFormOpen(true);
    };

    const handleView = (grn) => {
        setViewGrn(grn);
        setFormOpen(true);
    };

    return (
        <Box>
            {/* Toolbar */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1}>
                    <TextField
                        size="small"
                        placeholder="Search GRN#..."
                        value={grnFilter}
                        onChange={(e) => { setGrnFilter(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                        sx={{ width: 200 }}
                    />
                    <TextField
                        select
                        size="small"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        sx={{ width: 150 }}
                        label="Status"
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="DRAFT">Draft</MenuItem>
                        <MenuItem value="SUBMITTED">Submitted</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </TextField>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleNewGRN}
                    disabled={!canWrite}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1 }}
                >
                    New GRN
                </Button>
            </Box>

            {error && (
                <Typography color="error" variant="body2" mb={2}>{error}</Typography>
            )}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>GRN #</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>PO #</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Vendor</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Total (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={28} />
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">No GRNs found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#1565c0' }}>{row.grnNumber}</TableCell>
                                    <TableCell>{row.grnDate ? format(new Date(row.grnDate), 'dd MMM yyyy') : '-'}</TableCell>
                                    <TableCell>{row.purchaseOrderNumber || '-'}</TableCell>
                                    <TableCell>{row.vendorName || '-'}</TableCell>
                                    <TableCell>{row.warehouse || '-'}</TableCell>
                                    <TableCell align="right">{row.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell>
                                        <Chip size="small" label={row.status} color={statusColor(row.status)} />
                                    </TableCell>
                                    <TableCell>{row.createdBy || '-'}</TableCell>
                                    <TableCell>
                                        <Tooltip title="View">
                                            <IconButton size="small" onClick={() => handleView(row)}>
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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
                    rowsPerPage={size}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Paper>

            <GRNForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                existingGRN={viewGrn}
                onSuccess={() => { setFormOpen(false); load(); }}
            />
        </Box>
    );
};

export default GRNList;
