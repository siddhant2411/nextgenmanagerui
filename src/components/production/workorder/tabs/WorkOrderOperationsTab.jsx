import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Alert,
  Snackbar,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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
  Block,
  Warning,
  AccessTime,
  ExpandMore,
  ExpandLess,
  Edit,
  Delete,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import WorkOrderOperationsTimeline from './WorkOrderOperationsTimeline';
import LogLabourDialog from './LogLabourDialog';
import { getReasonCodes, deleteLabourEntry, resolveApiErrorMessage } from '../../../../services/workOrderService';
import { getLaborRoles } from '../../../../services/laborRoleService';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_OPERATIONS = [];

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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PLANNED:                { color: 'default', icon: <Schedule fontSize="inherit" />, colorMain: '#5a6474', bg: '#f4f6f8', border: '#dde3ec' },
  WAITING_FOR_DEPENDENCY: { color: 'warning', icon: <Block fontSize="inherit" />, colorMain: '#8a4a1c', bg: '#fdf4ec', border: '#efd0b0' },
  READY:                  { color: 'info',    icon: <PlayArrow fontSize="inherit" />, colorMain: '#8a4a1c', bg: '#fdf4ec', border: '#efd0b0' },
  IN_PROGRESS:            { color: 'primary', icon: <PrecisionManufacturing fontSize="inherit" />, colorMain: '#5b3b9e', bg: '#f0edf9', border: '#d4caea' },
  COMPLETED:              { color: 'success', icon: <CheckCircle fontSize="inherit" />, colorMain: '#2a6640', bg: '#eef6f0', border: '#b8d8bf' },
  HOLD:                   { color: 'error',   icon: <Info fontSize="inherit" />, colorMain: '#b84040', bg: '#fdf0f0', border: '#f0c8c8' },
  CANCELLED:              { color: 'default', icon: <Block fontSize="inherit" />, colorMain: '#6b6b6b', bg: '#f5f5f5', border: '#ddd' },
};

// ─── Reason Code Dialog ───────────────────────────────────────────────────────
function ReasonCodeDialog({ open, onClose, onSubmit, rejectedQty, scrapQty, rejectionCodes, scrapCodes }) {
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [scrapReasonCode, setScrapReasonCode] = useState('');

  useEffect(() => {
    if (open) { setRejectionReasonCode(''); setScrapReasonCode(''); }
  }, [open]);

  const canSubmit =
    (rejectedQty <= 0 || rejectionReasonCode) &&
    (scrapQty <= 0 || scrapReasonCode);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', pb: 1 }}>
        Reason Codes Required
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {rejectedQty > 0 && scrapQty > 0
            ? `Recording ${rejectedQty} rejected and ${scrapQty} scrap units.`
            : rejectedQty > 0
            ? `Recording ${rejectedQty} rejected units.`
            : `Recording ${scrapQty} scrap units.`}
        </Typography>
        <Stack spacing={2}>
          {rejectedQty > 0 && (
            <FormControl size="small" fullWidth required>
              <InputLabel>Rejection Reason *</InputLabel>
              <Select
                value={rejectionReasonCode}
                label="Rejection Reason *"
                onChange={(e) => setRejectionReasonCode(e.target.value)}
              >
                {rejectionCodes.map(rc => (
                  <MenuItem key={rc.code} value={rc.code}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{rc.code}</Typography>
                      <Typography variant="caption" color="text.secondary">{rc.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {scrapQty > 0 && (
            <FormControl size="small" fullWidth required>
              <InputLabel>Scrap Reason *</InputLabel>
              <Select
                value={scrapReasonCode}
                label="Scrap Reason *"
                onChange={(e) => setScrapReasonCode(e.target.value)}
              >
                {scrapCodes.map(rc => (
                  <MenuItem key={rc.code} value={rc.code}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{rc.code}</Typography>
                      <Typography variant="caption" color="text.secondary">{rc.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained" disableElevation disabled={!canSubmit}
          onClick={() => onSubmit({ rejectionReasonCode, scrapReasonCode })}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Submit Batch
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkOrderOperationsTab({
  formik,
  isEditMode,
  onStartOperation,
  onCompleteOperation,
  operationActionState,
  materials = [],
  onRefresh,
}) {
  const operations = Array.isArray(formik.values?.operations)
    ? formik.values.operations
    : EMPTY_OPERATIONS;

  const woStatus = formik.values?.status;
  const isWoTerminal = ['COMPLETED', 'CLOSED', 'CANCELLED'].includes(woStatus);

  const [partialDrafts, setPartialDrafts] = useState({});
  const [viewMode, setViewMode] = useState('table');
  const [rejectionCodes, setRejectionCodes] = useState([]);
  const [scrapCodes, setScrapCodes] = useState([]);
  const [reasonDialog, setReasonDialog] = useState({ open: false, operation: null, index: null });
  const [overCompletionWarning, setOverCompletionWarning] = useState(null);

  // Labour tracking state
  const [labourDialog, setLabourDialog] = useState({ open: false, operationId: null, operationName: '', entry: null, defaultValues: null });
  const [expandedLabour, setExpandedLabour] = useState(new Set());
  const [laborRoles, setLaborRoles] = useState([]);
  const [labourDeleteError, setLabourDeleteError] = useState('');

  // Load reason codes + labour roles once
  useEffect(() => {
    getReasonCodes('REJECTION').then(r => setRejectionCodes(r || [])).catch(() => {});
    getReasonCodes('SCRAP').then(r => setScrapCodes(r || [])).catch(() => {});
    getLaborRoles({ size: 200 }).then(r => setLaborRoles(r?.content || r || [])).catch(() => {});
  }, []);

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

  const qualityAlerts = useMemo(() =>
    operations
      .filter(o => toNumberValue(o.scrappedQuantity) > 0 || toNumberValue(o.rejectedQuantity) > 0)
      .map(o => ({
        id: o.id,
        name: o.operationName,
        sequence: o.sequence,
        scrapped: toNumberValue(o.scrappedQuantity),
        rejected: toNumberValue(o.rejectedQuantity),
      })),
  [operations]);

  const sortedOps = [...operations].sort((a, b) => (a?.sequence ?? Infinity) - (b?.sequence ?? Infinity));
  const firstOperationId = sortedOps.length > 0 ? sortedOps[0]?.id : null;
  const allowBackflush = !!formik.values?.allowBackflush;

  const getReadiness = (op) => {
    const plannedTotal = toNumberValue(op.plannedQuantity) || 1;
    const inputQty = toNumberValue(op.availableInputQuantity);

    const opMaterials = materials.filter(m =>
      m.workOrderOperationId === op.id ||
      (op.id === firstOperationId && !m.workOrderOperationId && !m.operationName)
    );

    let materialReady = Infinity;
    let issuedReady = Infinity;
    const shortages = [];

    opMaterials.forEach(m => {
      const onFloor = Math.max(toNumberValue(m.issuedQuantity) - toNumberValue(m.consumedQuantity), 0);
      const totalReq = toNumberValue(m.netRequiredQuantity || m.plannedRequiredQuantity);

      const reqPerUnit = totalReq / plannedTotal;
      console.log(reqPerUnit,onFloor);
      const issuedReadyFor = reqPerUnit > 0 ? onFloor / reqPerUnit : Infinity;
      if (issuedReadyFor < issuedReady) issuedReady = issuedReadyFor;

      if (allowBackflush) return;

      const warehouseAvailable = toNumberValue(m.component?.availableQuantity);
      const warehouseReserved = toNumberValue(m.component?.reservedQuantity);
      const totalAccessible = onFloor + warehouseAvailable + warehouseReserved;
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
      isStartable: finalReadiness >= 1,
      issuedUnits: issuedReady,
    };
  };

  const handlePartialDraftChange = (rowKey, field, value) => {
    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [field]: value },
    }));
  };

  const handleBatchClick = (operation, index) => {
    const rowKey = getOperationRowKey(operation, index);
    const draft = partialDrafts[rowKey] || {};
    const completedQty = toNumberValue(draft.completedQuantity);
    const rejectedQty  = toNumberValue(draft.rejectedQuantity);
    const scrapQty     = toNumberValue(draft.scrappedQuantity);

    if (completedQty + rejectedQty + scrapQty <= 0) return;

    // If rejection or scrap present, require reason codes first
    if (rejectedQty > 0 || scrapQty > 0) {
      setReasonDialog({ open: true, operation, index });
    } else {
      submitBatch(operation, index, {});
    }
  };

  const submitBatch = async (operation, index, reasonCodes) => {
    if (!onCompleteOperation) return;
    const rowKey = getOperationRowKey(operation, index);
    const draft = partialDrafts[rowKey] || {};
    const payload = {
      completedQuantity:   toNumberValue(draft.completedQuantity),
      rejectedQuantity:    toNumberValue(draft.rejectedQuantity),
      scrappedQuantity:    toNumberValue(draft.scrappedQuantity),
      rejectionReasonCode: reasonCodes.rejectionReasonCode || '',
      scrapReasonCode:     reasonCodes.scrapReasonCode || '',
      remarks: draft.remarks || '',
    };

    setReasonDialog({ open: false, operation: null, index: null });
    const result = await onCompleteOperation(operation?.id, payload);
    if (result) {
      if (result.warnings?.length) {
        setOverCompletionWarning(result.warnings[0]);
      }
      setPartialDrafts(prev => ({
        ...prev,
        [rowKey]: { completedQuantity: '', rejectedQuantity: '', scrappedQuantity: '', remarks: '' },
      }));

      // Auto-open labour dialog pre-filled from the routing operation
      const routingOp = operation?.routingOperation;
      const batchQty = toNumberValue(payload.completedQuantity);
      const runTime = parseFloat(routingOp?.runTime) || 0;
      setLabourDialog({
        open: true,
        operationId: operation?.id,
        operationName: operation?.operationName || routingOp?.name,
        entry: null,
        defaultValues: {
          laborRoleId: routingOp?.laborRole?.id || '',
          costRatePerHour: routingOp?.laborRole?.costPerHour || '',
          laborType: 'RUN',
          durationMinutes: runTime > 0 && batchQty > 0 ? (runTime * batchQty).toFixed(2) : '',
          operatorName: routingOp?.productionJob?.jobName || '',
          numberOfOperators: routingOp?.numberOfOperators || 1,
        },
      });
    }
  };

  const toggleLabour = (opId) => {
    setExpandedLabour(prev => {
      const next = new Set(prev);
      next.has(opId) ? next.delete(opId) : next.add(opId);
      return next;
    });
  };

  const openLogLabour = (op) => {
    setLabourDialog({ open: true, operationId: op.id, operationName: op.operationName || op.routingOperation?.name, entry: null });
  };

  const openEditLabour = (op, entry) => {
    setLabourDialog({ open: true, operationId: op.id, operationName: op.operationName || op.routingOperation?.name, entry });
  };

  const handleLabourDialogClose = (saved) => {
    setLabourDialog(d => ({ ...d, open: false }));
    if (saved && onRefresh) onRefresh();
  };

  const handleDeleteLabour = async (entryId) => {
    setLabourDeleteError('');
    try {
      await deleteLabourEntry(entryId);
      if (onRefresh) onRefresh();
    } catch (err) {
      setLabourDeleteError(resolveApiErrorMessage(err));
    }
  };

  const fmtDuration = (mins) => {
    if (!mins) return '-';
    const m = parseFloat(mins);
    if (m < 60) return `${m.toFixed(0)}m`;
    return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Summary Stats ── */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: 'Total Operations', value: stats.total,      color: '#3b82f6', icon: <AssignmentTurnedIn /> },
          { label: 'Ready to Start',   value: stats.ready,      color: '#1677ff', icon: <PlayArrow /> },
          { label: 'In Progress',      value: stats.inProgress, color: '#52c41a', icon: <PrecisionManufacturing /> },
          { label: 'Completed',        value: stats.completed,  color: '#237804', icon: <CheckCircle /> },
        ].map((stat, i) => (
          <Paper key={i} elevation={0} sx={{
            p: 2, flex: 1, minWidth: 160, borderRadius: 3,
            bgcolor: 'white', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 2,
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

      {/* ── Quality Alerts Banner ── */}
      {qualityAlerts.length > 0 && (
        <Alert
          severity="warning"
          icon={<Warning fontSize="inherit" />}
          sx={{ mb: 2, borderRadius: 2, alignItems: 'flex-start' }}
        >
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
            Quality losses recorded — upstream output may need to be increased
          </Typography>
          <Stack spacing={0.25}>
            {qualityAlerts.map(a => {
              const parts = [];
              if (a.scrapped > 0) parts.push(`${a.scrapped} scrapped`);
              if (a.rejected > 0) parts.push(`${a.rejected} pending disposition`);
              return (
                <Typography key={a.id} variant="caption" color="text.secondary">
                  • Op {a.sequence} — {a.name}: {parts.join(', ')}. Consider recording additional units on the preceding operation to compensate.
                </Typography>
              );
            })}
          </Stack>
        </Alert>
      )}

      {/* ── View Toggle & Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#1e293b' }}>
          Execution Pipeline
        </Typography>
        <ToggleButtonGroup
          size="small" value={viewMode} exclusive
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

      {viewMode === 'timeline' && <WorkOrderOperationsTimeline operations={operations} />}

      {viewMode === 'table' && (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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

                  const planned   = toNumberValue(op.plannedQuantity);
                  const completed = toNumberValue(op.completedQuantity);
                  const scrapped  = toNumberValue(op.scrappedQuantity);
                  const rejected  = toNumberValue(op.rejectedQuantity);
                  const progress  = planned > 0 ? (completed / planned) * 100 : 0;

                  const draft = partialDrafts[rowKey] || {};
                  const draftGood     = toNumberValue(draft.completedQuantity);
                  const draftRejected = toNumberValue(draft.rejectedQuantity);
                  const draftScrap    = toNumberValue(draft.scrappedQuantity);
                  const draftTotal    = draftGood + draftRejected + draftScrap;

                  const cfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.PLANNED;

                  const insufficientIssued = !allowBackflush && readiness.issuedUnits !== Infinity && draftGood > readiness.issuedUnits;
                  const batchDisabled = isCurrentAction || draftTotal <= 0 || insufficientIssued;
                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow
                        sx={{
                          '&:hover': { bgcolor: '#f8fafc' },
                          transition: 'background-color 0.2s',
                          borderLeft: `4px solid ${op.parallelPath ? getPathColour(op.parallelPath, allPathList) : 'transparent'}`,
                        }}
                      >
                        {/* Details */}
                        <TableCell sx={compactCellSx}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b' }}>
                              {op.sequence}. {op.operationName || op.routingOperation?.name}
                            </Typography>
                            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                              <Chip
                                icon={cfg.icon} label={op.status} size="small"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: cfg.bg, color: cfg.colorMain, border: `1px solid ${cfg.colorMain}40` }}
                              />
                              {op.parallelPath && (
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                  Path: {op.parallelPath}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </TableCell>

                        {/* Readiness */}
                        <TableCell sx={compactCellSx}>
                          {op.status === 'COMPLETED' ? (
                            <Box sx={{ minWidth: 100 }}>
                              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" fontWeight={700} color="success.main">
                                  {completed > planned ? 'OVER-RUN' : 'DONE'}
                                </Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: completed > planned ? '#d97706' : 'text.secondary' }}>
                                  {completed} / {planned}
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={100}
                                sx={{ height: 5, borderRadius: '9999px', bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: completed > planned ? '#d97706' : '#10b981', borderRadius: '9999px' } }}
                              />
                            </Box>
                          ) : (
                            <Tooltip
                              title={readiness.shortages.length > 0
                                ? `Missing: ${readiness.shortages.join(', ')}`
                                : `Ready for ${readiness.units.toFixed(1)} units`}
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
                                  sx={{ height: 5, borderRadius: '9999px', bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: readiness.isStartable ? '#10b981' : '#f59e0b', borderRadius: '9999px' } }}
                                />
                              </Box>
                            </Tooltip>
                          )}
                        </TableCell>

                        {/* Progress — shows good / rejected / scrap breakdown */}
                        <TableCell sx={compactCellSx}>
                          <Box sx={{ minWidth: 150 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5} flexWrap="wrap" gap={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                Good: {completed}{completed > planned && <Typography component="span" variant="caption" sx={{ color: '#d97706', fontWeight: 800 }}> (+{completed - planned})</Typography>}
                              </Typography>
                              {rejected > 0 && (
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#b45309' }}>
                                  Rej: {rejected}
                                </Typography>
                              )}
                              {scrapped > 0 && (
                                <Typography variant="caption" fontWeight={700} color="error.main">
                                  Scrap: {scrapped}
                                </Typography>
                              )}
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(progress, 100)}
                              sx={{ height: 5, borderRadius: '9999px', bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: completed > planned ? '#d97706' : '#1565c0', borderRadius: '9999px' } }}
                            />
                            {op.rejectionReasonCode && (
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                                Rej: {op.rejectionReasonCode}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Timeline */}
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

                        {/* Recording — 3 compact inputs: Good / Reject / Scrap */}
                        {isEditMode && (
                          <TableCell sx={compactCellSx}>
                            <Stack spacing={0.75}>
                              <Stack direction="row" spacing={0.75}>
                                <Tooltip title="Good units completed" arrow>
                                  <TextField
                                    size="small" placeholder="Good" type="number" inputProps={{ min: 0 }}
                                    value={draft.completedQuantity ?? ''}
                                    onChange={(e) => handlePartialDraftChange(rowKey, 'completedQuantity', e.target.value)}
                                    sx={{ '& .MuiInputBase-root': { height: 30, fontSize: '0.73rem', width: 60, borderRadius: 1.5 } }}
                                  />
                                </Tooltip>
                                <Tooltip title="Rejected (pending MRB)" arrow>
                                  <TextField
                                    size="small" placeholder="Rej" type="number" inputProps={{ min: 0 }}
                                    value={draft.rejectedQuantity ?? ''}
                                    onChange={(e) => handlePartialDraftChange(rowKey, 'rejectedQuantity', e.target.value)}
                                    sx={{ '& .MuiInputBase-root': { height: 30, fontSize: '0.73rem', width: 55, borderRadius: 1.5,
                                      ...(draftRejected > 0 && { color: '#b45309' }) } }}
                                  />
                                </Tooltip>
                                <Tooltip title="Scrap (permanent loss)" arrow>
                                  <TextField
                                    size="small" placeholder="Scrap" type="number" inputProps={{ min: 0 }}
                                    value={draft.scrappedQuantity ?? ''}
                                    onChange={(e) => handlePartialDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                                    sx={{ '& .MuiInputBase-root': { height: 30, fontSize: '0.73rem', width: 60, borderRadius: 1.5,
                                      ...(draftScrap > 0 && { color: '#b84040' }) } }}
                                  />
                                </Tooltip>
                              </Stack>
                              {/* Reason code indicator */}
                              {(draftRejected > 0 || draftScrap > 0) && (
                                <Typography variant="caption" sx={{ color: '#b45309', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Warning sx={{ fontSize: 11 }} />
                                  Reason code required on Submit
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                        )}

                        {/* Action */}
                        <TableCell align="center" sx={compactCellSx}>
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            {isEditMode && !isWoTerminal && (
                              <>
                                {['READY', 'WAITING_FOR_DEPENDENCY'].includes(op.status) && (
                                  <Tooltip title={!readiness.isStartable ? 'Insufficient input quantity to start' : 'Start execution'}>
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

                                {['READY', 'IN_PROGRESS', 'COMPLETED'].includes(op.status) && (() => {
                                  const batchTooltip = insufficientIssued
                                    ? op.status === 'COMPLETED'
                                      ? `Operation completed — issue additional materials to the floor before recording extra units (${readiness.issuedUnits.toFixed(2)} units available).`
                                      : `Insufficient issued qty on floor (${readiness.issuedUnits.toFixed(2)} units available). Issue materials first.`
                                    : (draftRejected > 0 || draftScrap > 0) ? 'Reason codes will be prompted' : '';
                                  return (
                                    <Tooltip title={batchTooltip} arrow>
                                      <span>
                                        <Button
                                          variant="contained" size="small" disableElevation
                                          disabled={batchDisabled}
                                          onClick={() => handleBatchClick(op, index)}
                                          startIcon={<Save fontSize="small" />}
                                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2 }}
                                        >
                                          {isCurrentAction && operationActionState?.action === 'complete' ? 'Saving...' : 'Batch'}
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  );
                                })()}
                              </>
                            )}
                            {/* Labour time toggle */}
                            {op.id && (
                              <Tooltip title={expandedLabour.has(op.id) ? 'Hide labour entries' : 'Show labour time'}>
                                <IconButton size="small" onClick={() => toggleLabour(op.id)}
                                  sx={{ color: (op.labourEntries?.length || 0) > 0 ? '#1677ff' : '#94a3b8' }}>
                                  <AccessTime fontSize="small" />
                                  {expandedLabour.has(op.id) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Labour entries expansion row */}
                      {op.id && (
                        <TableRow key={`${rowKey}-labour`}>
                          <TableCell colSpan={isEditMode ? 6 : 5} sx={{ p: 0, border: 'none' }}>
                            <Collapse in={expandedLabour.has(op.id)} unmountOnExit>
                              <Box sx={{ mx: 2, mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                  <Typography variant="caption" fontWeight={700} color="#1e293b">
                                    <AccessTime sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.5 }} />
                                    Labour Time — {op.operationName || op.routingOperation?.name}
                                    {(op.labourEntries?.length || 0) > 0 && (
                                      <Chip label={`${fmtDuration(op.labourEntries.reduce((s, e) => s + (parseFloat(e.durationMinutes) || 0), 0))} total`}
                                        size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: '#dbeafe', color: '#1d4ed8' }} />
                                    )}
                                  </Typography>
                                  {isEditMode && (
                                    <Button size="small" variant="outlined" startIcon={<AccessTime fontSize="small" />}
                                      onClick={() => openLogLabour(op)}
                                      sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>
                                      Log Time
                                    </Button>
                                  )}
                                </Stack>
                                {(op.labourEntries?.length || 0) === 0 ? (
                                  <Typography variant="caption" color="text.secondary">No time logged yet.</Typography>
                                ) : (
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                        {['Operator', 'Role', 'Type', 'Start', 'End', 'Duration', 'Rate (₹/hr)', 'Cost (₹)', ''].map(h => (
                                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5, color: '#64748b' }}>{h}</TableCell>
                                        ))}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {op.labourEntries.map(entry => (
                                        <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: '#f0f9ff' } }}>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{entry.operatorName || '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{entry.laborRole?.roleName || '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                            <Chip label={entry.laborType} size="small"
                                              sx={{ height: 16, fontSize: '0.6rem', bgcolor: entry.laborType === 'SETUP' ? '#fef3c7' : '#92400e' , color: entry.laborType === 'SETUP' ? '#92400e' : '#1d4ed8' }} />
                                          </TableCell>
                                          <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>{entry.startTime ? dayjs(entry.startTime).format('DD-MM HH:mm') : '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>{entry.endTime ? dayjs(entry.endTime).format('DD-MM HH:mm') : '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5, fontWeight: 600 }}>{fmtDuration(entry.durationMinutes)}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{entry.costRatePerHour ?? '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5, fontWeight: 600, color: '#059669' }}>{entry.totalCost ? `₹${entry.totalCost}` : '-'}</TableCell>
                                          <TableCell sx={{ py: 0.25 }}>
                                            {isEditMode && (
                                              <Stack direction="row" spacing={0.5}>
                                                <IconButton size="small" onClick={() => openEditLabour(op, entry)} sx={{ p: 0.25 }}>
                                                  <Edit sx={{ fontSize: 14 }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteLabour(entry.id)} sx={{ p: 0.25, color: '#ef4444' }}>
                                                  <Delete sx={{ fontSize: 14 }} />
                                                </IconButton>
                                              </Stack>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
          RECORDING GUIDE
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          • <b>Good</b>: units that passed this operation and flow downstream.&nbsp;
          • <b>Rej</b>: units pending MRB disposition (repairable / under review) — creates a rejection entry.&nbsp;
          • <b>Scrap</b>: units permanently scrapped.&nbsp;
          Reason codes are required for Rej/Scrap. All three quantities consume input materials.
        </Typography>
      </Box>

      {/* ── Labour Time Dialog ── */}
      <LogLabourDialog
        open={labourDialog.open}
        onClose={handleLabourDialogClose}
        operationId={labourDialog.operationId}
        operationName={labourDialog.operationName}
        laborRoles={laborRoles}
        entry={labourDialog.entry}
        defaultValues={labourDialog.defaultValues}
      />

      {/* ── Labour delete error ── */}
      <Snackbar
        open={!!labourDeleteError}
        autoHideDuration={5000}
        onClose={() => setLabourDeleteError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLabourDeleteError('')}>{labourDeleteError}</Alert>
      </Snackbar>

      {/* ── Reason Code Dialog ── */}
      <ReasonCodeDialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, operation: null, index: null })}
        onSubmit={(codes) => submitBatch(reasonDialog.operation, reasonDialog.index, codes)}
        rejectedQty={toNumberValue(partialDrafts[getOperationRowKey(reasonDialog.operation, reasonDialog.index)]?.rejectedQuantity)}
        scrapQty={toNumberValue(partialDrafts[getOperationRowKey(reasonDialog.operation, reasonDialog.index)]?.scrappedQuantity)}
        rejectionCodes={rejectionCodes}
        scrapCodes={scrapCodes}
      />

      {/* ── Over-completion warning snackbar ── */}
      <Snackbar
        open={!!overCompletionWarning}
        autoHideDuration={8000}
        onClose={() => setOverCompletionWarning(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setOverCompletionWarning(null)} sx={{ width: '100%' }}>
          {overCompletionWarning}
        </Alert>
      </Snackbar>
    </Box>
  );
}
