import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, Stack, Chip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip,
} from '@mui/material';
import { ArrowBack, TrendingUp, Warning, Business, Receipt } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getPurchaseAnalytics } from '../../services/purchaseOrderService';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';
const PRIMARY_LIGHT = '#f0f7ff';

const STATUS_COLORS = {
    DRAFT: '#94a3b8',
    SENT: '#3b82f6',
    PARTIALLY_RECEIVED: '#f59e0b',
    RECEIVED: '#22c55e',
    COMPLETED: '#10b981',
    CANCELLED: '#ef4444',
};

const fmtAmount = (n) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '₹0';

const SummaryCard = ({ title, value, sub, accent, icon: Icon }) => (
    <Paper elevation={0} sx={{
        p: 2.5, border: `1px solid ${BORDER}`, borderRadius: 2.5,
        borderLeft: `4px solid ${accent}`,
        background: 'linear-gradient(135deg,#ffffff 0%,#f8fafc 100%)',
    }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
                <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>
                    {value}
                </Typography>
                {sub && <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>}
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 2, background: PRIMARY_LIGHT, color: accent }}>
                <Icon sx={{ fontSize: 22 }} />
            </Box>
        </Stack>
    </Paper>
);

const CustomBar = ({ x, y, width, height, fill }) => (
    <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
);

export default function PurchaseAnalytics() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPurchaseAnalytics()
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress thickness={5} sx={{ color: PRIMARY }} />
            </Box>
        );
    }

    const monthlyData = (data?.monthlySpend ?? []).map(d => ({
        month: d.yearMonth,
        amount: parseFloat(d.total ?? 0),
    }));

    const statusData = Object.entries(data?.statusCounts ?? {}).map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: Number(count),
        color: STATUS_COLORS[status] ?? '#94a3b8',
    }));

    const vendorRows = Object.entries(data?.spendByVendor ?? {}).map(([name, total]) => ({
        name,
        total: parseFloat(total ?? 0),
    }));

    const overduePOs = data?.overduePOs ?? [];

    const totalSpend = vendorRows.reduce((s, r) => s + r.total, 0);
    const overdueCount = overduePOs.length;
    const thisMonth = (() => {
        const ym = new Date().toISOString().slice(0, 7);
        return monthlyData.find(d => d.month === ym)?.amount ?? 0;
    })();

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
                <Tooltip title="Back to Purchase Orders">
                    <IconButton onClick={() => navigate('/purchase')}
                        sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                        <ArrowBack />
                    </IconButton>
                </Tooltip>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em', mb: 0.3 }}>
                        Purchase Analytics
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Spend trends, vendor breakdown and delivery health
                    </Typography>
                </Box>
            </Stack>

            {/* Summary cards */}
            <Grid container spacing={2.5} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard title="Total Spend (Top 10 Vendors)" value={fmtAmount(totalSpend)} accent={PRIMARY} icon={TrendingUp} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard title="This Month" value={fmtAmount(thisMonth)} accent="#0891b2" icon={Receipt} sub="Current calendar month" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard title="Overdue POs" value={overdueCount} accent={overdueCount > 0 ? '#dc2626' : '#22c55e'} icon={Warning}
                        sub={overdueCount > 0 ? 'Past expected delivery' : 'All on time'} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard title="Active Vendors" value={vendorRows.length} accent="#7c3aed" icon={Business} sub="With purchase spend" />
                </Grid>
            </Grid>

            <Grid container spacing={3} mb={3}>
                {/* Monthly spend bar chart */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2.5 }}>
                        <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>Monthly Spend Trend</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mb: 2.5 }}>Total PO value by month</Typography>
                        {monthlyData.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <Typography sx={{ color: '#94a3b8' }}>No monthly data available</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={monthlyData} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                                    <RTooltip formatter={(v) => [fmtAmount(v), 'Spend']}
                                        contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                                    <Bar dataKey="amount" fill={PRIMARY} shape={<CustomBar />} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>

                {/* Status donut */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>PO Status Breakdown</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mb: 2 }}>Count by status</Typography>
                        {statusData.length === 0 ? (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography sx={{ color: '#94a3b8' }}>No data</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={80}
                                        dataKey="value" paddingAngle={3}>
                                        {statusData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                    <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Vendor spend table */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2.5, overflow: 'hidden' }}>
                        <Box sx={{ p: 2.5, borderBottom: `1px solid ${BORDER}` }}>
                            <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>Top Vendors by Spend</Typography>
                            <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>Top 10 by total PO value</Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', py: 1.5 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Vendor</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Total Spend</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vendorRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#94a3b8' }}>No data</TableCell>
                                        </TableRow>
                                    ) : vendorRows.map((r, i) => (
                                        <TableRow key={r.name} hover sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem', py: 1.2 }}>{i + 1}</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', py: 1.2 }}>{r.name}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: PRIMARY, py: 1.2 }}>
                                                {fmtAmount(r.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Overdue POs table */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2.5, overflow: 'hidden' }}>
                        <Box sx={{ p: 2.5, borderBottom: `1px solid ${BORDER}` }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>Overdue POs</Typography>
                                {overdueCount > 0 && (
                                    <Chip label={overdueCount} size="small"
                                        sx={{ bgcolor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                                )}
                            </Stack>
                            <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>Past expected delivery date</Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: 320, overflowY: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', bgcolor: '#f8fafc', py: 1.5 }}>PO #</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', bgcolor: '#f8fafc' }}>Vendor</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', bgcolor: '#f8fafc' }}>Days Late</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {overduePOs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
                                                All POs are on time
                                            </TableCell>
                                        </TableRow>
                                    ) : overduePOs.map(po => (
                                        <TableRow key={po.id} hover sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                                            onClick={() => navigate(`/purchase/${po.id}`)}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f2744', py: 1.2 }}>
                                                {po.purchaseOrderNumber}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.82rem', color: '#475569', py: 1.2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {po.vendorName ?? '—'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1.2 }}>
                                                <Chip label={`${po.daysOverdue}d`} size="small"
                                                    sx={{ bgcolor: po.daysOverdue > 14 ? '#fef2f2' : '#fff7ed',
                                                        color: po.daysOverdue > 14 ? '#dc2626' : '#c2410c',
                                                        border: `1px solid ${po.daysOverdue > 14 ? '#fca5a5' : '#fdba74'}`,
                                                        fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
