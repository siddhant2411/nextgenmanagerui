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
  Grid
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
  FactCheck,
  LocalShipping,
  AttachFile,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import WorkOrderOperationsTimeline from './WorkOrderOperationsTimeline';
import LogLabourDialog from './LogLabourDialog';
import QaCheckDialog from './QaCheckDialog';
import { getReasonCodes, deleteLabourEntry, getQaEntriesForOperation, resolveApiErrorMessage } from '../../../../services/workOrderService';
import { getLaborRoles } from '../../../../services/laborRoleService';
import { downloadOperationAttachment } from '../../../../services/bomService';

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
  const [labourDialog, setLabourDialog] = useState({ open: false, operationId: null, operationName: '', operation: null, entry: null, defaultValues: null });
  const [expandedLabour, setExpandedLabour] = useState(new Set());
  const [laborRoles, setLaborRoles] = useState([]);
  const [labourDeleteError, setLabourDeleteError] = useState('');

  // QA check state
  const [qaDialog, setQaDialog] = useState({ open: false, operation: null, entries: [], batchQty: null });

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
        operation,
        entry: null,
        defaultValues: {
          laborRoleId: routingOp?.laborRole?.id || '',
          costRatePerHour: routingOp?.laborRole?.costPerHour || '',
          laborType: 'RUN',
          durationMinutes: runTime > 0 && batchQty > 0 ? (runTime * batchQty).toFixed(2) : '',
          operatorName: routingOp?.productionJob?.jobName || '',
          numberOfOperators: routingOp?.numberOfOperators || 1,
          batchQty,
        },
      });
    }
  };

  const openQaDialog = async (op) => {
    setQaDialog({ open: true, operation: op, entries: op.qaEntries || [], batchQty: null });
    getQaEntriesForOperation(op.id)
      .then(entries => setQaDialog(d => d.open ? { ...d, entries } : d))
      .catch(() => {});
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
    const { operation, defaultValues } = labourDialog;
    setLabourDialog(d => ({ ...d, open: false }));
    if (saved) {
      if (onRefresh) onRefresh();
      // Auto-chain QA dialog if this operation requires inspection
      if (operation?.routingOperation?.inspection) {
        const batchQty = defaultValues?.batchQty ?? null;
        const qaEntries = operation.qaEntries || [];
        setQaDialog({ open: true, operation, entries: qaEntries, batchQty });
        // Also fetch fresh entries in background
        getQaEntriesForOperation(operation.id)
          .then(entries => setQaDialog(d => d.open ? { ...d, entries } : d))
          .catch(() => {});
      }
    }
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
      {/* ── Compact Summary Bar ── */}
      <Paper elevation={0} sx={{
        mb: 3, p: 1.5, borderRadius: 3, border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        bgcolor: '#f8fafc'
      }}>
        {[
          { label: 'Total',      value: stats.total,      color: '#3b82f6', icon: <AssignmentTurnedIn sx={{ fontSize: 18 }} /> },
          { label: 'Ready',      value: stats.ready,      color: '#1677ff', icon: <PlayArrow sx={{ fontSize: 18 }} /> },
          { label: 'Running',    value: stats.inProgress, color: '#52c41a', icon: <PrecisionManufacturing sx={{ fontSize: 18 }} /> },
          { label: 'Completed',  value: stats.completed,  color: '#237804', icon: <CheckCircle sx={{ fontSize: 18 }} /> },
        ].map((stat, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: stat.color + '15', p: 0.75, borderRadius: 1.5, color: stat.color, display: 'flex' }}>
              {stat.icon}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography variant="body1" fontWeight={800} sx={{ lineHeight: 1 }}>{stat.value}</Typography>
            </Box>
            {i < 3 && <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 24, alignSelf: 'center' }} />}
          </Box>
        ))}
      </Paper>

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
                  • Op {a.sequence} — {a.name}: {parts.join(', ')}. Consider recording additional units on preceding operations.
                </Typography>
              );
            })}
          </Stack>
        </Alert>
      )}

      {/* ── View Toggle & Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#0f2744' }}>
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
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#64748b', width: 40 }}></TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Operation & Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Execution Progress</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Yield Breakdown</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No operations scheduled.</TableCell></TableRow>
              ) : (
                operations.map((op, index) => {
                  const rowKey = getOperationRowKey(op, index);
                  const isCurrentAction = operationActionState?.loading && operationActionState?.operationId === op?.id;
                  const readiness = getReadiness(op);
                  const isExpanded = expandedLabour.has(op.id || rowKey);

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
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f8fafc' },
                          transition: 'background-color 0.2s',
                          borderLeft: `4px solid ${op.parallelPath ? getPathColour(op.parallelPath, allPathList) : 'transparent'}`,
                          ...(isExpanded && { bgcolor: '#f0f7ff !important' })
                        }}
                        onClick={() => toggleLabour(op.id || rowKey)}
                      >
                        <TableCell sx={compactCellSx}>
                          <IconButton size="small">
                            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          </IconButton>
                        </TableCell>

                        {/* Operation Details */}
                        <TableCell sx={compactCellSx}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b' }}>
                              {op.sequence}. {op.operationName || op.routingOperation?.name}
                            </Typography>
                            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                              <Chip
                                icon={cfg.icon} label={op.status} size="small"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: cfg.bg, color: cfg.colorMain, border: `1px solid ${cfg.colorMain}40` }}
                              />
                              {op.routingOperation?.costType === 'SUB_CONTRACTED' && (
                                <Chip
                                  icon={<LocalShipping sx={{ fontSize: '10px !important' }} />}
                                  label="Subcontract"
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#f3e8ff', color: '#7c3aed', border: '1px solid #c4b5fd' }}
                                />
                              )}
                              {op.routingOperation?.instructions && (
                                <Tooltip title="Has Instructions">
                                  <Info sx={{ fontSize: 14, color: '#3b82f6' }} />
                                </Tooltip>
                              )}
                            </Stack>
                          </Box>
                        </TableCell>

                        {/* Progress Bar */}
                        <TableCell sx={compactCellSx}>
                          <Box sx={{ minWidth: 140 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                {completed} / {planned}
                              </Typography>
                              <Typography variant="caption" fontWeight={700} color={progress >= 100 ? 'success.main' : 'primary.main'}>
                                {progress.toFixed(0)}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(progress, 100)}
                              sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: completed >= planned ? '#237804' : '#1677ff', borderRadius: 3 } }}
                            />
                          </Box>
                        </TableCell>

                        {/* Yield Summary */}
                        <TableCell sx={compactCellSx}>
                          <Stack direction="row" spacing={1.5}>
                            {rejected > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>Rejected</Typography>
                                <Typography variant="body2" fontWeight={700} color="#b45309">{rejected}</Typography>
                              </Box>
                            )}
                            {scrapped > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>Scrap</Typography>
                                <Typography variant="body2" fontWeight={700} color="#ef4444">{scrapped}</Typography>
                              </Box>
                            )}
                            {rejected <= 0 && scrapped <= 0 && (
                              <Typography variant="caption" color="text.secondary">No losses recorded</Typography>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell align="center" sx={compactCellSx}>
                          <Stack direction="row" spacing={1} justifyContent="center" onClick={(e) => e.stopPropagation()}>
                            {isEditMode && !isWoTerminal && ['READY', 'WAITING_FOR_DEPENDENCY'].includes(op.status) && op.routingOperation?.costType !== 'SUB_CONTRACTED' && (
                               <Button
                                 variant="contained" size="small" disableElevation
                                 disabled={!readiness.isStartable || isCurrentAction}
                                 onClick={() => onStartOperation(op.id)}
                                 startIcon={<PlayArrow fontSize="small" />}
                                 sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2, bgcolor: '#1677ff' }}
                               >
                                 Start
                               </Button>
                            )}
                            <Button
                              variant="outlined" size="small"
                              onClick={() => toggleLabour(op.id || rowKey)}
                              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                              Details
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Details Panel */}
                      <TableRow>
                        <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                          <Collapse in={isExpanded} unmountOnExit>
                            <Box sx={{ m: 2, p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                              <Grid container spacing={3}>
                                {/* Left Side: Instructions & Attachments */}
                                <Grid item xs={12} md={7}>
                                  <Typography variant="subtitle2" fontWeight={700} color="#0f2744" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Info fontSize="small" color="primary" /> Manufacturing Instructions
                                  </Typography>
                                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 2 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '0.85rem' }}>
                                      {op.routingOperation?.instructions || "No specific instructions provided for this operation."}
                                    </Typography>
                                  </Paper>

                                  {/* Attachments */}
                                  <Typography variant="subtitle2" fontWeight={700} color="#0f2744" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AttachFile fontSize="small" color="primary" /> Reference Documents
                                  </Typography>
                                  <Box display="flex" gap={1} flexWrap="wrap">
                                    {(op.routingOperation?.attachments || []).length > 0 ? (
                                      op.routingOperation.attachments.map((file) => (
                                        <Chip
                                          key={file.id}
                                          label={file.originalName || file.fileName?.replace(/^\d+_/, '')}
                                          onClick={() => {
                                            downloadOperationAttachment(file.id, file.originalName || file.fileName);
                                          }}
                                          icon={<Info sx={{ fontSize: 14 }} />}
                                          sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, border: '1px solid #bfdbfe' }}
                                        />
                                      ))
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">No attachments available.</Typography>
                                    )}
                                  </Box>
                                </Grid>

                                {/* Right Side: Recording & Actuals */}
                                <Grid item xs={12} md={5}>
                                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, border: '1px solid #1677ff20', bgcolor: '#f0f7ff' }}>
                                    <Typography variant="subtitle2" fontWeight={700} color="#1d4ed8" sx={{ mb: 1.5 }}>
                                      Recording Execution
                                    </Typography>
                                    {isEditMode && !isWoTerminal ? (
                                      <Stack spacing={2}>
                                        <Grid container spacing={1}>
                                          <Grid item xs={4}>
                                            <TextField
                                              label="Good" fullWidth size="small" type="number"
                                              value={draft.completedQuantity ?? ''}
                                              onChange={(e) => handlePartialDraftChange(rowKey, 'completedQuantity', e.target.value)}
                                              sx={{ '& .MuiInputBase-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
                                            />
                                          </Grid>
                                          <Grid item xs={4}>
                                            <TextField
                                              label="Reject" fullWidth size="small" type="number"
                                              value={draft.rejectedQuantity ?? ''}
                                              onChange={(e) => handlePartialDraftChange(rowKey, 'rejectedQuantity', e.target.value)}
                                              sx={{ '& .MuiInputBase-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
                                            />
                                          </Grid>
                                          <Grid item xs={4}>
                                            <TextField
                                              label="Scrap" fullWidth size="small" type="number"
                                              value={draft.scrappedQuantity ?? ''}
                                              onChange={(e) => handlePartialDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                                              sx={{ '& .MuiInputBase-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
                                            />
                                          </Grid>
                                        </Grid>
                                        <TextField
                                          label="Remarks / Observation" fullWidth size="small" multiline rows={2}
                                          value={draft.remarks || ''}
                                          onChange={(e) => handlePartialDraftChange(rowKey, 'remarks', e.target.value)}
                                          sx={{ '& .MuiInputBase-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
                                        />
                                        <Button
                                          variant="contained" fullWidth disableElevation
                                          disabled={batchDisabled}
                                          onClick={() => handleBatchClick(op, index)}
                                          startIcon={<Save />}
                                          sx={{ borderRadius: 2, fontWeight: 700, py: 1 }}
                                        >
                                          {isCurrentAction && operationActionState?.action === 'complete' ? 'Saving...' : 'Submit Batch'}
                                        </Button>
                                        {insufficientIssued && (
                                          <Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.7rem' } }}>
                                            Insufficient materials issued to the floor.
                                          </Alert>
                                        )}
                                      </Stack>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        Recording is disabled for this status.
                                      </Typography>
                                    )}
                                  </Paper>

                                  {/* Timeline Info */}
                                  <Stack sx={{ mt: 2, px: 1 }} spacing={1}>
                                    <Box display="flex" justifyContent="space-between">
                                      <Typography variant="caption" fontWeight={600} color="text.secondary">Start Time</Typography>
                                      <Typography variant="caption" fontWeight={700}>{formatDateTime(op.actualStartDate)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                      <Typography variant="caption" fontWeight={600} color="text.secondary">Completion Time</Typography>
                                      <Typography variant="caption" fontWeight={700}>{formatDateTime(op.actualEndDate)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                      <Typography variant="caption" fontWeight={600} color="text.secondary">Readiness</Typography>
                                      <Typography variant="caption" fontWeight={700} color={readiness.isStartable ? 'success.main' : 'warning.main'}>
                                        {readiness.units.toFixed(1)} units startable
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </Grid>
                              </Grid>

                              <Divider sx={{ my: 2.5 }} />

                              {/* Bottom Section: Labour & QA */}
                              <Box>
                                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" fontWeight={700} color="#0f2744" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AccessTime fontSize="small" /> Labour entries
                                  </Typography>
                                  {isEditMode && op.id && (
                                    <Button size="small" variant="text" onClick={() => openLogLabour(op)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                      + Log Time
                                    </Button>
                                  )}
                                </Stack>
                                {(op.labourEntries?.length || 0) === 0 ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>No labour time logged.</Typography>
                                ) : (
                                  <TableContainer sx={{ mb: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                                    <Table size="small">
                                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                          {['Operator', 'Role', 'Type', 'Duration', 'Cost', ''].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b' }}>{h}</TableCell>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {op.labourEntries.map(entry => (
                                          <TableRow key={entry.id}>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>{entry.operatorName || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>{entry.laborRole?.roleName || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>
                                              <Chip label={entry.laborType} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{fmtDuration(entry.durationMinutes)}</TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>₹{entry.totalCost || 0}</TableCell>
                                            <TableCell align="right">
                                              {isEditMode && (
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                  <IconButton size="small" onClick={() => openEditLabour(op, entry)}><Edit sx={{ fontSize: 14 }} /></IconButton>
                                                  <IconButton size="small" onClick={() => handleDeleteLabour(entry.id)} color="error"><Delete sx={{ fontSize: 14 }} /></IconButton>
                                                </Stack>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                )}

                                {op.routingOperation?.inspection && (
                                  <>
                                    <Stack direction="row" spacing={2} sx={{ mb: 1, mt: 3 }}>
                                      <Typography variant="subtitle2" fontWeight={700} color="#0f2744" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <FactCheck fontSize="small" /> Quality Checks (QA)
                                      </Typography>
                                      <Button size="small" variant="text" onClick={() => openQaDialog(op)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                        Open QA Panel
                                      </Button>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                      This operation requires mandatory inspection. {op.qaEntries?.length || 0} checks recorded.
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
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
          EXECUTION GUIDE
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          • <b>Expand</b> an operation to view detailed <b>Manufacturing Instructions</b> and download reference <b>attachments</b>.<br/>
          • Use the <b>Recording</b> section within the expanded panel to submit completed batches, including rejected or scrapped units.<br/>
          • Status transitions (Ready → In Progress → Completed) are tracked automatically as you start and batch operations.
        </Typography>
      </Box>

      {/* ── Dialogs & Modals ── */}
      <QaCheckDialog
        open={qaDialog.open}
        onClose={() => setQaDialog(d => ({ ...d, open: false }))}
        operation={qaDialog.operation}
        entries={qaDialog.entries}
        batchQty={qaDialog.batchQty}
        onSaved={() => onRefresh?.()}
      />

      <LogLabourDialog
        open={labourDialog.open}
        onClose={handleLabourDialogClose}
        operationId={labourDialog.operationId}
        operationName={labourDialog.operationName}
        laborRoles={laborRoles}
        entry={labourDialog.entry}
        defaultValues={labourDialog.defaultValues}
      />

      <ReasonCodeDialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, operation: null, index: null })}
        onSubmit={(codes) => submitBatch(reasonDialog.operation, reasonDialog.index, codes)}
        rejectedQty={toNumberValue(partialDrafts[getOperationRowKey(reasonDialog.operation, reasonDialog.index)]?.rejectedQuantity)}
        scrapQty={toNumberValue(partialDrafts[getOperationRowKey(reasonDialog.operation, reasonDialog.index)]?.scrappedQuantity)}
        rejectionCodes={rejectionCodes}
        scrapCodes={scrapCodes}
      />

      <Snackbar
        open={!!labourDeleteError} autoHideDuration={5000}
        onClose={() => setLabourDeleteError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLabourDeleteError('')}>{labourDeleteError}</Alert>
      </Snackbar>

      <Snackbar
        open={!!overCompletionWarning} autoHideDuration={8000}
        onClose={() => setOverCompletionWarning(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setOverCompletionWarning(null)} sx={{ width: '100%' }}>
          {overCompletionWarning}
        </Alert>
      </Snackbar>
    </Box>
  );
}
