import React, { useState } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Pagination, Stack, IconButton, Tooltip, CircularProgress, Chip, Avatar,
} from '@mui/material';
import { DeleteForever, LocalShipping, Visibility } from '@mui/icons-material';
import FilterBar from '../../ui/filterbar/FilterBar';
import { deleteDeliveryNote } from '../../../services/salesOrderService';

const HEADER_BG = '#f8fafc';
const BORDER = '#e2e8f0';

const columns = [
    { field: 'deliveryNoteNo', headerName: 'DN Number',   type: 'string' },
    { field: 'deliveryDate',   headerName: 'Date',        type: 'date' },
    { field: 'salesOrderNumber', headerName: 'SO Number', type: 'string' },
    { field: 'transporter',    headerName: 'Transporter', type: 'string' },
];

const SortHeader = ({ column, label, align = 'left', filters, onSort }) => {
    const isActive = filters?.sortBy === column;
    return (
        <TableCell align={align} sx={{
            fontWeight: 700, fontSize: '0.65625rem', color: '#64748b',
            bgcolor: HEADER_BG, cursor: 'pointer',
            borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
            userSelect: 'none', letterSpacing: '0.05em', textTransform: 'uppercase',
            '&:hover': { color: '#1e293b' },
        }} onClick={() => onSort(column)}>
            <Stack direction="row" spacing={0.5} alignItems="center">
                <span>{label}</span>
                {isActive && (
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                        {filters.sortDir === 'asc' ? '↑' : '↓'}
                    </Typography>
                )}
            </Stack>
        </TableCell>
    );
};

const DeliveryNoteList = ({
    dnList, filters, handleSort, currentPage, totalPages,
    handlePageChange, activeFilters, handleApplyFilters, refreshList, loading, onView,
}) => {
    const [deleting, setDeleting] = useState(null);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this delivery note? This action cannot be undone.')) return;
        setDeleting(id);
        try {
            await deleteDeliveryNote(id);
            refreshList();
        } catch (err) {
            alert('Delete failed: ' + (err?.response?.data?.message || err.message));
        } finally {
            setDeleting(null);
        }
    };

    const fmtDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };

    return (
        <Box>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                <FilterBar allColumns={columns} filters={activeFilters} handleApplyFilters={handleApplyFilters} setFilters={() => {}} />
            </Box>

            <TableContainer component={Box}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <SortHeader column="deliveryNoteNo" label="Delivery Note" filters={filters} onSort={handleSort} />
                            <SortHeader column="salesOrderNumber" label="Sales Order" filters={filters} onSort={handleSort} />
                            <SortHeader column="transporter" label="Transport" filters={filters} onSort={handleSort} />
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.65625rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Items
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.65625rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <CircularProgress size={32} />
                                </TableCell>
                            </TableRow>
                        ) : !Array.isArray(dnList) || !dnList.length ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary" variant="body2">No delivery notes found.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            dnList.map((row) => (
                                <TableRow key={row.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.1s' }}
                                    onClick={() => onView?.(row.id)}>

                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#ecfdf5', color: '#059669' }}>
                                                <LocalShipping sx={{ fontSize: 16 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{row.deliveryNoteNo}</Typography>
                                                <Typography variant="caption" sx={{ color: '#64748b' }}>{fmtDate(row.deliveryDate)}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        {row.salesOrderNumber
                                            ? <Typography variant="body2" sx={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>{row.salesOrderNumber}</Typography>
                                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                                        {row.salesOrderId && (
                                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>ID: {row.salesOrderId}</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Box>
                                            {row.transporter
                                                ? <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', fontSize: '0.8rem' }}>{row.transporter}</Typography>
                                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                                            {row.vehicleNumber && (
                                                <Typography variant="caption" sx={{ color: '#64748b' }}>{row.vehicleNumber}</Typography>
                                            )}
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        {row.items?.length > 0 ? (
                                            <Chip label={`${row.items.length} item${row.items.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569', height: 20 }} />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="View Details">
                                                <IconButton size="small" onClick={() => onView?.(row.id)} sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}>
                                                    <Visibility sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" disabled={deleting === row.id}
                                                    onClick={(e) => handleDelete(row.id, e)}
                                                    sx={{ color: '#64748b', '&:hover': { color: '#dc2626' } }}>
                                                    {deleting === row.id ? <CircularProgress size={14} /> : <DeleteForever sx={{ fontSize: 16 }} />}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: HEADER_BG }}>
                <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" shape="rounded" size="small" />
            </Box>
        </Box>
    );
};

export default DeliveryNoteList;
