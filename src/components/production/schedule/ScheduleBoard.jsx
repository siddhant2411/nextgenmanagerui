import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert, Box, Button, CircularProgress, Container, Grid, IconButton, InputAdornment, Paper, Stack,
    TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
    Build, CheckCircle, ChevronLeft, ChevronRight, ErrorOutline, HourglassBottom, PendingActions,
    PrecisionManufacturing, Refresh, Search, Speed, Today, Update,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { getScheduleBoard } from '../../../services/workOrderService';
import {
    MUTED, T, alertPanelSx, heroIconButtonSx, heroSx, primaryButtonSx, statCardSx, surfaceSx,
} from '../../inventory/warehouse/listStyles';
import { LABEL_WIDTH, MachineTimeline, OrderTimeline, STATUS_STYLE, useTimeScale } from './BoardTimeline';

/** How much time the board shows, and how wide an hour is at that zoom. */
const ZOOMS = {
    day: { label: 'Day', days: 1, pxPerHour: 64 },
    three: { label: '3 days', days: 3, pxPerHour: 26 },
    week: { label: 'Week', days: 7, pxPerHour: 11 },
    fortnight: { label: '2 weeks', days: 14, pxPerHour: 5.5 },
};
const VIEW_KEY = 'scheduleBoard.view';

const readView = () => {
    try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || {}; } catch { return {}; }
};
const fmtLate = (mins) => {
    const m = Math.abs(Math.round(mins));
    if (m >= 1440) return `${Math.round(m / 144) / 10} days`;
    if (m >= 60) return `${Math.round(m / 6) / 10} h`;
    return `${m} min`;
};
const fmtWhen = (d) => (d ? dayjs(d).format('DD MMM, HH:mm') : '–');
/** A plain due date arrives as the midnight after it; any other time is shown as is. */
const fmtDue = (d) => {
    if (!d) return 'no due date';
    const due = dayjs(d);
    return due.format('HH:mm') === '00:00' ? due.subtract(1, 'day').format('DD MMM') : due.format('DD MMM, HH:mm');
};

// ─── Alert panels ─────────────────────────────────────────────────────────────

const PANEL = {
    red: { border: '#fecaca', bg: '#fff5f5', head: '#fee2e2', ink: '#991b1b', icon: T.error, hover: '#fef2f2' },
    amber: { border: '#fde68a', bg: '#fffbeb', head: '#fef3c7', ink: '#92400e', icon: T.warning, hover: '#fef9e7' },
    slate: { border: '#cbd5e1', bg: '#f8fafc', head: '#e2e8f0', ink: '#334155', icon: '#475569', hover: '#f1f5f9' },
};

function AlertPanel({ tone, icon: Icon, title, items, render, onItem, action }) {
    const c = PANEL[tone];
    return (
        <Paper elevation={0} sx={{ ...alertPanelSx(c.border, c.bg), height: '100%' }}>
            <Box sx={{ p: 1.75, bgcolor: c.head, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon sx={{ color: c.icon, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 800, color: c.ink, fontSize: '0.85rem', flex: 1 }}>{title} ({items.length})</Typography>
                {action}
            </Box>
            {items.slice(0, 4).map((item, i) => (
                <Box key={i} onClick={onItem ? () => onItem(item) : undefined} sx={{
                    px: 2, py: 1.25, borderBottom: `1px solid ${c.border}`,
                    cursor: onItem ? 'pointer' : 'default', '&:hover': onItem ? { bgcolor: c.hover } : {},
                }}>
                    {render(item)}
                </Box>
            ))}
            {items.length > 4 && (
                <Typography sx={{ px: 2, py: 1, fontSize: '0.72rem', fontWeight: 700, color: c.ink }}>+{items.length - 4} more</Typography>
            )}
        </Paper>
    );
}

const AlertLine = ({ left, right, rightColor, sub }) => (
    <>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{left}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: rightColor, whiteSpace: 'nowrap' }}>{right}</Typography>
        </Stack>
        <Typography sx={{ color: MUTED, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</Typography>
    </>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduleBoard() {
    const navigate = useNavigate();
    const saved = readView();
    const [zoom, setZoom] = useState(ZOOMS[saved.zoom] ? saved.zoom : 'week');
    const [mode, setMode] = useState(saved.mode === 'orders' ? 'orders' : 'machines');
    const [anchor, setAnchor] = useState(dayjs().startOf('day'));
    const [search, setSearch] = useState('');
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const days = ZOOMS[zoom].days;
    const fromDay = anchor.format('YYYY-MM-DD');
    const toDay = anchor.add(days - 1, 'day').format('YYYY-MM-DD');

    useEffect(() => {
        try { localStorage.setItem(VIEW_KEY, JSON.stringify({ zoom, mode })); } catch { /* per-viewer convenience only */ }
    }, [zoom, mode]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setBoard(await getScheduleBoard(fromDay, toDay));
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Could not load the schedule.');
        } finally {
            setLoading(false);
        }
    }, [fromDay, toDay]);

    useEffect(() => { load(); }, [load]);

    const scale = useTimeScale(board?.from ?? anchor, board?.to ?? anchor.add(days, 'day'), ZOOMS[zoom].pxPerHour);
    const openOrder = useCallback((id) => navigate(`/production/work-order/edit/${id}`), [navigate]);

    // Open on now when the window holds it, a little in from the left so what just happened shows too.
    const scroller = useRef(null);
    useEffect(() => {
        if (!board || !scroller.current) return;
        const now = dayjs(board.now);
        const inWindow = now.isAfter(dayjs(board.from)) && now.isBefore(dayjs(board.to));
        const visible = scroller.current.clientWidth - LABEL_WIDTH;
        scroller.current.scrollLeft = inWindow ? Math.max(scale.x(now) - visible * 0.25, 0) : 0;
    }, [board, scale, mode]);

    const query = search.trim().toLowerCase();
    const matches = useCallback((bar) => !query || [bar.workOrderNumber, bar.itemCode, bar.itemName, bar.operationName, bar.parentWorkOrderNumber]
        .some((v) => v && String(v).toLowerCase().includes(query)), [query]);

    const k = board?.kpis;
    const stats = useMemo(() => k ? [
        {
            label: 'Load', value: `${Math.round(k.loadPercent)}%`, icon: Speed, color: k.loadPercent >= 90 ? T.error : k.loadPercent >= 70 ? T.warning : T.success,
            tag: `${Math.round(k.bookedMinutes / 60)} of ${Math.round(k.capacityMinutes / 60)} h`,
        },
        { label: 'Late orders', value: k.lateOrders, icon: ErrorOutline, color: k.lateOrders ? T.error : T.success, tag: k.lateOrders ? 'Will miss due date' : 'On time' },
        { label: 'At risk', value: k.atRiskOrders, icon: HourglassBottom, color: k.atRiskOrders ? T.warning : T.success, tag: 'Under a day to spare' },
        {
            label: 'Idle machines', value: `${k.idleResources} / ${k.resources}`, icon: PrecisionManufacturing, color: T.violet,
            tag: k.machinesDown ? `${k.machinesDown} down` : 'Free capacity',
        },
    ] : [], [k]);

    const step = (dir) => setAnchor((a) => a.add(dir * days, 'day'));
    const rangeLabel = days === 1 ? anchor.format('ddd D MMM YYYY')
        : `${anchor.format('D MMM')} – ${anchor.add(days - 1, 'day').format('D MMM YYYY')}`;

    const alerts = board ? [
        board.lateOrders.length > 0 && (
            <AlertPanel key="late" tone="red" icon={ErrorOutline} title="Late orders" items={board.lateOrders} onItem={(o) => openOrder(o.workOrderId)}
                render={(o) => <AlertLine left={o.workOrderNumber} right={`${fmtLate(o.minutesLate)} late`} rightColor={T.error}
                    sub={`${o.itemCode || '—'} · due ${fmtDue(o.dueBy)} · ends ${fmtWhen(o.plannedEnd)}`} />} />
        ),
        board.overrunning.length > 0 && (
            <AlertPanel key="over" tone="red" icon={Update} title="Running over" items={board.overrunning} onItem={(b) => openOrder(b.workOrderId)}
                render={(b) => <AlertLine left={`${b.workOrderNumber} · ${b.operationName}`} right={`${fmtLate(dayjs(board.now).diff(dayjs(b.end), 'minute'))} over`} rightColor={T.error}
                    sub={`${b.machineCode || b.workCenterCode} · planned to end ${fmtWhen(b.end)}`} />} />
        ),
        board.atRiskOrders.length > 0 && (
            <AlertPanel key="risk" tone="amber" icon={HourglassBottom} title="At risk" items={board.atRiskOrders} onItem={(o) => openOrder(o.workOrderId)}
                render={(o) => <AlertLine left={o.workOrderNumber} right={`${fmtLate(-o.minutesLate)} spare`} rightColor={T.warning}
                    sub={`${o.itemCode || '—'} · due ${fmtDue(o.dueBy)} · ends ${fmtWhen(o.plannedEnd)}`} />} />
        ),
        board.unscheduledOrders.length > 0 && (
            <AlertPanel key="new" tone="amber" icon={PendingActions} title="Not scheduled" items={board.unscheduledOrders} onItem={(o) => openOrder(o.workOrderId)}
                action={<Button size="small" onClick={() => navigate('/production/work-order')} sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', color: '#92400e', py: 0 }}>Schedule all</Button>}
                render={(o) => <AlertLine left={o.workOrderNumber} right={o.priority && o.priority !== 'NORMAL' ? o.priority.toLowerCase() : ''} rightColor={T.warning}
                    sub={`${o.itemCode || '—'} · due ${fmtDue(o.dueBy)}`} />} />
        ),
        board.machinesDown.length > 0 && (
            <AlertPanel key="down" tone="slate" icon={Build} title="Machines down" items={board.machinesDown}
                render={(m) => <AlertLine left={m.machineCode} right={m.until ? `until ${fmtWhen(m.until)}` : ''} rightColor="#475569"
                    sub={`${m.workCenterCode} · ${m.reason || 'not available'}`} />} />
        ),
    ].filter(Boolean) : [];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={6}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>Production Schedule</Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                Where every machine's time goes, and which orders need a decision.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <span><IconButton onClick={load} disabled={loading} sx={heroIconButtonSx}><Refresh /></IconButton></span>
                            </Tooltip>
                            <Button variant="contained" disableElevation onClick={() => navigate('/production/work-order')} sx={primaryButtonSx}>
                                Work Orders
                            </Button>
                        </Stack>
                    </Stack>
                    <Grid container spacing={3}>
                        {(stats.length ? stats : [0, 1, 2, 3].map((i) => ({ label: '', icon: Speed, color: '#64748b', tag: '', key: i }))).map((stat, i) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label || i}>
                                <Paper elevation={0} sx={statCardSx}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: 'flex' }}><stat.icon /></Box>
                                        <Typography sx={{ color: stat.color, fontSize: '0.7rem', fontWeight: 800, bgcolor: `${stat.color}10`, px: 1, borderRadius: 1 }}>{stat.tag}</Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: 'white' }}>
                                        {loading && !board ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError('')}>{error}</Alert>}

                {board && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        {alerts.length === 0 ? (
                            <Grid item xs={12}>
                                <Paper elevation={0} sx={{ ...alertPanelSx('#bbf7d0', '#f0fdf4'), p: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                    <CheckCircle sx={{ color: T.success }} />
                                    <Typography sx={{ fontWeight: 700, color: '#166534', fontSize: '0.88rem' }}>
                                        Nothing needs attention: no late, at-risk or unscheduled orders, nothing running over, and every machine available.
                                    </Typography>
                                </Paper>
                            </Grid>
                        ) : alerts.map((panel) => (
                            <Grid item xs={12} md={6} lg={alerts.length >= 4 ? 3 : 12 / alerts.length} key={panel.key}>{panel}</Grid>
                        ))}
                    </Grid>
                )}

                <Paper elevation={0} sx={surfaceSx}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${T.border}` }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
                                <ToggleButton value="machines" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5 }}>By machine</ToggleButton>
                                <ToggleButton value="orders" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5 }}>By order</ToggleButton>
                            </ToggleButtonGroup>
                            <ToggleButtonGroup size="small" exclusive value={zoom} onChange={(_, v) => v && setZoom(v)}>
                                {Object.entries(ZOOMS).map(([key, z]) => (
                                    <ToggleButton key={key} value={key} sx={{ textTransform: 'none', fontWeight: 700, px: 1.25 }}>{z.label}</ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                            <Stack direction="row" alignItems="center">
                                <IconButton size="small" onClick={() => step(-1)} aria-label="Earlier"><ChevronLeft /></IconButton>
                                <Tooltip title="Start from today"><IconButton size="small" onClick={() => setAnchor(dayjs().startOf('day'))} aria-label="Today"><Today fontSize="small" /></IconButton></Tooltip>
                                <IconButton size="small" onClick={() => step(1)} aria-label="Later"><ChevronRight /></IconButton>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', ml: 1, whiteSpace: 'nowrap' }}>{rangeLabel}</Typography>
                                {loading && <CircularProgress size={16} sx={{ ml: 1.5 }} />}
                            </Stack>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'HOLD'].map((s) => (
                                    <Stack key={s} direction="row" spacing={0.5} alignItems="center">
                                        <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: STATUS_STYLE[s].bg }} />
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED }}>{STATUS_STYLE[s].label}</Typography>
                                    </Stack>
                                ))}
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, boxShadow: `0 0 0 2px ${T.error}`, bgcolor: 'white' }} />
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED }}>Late</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, background: 'repeating-linear-gradient(135deg, #f1f5f9 0 3px, #dfe5ee 3px 6px)' }} />
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: MUTED }}>Closed</Typography>
                                </Stack>
                            </Stack>
                            <TextField size="small" placeholder="Find order, item, operation" value={search} onChange={(e) => setSearch(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                                sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.82rem' } }} />
                        </Stack>
                    </Stack>

                    <Box ref={scroller} sx={{ overflow: 'auto', maxHeight: '70vh' }}>
                        {!board && loading && <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>}
                        {board && board.resources.length === 0 && (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Typography sx={{ color: MUTED, fontWeight: 600 }}>No work centres are set up yet.</Typography>
                            </Box>
                        )}
                        {board && board.resources.length > 0 && (mode === 'machines'
                            ? <MachineTimeline board={board} scale={scale} onOpen={openOrder} matches={matches} />
                            : <OrderTimeline board={board} scale={scale} onOpen={openOrder} matches={matches} />)}
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
