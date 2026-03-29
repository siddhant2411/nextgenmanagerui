import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  IconButton,
  MenuItem,
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
} from '@mui/material';
import { DeleteOutline, TableChart, BarChart } from '@mui/icons-material';
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

const DATE_FIELDS = new Set([
  'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate',
]);

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return '-';
  return parsed.format('DD-MM-YY hh:mm A');
};

const compactCellSx = {
  px: 0.75,
  py: 0.5,
  fontSize: '0.74rem',
  whiteSpace: 'nowrap',
};

const compactInputSx = {
  '& .MuiInputBase-root': { height: 32, fontSize: '0.74rem', width: '5rem' },
  '& .MuiInputBase-input': { px: 1, py: 0.5 },
};

const getOperationRowKey = (operation, index) =>
  String(operation?.id ?? operation?.routingOperation?.id ?? index);

// ─── Enhanced status colour/config ───────────────────────────────────────────
const STATUS_CONFIG = {
  PLANNED: { color: 'default', muiColor: '#8c8c8c', rowBg: 'transparent' },
  WAITING_FOR_DEPENDENCY: { color: 'warning', muiColor: '#fa8c16', rowBg: '#fff7e6' },
  READY: { color: 'info', muiColor: '#1677ff', rowBg: '#e6f4ff' },
  IN_PROGRESS: { color: 'primary', muiColor: '#1677ff', rowBg: 'transparent' },
  COMPLETED: { color: 'success', muiColor: '#237804', rowBg: 'transparent' },
  HOLD: { color: 'error', muiColor: '#cf1322', rowBg: 'transparent' },
  CANCELLED: { color: 'default', muiColor: '#bfbfbf', rowBg: 'transparent' },
};

const getStatusColor = (status) => STATUS_CONFIG[status]?.color || 'default';
const getRowBg = (status) => STATUS_CONFIG[status]?.rowBg || 'transparent';

const canStartOperation = (operation) =>
  Boolean(operation?.id) && ['READY'].includes(operation?.status);

// WAITING_FOR_DEPENDENCY: show blocked dialog; READY: show start dialog; others: disable
const canInitiateStart = (operation) =>
  Boolean(operation?.id) && ['READY', 'WAITING_FOR_DEPENDENCY'].includes(operation?.status);

const canRecordPartialCompletion = (operation) =>
  Boolean(operation?.id) && ['READY', 'IN_PROGRESS'].includes(operation?.status);

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
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'timeline'

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

  // Build path list for colour coding
  const allPathList = [...new Set(operations.map(o => o.parallelPath).filter(Boolean))];

  // Build op lookup maps: id → sequence and id → name
  const opSeqMap = {};
  const opNameMap = {};
  const opStatusMap = {};
  for (const op of operations) {
    if (op.id) {
      opSeqMap[op.id] = op.sequence ?? op.routingOperation?.sequenceNumber;
      opNameMap[op.id] = op.operationName || op.routingOperation?.name || '';
      opStatusMap[op.id] = op.status;
    }
  }

  // Determine if Available Input column should be shown
  // Hide when every operation's availableInputQuantity equals its plannedQuantity
  const showAvailInput = isEditMode && operations.some(op => {
    const avail = Number(op?.availableInputQuantity ?? 0);
    const planned = Number(op?.plannedQuantity ?? 0);
    return avail !== planned;
  });

  const statusOptions = Array.from(new Set([
    ...DEFAULT_OPERATION_STATUSES,
    ...operations.map((op) => op?.status).filter(Boolean),
  ]));

  const handleOperationChange = (index, field, value) => {
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      [field]:
        field === 'isMilestone' || field === 'allowOverCompletion'
          ? Boolean(value)
          : DATE_FIELDS.has(field)
            ? value
            : field === 'status'
              ? value
              : toNumberValue(value),
    };
    formik.setFieldValue('operations', updated);
  };

  const handlePartialDraftChange = (rowKey, field, value) => {
    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [field]: value },
    }));
  };

  const handleRemove = (index) => {
    formik.setFieldValue('operations', operations.filter((_, idx) => idx !== index));
  };

  const getCompletionPayload = (rowKey) => {
    const draft = partialDrafts[rowKey] || {};
    return {
      completedQuantity: toNumberValue(draft.completedQuantity),
      scrappedQuantity: toNumberValue(draft.scrappedQuantity),
      remarks: draft.remarks || '',
    };
  };

  const canSubmitCompletionPayload = (payload) =>
    !Number.isNaN(payload.completedQuantity) &&
    !Number.isNaN(payload.scrappedQuantity) &&
    payload.completedQuantity >= 0 &&
    payload.scrappedQuantity >= 0 &&
    payload.completedQuantity + payload.scrappedQuantity > 0;

  const hasAnyCompletionDraft = operations.some((op, index) => {
    if (!canRecordPartialCompletion(op)) return false;
    return canSubmitCompletionPayload(getCompletionPayload(getOperationRowKey(op, index)));
  });

  // Material gate for first operation
  const sortedOps = [...operations].sort((a, b) => (a?.sequence ?? Infinity) - (b?.sequence ?? Infinity));
  const firstOperationId = sortedOps.length > 0 ? sortedOps[0]?.id : null;
  const blockingMaterials = (materials || []).filter(
    (m) => !m?.workOrderOperationId && !m?.operationName && m?.issueStatus !== 'ISSUED'
  );
  const hasBlockingMaterials = blockingMaterials.length > 0;
  const blockingItemCodes = blockingMaterials
    .map((m) => m?.component?.itemCode || m?.component?.name || 'Unknown')
    .join(', ');
  const materialGateTooltip = hasBlockingMaterials
    ? `WO-level materials must be fully issued before this operation can start: ${blockingItemCodes}`
    : '';

  const handleStart = async (operationId) => {
    if (!onStartOperation) return;
    await onStartOperation(operationId);
  };

  const handleRecordPartialCompletion = async (operation, index) => {
    if (!onCompleteOperation) return;
    const rowKey = getOperationRowKey(operation, index);
    const payload = getCompletionPayload(rowKey);
    if (!canSubmitCompletionPayload(payload)) return;
    const success = await onCompleteOperation(operation?.id, payload);
    if (!success) return;
    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: { completedQuantity: '', scrappedQuantity: '', remarks: '' },
    }));
  };

  const colSpanBase = isEditMode ? 16 : 12;

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
          OPERATIONS
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {isEditMode && (
            <Chip
              size="small"
              color={hasAnyCompletionDraft ? 'primary' : 'default'}
              variant="outlined"
              label="Partial completion uses incremental quantities"
            />
          )}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v); }}
            sx={{ height: 28 }}
          >
            <ToggleButton value="table" sx={{ px: 1, py: 0.25 }}>
              <Tooltip title="Table view"><TableChart fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="timeline" sx={{ px: 1, py: 0.25 }}>
              <Tooltip title="Timeline view"><BarChart fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {isEditMode && hasBlockingMaterials && (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
          <strong>Material gate:</strong> WO-level materials must be fully issued before the first operation can start —{' '}
          <strong>{blockingItemCodes}</strong>
        </Alert>
      )}

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && (
        <WorkOrderOperationsTimeline operations={operations} />
      )}

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxWidth: '100%', overflowX: 'auto', '& .MuiTableCell-root': compactCellSx }}
        >
          <Table size="small" sx={{ minWidth: isEditMode ? 1350 : 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Seq</TableCell>
                <TableCell>Operation Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Dependencies</TableCell>
                <TableCell>Parallel Path</TableCell>
                <TableCell>Planned Qty</TableCell>
                {showAvailInput && (
                  <TableCell>
                    <Tooltip title="Available Input / Planned Qty — input forwarded from previous operation">
                      <span>Avail. Input</span>
                    </Tooltip>
                  </TableCell>
                )}
                <TableCell>Completed Qty</TableCell>
                <TableCell>Scrapped Qty</TableCell>
                {isEditMode && <TableCell>Remaining Qty</TableCell>}
                {isEditMode && <TableCell>Remaining Input</TableCell>}
                <TableCell>Actual Start</TableCell>
                <TableCell>Actual End</TableCell>
                {isEditMode && <TableCell>Complete Now</TableCell>}
                {isEditMode && <TableCell>Scrap Now</TableCell>}
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpanBase} align="center">
                    <Typography variant="body2" color="text.secondary">No operations available.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                operations.map((operation, index) => {
                  const rowKey = getOperationRowKey(operation, index);
                  const completionPayload = getCompletionPayload(rowKey);
                  const isCurrentAction = operationActionState?.loading && operationActionState?.operationId === operation?.id;
                  const startAllowed = isEditMode && canStartOperation(operation);
                  const canInitiate = isEditMode && canInitiateStart(operation);
                  const partialCompletionAllowed = isEditMode && canRecordPartialCompletion(operation);
                  const canRecord = partialCompletionAllowed && canSubmitCompletionPayload(completionPayload) && !isCurrentAction;

                  const plannedQty = toNumberValue(operation?.plannedQuantity);
                  const availableInputQty = toNumberValue(operation?.availableInputQuantity);
                  const completedQty = toNumberValue(operation?.completedQuantity);
                  const scrappedQty = toNumberValue(operation?.scrappedQuantity);
                  const remainingQty = Math.max(plannedQty - completedQty, 0);
                  const remainingInput = Math.max(availableInputQty - completedQty, 0);

                  const status = operation?.status || 'PLANNED';
                  const rowBg = getRowBg(status);
                  const isWaiting = status === 'WAITING_FOR_DEPENDENCY';
                  const isReady = status === 'READY';

                  // Dependencies chips — green if dep is COMPLETED, amber if not
                  const depIds = Array.isArray(operation?.dependsOnOperationIds) ? operation.dependsOnOperationIds : [];
                  const depChips = depIds.map(id => {
                    const seq = opSeqMap[id];
                    const name = opNameMap[id] || '';
                    const depStatus = opStatusMap[id];
                    const isDone = depStatus === 'COMPLETED';
                    return { id, label: seq != null ? `Op ${seq}` : `#${id}`, name, isDone };
                  });

                  // Parallel path colour
                  const pathColour = getPathColour(operation?.parallelPath, allPathList);

                  return (
                    <TableRow
                      key={operation?.id || `${operation?.routingOperation?.id || index}`}
                      sx={{
                        bgcolor: rowBg,
                        '&:hover': { bgcolor: isWaiting ? '#fff3d6' : isReady ? '#d6eaff' : '#fafafa' },
                        transition: 'background 0.15s',
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{operation?.sequence ?? operation?.routingOperation?.sequenceNumber ?? '-'}</TableCell>
                      <TableCell>{operation?.operationName || operation?.routingOperation?.name || '-'}</TableCell>

                      {/* ── Status badge ── */}
                      <TableCell sx={{ minWidth: 140 }}>
                        {isEditMode ? (
                          <Chip
                            size="small"
                            label={status}
                            color={getStatusColor(status)}
                            variant={isWaiting ? 'filled' : 'outlined'}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              ...(isWaiting && { bgcolor: '#fa8c16', color: '#fff' }),
                              ...(isReady && { borderColor: '#1677ff', color: '#1677ff' }),
                            }}
                          />
                        ) : (
                          <TextField
                            select size="small" fullWidth
                            value={status}
                            onChange={(e) => handleOperationChange(index, 'status', e.target.value)}
                            sx={compactInputSx}
                          >
                            {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </TextField>
                        )}
                      </TableCell>

                      {/* ── Dependencies chips (green=done, amber=blocking) ── */}
                      <TableCell sx={{ minWidth: 110 }}>
                        {depChips.length > 0 ? (
                          <Box display="flex" flexWrap="wrap" gap={0.3}>
                            {depChips.map((chip) => (
                              <Tooltip
                                key={chip.id}
                                title={
                                  chip.name
                                    ? `${chip.label}${chip.name ? ` — ${chip.name}` : ''} (${chip.isDone ? 'Completed ✓' : 'Not done yet'})`
                                    : chip.isDone ? 'Completed ✓' : 'Not done yet'
                                }
                                arrow
                              >
                                <Chip
                                  size="small"
                                  label={chip.label}
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: chip.isDone ? '#237804' : '#fa8c16',
                                    color: '#fff',
                                    cursor: 'default',
                                  }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* ── Parallel Path chip ── */}
                      <TableCell sx={{ minWidth: 90 }}>
                        {operation?.parallelPath ? (
                          <Chip
                            size="small"
                            label={operation.parallelPath}
                            sx={{
                              bgcolor: pathColour,
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 18,
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* Planned Qty */}
                      <TableCell sx={{ width: '4rem' }}>
                        {isEditMode ? (
                          <Typography variant="caption">{plannedQty}</Typography>
                        ) : (
                          <TextField size="small" type="number"
                            value={operation?.plannedQuantity ?? 0}
                            onChange={(e) => handleOperationChange(index, 'plannedQuantity', e.target.value)}
                            inputProps={{ min: 0 }} sx={compactInputSx} />
                        )}
                      </TableCell>

                      {/* ── Available Input (50 / 100 ratio) ── */}
                      {showAvailInput && (
                        <TableCell sx={{ width: '5rem' }}>
                          <Tooltip title={`Available input forwarded from upstream operations: ${availableInputQty} of ${plannedQty} needed`} arrow>
                            <Box display="inline-flex" alignItems="center" gap={0.5}>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{
                                  color: availableInputQty >= plannedQty
                                    ? '#237804'
                                    : availableInputQty > 0
                                      ? '#d46b08'
                                      : '#8c8c8c',
                                }}
                              >
                                {availableInputQty}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">/</Typography>
                              <Typography variant="caption" color="text.secondary">{plannedQty}</Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                      )}

                      {/* Completed Qty */}
                      <TableCell sx={{ width: '4rem' }}>
                        {isEditMode ? (
                          <Typography variant="caption">{completedQty}</Typography>
                        ) : (
                          <TextField size="small" type="number"
                            value={operation?.completedQuantity ?? 0}
                            onChange={(e) => handleOperationChange(index, 'completedQuantity', e.target.value)}
                            inputProps={{ min: 0 }} sx={compactInputSx} />
                        )}
                      </TableCell>

                      {/* Scrapped Qty */}
                      <TableCell sx={{ width: '4rem' }}>
                        {isEditMode ? (
                          <Typography variant="caption">{scrappedQty}</Typography>
                        ) : (
                          <TextField size="small" type="number"
                            value={operation?.scrappedQuantity ?? 0}
                            onChange={(e) => handleOperationChange(index, 'scrappedQuantity', e.target.value)}
                            inputProps={{ min: 0, step: '0.01' }} sx={compactInputSx} />
                        )}
                      </TableCell>

                      {isEditMode && (
                        <TableCell sx={{ width: '4rem' }}>
                          <Typography variant="caption">{remainingQty}</Typography>
                        </TableCell>
                      )}

                      {isEditMode && (
                        <TableCell sx={{ width: '4rem' }}>
                          <Typography variant="caption" fontWeight={600} color={remainingInput === 0 ? 'text.secondary' : 'warning.main'}>
                            {remainingInput}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Actual Start */}
                      <TableCell sx={{ width: 50 }}>
                        {isEditMode ? (
                          <Typography variant="caption">{formatDateTime(operation?.actualStartDate)}</Typography>
                        ) : (
                          <TextField size="small" type="datetime-local"
                            value={operation?.actualStartDate ?? ''}
                            onChange={(e) => handleOperationChange(index, 'actualStartDate', e.target.value)}
                            fullWidth sx={compactInputSx} />
                        )}
                      </TableCell>

                      {/* Actual End */}
                      <TableCell sx={{ width: 50 }}>
                        {isEditMode ? (
                          <Typography variant="caption">{formatDateTime(operation?.actualEndDate)}</Typography>
                        ) : (
                          <TextField size="small" type="datetime-local"
                            value={operation?.actualEndDate ?? ''}
                            onChange={(e) => handleOperationChange(index, 'actualEndDate', e.target.value)}
                            fullWidth sx={compactInputSx} />
                        )}
                      </TableCell>

                      {/* Complete Now */}
                      {isEditMode && (
                        <TableCell sx={{ width: 40 }}>
                          <TextField size="small" type="number"
                            value={partialDrafts[rowKey]?.completedQuantity ?? ''}
                            onChange={(e) => handlePartialDraftChange(rowKey, 'completedQuantity', e.target.value)}
                            inputProps={{ min: 0 }} placeholder="0"
                            disabled={!partialCompletionAllowed || isCurrentAction}
                            sx={compactInputSx} />
                        </TableCell>
                      )}

                      {/* Scrap Now */}
                      {isEditMode && (
                        <TableCell sx={{ width: 40 }}>
                          <TextField size="small" type="number"
                            value={partialDrafts[rowKey]?.scrappedQuantity ?? ''}
                            onChange={(e) => handlePartialDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                            inputProps={{ min: 0, step: '0.01' }} placeholder="0"
                            disabled={!partialCompletionAllowed || isCurrentAction}
                            sx={compactInputSx} />
                        </TableCell>
                      )}

                      {/* Action */}
                      <TableCell align="center">
                        {isEditMode ? (
                          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Tooltip
                              title={
                                isWaiting
                                  ? 'Cannot start — waiting for dependencies'
                                  : hasBlockingMaterials && operation?.id === firstOperationId
                                    ? materialGateTooltip
                                    : ''
                              }
                              arrow
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color={isWaiting ? 'warning' : 'primary'}
                                  onClick={() => handleStart(operation?.id)}
                                  disabled={
                                    !canInitiate ||
                                    isCurrentAction ||
                                    (hasBlockingMaterials && operation?.id === firstOperationId)
                                  }
                                >
                                  {isCurrentAction && operationActionState?.action === 'start'
                                    ? 'Starting…'
                                    : isWaiting
                                      ? 'Blocked'
                                      : 'Start'}
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={hasBlockingMaterials && operation?.id === firstOperationId ? materialGateTooltip : ''}
                              arrow
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleRecordPartialCompletion(operation, index)}
                                  disabled={!canRecord || (hasBlockingMaterials && operation?.id === firstOperationId)}
                                >
                                  {isCurrentAction && operationActionState?.action === 'complete'
                                    ? 'Saving…'
                                    : 'Record Batch'}
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Tooltip title="Remove operation">
                            <span>
                              <IconButton color="error" size="small" onClick={() => handleRemove(index)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {operations.length > 0 && (
        <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
          <Chip size="small" variant="outlined" label={`Total: ${operations.length} operation(s)`} />
          {allPathList.length > 0 && (
            <Chip size="small" variant="outlined" color="info"
              label={`${allPathList.length} parallel path(s): ${allPathList.join(', ')}`} />
          )}
          {isEditMode && (
            <Chip size="small" variant="outlined" color="primary"
              label="Use Complete Now / Scrap Now as incremental batch values" />
          )}
        </Box>
      )}
    </Box>
  );
}
