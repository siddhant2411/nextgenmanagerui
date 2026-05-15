import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Chip, CircularProgress, IconButton, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tooltip, Typography, Pagination
} from '@mui/material';
import { Visibility, Cancel } from '@mui/icons-material';
import { cancelTaxInvoice } from '../../../services/salesOrderService';
import FilterBar from '../../ui/filterbar/FilterBar';

const BORDER = '#e2e8f0';
const HEADER_BG = '#f8fafc';

const STATUS_STYLE = {
    DRAFT:     { color: '#64748b', bg: '#f1f5f9' },
    SENT:      { color: '#2563eb', bg: '#eff6ff' },
    PAID:      { color: '#059669', bg: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
};

const columns = [
    { field: 'invoiceNumber', headerName: 'Invoice #', type: 'string' },
    { field: 'salesOrderNumber', headerName: 'Sales Order', type: 'string' },
    { field: 'customerName', headerName: 'Customer', type: 'string' },
    { field: 'invoiceDate', headerName: 'Date', type: 'date' },
    { field: 'status', headerName: 'Status', type: 'enum', options: ['DRAFT', 'SENT', 'PAID', 'CANCELLED'] },
];

const SortHeader = ({ column, label, filters, onSort }) => {
    const isActive = filters?.sortBy === column;
    return (
        <TableCell sx={{
            fontWeight: 700, fontSize: '0.68rem', color: '#64748b',
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

export default function InvoiceList({ 
    invoices = [], loading, onRefresh, 
    filters, handleSort, activeFilters, handleApplyFilters, 
    totalPages, handlePageChange 
}) {
    const navigate = useNavigate();
    const [cancelling, setCancelling] = useState(null);

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this invoice?')) return;
        setCancelling(id);
        try {
            await cancelTaxInvoice(id);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert(e?.response?.data?.message ?? 'Failed to cancel invoice.');
        } finally {
            setCancelling(null);
        }
    };

    const fmtDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };

    const fmtAmount = (n) => n != null
        ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—';

    return (
        <Box>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                <FilterBar 
                    allColumns={columns} 
                    filters={activeFilters} 
                    handleApplyFilters={handleApplyFilters}
                    setFilters={() => {}} 
                />
            </Box>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <SortHeader column="invoiceNumber" label="Invoice #" filters={filters} onSort={handleSort} />
                            <SortHeader column="salesOrderNumber" label="Sales Order" filters={filters} onSort={handleSort} />
                            <SortHeader column="customerName" label="Customer" filters={filters} onSort={handleSort} />
                            <SortHeader column="invoiceDate" label="Date" filters={filters} onSort={handleSort} />
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' }}>Due Date</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' }}>Total</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' }}>Paid</TableCell>
                            <SortHeader column="status" label="Status" filters={filters} onSort={handleSort} />
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                        ) : !invoices.length ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No invoices found.</Typography></TableCell></TableRow>
                        ) : (
                            invoices.map(inv => {
                                const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.DRAFT;
                                return (
                                    <TableRow key={inv.id} hover sx={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/sales/sales-order/invoices/view/${inv.id}`)}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                                                {inv.invoiceNumber}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#2563eb' }}>
                                                {inv.salesOrderNumber ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                                                {inv.customerName ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>{fmtDate(inv.invoiceDate)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', color: inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? '#dc2626' : 'inherit' }}>
                                            {fmtDate(inv.dueDate)}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>₹ {fmtAmount(inv.totalPayableAmount)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>₹ {fmtAmount(inv.paidAmount)}</TableCell>
                                        <TableCell>
                                            <Chip label={inv.status} size="small"
                                                sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, bgcolor: st.bg, color: st.color }} />
                                        </TableCell>
                                        <TableCell onClick={e => e.stopPropagation()}>
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title="View">
                                                    <IconButton size="small" onClick={() => navigate(`/sales/sales-order/invoices/view/${inv.id}`)}>
                                                        <Visibility sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="small" color="error"
                                                            disabled={cancelling === inv.id}
                                                            onClick={() => handleCancel(inv.id)}>
                                                            {cancelling === inv.id
                                                                ? <CircularProgress size={14} />
                                                                : <Cancel sx={{ fontSize: 16 }} />}
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {totalPages > 1 && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: HEADER_BG }}>
                    <Pagination count={totalPages} page={filters.page + 1} onChange={handlePageChange} color="primary" shape="rounded" size="small" />
                </Box>
            )}
        </Box>
    );
}
