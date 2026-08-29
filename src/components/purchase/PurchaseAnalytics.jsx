import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getPurchaseAnalytics } from '../../services/purchaseOrderService';
import {
    T, SHELL, STATUS, TABLE, MONO, chipSx, panelSx,
    fmtRupees, fmtNum, humanize,
} from '../../theme/moduleTokens';
import ModuleHero from '../ui/moduleshell/ModuleHero';
import ModuleBody from '../ui/moduleshell/ModuleBody';
import { StatTile, StatStrip } from '../ui/moduleshell/StatTile';

/* ============================================================================
   Purchase analytics.

   Same shell and same palette as the purchase register it is one click from.
   ========================================================================= */

/**
 * Donut fills for the status breakdown.
 *
 * These follow the status chips in the register — a SENT slice and a SENT chip have to be the same
 * blue or the two screens are describing different things. RECEIVED and COMPLETED are both "good"
 * and would collide as one green, so they are separated by lightness rather than by hue.
 */
const STATUS_COLORS = {
    DRAFT: T.ink3,
    SENT: T.accent,
    PARTIALLY_RECEIVED: STATUS.warning,
    RECEIVED: '#34d399',
    COMPLETED: STATUS.good,
    CANCELLED: STATUS.critical,
};

const SERIOUS_AFTER_DAYS = 14;

/** Rounded bar cap — recharts has no radius prop on Bar itself. */
const CustomBar = ({ x, y, width, height, fill }) => (
    <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
);

const Panel = ({ title, sub, right, children, sx }) => (
    <Paper elevation={0} sx={{ ...panelSx, ...sx }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1.5}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.015em', color: T.ink }}>
                {title}
            </Typography>
            {right}
        </Stack>
        {sub && <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.5, mb: 2, fontWeight: 500 }}>{sub}</Typography>}
        {children}
    </Paper>
);

const Th = ({ label, align = 'left', width }) => (
    <TableCell align={align} sx={{ ...TABLE.head, width }}>{label}</TableCell>
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

    const monthlyData = (data?.monthlySpend ?? []).map(d => ({
        month: d.yearMonth,
        amount: parseFloat(d.total ?? 0),
    }));

    const statusData = Object.entries(data?.statusCounts ?? {}).map(([status, count]) => ({
        name: humanize(status),
        value: Number(count),
        color: STATUS_COLORS[status] ?? T.ink3,
    }));

    const vendorRows = Object.entries(data?.spendByVendor ?? {}).map(([name, total]) => ({
        name,
        total: parseFloat(total ?? 0),
    }));

    const overduePOs = data?.overduePOs ?? [];
    const overdueCount = overduePOs.length;

    /* This is the sum of the top ten vendors the endpoint returns, not company spend. The tile
       says so, because a number labelled "total spend" that is not the total is worse than no
       number at all. */
    const topVendorSpend = vendorRows.reduce((s, r) => s + r.total, 0);

    const thisMonth = (() => {
        const ym = new Date().toISOString().slice(0, 7);
        return monthlyData.find(d => d.month === ym)?.amount ?? 0;
    })();

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Purchase Analytics"
                subtitle="Spend trend, vendor concentration and delivery health."
                onBack={() => navigate('/purchase')}
                backLabel="Back to purchase orders"
            />

            <ModuleBody>
                <StatStrip>
                    <StatTile
                        label="Top-10 vendor spend" value={fmtRupees(topVendorSpend)}
                        hint="the ten largest vendors only" loading={loading}
                    />
                    <StatTile
                        label="This month" value={fmtRupees(thisMonth)}
                        hint="current calendar month" loading={loading}
                    />
                    <StatTile
                        label="Overdue POs" value={fmtNum(overdueCount)}
                        hint={overdueCount > 0 ? 'past expected delivery' : 'all on time'}
                        severity={overdueCount > 0 ? STATUS.critical : STATUS.good}
                        loading={loading}
                    />
                    <StatTile
                        label="Active vendors" value={fmtNum(vendorRows.length)}
                        hint="with purchase spend" loading={loading}
                    />
                </StatStrip>

                {loading ? (
                    <Paper elevation={0} sx={panelSx}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
                            <CircularProgress size={40} thickness={4} sx={{ color: T.accent }} />
                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.ink2 }}>Crunching purchase data...</Typography>
                        </Box>
                    </Paper>
                ) : (
                    <>
                        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' } }}>
                            <Panel title="Monthly spend" sub="Total purchase order value by month.">
                                {monthlyData.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <Typography sx={{ color: T.ink3, fontWeight: 600 }}>No monthly data yet.</Typography>
                                    </Box>
                                ) : (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={monthlyData} barSize={32}>
                                            <CartesianGrid strokeDasharray="2 4" stroke={T.rule} vertical={false} />
                                            <XAxis
                                                dataKey="month" axisLine={false} tickLine={false}
                                                tick={{ fontSize: 10, fill: T.ink3, fontFamily: MONO }}
                                            />
                                            <YAxis
                                                axisLine={false} tickLine={false}
                                                tick={{ fontSize: 10, fill: T.ink3, fontFamily: MONO }}
                                                tickFormatter={v => v >= 1e5 ? `\u20B9${(v / 1e5).toFixed(1)}L` : `\u20B9${(v / 1000).toFixed(0)}K`}
                                            />
                                            <RTooltip
                                                formatter={(v) => [fmtRupees(v), 'Spend']}
                                                cursor={{ fill: T.ruleSoft }}
                                                contentStyle={{
                                                    borderRadius: 8, border: `1px solid ${T.rule}`,
                                                    fontSize: 12, boxShadow: SHELL.cardShadow,
                                                }}
                                            />
                                            <Bar dataKey="amount" fill={T.accent} shape={<CustomBar />} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Panel>

                            <Panel title="Status breakdown" sub="Purchase orders by state, counted today.">
                                {statusData.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <Typography sx={{ color: T.ink3, fontWeight: 600 }}>No data.</Typography>
                                    </Box>
                                ) : (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={82}
                                                dataKey="value" paddingAngle={3}
                                            >
                                                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Legend iconSize={9} iconType="square" wrapperStyle={{ fontSize: 11.5, color: T.ink2, fontWeight: 600 }} />
                                            <RTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${T.rule}`, fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </Panel>
                        </Box>

                        <Box sx={{ display: 'grid', gap: 2, mt: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                            <Panel title="Top vendors by spend" sub="The ten largest by total purchase order value.">
                                <TableContainer component={Box} sx={{ ...TABLE.container, overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <Th label="#" width={48} />
                                                <Th label="Vendor" />
                                                <Th label="Total spend" align="right" />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {vendorRows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 5, color: T.ink3, borderBottom: 0 }}>
                                                        No vendor spend recorded.
                                                    </TableCell>
                                                </TableRow>
                                            ) : vendorRows.map((r, i) => (
                                                <TableRow key={r.name} hover>
                                                    <TableCell sx={{ ...TABLE.cell, color: T.ink3, fontFamily: MONO }}>{i + 1}</TableCell>
                                                    <TableCell sx={{ ...TABLE.cell, fontWeight: 600, color: T.ink }}>{r.name}</TableCell>
                                                    <TableCell sx={{ ...TABLE.num, fontWeight: 700 }}>{fmtRupees(r.total)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Panel>

                            <Panel
                                title="Overdue orders"
                                sub="Past the expected delivery date, worst first."
                                right={overdueCount > 0 && (
                                    <Chip label={fmtNum(overdueCount)} size="small" sx={chipSx(STATUS.critical, STATUS.criticalBg)} />
                                )}
                            >
                                <TableContainer component={Box} sx={{ ...TABLE.container, maxHeight: 320, overflowY: 'auto' }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <Th label="PO Number" />
                                                <Th label="Vendor" />
                                                <Th label="Days late" align="right" width={96} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {overduePOs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 5, borderBottom: 0, color: STATUS.good, fontWeight: 700 }}>
                                                        Every order is on time.
                                                    </TableCell>
                                                </TableRow>
                                            ) : overduePOs.map(po => {
                                                const serious = po.daysOverdue > SERIOUS_AFTER_DAYS;
                                                const severity = serious ? STATUS.critical : STATUS.warning;
                                                return (
                                                    <TableRow
                                                        key={po.id} hover
                                                        onClick={() => navigate(`/purchase/${po.id}`)}
                                                        sx={TABLE.row}
                                                    >
                                                        <TableCell sx={{ ...TABLE.cell, fontWeight: 800, color: T.accent }}>
                                                            {po.purchaseOrderNumber}
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            ...TABLE.cell, maxWidth: 160,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {po.vendorName ?? '\u2014'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ py: 1.2 }}>
                                                            <Chip
                                                                label={`${po.daysOverdue}d`} size="small"
                                                                sx={chipSx(severity, serious ? STATUS.criticalBg : STATUS.warningBg)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Panel>
                        </Box>
                    </>
                )}
            </ModuleBody>
        </Box>
    );
}
