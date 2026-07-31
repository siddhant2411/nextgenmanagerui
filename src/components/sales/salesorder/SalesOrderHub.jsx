import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Stack, Card, CardContent, Grid,
    CircularProgress, IconButton, Tooltip, Chip, Table, TableBody,
    TableCell, TableHead, TableRow, TableContainer, Avatar, Container, Paper
} from '@mui/material';
import {
    Add, ShoppingCart, PendingActions, LocalShipping,
    AccountBalanceWallet, Refresh, Warning, Description, Receipt,
} from '@mui/icons-material';
import {
    listSalesOrders, getSalesAnalytics, getPendingDispatch, getOverdueSOs,
} from '../../../services/salesOrderService';
import SalesOrderList from './SalesOrderList';
import { useViewState } from '../../../commonTools/useViewState';

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
    header:  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
};

/* Route namespace for preserved filters/sort/page — see commonTools/useViewState. */
const VIEW_STATE_NS = '/sales/sales-order';

const DEFAULT_FILTERS = { page: 0, size: 10, sortBy: 'orderDate', sortDir: 'desc' };

const SalesOrderHub = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics]           = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [pendingDispatch, setPendingDispatch] = useState([]);
    const [overdue, setOverdue]               = useState([]);
    const [quotationList, setQuotationList]   = useState([]);
    const [loadingList, setLoadingList]       = useState(true);
    const [filters, setFilters]               = useViewState(VIEW_STATE_NS, 'filters', DEFAULT_FILTERS);
    // activeFilters drives the FilterBar chips; it must travel with `filters` or
    // the list would come back filtered with no visible chips explaining why.
    const [activeFilters, setActiveFilters]   = useViewState(VIEW_STATE_NS, 'activeFilters', []);
    const [totalPages, setTotalPages]         = useState(0);

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const [data, pd, od] = await Promise.all([
                getSalesAnalytics(),
                getPendingDispatch().catch(() => []),
                getOverdueSOs().catch(() => []),
            ]);
            setAnalytics(data);
            setPendingDispatch(pd ?? []);
            setOverdue(od ?? []);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const fetchSalesOrders = useCallback(async () => {
        setLoadingList(true);
        try {
            const cleanFilters = {};
            Object.keys(filters).forEach(k => {
                if (filters[k] !== '' && filters[k] !== null && filters[k] !== undefined) {
                    cleanFilters[k] = filters[k];
                }
            });
            const data = await listSalesOrders(cleanFilters);
            setQuotationList(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
        } catch (err) {
            console.error('Failed to fetch sales orders', err);
        } finally {
            setLoadingList(false);
        }
    }, [filters]);

    useEffect(() => { fetchAnalytics(); }, []);
    useEffect(() => { fetchSalesOrders(); }, [fetchSalesOrders]);

    const mapFiltersToParams = (filterArray) => {
        const newParams = {
            orderNumber: '', orderDate: '', customerName: '', poNumber: '', netAmount: '', status: ''
        };
        filterArray.forEach(f => {
            if (newParams.hasOwnProperty(f.field)) {
                newParams[f.field] = f.value;
            }
        });
        return newParams;
    };

    const handleApplyFilters = (newFilters) => {
        if (Array.isArray(newFilters)) {
            setActiveFilters(newFilters);
            const mapped = mapFiltersToParams(newFilters);
            setFilters(prev => ({ ...prev, ...mapped, page: 0 }));
        } else {
            setFilters(prev => ({ ...prev, ...newFilters, page: 0 }));
        }
    };

    const handlePageChange   = (_, value) => setFilters(prev => ({ ...prev, page: value - 1 }));
    const handleSort         = (column) => setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortDir: prev.sortBy === column && prev.sortDir === 'desc' ? 'asc' : 'desc'
    }));

    const fmtDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* ── Hero Header ── */}
            <Box sx={{ 
                bgcolor: '#0f172a', 
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 12 
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={6}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>Sales Command Center</Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Real-time oversight of orders, fulfillment, and revenue stream.</Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh All Data">
                                <IconButton onClick={() => { fetchAnalytics(); fetchSalesOrders(); }} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained" disableElevation startIcon={<Add />}
                                onClick={() => navigate('/sales/sales-order/add')}
                                sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 3, fontWeight: 800, textTransform: 'none', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)' }}
                            >
                                New Sales Order
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        {[
                            { label: 'Total Orders', value: analytics?.totalOrders ?? 0, icon: ShoppingCart, color: '#3b82f6', trend: '+12%' },
                            { label: 'Pending Dispatch', value: analytics?.pendingOrders ?? 0, icon: PendingActions, color: '#f59e0b', trend: 'High' },
                            { label: 'Fully Dispatched', value: analytics?.fullyDispatched ?? 0, icon: LocalShipping, color: '#10b981', trend: '+5.4%' },
                            { label: 'Total Revenue', value: `₹${(analytics?.totalRevenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: AccountBalanceWallet, color: '#8b5cf6', trend: 'Monthly' },
                        ].map((stat, i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <Paper elevation={0} sx={{ 
                                    p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
                                }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: 'flex' }}><stat.icon /></Box>
                                        <Typography sx={{ color: stat.color, fontSize: '0.7rem', fontWeight: 800, bgcolor: `${stat.color}10`, px: 1, borderRadius: 1 }}>{stat.trend}</Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: 'white' }}>
                                        {loadingAnalytics ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* ── Main Content Area ── */}
            <Container maxWidth="xl" sx={{ mt: -6 }}>
                <Grid container spacing={4}>
                    {/* Alerts and Critical Tasks */}
                    {(overdue.length > 0 || pendingDispatch.length > 0) && (
                        <Grid item xs={12} lg={4}>
                            <Stack spacing={3}>
                                {overdue.length > 0 && (
                                    <Paper elevation={0} sx={{ p: 0, borderRadius: 4, border: `1px solid #fecaca`, bgcolor: '#fff5f5', overflow: 'hidden' }}>
                                        <Box sx={{ p: 2, bgcolor: '#fee2e2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Warning sx={{ color: T.error, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem' }}>Overdue Shipments ({overdue.length})</Typography>
                                        </Box>
                                        <Stack spacing={0}>
                                            {overdue.slice(0, 5).map(row => (
                                                <Box key={row.id} onClick={() => navigate(`/sales/sales-order/edit/${row.id}`)}
                                                    sx={{ p: 2, borderBottom: '1px solid #fecaca', cursor: 'pointer', '&:hover': { bgcolor: '#fef2f2' } }}>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{row.orderNumber}</Typography>
                                                        <Typography sx={{ color: T.error, fontWeight: 700, fontSize: '0.75rem' }}>{fmtDate(row.deliveryDate)}</Typography>
                                                    </Stack>
                                                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>{row.customerName}</Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}

                                {pendingDispatch.length > 0 && (
                                    <Paper elevation={0} sx={{ p: 0, borderRadius: 4, border: `1px solid #fde68a`, bgcolor: '#fffbeb', overflow: 'hidden' }}>
                                        <Box sx={{ p: 2, bgcolor: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LocalShipping sx={{ color: T.warning, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: '#92400e', fontSize: '0.85rem' }}>Ready for Dispatch ({pendingDispatch.length})</Typography>
                                        </Box>
                                        <Stack spacing={0}>
                                            {pendingDispatch.slice(0, 5).map(row => (
                                                <Box key={row.id} onClick={() => navigate(`/sales/sales-order/edit/${row.id}`)}
                                                    sx={{ p: 2, borderBottom: '1px solid #fde68a', cursor: 'pointer', '&:hover': { bgcolor: '#fffaf0' } }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{row.orderNumber}</Typography>
                                                            <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>{row.customerName}</Typography>
                                                        </Box>
                                                        <Button size="small" variant="contained" disableElevation
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/sales/sales-order/delivery-notes/add?soId=${row.id}`); }}
                                                            sx={{ borderRadius: 1.5, fontSize: '0.65rem', textTransform: 'none', bgcolor: T.warning, height: 24 }}>
                                                            Create DN
                                                        </Button>
                                                    </Stack>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    )}

                    {/* Registry Table */}
                    <Grid item xs={12} lg={(overdue.length > 0 || pendingDispatch.length > 0) ? 8 : 12}>
                        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)' }}>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Order Registry</Typography>
                                <Stack direction="row" spacing={2}>
                                    <Button size="small" onClick={() => navigate('/sales/sales-order/invoices')} sx={{ color: T.textSec, fontWeight: 700, textTransform: 'none' }}>View Invoices</Button>
                                    <Button size="small" onClick={() => navigate('/sales/sales-order/delivery-notes')} sx={{ color: T.textSec, fontWeight: 700, textTransform: 'none' }}>View Challans</Button>
                                </Stack>
                            </Box>
                            <SalesOrderList
                                quotationList={quotationList}
                                filters={filters}
                                handleSort={handleSort}
                                currentPage={filters.page + 1}
                                totalPages={totalPages}
                                handlePageChange={handlePageChange}
                                activeFilters={activeFilters}
                                handleApplyFilters={handleApplyFilters}
                                refreshList={fetchSalesOrders}
                                loading={loadingList}
                            />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default SalesOrderHub;
