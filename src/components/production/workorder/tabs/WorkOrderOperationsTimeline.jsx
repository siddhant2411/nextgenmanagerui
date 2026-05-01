import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
    Box,
    Chip,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    PLANNED:                { bg: '#8c8c8c', fg: '#fff', label: 'Planned',     pulse: false, strikethrough: false },
    WAITING_FOR_DEPENDENCY: { bg: '#fa8c16', fg: '#fff', label: 'Waiting',     pulse: false, strikethrough: false },
    READY:                  { bg: '#1677ff', fg: '#fff', label: 'Ready',       pulse: false, strikethrough: false },
    IN_PROGRESS:            { bg: '#52c41a', fg: '#fff', label: 'In Progress', pulse: true,  strikethrough: false },
    COMPLETED:              { bg: '#237804', fg: '#fff', label: 'Done',        pulse: false, strikethrough: false },
    HOLD:                   { bg: '#cf1322', fg: '#fff', label: 'On Hold',     pulse: false, strikethrough: false },
    CANCELLED:              { bg: '#d9d9d9', fg: '#595959', label: 'Cancelled', pulse: false, strikethrough: true },
};

const PATH_COLOURS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];
function getPathColour(path, pathList) {
    if (!path) return '#8c8c8c';
    const idx = pathList.indexOf(path);
    return PATH_COLOURS[Math.max(idx, 0) % PATH_COLOURS.length];
}

const fmt = (v) => v ? dayjs(v).format('DD-MM-YY HH:mm') : '-';
const fmtDate = (v) => v ? dayjs(v).format('DD-MM-YY') : '-';

const LANE_H = 48;       // lane row height in px
const BAR_H = 22;        // bar height in px
const LANE_LABEL_W = 116; // label panel width in px

// ─── Layout computation ────────────────────────────────────────────────────────
// Priority: actual dates → planned dates → setupTime+runTime → equal widths
function computeLayout(operations) {
    const dates = operations.flatMap(op => [
        op.actualStartDate, op.actualEndDate,
        op.plannedStartDate, op.plannedEndDate,
    ]).filter(Boolean).map(d => dayjs(d).valueOf());

    const hasSchedDates = dates.length >= 2;

    if (hasSchedDates) {
        const minTs = Math.min(...dates);
        const maxTs = Math.max(...dates);
        const range = maxTs - minTs || 1;

        return operations.map(op => {
            const s = op.actualStartDate || op.plannedStartDate;
            const e = op.actualEndDate || op.plannedEndDate;

            if (s && e) {
                const leftPct = ((dayjs(s).valueOf() - minTs) / range) * 100;
                const widthPct = Math.max(((dayjs(e).valueOf() - dayjs(s).valueOf()) / range) * 100, 2);
                return { left: leftPct, width: widthPct, hasDates: true };
            }
            return { left: 0, width: 8, hasDates: false };
        });
    }

    // No dates — use setupTime+runTime as proportional widths
    const totalTimes = operations.map(op => (op.setupTime || 0) + (op.runTime || 0));
    const sumTime = totalTimes.reduce((a, b) => a + b, 0);

    if (sumTime > 0) {
        let cursor = 0;
        return operations.map((op, i) => {
            const wPct = (totalTimes[i] / sumTime) * 88;
            const left = cursor;
            cursor += wPct + 1.5;
            return { left, width: Math.max(wPct, 4), hasDates: false };
        });
    }

    // Pure fallback: equal blocks
    const step = 88 / Math.max(operations.length, 1);
    return operations.map((_, i) => ({
        left: i * (step + 0.5),
        width: Math.max(step - 0.5, 4),
        hasDates: false,
    }));
}

// ─── Tooltip body ─────────────────────────────────────────────────────────────
function BarTooltip({ op, blockingNames }) {
    const cfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.PLANNED;
    return (
        <Box sx={{ p: 0.5, maxWidth: 260 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>
                Op {op.sequence ?? op.routingOperation?.sequenceNumber}: {op.operationName || op.routingOperation?.name}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', mb: 0.25 }}>Status: {cfg.label}</Typography>
            {op.workCenter && (
                <Typography sx={{ fontSize: '0.72rem' }}>Work Centre: {op.workCenter.centerName || op.workCenter}</Typography>
            )}
            {op.machineDetails && (
                <Typography sx={{ fontSize: '0.72rem' }}>Machine: {op.machineDetails.machineName || op.machineDetails}</Typography>
            )}
            {(op.setupTime != null || op.runTime != null) && (
                <Typography sx={{ fontSize: '0.72rem' }}>
                    Setup: {op.setupTime ?? 0} min | Run: {op.runTime ?? 0} min/unit
                </Typography>
            )}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', mt: 0.5, pt: 0.5 }}>
                <Typography sx={{ fontSize: '0.7rem' }}>Planned: {fmtDate(op.plannedStartDate)} → {fmtDate(op.plannedEndDate)}</Typography>
                <Typography sx={{ fontSize: '0.7rem' }}>Actual:  {fmtDate(op.actualStartDate)} → {fmtDate(op.actualEndDate)}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                Qty: {op.completedQuantity ?? 0} / {op.plannedQuantity ?? 0} completed
            </Typography>
            {op.dependencyResolvedDate && (
                <Typography sx={{ fontSize: '0.7rem' }}>Deps resolved: {fmt(op.dependencyResolvedDate)}</Typography>
            )}
            {blockingNames.length > 0 && (
                <Typography sx={{ fontSize: '0.7rem', color: '#faad14', mt: 0.5 }}>
                    ⚠ Blocked by: {blockingNames.join(', ')}
                </Typography>
            )}
        </Box>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WorkOrderOperationsTimeline({ operations = [] }) {
    const barAreaRef = useRef(null);
    // barRects: opId → DOMRect of the bar element (relative to barArea)
    const [barRects, setBarRects] = useState({});
    const barEls = useRef({});   // opId → DOM element

    const measureBars = useCallback(() => {
        const container = barAreaRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const next = {};
        for (const [id, el] of Object.entries(barEls.current)) {
            if (el) {
                const r = el.getBoundingClientRect();
                next[id] = {
                    x: r.left - containerRect.left,
                    y: r.top - containerRect.top,
                    w: r.width,
                    h: r.height,
                };
            }
        }
        setBarRects(next);
    }, []);

    useLayoutEffect(() => {
        measureBars();
        window.addEventListener('resize', measureBars);
        return () => window.removeEventListener('resize', measureBars);
    }, [operations, measureBars]);

    if (!operations.length) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                No operations to display.
            </Typography>
        );
    }

    const sorted = [...operations].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
    const opById = {};
    for (const op of operations) { if (op.id) opById[op.id] = op; }

    const pathList = [...new Set(operations.map(o => o.parallelPath).filter(Boolean))];

    // Group into lanes (parallelPath → shared lane; no path → solo lane)
    const lanes = [];
    const pathLaneMap = {};
    for (const op of sorted) {
        const path = op.parallelPath;
        if (path) {
            if (pathLaneMap[path] === undefined) {
                pathLaneMap[path] = lanes.length;
                lanes.push({ path, ops: [] });
            }
            lanes[pathLaneMap[path]].ops.push(op);
        } else {
            lanes.push({ path: null, ops: [op] });
        }
    }

    // Compute layout per lane (proportional within each lane)
    const opLayoutMap = {};
    for (const lane of lanes) {
        const layouts = computeLayout(lane.ops);
        lane.ops.forEach((op, i) => {
            if (op.id) opLayoutMap[op.id] = layouts[i];
        });
    }

    // Build edge list for dep arrows
    // dependsOnOperationIds lives on the WorkOrderOperation; routing deps on routingOperation.dependencies
    const edges = [];
    for (const op of operations) {
        const toId = op.id;
        const depIds = Array.isArray(op.dependsOnOperationIds) ? op.dependsOnOperationIds : [];
        for (const fromId of depIds) {
            // Get dep type from routingOperation.dependencies
            const depType = (op.routingOperation?.dependencies || [])
                .find(d => d.dependsOnRoutingOperationId === fromId)?.dependencyType || 'SEQUENTIAL';
            edges.push({ fromId, toId, depType });
        }
    }

    // SVG arrow markers
    const totalH = lanes.reduce((sum, lane) => sum + Math.max(lane.ops.length, 1) * LANE_H, 0);

    return (
        <Box>
            {/* Legend */}
            <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600} mr={0.5}>Status:</Typography>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <Chip key={key} size="small" label={cfg.label}
                        sx={{ bgcolor: cfg.bg, color: cfg.fg, fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                ))}
                {pathList.length > 0 && (
                    <Box display="flex" gap={0.5} alignItems="center" ml={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Paths:</Typography>
                        {pathList.map(p => (
                            <Chip key={p} size="small" label={p}
                                sx={{ bgcolor: getPathColour(p, pathList), color: '#fff', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                        ))}
                    </Box>
                )}
                {edges.length > 0 && (
                    <Box display="flex" gap={1} alignItems="center" ml={1}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <svg width={28} height={12}>
                                <line x1={0} y1={6} x2={20} y2={6} stroke="#444" strokeWidth={1.5} />
                                <polygon points="16,3 22,6 16,9" fill="#444" />
                            </svg>
                            <Typography variant="caption" color="text.secondary">Sequential dep</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <svg width={28} height={12}>
                                <line x1={0} y1={6} x2={20} y2={6} stroke="#aaa" strokeWidth={1.5} strokeDasharray="4,3" />
                                <polygon points="16,3 22,6 16,9" fill="#aaa" />
                            </svg>
                            <Typography variant="caption" color="text.secondary">Parallel dep</Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Timeline */}
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, bgcolor: '#0f2744', color: '#fff' }}>
                    <Box sx={{ width: LANE_LABEL_W, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>Lane</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                            Timeline {sorted.every(o => !o.plannedStartDate) ? '(relative — add schedule for exact dates)' : ''}
                        </Typography>
                    </Box>
                </Box>

                {/* Bar area wrapper (relative container for SVG overlay) */}
                <Box sx={{ position: 'relative' }}>
                    {/* SVG arrows overlay */}
                    {edges.length > 0 && Object.keys(barRects).length > 0 && (
                        <Box
                            component="svg"
                            ref={barAreaRef}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: LANE_LABEL_W,
                                width: `calc(100% - ${LANE_LABEL_W}px)`,
                                height: totalH,
                                pointerEvents: 'none',
                                zIndex: 5,
                                overflow: 'visible',
                            }}
                        >
                            <defs>
                                <marker id="arr-seq" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
                                    <path d="M0,0 L0,6 L7,3 z" fill="#444" />
                                </marker>
                                <marker id="arr-par" markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
                                    <path d="M0,0 L0,6 L7,3 z" fill="#aaa" />
                                </marker>
                            </defs>
                            {edges.map((edge, i) => {
                                const from = barRects[edge.fromId];
                                const to = barRects[edge.toId];
                                if (!from || !to) return null;
                                const isParallel = edge.depType === 'PARALLEL_ALLOWED';
                                const x1 = from.x + from.w;
                                const y1 = from.y + from.h / 2;
                                const x2 = to.x - 6;
                                const y2 = to.y + to.h / 2;
                                const cx = (x1 + x2) / 2;

                                return (
                                    <path
                                        key={i}
                                        d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                                        stroke={isParallel ? '#aaa' : '#444'}
                                        strokeWidth={1.5}
                                        strokeDasharray={isParallel ? '5,4' : 'none'}
                                        fill="none"
                                        markerEnd={isParallel ? 'url(#arr-par)' : 'url(#arr-seq)'}
                                    />
                                );
                            })}
                        </Box>
                    )}

                    {/* Lanes */}
                    <Box ref={barAreaRef}>
                        {lanes.map((lane, laneIdx) => {
                            const pathColour = lane.path ? getPathColour(lane.path, pathList) : '#8c8c8c';
                            const isMultiOp = lane.ops.length > 1;
                            const laneHeight = Math.max(lane.ops.length, 1) * LANE_H;

                            return (
                                <Box
                                    key={laneIdx}
                                    sx={{
                                        display: 'flex',
                                        borderBottom: laneIdx < lanes.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        bgcolor: laneIdx % 2 === 0 ? '#fff' : '#fafafa',
                                        minHeight: laneHeight,
                                    }}
                                >
                                    {/* Lane label */}
                                    <Box sx={{
                                        width: LANE_LABEL_W, flexShrink: 0,
                                        px: 1, py: 0.75,
                                        borderRight: `3px solid ${pathColour}`,
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                    }}>
                                        {lane.path ? (
                                            <Chip size="small" label={lane.path}
                                                sx={{ bgcolor: pathColour + '22', color: pathColour, fontWeight: 700, fontSize: '0.68rem', height: 20, mb: 0.25 }} />
                                        ) : (
                                            <Typography sx={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                                Op {lane.ops[0]?.sequence ?? '-'}
                                            </Typography>
                                        )}
                                        {isMultiOp && (
                                            <Typography sx={{ fontSize: '0.6rem', color: '#9ca3af' }}>
                                                {lane.ops.length} ops
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Bar row */}
                                    <Box sx={{ flex: 1, position: 'relative', px: 1 }}>
                                        {lane.ops.map((op, opIdx) => {
                                            const layout = opLayoutMap[op.id] || { left: 0, width: 10 };
                                            const cfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.PLANNED;
                                            const blockingNames = (op.dependsOnOperationIds || [])
                                                .map(id => {
                                                    const dep = opById[id];
                                                    if (!dep || dep.status === 'COMPLETED') return null;
                                                    return `Op ${dep.sequence} (${dep.operationName || dep.routingOperation?.name || '-'})`;
                                                })
                                                .filter(Boolean);

                                            const barTop = isMultiOp
                                                ? opIdx * LANE_H + (LANE_H - BAR_H) / 2
                                                : (laneHeight - BAR_H) / 2;

                                            return (
                                                <Tooltip
                                                    key={op.id || opIdx}
                                                    placement="top"
                                                    arrow
                                                    title={<BarTooltip op={op} blockingNames={blockingNames} />}
                                                >
                                                    <Box
                                                        ref={el => {
                                                            barEls.current[op.id] = el;
                                                            if (el) {
                                                                // trigger measurement on mount
                                                                requestAnimationFrame(measureBars);
                                                            }
                                                        }}
                                                        sx={{
                                                            position: 'absolute',
                                                            left: `${layout.left}%`,
                                                            width: `${layout.width}%`,
                                                            minWidth: 52,
                                                            top: barTop,
                                                            height: BAR_H,
                                                            bgcolor: cfg.bg,
                                                            borderRadius: 1,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            px: 0.75,
                                                            cursor: 'default',
                                                            textDecoration: cfg.strikethrough ? 'line-through' : 'none',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                                            animation: cfg.pulse ? 'pulseGreen 2s ease-in-out infinite' : 'none',
                                                            '@keyframes pulseGreen': {
                                                                '0%': { opacity: 1 },
                                                                '50%': { opacity: 0.65 },
                                                                '100%': { opacity: 1 },
                                                            },
                                                            '&:hover': { filter: 'brightness(0.88)', zIndex: 3 },
                                                            zIndex: 2,
                                                        }}
                                                    >
                                                        <Typography noWrap sx={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.fg, lineHeight: 1 }}>
                                                            {op.sequence}. {(op.operationName || op.routingOperation?.name || '').slice(0, 14)}
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
                </Box>
            </Paper>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Hover bars for details · Pulsing green = In Progress · Bar width ∝ setup+run time
                {edges.length > 0 && ' · Arrows show dependencies'}
            </Typography>
        </Box>
    );
}
