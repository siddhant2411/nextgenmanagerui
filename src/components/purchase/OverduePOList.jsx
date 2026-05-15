import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, IconButton,
    Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { ArrowBack, Refresh, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getOverduePOs } from '../../services/purchaseOrderService';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAmount = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

const STATUS_STYLE = {
    SENT:               { bg: '#eaf0f9', color: '#1c4f87', border: '#bad0ec' },
    PARTIALLY_RECEIVED: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
};

export default function OverduePOList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getOverduePOs()
            .then(data => setRows(data ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Tooltip title="Back to Purchase Orders">
                        <IconButton onClick={() => navigate('/purchase')}
                            sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                            <ArrowBack />
                        </IconButton>
                    </Tooltip>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em' }}>
                                Overdue POs
                            </Typography>
                            {!loading && rows.length > 0 && (
                                <Chip label={rows.length} size="small"
                                    sx={{ bgcolor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700 }} />
                            )}
                        </Stack>
                        <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Purchase orders past their expected delivery date
                        </Typography>
                    </Box>
                </Stack>
                <Tooltip title="Refresh">
                    <IconButton onClick={load} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                    <CircularProgress thickness={5} sx={{ color: PRIMARY }} />
                </Box>
            ) : rows.length === 0 ? (
                <Paper elevation={0} sx={{ py: 12, border: `1px dashed ${BORDER}`, borderRadius: 3, bgcolor: 'white', textAlign: 'center' }}>
                    <Box sx={{ fontSize: 48, mb: 2 }}>✅</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>All POs are on time</Typography>
                    <Typography sx={{ color: '#64748b' }}>No purchase orders are past their expected delivery date.</Typography>
                </Paper>
            ) : (
                <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2.5, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    {['PO Number', 'Vendor', 'Order Date', 'Expected Delivery', 'Days Late', 'Status', 'Amount', ''].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.8, borderBottom: `1px solid ${BORDER}` }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map(row => {
                                    const ss = STATUS_STYLE[row.status] ?? { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' };
                                    return (
                                        <TableRow key={row.id} hover
                                            sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: '#f0f7ff' } }}
                                            onClick={() => navigate(`/purchase/${row.id}`)}>
                                            <TableCell sx={{ fontWeight: 700, color: '#0f2744', fontSize: '0.88rem', py: 2 }}>
                                                {row.purchaseOrderNumber}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.88rem', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.vendorName ?? '—'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {fmtDate(row.orderDate)}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {fmtDate(row.expectedDeliveryDate)}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={0.8}>
                                                    <Warning sx={{ fontSize: 15, color: row.daysOverdue > 14 ? '#dc2626' : '#f59e0b' }} />
                                                    <Chip
                                                        label={`${row.daysOverdue} day${row.daysOverdue !== 1 ? 's' : ''}`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: row.daysOverdue > 14 ? '#fef2f2' : '#fff7ed',
                                                            color: row.daysOverdue > 14 ? '#dc2626' : '#c2410c',
                                                            border: `1px solid ${row.daysOverdue > 14 ? '#fca5a5' : '#fdba74'}`,
                                                            fontWeight: 700, height: 22, fontSize: '0.75rem',
                                                        }}
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={row.status?.replace(/_/g, ' ')} size="small"
                                                    sx={{ bgcolor: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                                                {fmtAmount(row.grandTotal)}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                                View →
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
