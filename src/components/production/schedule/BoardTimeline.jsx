import React, { useMemo } from 'react';
import { Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { MUTED, T } from '../../inventory/warehouse/listStyles';

// ─── Look ─────────────────────────────────────────────────────────────────────

export const LABEL_WIDTH = 240;
const ROW_HEIGHT = 58;
const GROUP_HEIGHT = 30;
const HEADER_HEIGHT = 50;

export const STATUS_STYLE = {
    PLANNED: { bg: '#2563eb', label: 'Planned' },
    READY: { bg: '#2563eb', label: 'Ready' },
    WAITING_FOR_DEPENDENCY: { bg: '#3b82f6', label: 'Waiting' },
    IN_PROGRESS: { bg: '#0f766e', label: 'Running' },
    COMPLETED: { bg: '#94a3b8', label: 'Done' },
    HOLD: { bg: '#b45309', label: 'On hold' },
};
const PRIORITY_EDGE = { URGENT: '#dc2626', HIGH: '#f97316' };
const HATCH = 'repeating-linear-gradient(135deg, rgba(255,255,255,.22) 0 5px, transparent 5px 10px)';
const CLOSED_BG = 'repeating-linear-gradient(135deg, #f1f5f9 0 6px, #e9eef5 6px 12px)';

const loadColor = (pct) => (pct >= 90 ? T.error : pct >= 70 ? T.warning : pct > 0 ? T.success : '#cbd5e1');

const fmtMins = (mins) => {
    const total = Math.round(Number(mins) || 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h}h ${m}m`;
    return h ? `${h}h` : `${m}m`;
};
const fmtWhen = (d) => (d ? dayjs(d).format('DD MMM, HH:mm') : '–');
/** A due date entered as a plain date arrives as midnight after it: show it as that day. */
export const fmtDueBy = (d) => {
    if (!d) return '–';
    const due = dayjs(d);
    return due.format('HH:mm') === '00:00' ? `by end of ${due.subtract(1, 'day').format('DD MMM')}` : `by ${due.format('DD MMM, HH:mm')}`;
};

// ─── Time axis ────────────────────────────────────────────────────────────────

/**
 * Maps time to pixels for a window. {@code pxPerHour} sets the zoom; the tick step is picked so
 * labels never crowd.
 */
export function useTimeScale(from, to, pxPerHour) {
    return useMemo(() => {
        const start = dayjs(from);
        const end = dayjs(to);
        const minutes = Math.max(end.diff(start, 'minute'), 1);
        const pxPerMin = pxPerHour / 60;
        const tickHours = pxPerHour >= 50 ? 1 : pxPerHour >= 20 ? 3 : pxPerHour >= 8 ? 6 : 12;
        return {
            start,
            width: minutes * pxPerMin,
            x: (t) => dayjs(t).diff(start, 'minute') * pxPerMin,
            clampX: (t) => Math.min(Math.max(dayjs(t).diff(start, 'minute') * pxPerMin, 0), minutes * pxPerMin),
            days: Array.from({ length: Math.ceil(minutes / 1440) }, (_, i) => start.add(i, 'day')),
            tickHours,
            pxPerMin,
        };
    }, [from, to, pxPerHour]);
}

function AxisHeader({ scale, now }) {
    const ticks = [];
    scale.days.forEach((day) => {
        for (let h = scale.tickHours; h < 24; h += scale.tickHours) ticks.push(day.add(h, 'hour'));
    });
    return (
        <Box sx={{ position: 'relative', height: HEADER_HEIGHT, width: scale.width, borderBottom: `1px solid ${T.border}`, bgcolor: '#f8fafc' }}>
            {scale.days.map((day) => {
                const isToday = day.isSame(now, 'day');
                return (
                    <Box key={day.valueOf()} sx={{
                        position: 'absolute', left: scale.x(day), width: 1440 * scale.pxPerMin, top: 0, height: 26,
                        borderLeft: `1px solid ${T.border}`, px: 1, display: 'flex', alignItems: 'center', gap: 0.75,
                        bgcolor: isToday ? '#eff6ff' : 'transparent', overflow: 'hidden',
                    }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: isToday ? T.primary : T.text, whiteSpace: 'nowrap' }}>
                            {day.format('ddd D MMM')}
                        </Typography>
                        {isToday && <Chip label="Today" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: T.primary, color: 'white' }} />}
                    </Box>
                );
            })}
            {ticks.map((t) => (
                <Typography key={t.valueOf()} sx={{
                    position: 'absolute', left: scale.x(t) - 14, top: 30, width: 28, textAlign: 'center',
                    fontSize: '0.62rem', fontWeight: 600, color: MUTED,
                }}>
                    {t.format('HH:mm')}
                </Typography>
            ))}
        </Box>
    );
}

/** Day and tick lines behind the rows. */
function GridLines({ scale, height }) {
    const lines = [];
    scale.days.forEach((day) => {
        lines.push({ t: day, strong: true });
        for (let h = scale.tickHours; h < 24; h += scale.tickHours) lines.push({ t: day.add(h, 'hour'), strong: false });
    });
    return lines.map(({ t, strong }) => (
        <Box key={t.valueOf()} sx={{
            position: 'absolute', left: scale.x(t), top: 0, height, width: 0,
            borderLeft: strong ? '1px solid #cbd5e1' : '1px dashed #e2e8f0', pointerEvents: 'none',
        }} />
    ));
}

// ─── Bars ─────────────────────────────────────────────────────────────────────

/**
 * Puts overlapping bars in a row on separate lanes, so none hides another. A finite-capacity
 * plan has no overlaps, so more than one lane means a clash: work running over, or a job
 * started on a machine the plan gave to something else.
 */
export function laneBars(bars) {
    // The span a bar is drawn over: earlier to later, whichever way round the plan saved them.
    const spans = bars.map((bar) => {
        const a = dayjs(bar.start);
        const b = dayjs(bar.end);
        return { bar, start: a.isAfter(b) ? b : a, end: a.isAfter(b) ? a : b };
    });
    spans.sort((x, y) => x.start.diff(y.start) || x.end.diff(y.end));
    const laneEnds = [];
    const placed = spans.map(({ bar, start, end }) => {
        let lane = laneEnds.findIndex((laneEnd) => !laneEnd.isAfter(start));
        if (lane < 0) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
        return { bar, lane };
    });
    return { placed, lanes: Math.max(laneEnds.length, 1) };
}

function BarTooltip({ bar, showResource }) {
    const status = STATUS_STYLE[bar.operationStatus] || { label: bar.operationStatus };
    return (
        <Box sx={{ fontSize: '0.75rem', lineHeight: 1.5, p: 0.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>{bar.workOrderNumber} · {bar.sequence} {bar.operationName}</Typography>
            {bar.itemCode && <div>{bar.itemCode}{bar.itemName ? ` — ${bar.itemName}` : ''}</div>}
            {bar.parentWorkOrderNumber && <div>Sub-assembly for {bar.parentWorkOrderNumber}</div>}
            {showResource && <div>On {bar.machineCode || bar.workCenterCode}</div>}
            <div>{fmtWhen(bar.start)} → {fmtWhen(bar.end)}</div>
            <div>Work {fmtMins(bar.workMinutes)} · Qty {Number(bar.completedQuantity || 0)}/{Number(bar.plannedQuantity || 0)}</div>
            <div>{status.label}{bar.priority && bar.priority !== 'NORMAL' ? ` · ${bar.priority}` : ''}</div>
            {bar.kept && <div>Kept where it is: the scheduler will not move it</div>}
            {bar.dueBy && <div style={{ color: bar.late ? '#fca5a5' : undefined }}>Order due {fmtDueBy(bar.dueBy)}{bar.late ? ' — will be late' : ''}</div>}
            <div style={{ opacity: 0.7, marginTop: 4 }}>Click to open the work order</div>
        </Box>
    );
}

function Bar({ bar, scale, now, onOpen, showResource, label, lane = 0, lanes = 1 }) {
    // A plan saved with its start after its end (possible before the scheduler kept running
    // work from its actual start) is still drawn across the time it names.
    const left = Math.min(scale.clampX(bar.start), scale.clampX(bar.end));
    const right = Math.max(scale.clampX(bar.start), scale.clampX(bar.end));
    const width = Math.max(right - left, 3);
    const style = STATUS_STYLE[bar.operationStatus] || { bg: '#64748b' };
    const edge = PRIORITY_EDGE[bar.priority];
    const overrunning = bar.operationStatus === 'IN_PROGRESS' && dayjs(bar.end).isBefore(now);
    const text = label ?? `${bar.workOrderNumber} · ${bar.operationName}`;
    const laneHeight = (ROW_HEIGHT - 16) / lanes;
    const top = 8 + lane * laneHeight;
    const height = Math.max(laneHeight - (lanes > 1 ? 3 : 0), 8);

    return (
        <>
            {overrunning && (
                <Tooltip title={`Still running ${fmtMins(dayjs(now).diff(dayjs(bar.end), 'minute'))} past its planned end`} arrow>
                    <Box sx={{
                        position: 'absolute', top: top + height / 2 - 7, height: 14, left: right, width: Math.max(scale.clampX(now) - right, 2), zIndex: 3,
                        borderTop: `2px dashed ${T.error}`, borderBottom: `2px dashed ${T.error}`, borderRight: `2px solid ${T.error}`,
                    }} />
                </Tooltip>
            )}
            <Tooltip title={<BarTooltip bar={bar} showResource={showResource} />} arrow placement="top" enterDelay={150}>
                <Box
                    onClick={() => onOpen(bar.workOrderId)}
                    data-testid="board-bar"
                    data-wo={bar.workOrderNumber}
                    data-op={bar.operationId}
                    sx={{
                        // Above the grid lines, below the now line and the sticky labels.
                        position: 'absolute', top: lanes > 1 ? top : 12, height: lanes > 1 ? height : ROW_HEIGHT - 24, left, width, zIndex: 3,
                        bgcolor: style.bg, backgroundImage: bar.kept ? HATCH : 'none',
                        borderRadius: 1.25, cursor: 'pointer', overflow: 'hidden',
                        borderLeft: edge ? `4px solid ${edge}` : 'none',
                        boxShadow: bar.late ? `0 0 0 2px ${T.error}` : '0 1px 2px rgba(15,23,42,0.18)',
                        display: 'flex', alignItems: 'center', px: width > 40 ? 0.75 : 0,
                        transition: 'transform .08s, box-shadow .08s',
                        '&:hover': { zIndex: 4, transform: 'translateY(-1px)', boxShadow: bar.late ? `0 0 0 2px ${T.error}, 0 4px 10px rgba(15,23,42,.25)` : '0 4px 10px rgba(15,23,42,.25)', zIndex: 3 },
                    }}
                >
                    {width > 56 && height >= 14 && (
                        <Typography sx={{ color: 'white', fontSize: lanes > 1 ? '0.6rem' : '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {text}
                        </Typography>
                    )}
                </Box>
            </Tooltip>
        </>
    );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function LoadMeter({ pct, booked, capacity }) {
    return (
        <Tooltip title={`${fmtMins(booked)} booked of ${fmtMins(capacity)} working time in this window`} arrow>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5 }}>
                <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{
                    flex: 1, height: 5, borderRadius: 3, bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: loadColor(pct), borderRadius: 3 },
                }} />
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: loadColor(pct), minWidth: 34, textAlign: 'right' }}>
                    {Math.round(pct)}%
                </Typography>
            </Stack>
        </Tooltip>
    );
}

function RowFrame({ label, height = ROW_HEIGHT, scale, children, background }) {
    return (
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
            <Box sx={{
                width: LABEL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 4, bgcolor: 'white',
                borderRight: `1px solid ${T.border}`, px: 1.5, height, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
                {label}
            </Box>
            <Box sx={{ position: 'relative', width: scale.width, height, background: background ?? 'white', flexShrink: 0 }}>
                {children}
            </Box>
        </Box>
    );
}

/** Closed time is hatched grey, open time white, downtime red. */
function WorkingTime({ resource, scale }) {
    return (
        <>
            {resource.openTime.map((span) => (
                <Box key={span.start} sx={{ position: 'absolute', top: 0, bottom: 0, left: scale.clampX(span.start), width: scale.clampX(span.end) - scale.clampX(span.start), bgcolor: 'white' }} />
            ))}
            {resource.downtime.map((span) => (
                <Tooltip key={span.start} title={`Down: ${span.label} (${fmtWhen(span.start)} → ${fmtWhen(span.end)})`} arrow>
                    <Box sx={{
                        position: 'absolute', top: 3, bottom: 3, left: scale.clampX(span.start), zIndex: 1,
                        width: Math.max(scale.clampX(span.end) - scale.clampX(span.start), 2), borderRadius: 1,
                        background: 'repeating-linear-gradient(135deg, #fee2e2 0 5px, #fecaca 5px 10px)', border: '1px solid #fca5a5',
                    }} />
                </Tooltip>
            ))}
        </>
    );
}

function ResourceLabel({ resource, clash }) {
    const down = resource.machineStatus && resource.machineStatus !== 'ACTIVE';
    const title = resource.unassigned ? 'No machine yet' : resource.machineCode || resource.workCenterCode;
    const subtitle = resource.unassigned ? 'Planned on the work centre' : resource.machineName || resource.workCenterName;
    return (
        <>
            <Stack direction="row" alignItems="center" spacing={0.75}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: resource.unassigned ? MUTED : T.text, fontStyle: resource.unassigned ? 'italic' : 'normal' }}>
                    {title}
                </Typography>
                {down && <Chip label={resource.machineStatus.replace(/_/g, ' ').toLowerCase()} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: '#fee2e2', color: T.error }} />}
                {clash && (
                    <Tooltip title="Two jobs are booked on this machine at the same time: work running over, or a job started here off-plan. Reschedule the orders that are not running." arrow>
                        <Chip label="Clash" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: '#fee2e2', color: T.error }} />
                    </Tooltip>
                )}
            </Stack>
            <Typography sx={{ fontSize: '0.66rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</Typography>
            {!resource.unassigned && <LoadMeter pct={resource.loadPercent} booked={resource.bookedMinutes} capacity={resource.capacityMinutes} />}
        </>
    );
}

// ─── The two views ────────────────────────────────────────────────────────────

/** One row per machine (or work centre without machines), grouped by work centre. */
export function MachineTimeline({ board, scale, onOpen, matches }) {
    const groups = useMemo(() => {
        const byCentre = new Map();
        board.resources.forEach((r) => {
            if (!byCentre.has(r.workCenterCode)) byCentre.set(r.workCenterCode, { code: r.workCenterCode, name: r.workCenterName, rows: [] });
            byCentre.get(r.workCenterCode).rows.push(r);
        });
        return [...byCentre.values()].map((g) => {
            const capacity = g.rows.reduce((s, r) => s + r.capacityMinutes, 0);
            const booked = g.rows.reduce((s, r) => s + r.bookedMinutes, 0);
            return { ...g, pct: capacity ? (booked / capacity) * 100 : 0 };
        });
    }, [board]);

    const height = groups.reduce((s, g) => s + GROUP_HEIGHT + g.rows.length * ROW_HEIGHT, 0);
    const now = dayjs(board.now);
    const nowX = now.isAfter(scale.start) && now.isBefore(dayjs(board.to)) ? scale.x(now) : null;

    return (
        <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 6 }}>
                <Box sx={{ width: LABEL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 7, bgcolor: '#f8fafc', borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, px: 1.5, display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Machine · load</Typography>
                </Box>
                <AxisHeader scale={scale} now={now} />
            </Box>
            <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: LABEL_WIDTH, top: 0, height, width: scale.width, zIndex: 2, pointerEvents: 'none' }}>
                    <GridLines scale={scale} height={height} />
                    {nowX !== null && (
                        <Box sx={{ position: 'absolute', left: nowX, top: 0, height, borderLeft: `2px solid ${T.error}`, zIndex: 5 }}>
                            <Box sx={{ position: 'absolute', top: -4, left: -5, width: 8, height: 8, borderRadius: '50%', bgcolor: T.error }} />
                        </Box>
                    )}
                </Box>
                {groups.map((g) => (
                    <React.Fragment key={g.code}>
                        <RowFrame scale={scale} height={GROUP_HEIGHT} background="#f8fafc" label={
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: T.text, letterSpacing: '0.02em' }}>
                                    {g.code} <span style={{ fontWeight: 600, color: MUTED }}>{g.name}</span>
                                </Typography>
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: loadColor(g.pct) }}>{Math.round(g.pct)}%</Typography>
                            </Stack>
                        } />
                        {g.rows.map((r) => {
                            const { placed, lanes } = laneBars(r.bars);
                            return (
                                <RowFrame key={r.key} scale={scale} background={CLOSED_BG} label={<ResourceLabel resource={r} clash={lanes > 1 && !r.unassigned} />}>
                                    <WorkingTime resource={r} scale={scale} />
                                    {placed.map(({ bar, lane }) => (
                                        <Box key={bar.operationId} sx={{ opacity: matches(bar) ? 1 : 0.18 }}>
                                            <Bar bar={bar} scale={scale} now={now} onOpen={onOpen} lane={lane} lanes={lanes} />
                                        </Box>
                                    ))}
                                </RowFrame>
                            );
                        })}
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    );
}

/**
 * One row per work order, its operations across machines. Sub-assemblies sit under the order
 * that uses them, so the chain reads top to bottom.
 */
export function OrderTimeline({ board, scale, onOpen, matches }) {
    const rows = useMemo(() => {
        const orders = new Map();
        board.resources.forEach((r) => r.bars.forEach((bar) => {
            if (!orders.has(bar.workOrderId)) {
                orders.set(bar.workOrderId, {
                    id: bar.workOrderId, number: bar.workOrderNumber, itemCode: bar.itemCode, itemName: bar.itemName,
                    priority: bar.priority, dueBy: bar.dueBy, late: bar.late, parentId: bar.parentWorkOrderId,
                    parentNumber: bar.parentWorkOrderNumber, bars: [],
                });
            }
            orders.get(bar.workOrderId).bars.push(bar);
        }));
        const list = [...orders.values()];
        list.forEach((o) => {
            o.bars.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
            o.start = o.bars[0]?.start;
        });
        const byStart = (a, b) => dayjs(a.start).diff(dayjs(b.start));
        const children = (id) => list.filter((o) => o.parentId === id).sort(byStart);
        const roots = list.filter((o) => !o.parentId || !orders.has(o.parentId)).sort(byStart);
        const ordered = [];
        const walk = (o, depth) => {
            ordered.push({ ...o, depth });
            children(o.id).forEach((c) => walk(c, depth + 1));
        };
        roots.forEach((o) => walk(o, 0));
        return ordered;
    }, [board]);

    const height = rows.length * ROW_HEIGHT;
    const now = dayjs(board.now);
    const nowX = now.isAfter(scale.start) && now.isBefore(dayjs(board.to)) ? scale.x(now) : null;

    return (
        <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 6 }}>
                <Box sx={{ width: LABEL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 7, bgcolor: '#f8fafc', borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, px: 1.5, display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Work order · due</Typography>
                </Box>
                <AxisHeader scale={scale} now={now} />
            </Box>
            <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: LABEL_WIDTH, top: 0, height, width: scale.width, zIndex: 2, pointerEvents: 'none' }}>
                    <GridLines scale={scale} height={height} />
                    {nowX !== null && <Box sx={{ position: 'absolute', left: nowX, top: 0, height, borderLeft: `2px solid ${T.error}`, zIndex: 5 }} />}
                </Box>
                {rows.length === 0 && (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography sx={{ color: MUTED, fontWeight: 600 }}>No work orders are planned in this window.</Typography>
                    </Box>
                )}
                {rows.map((o) => {
                    const dueX = o.dueBy && dayjs(o.dueBy).isAfter(scale.start) && dayjs(o.dueBy).isBefore(dayjs(board.to)) ? scale.x(o.dueBy) : null;
                    return (
                        <RowFrame key={o.id} scale={scale} label={
                            <Box sx={{ pl: o.depth * 1.75, borderLeft: o.depth ? '2px solid #cbd5e1' : 'none', ml: o.depth ? 0.5 : 0 }}>
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                    <Typography onClick={() => onOpen(o.id)} sx={{ fontSize: '0.8rem', fontWeight: 800, color: T.primary, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                                        {o.number}
                                    </Typography>
                                    {o.late && <Chip label="Late" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: '#fee2e2', color: T.error }} />}
                                    {o.priority && PRIORITY_EDGE[o.priority] && <Chip label={o.priority.toLowerCase()} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: `${PRIORITY_EDGE[o.priority]}18`, color: PRIORITY_EDGE[o.priority] }} />}
                                </Stack>
                                <Typography sx={{ fontSize: '0.66rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.depth ? `for ${o.parentNumber} · ` : ''}{o.itemCode || '—'}{o.dueBy ? ` · due ${dayjs(o.dueBy).subtract(1, 'minute').format('DD MMM')}` : ''}
                                </Typography>
                            </Box>
                        }>
                            {dueX !== null && (
                                <Tooltip title={`Due ${fmtDueBy(o.dueBy)}`} arrow>
                                    <Box sx={{ position: 'absolute', left: dueX - 1, top: 2, bottom: 2, width: 3, borderRadius: 1, bgcolor: o.late ? T.error : '#0f172a', zIndex: 3 }} />
                                </Tooltip>
                            )}
                            {(() => {
                                // An order's own operations overlap when output moves on in batches.
                                const { placed, lanes } = laneBars(o.bars);
                                return placed.map(({ bar, lane }) => (
                                    <Box key={bar.operationId} sx={{ opacity: matches(bar) ? 1 : 0.18 }}>
                                        <Bar bar={bar} scale={scale} now={now} onOpen={onOpen} showResource lane={lane} lanes={lanes}
                                            label={`${bar.sequence} ${bar.operationName} · ${bar.machineCode || bar.workCenterCode}`} />
                                    </Box>
                                ));
                            })()}
                        </RowFrame>
                    );
                })}
            </Box>
        </Box>
    );
}
