import React, { useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Box, Typography, Alert, Chip, Divider, Tabs, Tab, Paper,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
    Tooltip,
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import dayjs from 'dayjs';

// ─── Formatting helpers (IST — API timestamps already carry +05:30 offset) ────
const fmtDate = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '–');
const fmtDateTime = (d) => (d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '–');
const fmtDurHrs = (mins) => {
    if (mins == null) return '–';
    const total = Math.round(mins);
    if (total <= 0) return '0m';
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    return h > 0 ? `${h}h` : `${m}m`;
};
const fmtCostINR = (cost) =>
    cost != null ? `₹${Number(cost).toLocaleString('en-IN')}` : '–';

// ─── Colour palette ────────────────────────────────────────────────────────────
const NULL_PATH_COLOR = '#4096ff'; // neutral blue for operations with no parallelPath
const PATH_PALETTE = [
    '#52c41a', // green   — PATH_A
    '#fa8c16', // orange  — PATH_B
    '#722ed1', // purple  — PATH_C
    '#eb2f96', // pink    — PATH_D
    '#13c2c2', // cyan    — PATH_E
    '#faad14', // gold    — PATH_F
    '#a0d911', // lime    — PATH_G
];

function getPathColor(path, allPaths) {
    if (!path) return NULL_PATH_COLOR;
    const idx = allPaths.indexOf(path);
    return PATH_PALETTE[Math.max(idx, 0) % PATH_PALETTE.length];
}

// ─── Extract "missed by N days" from warning strings ──────────────────────────
function extractMissedDays(warnings = []) {
    for (const w of warnings) {
        const m = w.match(/missed\s+by\s+(\d+)\s+day/i);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

// ─── Gantt chart component ────────────────────────────────────────────────────
function GanttChart({ operations, scheduleStart, scheduleEnd }) {
    const allPaths = useMemo(
        () => [...new Set(operations.map((o) => o.parallelPath).filter(Boolean))],
        [operations],
    );

    const start = dayjs(scheduleStart);
    const end = dayjs(scheduleEnd);
    const totalMins = Math.max(end.diff(start, 'minute'), 1);
    const today = dayjs();
    const todayPct =
        today.isAfter(start) && today.isBefore(end)
            ? (today.diff(start, 'minute') / totalMins) * 100
            : null;

    return (
        <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <Box sx={{ display: 'flex', minWidth: 680 }}>
                {/* ── Label column (fixed width) ── */}
                <Box sx={{ width: 220, flexShrink: 0, pr: 1 }}>
                    {/* Header spacer */}
                    <Box sx={{ height: 28 }} />
                    {operations.map((op, idx) => {
                        const pathColor = getPathColor(op.parallelPath, allPaths);
                        const hasPath = Boolean(op.parallelPath);
                        return (
                            <Box
                                key={op.operationId || idx}
                                sx={{
                                    height: 34,
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 0.5,
                                    pl: hasPath ? 0.75 : 0,
                                    borderLeft: hasPath ? `3px solid ${pathColor}` : '3px solid transparent',
                                    borderRadius: '0 4px 4px 0',
                                    bgcolor: hasPath ? `${pathColor}11` : 'transparent',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: 210,
                                    }}
                                >
                                    {op.sequence}. {op.operationName}
                                    {op.workCenterCode ? ` (${op.workCenterCode})` : ''}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>

                {/* ── Bar area ── */}
                <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    {/* Time axis header */}
                    <Box
                        sx={{
                            height: 28,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #e2e8f0',
                            mb: 0.25,
                            px: 0.5,
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {fmtDate(scheduleStart)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {fmtDate(scheduleEnd)}
                        </Typography>
                    </Box>

                    {/* Today vertical line */}
                    {todayPct !== null && (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: `${todayPct}%`,
                                top: 0,
                                bottom: 0,
                                width: 0,
                                borderLeft: '1.5px dashed #ef4444',
                                zIndex: 10,
                                pointerEvents: 'none',
                            }}
                        >
                            <Typography
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    left: 3,
                                    fontSize: '0.6rem',
                                    color: '#ef4444',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1,
                                }}
                            >
                                Today
                            </Typography>
                        </Box>
                    )}

                    {/* Operation bars */}
                    {operations.map((op, idx) => {
                        const opStart = dayjs(op.plannedStartDate);
                        const opEnd = dayjs(op.plannedEndDate);
                        if (!opStart.isValid() || !opEnd.isValid()) {
                            return (
                                <Box key={op.operationId || idx} sx={{ height: 34, mb: 0.5 }} />
                            );
                        }

                        const leftPct = Math.max(
                            0,
                            (opStart.diff(start, 'minute') / totalMins) * 100,
                        );
                        const durMins = Math.max(opEnd.diff(opStart, 'minute'), 1);
                        const widthPct = Math.max(
                            2.5,
                            Math.min((durMins / totalMins) * 100, 100 - leftPct),
                        );

                        const pathColor = getPathColor(op.parallelPath, allPaths);
                        const hasPath = Boolean(op.parallelPath);

                        const tooltipText =
                            `${fmtDateTime(op.plannedStartDate)} → ${fmtDateTime(op.plannedEndDate)}\n` +
                            `Duration: ${fmtDurHrs(op.durationMinutes)}` +
                            (op.machineCode ? `\nMachine: ${op.machineCode}` : '') +
                            (op.parallelPath ? `\nPath: ${op.parallelPath}` : '');

                        return (
                            <Box
                                key={op.operationId || idx}
                                sx={{
                                    height: 34,
                                    position: 'relative',
                                    mb: 0.5,
                                    bgcolor: '#f8fafc',
                                    borderRadius: 0.75,
                                }}
                            >
                                <Tooltip
                                    title={
                                        <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
                                            {tooltipText}
                                        </Box>
                                    }
                                    placement="top"
                                    arrow
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: `${leftPct}%`,
                                            width: `${widthPct}%`,
                                            top: 4,
                                            bottom: 4,
                                            bgcolor: pathColor,
                                            borderRadius: 1,
                                            opacity: 0.88,
                                            borderLeft: hasPath ? `3px solid ${pathColor}` : 'none',
                                            filter: hasPath ? 'brightness(0.92)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            overflow: 'hidden',
                                            pl: 0.75,
                                            cursor: 'default',
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: '0.6rem',
                                                color: '#fff',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {fmtDurHrs(op.durationMinutes)}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Path legend */}
            {allPaths.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={1.5} pl={0}>
                    <Chip
                        size="small"
                        label="No path (sequential)"
                        sx={{ bgcolor: NULL_PATH_COLOR, color: '#fff', fontWeight: 600, fontSize: '0.68rem', height: 20 }}
                    />
                    {allPaths.map((path, i) => (
                        <Chip
                            key={path}
                            size="small"
                            label={path}
                            sx={{
                                bgcolor: PATH_PALETTE[i % PATH_PALETTE.length],
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                height: 20,
                            }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}

// ─── Table tab ─────────────────────────────────────────────────────────────────
const hdrSx = {
    bgcolor: '#0b1b2b',
    color: '#e6edf5',
    fontWeight: 600,
    fontSize: '0.76rem',
    py: 0.75,
    whiteSpace: 'nowrap',
};

function OperationsTable({ operations, allPaths }) {
    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={hdrSx}>Seq</TableCell>
                        <TableCell sx={hdrSx}>Operation</TableCell>
                        <TableCell sx={hdrSx}>Work Centre</TableCell>
                        <TableCell sx={hdrSx}>Machine</TableCell>
                        <TableCell sx={hdrSx}>Start (IST)</TableCell>
                        <TableCell sx={hdrSx}>End (IST)</TableCell>
                        <TableCell sx={hdrSx}>Duration</TableCell>
                        <TableCell sx={hdrSx}>Path</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {operations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No operation schedules available.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        operations.map((op, idx) => (
                            <TableRow
                                key={op.operationId || idx}
                                sx={{ '&:hover': { bgcolor: '#f0f4f8' } }}
                            >
                                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                    {op.sequence ?? idx + 1}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 500 }}>
                                    {op.operationName || '–'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem' }}>
                                    {op.workCenterCode ? (
                                        <Chip size="small" label={op.workCenterCode} variant="outlined" sx={{ fontSize: '0.68rem' }} />
                                    ) : '–'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem' }}>
                                    {op.machineCode ? (
                                        <Chip size="small" label={op.machineCode} variant="outlined" sx={{ fontSize: '0.68rem' }} />
                                    ) : <Typography variant="caption" color="text.disabled">–</Typography>}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(op.plannedStartDate)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(op.plannedEndDate)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                    {fmtDurHrs(op.durationMinutes)}
                                </TableCell>
                                <TableCell>
                                    {op.parallelPath ? (
                                        <Chip
                                            size="small"
                                            label={op.parallelPath}
                                            sx={{
                                                bgcolor: getPathColor(op.parallelPath, allPaths),
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                height: 18,
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="caption" color="text.disabled">–</Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────
export default function ScheduleDialog({ open, onClose, result }) {
    const [tab, setTab] = useState(0);

    if (!result) return null;

    const operations = result.operationSchedules || [];
    const allPaths = [...new Set(operations.map((o) => o.parallelPath).filter(Boolean))];
    const warnings = result.warnings || [];
    const missedDays = extractMissedDays(warnings);

    const totalHrs = result.estimatedProductionMinutes != null
        ? Math.round(result.estimatedProductionMinutes / 60 * 10) / 10
        : null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{ sx: { width: '90vw', maxWidth: 1200, borderRadius: 2 } }}
        >
            {/* ── Title ── */}
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: '#0f2744',
                    pb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                <span>Schedule Result</span>
                {result.workOrderNumber && (
                    <Chip
                        size="small"
                        label={result.workOrderNumber}
                        sx={{ fontWeight: 700, bgcolor: '#e3f2fd', color: '#0d47a1', fontSize: '0.78rem' }}
                    />
                )}
                {missedDays !== null && (
                    <Chip
                        size="small"
                        icon={<WarningAmber sx={{ fontSize: '0.95rem !important' }} />}
                        label={`Due date missed by ${missedDays} day${missedDays !== 1 ? 's' : ''}`}
                        sx={{ bgcolor: '#fff1f0', color: '#cf1322', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #ffa39e' }}
                    />
                )}
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1 }}>
                {/* ── Warnings ── */}
                {warnings.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        {warnings.map((w, i) => (
                            <Alert key={i} severity="warning" sx={{ mb: 0.5, borderRadius: 1.5, fontSize: '0.8rem' }}>
                                {w}
                            </Alert>
                        ))}
                    </Box>
                )}

                {/* ── Summary row ── */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                        gap: 1.25,
                        mb: 2.5,
                    }}
                >
                    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Planned Window
                        </Typography>
                        <Typography fontWeight={700} fontSize="0.88rem" sx={{ mt: 0.25 }}>
                            {result.plannedStartDate && result.plannedEndDate
                                ? `${fmtDate(result.plannedStartDate)} → ${fmtDate(result.plannedEndDate)}`
                                : '–'}
                        </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Est. Duration
                        </Typography>
                        <Typography fontWeight={700} fontSize="0.88rem" sx={{ mt: 0.25 }}>
                            {totalHrs != null ? `${totalHrs} hrs` : '–'}
                        </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Est. Total Cost
                        </Typography>
                        <Typography fontWeight={700} fontSize="0.88rem" sx={{ mt: 0.25 }}>
                            {fmtCostINR(result.estimatedTotalCost)}
                        </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Operations
                        </Typography>
                        <Typography fontWeight={700} fontSize="0.88rem" sx={{ mt: 0.25 }}>
                            {operations.length}
                        </Typography>
                    </Paper>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* ── Tabs ── */}
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ mb: 2, minHeight: 36 }}
                    TabIndicatorProps={{ sx: { bgcolor: '#1677ff' } }}
                >
                    <Tab label="Gantt Chart" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minHeight: 36, py: 0.5 }} />
                    <Tab label="Table" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minHeight: 36, py: 0.5 }} />
                </Tabs>

                {tab === 0 && operations.length > 0 && result.plannedStartDate && result.plannedEndDate && (
                    <GanttChart
                        operations={operations}
                        scheduleStart={result.plannedStartDate}
                        scheduleEnd={result.plannedEndDate}
                    />
                )}
                {tab === 0 && operations.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No operations scheduled.
                    </Typography>
                )}

                {tab === 1 && (
                    <OperationsTable operations={operations} allPaths={allPaths} />
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, pt: 0.5 }}>
                <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
