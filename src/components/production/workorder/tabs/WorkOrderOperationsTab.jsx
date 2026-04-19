import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import { 
  TableChart, 
  BarChart, 
  PlayArrow, 
  Save, 
  CheckCircle, 
  Error as ErrorIcon, 
  Info, 
  Schedule, 
  PrecisionManufacturing,
  AssignmentTurnedIn,
  Block
} from '@mui/icons-material';
import dayjs from 'dayjs';
import WorkOrderOperationsTimeline from './WorkOrderOperationsTimeline';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_OPERATION_STATUSES = [
  'PLANNED',
  'WAITING_FOR_DEPENDENCY',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'HOLD',
  'CANCELLED',
];
const EMPTY_OPERATIONS = [];

// ─── Parallel path colours ────────────────────────────────────────────────────
const PATH_PALETTE = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96',
  '#13c2c2', '#faad14', '#a0d911',
];

function getPathColour(path, pathList) {
  if (!path) return '#8c8c8c';
  const idx = pathList.indexOf(path);
  return PATH_PALETTE[Math.max(idx, 0) % PATH_PALETTE.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return '-';
  return parsed.format('DD-MM-YY hh:mm A');
};

const compactCellSx = {
  px: 1.5,
  py: 1.25,
  fontSize: '0.82rem',
  borderBottom: '1px solid rgba(224, 224, 224, 0.4)',
};

const getOperationRowKey = (operation, index) =>
  String(operation?.id ?? operation?.routingOperation?.id ?? index);

// ─── Enhanced status colour/config ───────────────────────────────────────────
const STATUS_CONFIG = {
  PLANNED:                { color: 'default', icon: <Schedule fontSize="inherit" />, colorMain: '#8c8c8c', bg: '#f5f5f5' },
  WAITING_FOR_DEPENDENCY: { color: 'warning', icon: <Block fontSize="inherit" />, colorMain: '#fa8c16', bg: '#fff7e6' },
  READY:                  { color: 'info',    icon: <PlayArrow fontSize="inherit" />, colorMain: '#1677ff', bg: '#e6f4ff' },
  IN_PROGRESS:            { color: 'primary', icon: <PrecisionManufacturing fontSize="inherit" />, colorMain: '#1890ff', bg: '#e6f7ff' },
  COMPLETED:              { color: 'success', icon: <CheckCircle fontSize="inherit" />, colorMain: '#52c41a', bg: '#f6ffed' },
  HOLD:                   { color: 'error',   icon: <Info fontSize="inherit" />, colorMain: '#ff4d4f', bg: '#fff1f0' },
  CANCELLED:              { color: 'default', icon: <Block fontSize="inherit" />, colorMain: '#bfbfbf', bg: '#f5f5f5' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkOrderOperationsTab({
  formik,
  isEditMode,
  onStartOperation,
  onCompleteOperation,
  operationActionState,
  materials = [],
}) {
  const operations = Array.isArray(formik.values?.operations)
    ? formik.values.operations
    : EMPTY_OPERATIONS;
  const [partialDrafts, setPartialDrafts] = useState({});
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    const validKeys = new Set(operations.map((op, i) => getOperationRowKey(op, i)));
    setPartialDrafts((prev) => {
      const next = {};
      let changed = false;
      Object.keys(prev).forEach((key) => {
        if (validKeys.has(key)) { next[key] = prev[key]; }
        else { changed = true; }
      });
      return changed ? next : prev;
    });
  }, [operations]);

  const allPathList = useMemo(() => [...new Set(operations.map(o => o.parallelPath).filter(Boolean))], [operations]);

  const stats = useMemo(() => ({
    total: operations.length,
    completed: operations.filter(o => o.status === 'COMPLETED').length,
    inProgress: operations.filter(o => o.status === 'IN_PROGRESS').length,
    ready: operations.filter(o => o.status === 'READY').length,
  }), [operations]);

  // Determine readiness for each operation
  const sortedOps = [...operations].sort((a, b) => (a?.sequence ?? Infinity) - (b?.sequence ?? Infinity));
  const firstOperationId = sortedOps.length > 0 ? sortedOps[0]?.id : null;

  const getReadiness = (op) => {
    const plannedTotal = toNumberValue(op.plannedQuantity) || 1;
    const inputQty = toNumberValue(op.availableInputQuantity);
    
    // Check materials linked to this specific operation or WO-level if first op
    const opMaterials = materials.filter(m => 
      m.workOrderOperationId === op.id || 
      (op.id === firstOperationId && !m.workOrderOperationId && !m.operationName)
    );
    
    let materialReady = Infinity;
    const shortages = [];

    opMaterials.forEach(m => {
      const onFloor = toNumberValue(m.issuedQuantity) - toNumberValue(m.consumedQuantity);
      const warehouseAvailable = toNumberValue(m.component?.availableQuantity);
      const warehouseReserved = toNumberValue(m.component?.reservedQuantity);
      // On-floor stock + reserved in warehouse = what's accessible for this WO
      const totalAccessible = Math.max(onFloor, 0) + warehouseAvailable + warehouseReserved;

      const totalReq = toNumberValue(m.requiredQuantity || m.plannedRequiredQuantity);
      const reqPerUnit = totalReq / plannedTotal;

      // Advisory: how many units can we satisfy from accessible stock
      const readyFor = reqPerUnit > 0 ? totalAccessible / reqPerUnit : Infinity;

      if (readyFor < materialReady) materialReady = readyFor;
      if (readyFor < 1) {
        shortages.push(`${m.component?.itemCode || 'Material'}: ${totalAccessible.toFixed(2)} available / ${reqPerUnit.toFixed(2)} needed per unit`);
      }
    });

    const finalReadiness = Math.min(inputQty, materialReady);
    return {
      units: finalReadiness === Infinity ? inputQty : finalReadiness,
      shortages,
      isStartable: finalReadiness >= 1
    };
  };

  const handlePartialDraftChange = (rowKey, field, value) => {
    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [field]: value },
    }));
  };

  const handleRecordPartialCompletion = async (operation, index) => {
    if (!onCompleteOperation) return;
    const rowKey = getOperationRowKey(operation, index);
    const draft = partialDrafts[rowKey] || {};
    const payload = {
      completedQuantity: toNumberValue(draft.completedQuantity),
      scrappedQuantity: toNumberValue(draft.scrappedQuantity),
      remarks: draft.remarks || '',
    };
    
    if (payload.completedQuantity + payload.scrappedQuantity <= 0) return;
    
    const success = await onCompleteOperation(operation?.id, payload);
    if (success) {
      setPartialDrafts(prev => ({ ...prev, [rowKey]: { completedQuantity: '', scrappedQuantity: '', remarks: '' } }));
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Summary Stats ── */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: 'Total Operations', value: stats.total, color: '#3b82f6', icon: <AssignmentTurnedIn /> },
          { label: 'Ready to Start', value: stats.ready, color: '#1677ff', icon: <PlayArrow /> },
          { label: 'In Progress', value: stats.inProgress, color: '#52c41a', icon: <PrecisionManufacturing /> },
          { label: 'Completed', value: stats.completed, color: '#237804', icon: <CheckCircle /> },
        ].map((stat, i) => (
          <Paper key={i} elevation={0} sx={{ 
            p: 2, flex: 1, minWidth: 160, borderRadius: 3, 
            bgcolor: 'white', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 2
          }}>
            <Box sx={{ bgcolor: stat.color + '15', p: 1, borderRadius: 2, color: stat.color, display: 'flex' }}>
              {stat.icon}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                {stat.label}
              </Typography>
              <Typography variant="h6" fontWeight={800}>{stat.value}</Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* ── View Toggle & Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#1e293b' }}>
          Execution Pipeline
        </Typography>
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          sx={{ height: 32, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2, '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, px: 2 } }}
        >
          <ToggleButton value="table">
            <Stack direction="row" spacing={1} alignItems="center">
              <TableChart fontSize="small" />
              <Typography variant="caption" fontWeight={700}>List</Typography>
            </Stack>
          </ToggleButton>
          <ToggleButton value="timeline">
            <Stack direction="row" spacing={1} alignItems="center">
              <BarChart fontSize="small" />
              <Typography variant="caption" fontWeight={700}>Timeline</Typography>
            </Stack>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && <WorkOrderOperationsTimeline operations={operations} />}

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <TableContainer 
          component={Paper} 
          elevation={0} 
          sx={{ borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Operation Details</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Readiness</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Execution Progress</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Actual Timeline</TableCell>
                {isEditMode && <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Recording</TableCell>}
                <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>No operations scheduled.</TableCell></TableRow>
              ) : (
                operations.map((op, index) => {
                  const rowKey = getOperationRowKey(op, index);
                  const isCurrentAction = operationActionState?.loading && operationActionState?.operationId === op?.id;
                  const readiness = getReadiness(op);
                  
                  const planned = toNumberValue(op.plannedQuantity);
                  const completed = toNumberValue(op.completedQuantity);
                  const scrapped = toNumberValue(op.scrappedQuantity);
                  const progress = planned > 0 ? (completed / planned) * 100 : 0;
                  
                  const cfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.PLANNED;

                  return (
                    <TableRow 
                      key={rowKey}
                      sx={{ 
                        '&:hover': { bgcolor: '#f8fafc' },
                        transition: 'background-color 0.2s',
                        borderLeft: `4px solid ${op.parallelPath ? getPathColour(op.parallelPath, allPathList) : 'transparent'}`
                      }}
                    >
                      {/* Details Column */}
                      <TableCell sx={compactCellSx}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b' }}>
                            {op.sequence}. {op.operationName || op.routingOperation?.name}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                            <Chip 
                              icon={cfg.icon} 
                              label={op.status} 
                              size="small" 
                              sx={{ 
                                height: 20, fontSize: '0.65rem', fontWeight: 800, 
                                bgcolor: cfg.bg, color: cfg.colorMain, border: `1px solid ${cfg.colorMain}40`
                              }} 
                            />
                            {op.parallelPath && (
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                Path: {op.parallelPath}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </TableCell>

                      {/* Readiness Column */}
                      <TableCell sx={compactCellSx}>
                        <Tooltip 
                          title={
                            readiness.shortages.length > 0 
                              ? `Missing: ${readiness.shortages.join(', ')}` 
                              : `Ready for ${readiness.units.toFixed(1)} units`
                          }
                          arrow
                        >
                          <Box sx={{ minWidth: 100 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color={readiness.isStartable ? 'success.main' : 'warning.main'}>
                                {readiness.isStartable ? 'READY' : 'UNREADY'}
                              </Typography>
                              <Typography variant="caption" fontWeight={700}>
                                {readiness.units.toFixed(1)} / {planned}
                              </Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((readiness.units / planned) * 100, 100)} 
                              sx={{ 
                                height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                                '& .MuiLinearProgress-bar': { bgcolor: readiness.isStartable ? '#10b981' : '#f59e0b', borderRadius: 3 }
                              }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>

                      {/* Progress Column */}
                      <TableCell sx={compactCellSx}>
                        <Box sx={{ minWidth: 140 }}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                              Done: {completed}
                            </Typography>
                            {scrapped > 0 && <Typography variant="caption" fontWeight={700} color="error.main">
                              Scrap: {scrapped}
                            </Typography>}
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            sx={{ 
                              height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                              '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 3 }
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* Timeline Column */}
                      <TableCell sx={compactCellSx}>
                        <Box sx={{ color: '#64748b' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Schedule sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDateTime(op.actualStartDate)}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircle sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDateTime(op.actualEndDate)}</Typography>
                          </Stack>
                        </Box>
                      </TableCell>

                      {/* Recording Column */}
                      {isEditMode && (
                        <TableCell sx={compactCellSx}>
                          <Stack direction="row" spacing={1}>
                            <TextField 
                              size="small" placeholder="Batch" type="number"
                              value={partialDrafts[rowKey]?.completedQuantity ?? ''}
                              onChange={(e) => handlePartialDraftChange(rowKey, 'completedQuantity', e.target.value)}
                              sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.75rem', width: 64, borderRadius: 2 } }}
                            />
                            <TextField 
                              size="small" placeholder="Scrap" type="number"
                              value={partialDrafts[rowKey]?.scrappedQuantity ?? ''}
                              onChange={(e) => handlePartialDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                              sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.75rem', width: 64, borderRadius: 2 } }}
                            />
                          </Stack>
                        </TableCell>
                      )}

                      {/* Action Column */}
                      <TableCell align="center" sx={compactCellSx}>
                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                          {isEditMode && (
                            <>
                              {['READY', 'WAITING_FOR_DEPENDENCY'].includes(op.status) && (
                                <Tooltip title={!readiness.isStartable ? 'Insufficient resources for 1 unit' : 'Start execution'}>
                                  <span>
                                    <Button 
                                      variant="outlined" size="small"
                                      disabled={!readiness.isStartable || isCurrentAction}
                                      onClick={() => onStartOperation(op.id)}
                                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2 }}
                                    >
                                      {isCurrentAction && operationActionState?.action === 'start' ? 'Starting...' : 'Start'}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              
                              {['READY', 'IN_PROGRESS'].includes(op.status) && (
                                <Button 
                                  variant="contained" size="small" disableElevation
                                  disabled={isCurrentAction || (toNumberValue(partialDrafts[rowKey]?.completedQuantity) + toNumberValue(partialDrafts[rowKey]?.scrappedQuantity) <= 0)}
                                  onClick={() => handleRecordPartialCompletion(op, index)}
                                  startIcon={<Save fontSize="small" />}
                                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2 }}
                                >
                                  {isCurrentAction && operationActionState?.action === 'complete' ? 'Saving...' : 'Batch'}
                                </Button>
                              )}
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Legend ── */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 1 }}>
          <Info sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          CONTINUOUS FLOW SYSTEM
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          • Operations become startable when upstream output is available (input gate). Material shortage warnings are advisory only — stock is consumed when you Record a Batch.
          • Progress is visualised based on planned vs completed quantities.
          • Recording Batch adds incremental quantities and automatically backflushes inventory if needed.
        </Typography>
      </Box>
    </Box>
  );
}
