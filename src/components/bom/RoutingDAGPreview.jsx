import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Chip, Typography } from '@mui/material';

// ─── Colour palette for parallel paths ───────────────────────────────────────
const PATH_COLOURS = [
    '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96',
    '#13c2c2', '#faad14', '#a0d911',
];

const getPathColour = (path, pathIndex) => {
    if (!path) return '#8c8c8c';
    return PATH_COLOURS[pathIndex % PATH_COLOURS.length];
};

// ─── Cycle detection (DFS) ────────────────────────────────────────────────────
function hasCycle(operations) {
    const idSet = new Set(operations.map(o => o.id || o._tempId));
    const adjMap = {};
    for (const op of operations) {
        const id = op.id || op._tempId;
        adjMap[id] = [];
        if (Array.isArray(op.dependencies)) {
            for (const dep of op.dependencies) {
                const dependsOn = dep.dependsOnRoutingOperationId;
                if (idSet.has(dependsOn)) {
                    adjMap[id].push(dependsOn);
                }
            }
        }
    }
    const visited = new Set();
    const stack = new Set();

    function dfs(nodeId) {
        if (stack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;
        visited.add(nodeId);
        stack.add(nodeId);
        for (const neighbour of (adjMap[nodeId] || [])) {
            if (dfs(neighbour)) return true;
        }
        stack.delete(nodeId);
        return false;
    }

    for (const op of operations) {
        const id = op.id || op._tempId;
        if (!visited.has(id) && dfs(id)) return true;
    }
    return false;
}

// ─── Node layout constants ────────────────────────────────────────────────────
const NODE_W = 160;
const NODE_H = 64;
const H_GAP = 80;
const V_GAP = 32;

export default function RoutingDAGPreview({ operations = [] }) {
    const svgRef = useRef(null);
    const [svgSize, setSvgSize] = useState({ w: 800, h: 300 });

    // Build unique parallel path list
    const pathList = useMemo(() => {
        const paths = [...new Set(operations.map(o => o.parallelPath).filter(Boolean))];
        return paths;
    }, [operations]);

    const pathIndexMap = useMemo(() => {
        const m = {};
        pathList.forEach((p, i) => { m[p] = i; });
        return m;
    }, [pathList]);

    // Simple topo-sorted layout: X = level (longest path from root), Y = parallel path row
    const nodePositions = useMemo(() => {
        if (!operations.length) return {};

        const idOf = op => op.id || op._tempId;

        // Build adjacency (dependsOn → current)
        const inEdges = {}; // id → [dependsOnId]
        for (const op of operations) {
            inEdges[idOf(op)] = [];
            if (Array.isArray(op.dependencies)) {
                for (const dep of op.dependencies) {
                    inEdges[idOf(op)].push(dep.dependsOnRoutingOperationId);
                }
            }
        }

        // Level = longest path from root
        const level = {};
        function getLevel(id) {
            if (level[id] !== undefined) return level[id];
            const deps = inEdges[id] || [];
            if (!deps.length) { level[id] = 0; return 0; }
            level[id] = 1 + Math.max(...deps.map(d => getLevel(d)));
            return level[id];
        }
        operations.forEach(op => getLevel(idOf(op)));

        // Group by parallel path for Y placement
        const pathRowMap = {};
        const rowCounts = {};
        let nextFreePath = 0;

        operations.forEach(op => {
            const id = idOf(op);
            const path = op.parallelPath || `__seq_${id}`;
            if (pathRowMap[path] === undefined) {
                pathRowMap[path] = nextFreePath++;
            }
            rowCounts[pathRowMap[path]] = (rowCounts[pathRowMap[path]] || 0) + 1;
        });

        const positions = {};
        operations.forEach(op => {
            const id = idOf(op);
            const path = op.parallelPath || `__seq_${id}`;
            const row = pathRowMap[path];
            const col = level[id];
            positions[id] = {
                x: col * (NODE_W + H_GAP) + 16,
                y: row * (NODE_H + V_GAP) + 16,
                op,
            };
        });

        return positions;
    }, [operations]);

    // Compute SVG canvas size
    useEffect(() => {
        const positions = Object.values(nodePositions);
        if (!positions.length) return;
        const maxX = Math.max(...positions.map(p => p.x + NODE_W)) + 32;
        const maxY = Math.max(...positions.map(p => p.y + NODE_H)) + 32;
        setSvgSize({ w: maxX, h: maxY });
    }, [nodePositions]);

    const cycleDetected = useMemo(() => hasCycle(operations), [operations]);

    // Build edge list
    const edges = useMemo(() => {
        const list = [];
        for (const op of operations) {
            const toId = op.id || op._tempId;
            if (!Array.isArray(op.dependencies)) continue;
            for (const dep of op.dependencies) {
                const fromId = dep.dependsOnRoutingOperationId;
                if (nodePositions[fromId] && nodePositions[toId]) {
                    list.push({
                        fromId,
                        toId,
                        depType: dep.dependencyType || 'SEQUENTIAL',
                    });
                }
            }
        }
        return list;
    }, [operations, nodePositions]);

    if (!operations.length) return null;

    const idOf = op => op.id || op._tempId;

    return (
        <Box>
            {cycleDetected && (
                <Alert severity="error" sx={{ mb: 1, fontSize: '0.78rem' }}>
                    <strong>Circular dependency detected!</strong> Please remove the cycle before saving.
                </Alert>
            )}

            {/* Legend */}
            {pathList.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={0.75} mb={1}>
                    {pathList.map((path, i) => (
                        <Chip
                            key={path}
                            label={path}
                            size="small"
                            sx={{
                                bgcolor: getPathColour(path, pathIndexMap[path]),
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                            }}
                        />
                    ))}
                    <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                        <svg width={24} height={12}>
                            <line x1={0} y1={6} x2={20} y2={6} stroke="#333" strokeWidth={1.5} />
                            <polygon points="16,3 22,6 16,9" fill="#333" />
                        </svg>
                        <Typography variant="caption" color="text.secondary">Sequential</Typography>
                        <Box ml={1} display="flex" alignItems="center" gap={0.5}>
                            <svg width={24} height={12}>
                                <line x1={0} y1={6} x2={20} y2={6} stroke="#1677ff" strokeWidth={1.5} strokeDasharray="4,3" />
                                <polygon points="16,3 22,6 16,9" fill="#1677ff" />
                            </svg>
                            <Typography variant="caption" color="text.secondary">Parallel Allowed</Typography>
                        </Box>
                    </Box>
                </Box>
            )}

            <Box sx={{ border: '1px solid #e5e9f2', borderRadius: 1.5, bgcolor: '#f8fafc', overflowX: 'auto', overflowY: 'auto', maxHeight: 400 }}>
                <svg
                    ref={svgRef}
                    width={svgSize.w}
                    height={svgSize.h}
                    style={{ display: 'block' }}
                >
                    <defs>
                        <marker id="arrow-seq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#555" />
                        </marker>
                        <marker id="arrow-par" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#1677ff" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {edges.map((edge, i) => {
                        const from = nodePositions[edge.fromId];
                        const to = nodePositions[edge.toId];
                        if (!from || !to) return null;

                        const x1 = from.x + NODE_W;
                        const y1 = from.y + NODE_H / 2;
                        const x2 = to.x;
                        const y2 = to.y + NODE_H / 2;
                        const cx1 = x1 + (x2 - x1) / 2;
                        const cy1 = y1;
                        const cx2 = x1 + (x2 - x1) / 2;
                        const cy2 = y2;
                        const isParallel = edge.depType === 'PARALLEL_ALLOWED';

                        return (
                            <g key={i}>
                                <path
                                    d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2 - 8},${y2}`}
                                    stroke={isParallel ? '#1677ff' : '#555'}
                                    strokeWidth={1.5}
                                    strokeDasharray={isParallel ? '5,4' : 'none'}
                                    fill="none"
                                    markerEnd={isParallel ? 'url(#arrow-par)' : 'url(#arrow-seq)'}
                                />
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {operations.map(op => {
                        const id = idOf(op);
                        const pos = nodePositions[id];
                        if (!pos) return null;

                        const pathColour = op.parallelPath
                            ? getPathColour(op.parallelPath, pathIndexMap[op.parallelPath])
                            : '#8c8c8c';
                        const isParallel = Boolean(op.allowParallel);

                        return (
                            <g key={id}>
                                {/* Shadow */}
                                <rect
                                    x={pos.x + 2}
                                    y={pos.y + 2}
                                    width={NODE_W}
                                    height={NODE_H}
                                    rx={6}
                                    fill="rgba(0,0,0,0.06)"
                                />
                                {/* Card bg */}
                                <rect
                                    x={pos.x}
                                    y={pos.y}
                                    width={NODE_W}
                                    height={NODE_H}
                                    rx={6}
                                    fill="#fff"
                                    stroke={isParallel ? pathColour : '#d0d7de'}
                                    strokeWidth={isParallel ? 2 : 1}
                                />
                                {/* Left colour strip for parallel path */}
                                {op.parallelPath && (
                                    <rect
                                        x={pos.x}
                                        y={pos.y}
                                        width={4}
                                        height={NODE_H}
                                        rx={3}
                                        fill={pathColour}
                                    />
                                )}
                                {/* Seq number badge */}
                                <rect x={pos.x + 8} y={pos.y + 8} width={22} height={16} rx={3} fill="#f0f4ff" />
                                <text x={pos.x + 19} y={pos.y + 20} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1677ff">
                                    {op.sequenceNumber || '?'}
                                </text>
                                {/* Name */}
                                <text
                                    x={pos.x + 38}
                                    y={pos.y + 20}
                                    fontSize={11}
                                    fontWeight={600}
                                    fill="#0f2744"
                                    style={{ fontFamily: 'Inter, system-ui' }}
                                >
                                    {(op.name || 'Operation').length > 14 ? (op.name || 'Operation').slice(0, 13) + '…' : (op.name || 'Operation')}
                                </text>
                                {/* Work center */}
                                <text
                                    x={pos.x + 8}
                                    y={pos.y + 38}
                                    fontSize={10}
                                    fill="#6b7280"
                                    style={{ fontFamily: 'Inter, system-ui' }}
                                >
                                    {op.workCenter?.centerName ? (op.workCenter.centerName.length > 20 ? op.workCenter.centerName.slice(0, 19) + '…' : op.workCenter.centerName) : 'No work center'}
                                </text>
                                {/* Timing */}
                                <text x={pos.x + 8} y={pos.y + 52} fontSize={9} fill="#9ca3af">
                                    {`Setup: ${op.setupTime || 0}h | Run: ${op.runTime || 0}h`}
                                </text>
                                {/* Parallel badge */}
                                {isParallel && (
                                    <g>
                                        <rect x={pos.x + NODE_W - 34} y={pos.y + 8} width={28} height={14} rx={4} fill={pathColour + '33'} stroke={pathColour} strokeWidth={0.8} />
                                        <text x={pos.x + NODE_W - 20} y={pos.y + 19} textAnchor="middle" fontSize={8} fontWeight={700} fill={pathColour}>
                                            ∥
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </Box>
        </Box>
    );
}
