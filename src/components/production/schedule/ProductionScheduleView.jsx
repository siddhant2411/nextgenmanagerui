import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    CircularProgress,
    Paper,
    TextField,
    Toolbar,
    Typography,
    Chip,
    Tooltip,
    IconButton,
    Alert,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Refresh, Today } from '@mui/icons-material';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { getProductionScheduleCombined } from '../../../services/workOrderService';

dayjs.extend(isBetween);

const PRIORITY_COLORS = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };
const STATUS_COLORS = {
    COMPLETED: '#22c55e',
    IN_PROGRESS: '#6366f1',
    READY: '#eab308',
    PLANNED: '#94a3b8'
};

const STATUS_LABELS = {
    COMPLETED: 'Completed',
    IN_PROGRESS: 'In Progress',
    READY: 'Ready',
    PLANNED: 'Planned',
};

const formatMinutesReadable = (mins) => {
    if (!mins && mins !== 0) return '-';
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// Simple StatCard component for KPIs
const StatCard = ({ title, value, subtitle, accent = '#1f6feb' }) => (
    <Paper
        elevation={0}
        sx={{
            p: 1.5,
            borderRadius: 2,
            border: '1px solid #e5e9f2',
            background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)',
            position: 'relative',
            overflow: 'hidden',
            flex: 1,
            minWidth: 140,
        }}
    >
        <Box
            sx={{
                position: 'absolute',
                top: -18,
                right: -18,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: accent,
                opacity: 0.12,
            }}
        />
        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>
            {title}
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
            {value}
        </Typography>
        {subtitle && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                {subtitle}
            </Typography>
        )}
    </Paper>
);

export default function ProductionScheduleView({ setSnackbar }) {
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fromDate, setFromDate] = useState(dayjs().startOf('week').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD'));
    const loadingRef = useRef(false);

    const loadSchedule = useCallback(async () => {
        // Validate date range before calling API
        const from = dayjs(fromDate);
        const to = dayjs(toDate);
        if (!from.isValid() || !to.isValid()) return;
        if (to.isBefore(from)) {
            setError('End date must be after start date.');
            return;
        }
        // Limit range to 90 days to prevent performance issues
        if (to.diff(from, 'day') > 90) {
            setError('Date range cannot exceed 90 days.');
            return;
        }

        if (loadingRef.current) return; // prevent duplicate requests
        loadingRef.current = true;

        try {
            setLoading(true);
            setError('');
            const response = await getProductionScheduleCombined(fromDate, toDate);
            setScheduleData(response);
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to load production schedule.';
            setError(msg);
            if (setSnackbar) setSnackbar(msg, 'error');
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [fromDate, toDate, setSnackbar]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handlePrevWeek = () => {
        setFromDate(dayjs(fromDate).subtract(7, 'day').format('YYYY-MM-DD'));
        setToDate(dayjs(toDate).subtract(7, 'day').format('YYYY-MM-DD'));
    };

    const handleNextWeek = () => {
        setFromDate(dayjs(fromDate).add(7, 'day').format('YYYY-MM-DD'));
        setToDate(dayjs(toDate).add(7, 'day').format('YYYY-MM-DD'));
    };

    const handleGoToToday = () => {
        setFromDate(dayjs().startOf('week').format('YYYY-MM-DD'));
        setToDate(dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD'));
    };

    // Generate date array for the timeline header
    const timelineDates = useMemo(() => {
        const dates = [];
        let current = dayjs(fromDate);
        const end = dayjs(toDate);
        if (!current.isValid() || !end.isValid()) return dates;
        // Safety limit to prevent infinite loop from bad dates
        let maxIter = 100;
        while ((current.isBefore(end) || current.isSame(end, 'day')) && maxIter-- > 0) {
            dates.push(current);
            current = current.add(1, 'day');
        }
        return dates;
    }, [fromDate, toDate]);

    const totalDays = timelineDates.length || 1;

    // Calculate left/width percentages for Gantt bars
    const getGanttStyle = useCallback((start, end) => {
        const startDay = dayjs(start);
        const endDay = end ? dayjs(end) : startDay.add(1, 'day');
        const viewStart = dayjs(fromDate).startOf('day');
        const viewEnd = dayjs(toDate).endOf('day');

        let effectiveStart = startDay.isBefore(viewStart) ? viewStart : startDay;
        let effectiveEnd = endDay.isAfter(viewEnd) ? viewEnd : endDay;

        // Safety check if completely out of bounds
        if (effectiveEnd.isBefore(viewStart) || effectiveStart.isAfter(viewEnd)) {
            return { display: 'none' };
        }

        const totalMinutes = viewEnd.diff(viewStart, 'minute');
        if (totalMinutes <= 0) return { display: 'none' };

        const startOffsetMinutes = effectiveStart.diff(viewStart, 'minute');
        const durationMinutes = effectiveEnd.diff(effectiveStart, 'minute');

        const left = (startOffsetMinutes / totalMinutes) * 100;
        const width = Math.max((durationMinutes / totalMinutes) * 100, 0.5); // minimum 0.5% width for visibility

        return {
            left: `${Math.max(0, left)}%`,
            width: `${Math.min(100 - Math.max(0, left), width)}%`,
        };
    }, [fromDate, toDate]);

    return (
        <Box
            sx={{
                fontFamily: "'IBM Plex Sans', system-ui",
                background: 'linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
                p: { xs: 1, sm: 2 },
                borderRadius: 2,
                width: '100%',
                minHeight: '80vh',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2.5 },
                    borderRadius: 2,
                    border: '1px solid #e3e8ef',
                    boxShadow: '0 10px 26px rgba(2, 12, 27, 0.08)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                }}
            >
                {/* Header & Controls */}
                <Toolbar
                    sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        background: 'linear-gradient(90deg, rgba(248,250,252,1) 0%, rgba(238,242,247,1) 100%)',
                        border: '1px solid #e5e9f2',
                        minHeight: '48px !important',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            color: 'primary.main',
                            fontSize: { xs: '1.15rem', sm: '1.5rem' },
                            letterSpacing: 0.2,
                            flexGrow: 1,
                        }}
                    >
                        Production Schedule
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={handlePrevWeek} title="Previous week"><ChevronLeft /></IconButton>
                        <TextField
                            size="small"
                            type="date"
                            label="From"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) setFromDate(val);
                            }}
                            sx={{ width: 150, '& .MuiInputBase-root': { height: 36, fontSize: '0.85rem' } }}
                        />
                        <Typography variant="body2" color="text.secondary">to</Typography>
                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) setToDate(val);
                            }}
                            inputProps={{ min: fromDate }}
                            sx={{ width: 150, '& .MuiInputBase-root': { height: 36, fontSize: '0.85rem' } }}
                        />
                        <IconButton size="small" onClick={handleNextWeek} title="Next week"><ChevronRight /></IconButton>
                        <Tooltip title="Go to this week" arrow>
                            <IconButton size="small" onClick={handleGoToToday} color="primary">
                                <Today fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Refresh" arrow>
                            <IconButton size="small" onClick={loadSchedule} color="primary" disabled={loading}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>

                {/* Error display */}
                {error && (
                    <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 1.5 }}>
                        {error}
                    </Alert>
                )}

                {/* Status Legend */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Status:</Typography>
                    {Object.entries(STATUS_COLORS).map(([key, color]) => (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
                            <Typography variant="caption" color="text.secondary">{STATUS_LABELS[key]}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ mx: 1, borderLeft: '1px solid #e3e8ef', height: 16 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Priority:</Typography>
                    {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 3, height: 12, borderRadius: 0.5, bgcolor: color }} />
                            <Typography variant="caption" color="text.secondary">{key.charAt(0) + key.slice(1).toLowerCase()}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* KPIs Section */}
                {loading && !scheduleData ? (
                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : scheduleData ? (
                    <>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <StatCard
                                title="Total Operations"
                                value={scheduleData.totalOperations ?? 0}
                                accent="#3b82f6"
                            />
                            <StatCard
                                title="Completed"
                                value={scheduleData.completedOperations ?? 0}
                                accent="#22c55e"
                            />
                            <StatCard
                                title="In Progress"
                                value={scheduleData.inProgressOperations ?? 0}
                                accent="#8b5cf6"
                            />
                            <StatCard
                                title="Planned Time"
                                value={formatMinutesReadable(scheduleData.totalPlannedMinutes)}
                                accent="#f59e0b"
                            />
                            <StatCard
                                title="Utilization"
                                value={`${(scheduleData.utilizationPercent ?? 0).toFixed(1)}%`}
                                accent="#0ea5e9"
                            />
                        </Box>

                        {/* Gantt Chart Area */}
                        <Box sx={{ mt: 2, border: '1px solid #e3e8ef', borderRadius: 2, overflowX: 'auto' }}>
                            <Box sx={{ minWidth: Math.max(800, timelineDates.length * 80) }}>
                                {/* Timeline Header */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        borderBottom: '1px solid #e3e8ef',
                                        bgcolor: '#f8fafc',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                    }}
                                >
                                    <Box sx={{ width: 220, minWidth: 220, p: 1.5, borderRight: '1px solid #e3e8ef', fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>
                                        Work Center / Machine
                                    </Box>
                                    <Box sx={{ display: 'flex', flexGrow: 1 }}>
                                        {timelineDates.map((date, i) => {
                                            const isToday = date.isSame(dayjs(), 'day');
                                            const isSunday = date.day() === 0;
                                            return (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        flex: 1,
                                                        p: 1,
                                                        textAlign: 'center',
                                                        borderRight: i < timelineDates.length - 1 ? '1px dashed #e3e8ef' : 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: isToday ? 'primary.main' : isSunday ? '#ef4444' : 'text.secondary',
                                                        bgcolor: isToday ? 'rgba(25,118,210,0.06)' : isSunday ? 'rgba(239,68,68,0.04)' : 'transparent',
                                                    }}
                                                >
                                                    {date.format('DD MMM')}
                                                    <Box sx={{ fontSize: '0.65rem', fontWeight: 400 }}>{date.format('ddd')}</Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>

                                {/* Schedule Body */}
                                <Box sx={{ position: 'relative' }}>
                                    {/* Vertical grid lines overlay */}
                                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 220, right: 0, display: 'flex', pointerEvents: 'none' }}>
                                        {timelineDates.map((date, i) => (
                                            <Box key={i} sx={{
                                                flex: 1,
                                                borderRight: i < timelineDates.length - 1 ? '1px dashed #e3e8ef' : 'none',
                                                bgcolor: date.day() === 0 ? 'rgba(239,68,68,0.03)' : 'transparent',
                                            }} />
                                        ))}
                                    </Box>

                                    {/* Swimlanes */}
                                    {!scheduleData.workCenterSchedules || scheduleData.workCenterSchedules.length === 0 ? (
                                        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                            <Typography variant="body1" sx={{ mb: 1 }}>No schedule data available for this date range.</Typography>
                                            <Typography variant="body2">Ensure work orders are scheduled and have operations assigned to work centers and machines.</Typography>
                                        </Box>
                                    ) : (
                                        scheduleData.workCenterSchedules.map((wc) => (
                                            <Box key={wc.workCenterId || wc.workCenterCode} sx={{ borderBottom: '1px solid #e3e8ef' }}>
                                                {/* Work Center Row */}
                                                <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', py: 0.75 }}>
                                                    <Box sx={{ width: 220, minWidth: 220, px: 2, fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', display: 'flex', alignItems: 'center' }}>
                                                        {wc.workCenterCode || `WC-${wc.workCenterId}`}
                                                    </Box>
                                                    <Box sx={{ flexGrow: 1 }} />
                                                </Box>

                                                {/* Machines Sub-Swimlanes */}
                                                {(wc.machines || []).length === 0 ? (
                                                    <Box sx={{ display: 'flex', minHeight: 40 }}>
                                                        <Box sx={{ width: 220, minWidth: 220, px: 3, py: 1, borderRight: '1px solid #e3e8ef' }}>
                                                            <Typography variant="caption" color="text.disabled">No machines assigned</Typography>
                                                        </Box>
                                                    </Box>
                                                ) : (wc.machines || []).map((machine) => {
                                                    const ops = machine.operations || [];
                                                    // Calculate dynamic row height based on number of overlapping ops
                                                    const rowHeight = Math.max(48, ops.length * 28 + 16);
                                                    return (
                                                        <Box key={machine.machineId || machine.machineCode} sx={{ display: 'flex', borderTop: '1px solid #f1f5f9', minHeight: rowHeight, position: 'relative' }}>
                                                            {/* Machine Label */}
                                                            <Box sx={{ width: 220, minWidth: 220, px: 3, py: 1.5, fontSize: '0.8rem', fontWeight: 500, color: 'text.secondary', borderRight: '1px solid #e3e8ef', bgcolor: '#fff', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{machine.machineCode || 'Unassigned'}</Typography>
                                                                <Typography variant="caption" color="text.disabled">{formatMinutesReadable(machine.totalPlannedMinutes)}</Typography>
                                                            </Box>

                                                            {/* Gantt Area for this Machine */}
                                                            <Box sx={{ flexGrow: 1, position: 'relative', py: 1 }}>
                                                                {ops.map((operation, opIdx) => {
                                                                    const start = operation.actualStartDate || operation.plannedStartDate;
                                                                    const end = operation.actualEndDate || operation.plannedEndDate;
                                                                    if (!start) return null;

                                                                    const ganttPosition = getGanttStyle(start, end);

                                                                    return (
                                                                        <Tooltip
                                                                            key={operation.operationId || opIdx}
                                                                            title={
                                                                                <React.Fragment>
                                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{operation.workOrderNumber} - {operation.operationName}</Typography>
                                                                                    <Typography variant="body2">Status: {STATUS_LABELS[operation.status] || operation.status}</Typography>
                                                                                    <Typography variant="body2">Priority: {operation.priority || 'Normal'}</Typography>
                                                                                    <Typography variant="body2">Qty: {operation.completedQuantity ?? 0} / {operation.plannedQuantity ?? 0}</Typography>
                                                                                    <Typography variant="caption">Start: {dayjs(start).format('DD MMM YYYY, HH:mm')}</Typography>
                                                                                    {end && <Typography variant="caption" display="block">End: {dayjs(end).format('DD MMM YYYY, HH:mm')}</Typography>}
                                                                                </React.Fragment>
                                                                            }
                                                                            arrow
                                                                            placement="top"
                                                                        >
                                                                            <Box
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    height: 22,
                                                                                    top: 4 + opIdx * 26, // Stack operations vertically instead of tiny stagger
                                                                                    ...ganttPosition,
                                                                                    bgcolor: STATUS_COLORS[operation.status] || STATUS_COLORS.PLANNED,
                                                                                    borderLeft: `3px solid ${PRIORITY_COLORS[operation.priority] || PRIORITY_COLORS.NORMAL}`,
                                                                                    borderRadius: 1,
                                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                                                                    opacity: 0.9,
                                                                                    cursor: 'pointer',
                                                                                    overflow: 'hidden',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    px: 0.5,
                                                                                    transition: 'opacity 0.1s',
                                                                                    '&:hover': {
                                                                                        opacity: 1,
                                                                                        zIndex: 10,
                                                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Typography sx={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                                                    {operation.workOrderNumber}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </Box>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        ))
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        {/* Loading overlay for refresh */}
                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Refreshing...</Typography>
                            </Box>
                        )}
                    </>
                ) : !loading && !error ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1" sx={{ mb: 1 }}>No schedule data available.</Typography>
                        <Typography variant="body2">Select a date range and click refresh to load the production schedule.</Typography>
                    </Box>
                ) : null}
            </Paper>
        </Box>
    );
}
