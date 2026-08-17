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
import { groupByWorkOrderLine, shouldShowLineGroups, LineGroupHeaderRow } from './workOrderLineGrouping';

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

/** Matches the 5-decimal scale the backend rounds material consumption to before comparing. */
const round5 = (value) => Math.round(value * 1e5) / 1e5;

/**
 * How many units a stock quantity covers, given a per-unit requirement.
 *
 * A plain division under-reports whenever the requirement doesn't divide evenly: 10 units of
 * material over a planned qty of 3 gives 3.3333333333333335 per unit, so stock issued for
 * exactly one unit (3.33333 at the DB's scale) divides out to 0.999999 and the floor gate
 * rejects a batch the backend happily accepts. The backend rounds consumption to 5 decimals
 * before comparing, so a whole unit is affordable whenever that rounded figure fits.
 */
const unitsCovered = (stockQty, reqPerUnit) => {
  if (!(reqPerUnit > 0)) return Infinity;
  const raw = stockQty / reqPerUnit;
  const whole = Math.round(raw);
  return whole > 0 && round5(whole * reqPerUnit) <= stockQty ? Math.max(whole, raw) : raw;
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

// ─── Requirements panel ───────────────────────────────────────────────────────
const REQ_TONE = {
  ok:      { main: '#2a6640', bg: '#f4faf5', border: '#c7e2cd' },
  warn:    { main: '#8a4a1c', bg: '#fdf7f0', border: '#efd0b0' },
  blocked: { main: '#b84040', bg: '#fdf4f4', border: '#f0c8c8' },
};

const fmtQty = (value) => {
  const n = toNumberValue(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
};

const ReqColumnTitle = ({ children }) => (
  <Typography
    variant="caption"
    sx={{ display: 'block', mb: 1, fontWeight: 800, fontSize: '0.62rem', letterSpacing: 0.6, textTransform: 'uppercase', color: '#64748b' }}
  >
    {children}
  </Typography>
);

/**
 * Explains, in one card, everything that gates this operation: the upstream operations it is
 * waiting on, the materials it needs on the floor (with the shortfall), and what it produces.
 */
function OperationRequirements({ readiness, outputItem, dependents, allowBackflush }) {
  const tone = readiness.blockedReason
    ? REQ_TONE.blocked
    : (readiness.shortMaterials.length > 0 ? REQ_TONE.warn : REQ_TONE.ok);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: tone.bg, borderColor: tone.border }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} color="#0f2744">
          Start Requirements
        </Typography>
        <Chip
          size="small"
          icon={readiness.blockedReason ? <Block sx={{ fontSize: '12px !important' }} /> : <CheckCircle sx={{ fontSize: '12px !important' }} />}
          label={readiness.blockedReason || `${fmtQty(readiness.completableNow)} units completable now`}
          sx={{ height: 20, fontSize: '0.66rem', fontWeight: 800, bgcolor: '#fff', color: tone.main, border: `1px solid ${tone.main}40` }}
        />
        {!readiness.blockedReason && readiness.units > readiness.completableNow && (
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.66rem' }}>
            {fmtQty(readiness.units)} once the rest is issued to the floor
          </Typography>
        )}
      </Stack>

      <Grid container spacing={2}>
        {/* ① Upstream input */}
        <Grid item xs={12} md={4}>
          <ReqColumnTitle>Input from upstream</ReqColumnTitle>
          {readiness.dependencies.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No upstream dependency — this operation starts the chain.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {readiness.dependencies.map((dep) => {
                const depCfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.PLANNED;
                return (
                  <Box key={dep.id ?? dep.sequence} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#1e293b', display: 'block' }} noWrap>
                        {dep.sequence}. {dep.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: depCfg.colorMain, fontWeight: 700, fontSize: '0.62rem' }}>
                        {dep.status}
                      </Typography>
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ whiteSpace: 'nowrap', color: '#475569' }}>
                      {fmtQty(dep.completed)} / {fmtQty(dep.planned)} done
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Input available</Typography>
            <Typography variant="caption" fontWeight={800} color={readiness.blockedByInput ? 'error.main' : 'success.main'}>
              {fmtQty(readiness.inputQty)} units
            </Typography>
          </Box>
        </Grid>

        {/* ② Materials */}
        <Grid item xs={12} md={5} sx={{ borderLeft: { md: '1px dashed #cbd5e1' }, pl: { md: 2 } }}>
          <ReqColumnTitle>
            Required materials{readiness.remainingQty > 0 ? ` · for ${fmtQty(readiness.remainingQty)} units` : ''}
          </ReqColumnTitle>
          {readiness.requirements.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No materials gated on this operation.
            </Typography>
          ) : (
            <Stack spacing={0.75} sx={{ maxHeight: 180, overflowY: 'auto', pr: 0.5 }}>
              {readiness.requirements.map((req) => (
                <Box key={req.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#1e293b', display: 'block' }} noWrap>
                      {req.itemCode} {req.itemName ? <span style={{ fontWeight: 400, color: '#64748b' }}>· {req.itemName}</span> : null}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.62rem' }}>
                      {fmtQty(req.perUnit)} {req.uom} / unit → need {fmtQty(req.needQty)} {req.uom}
                      {req.mrPending ? ' · MR not approved' : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block', color: '#475569' }}>
                      {fmtQty(req.onFloor)} on floor
                      <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                        {' '}= {fmtQty(req.unitsFromFloor)} units
                      </span>
                    </Typography>
                    {req.blocking ? (
                      <Typography variant="caption" fontWeight={800} sx={{ color: REQ_TONE.blocked.main, fontSize: '0.62rem' }}>
                        no stock anywhere
                      </Typography>
                    ) : req.shortOnFloor > 0 ? (
                      <Typography variant="caption" fontWeight={800} sx={{ color: REQ_TONE.warn.main, fontSize: '0.62rem' }}>
                        issue {fmtQty(req.shortOnFloor)} more
                      </Typography>
                    ) : (
                      <Typography variant="caption" fontWeight={800} sx={{ color: REQ_TONE.ok.main, fontSize: '0.62rem' }}>
                        sufficient
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
          {readiness.requirements.length > 0 && !allowBackflush && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Batchable from floor stock
                </Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: readiness.completableNow >= 1 ? REQ_TONE.ok.main : REQ_TONE.blocked.main }}>
                  {fmtQty(readiness.completableNow)} units
                </Typography>
              </Box>
              {readiness.issuedLimitedBy && readiness.issuedUnits < readiness.remainingQty && (
                <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.62rem' }}>
                  Limited by {readiness.issuedLimitedBy}
                </Typography>
              )}
            </>
          )}
          {allowBackflush && readiness.requirements.length > 0 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b', fontSize: '0.62rem' }}>
              Backflush is enabled — material shortages will not block this operation.
            </Typography>
          )}
        </Grid>

        {/* ③ Output */}
        <Grid item xs={12} md={3} sx={{ borderLeft: { md: '1px dashed #cbd5e1' }, pl: { md: 2 } }}>
          <ReqColumnTitle>Output</ReqColumnTitle>
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1, color: '#0f2744' }}>
            {fmtQty(readiness.remainingQty)} units
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            remaining to produce
          </Typography>
          {outputItem && (
            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mt: 0.75, color: '#1e293b' }}>
              {outputItem.itemCode}{outputItem.name ? ` · ${outputItem.name}` : ''}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#64748b', fontSize: '0.62rem' }}>
            {dependents.length > 0
              ? `Feeds ${dependents.map(d => `${d.sequence}. ${d.name}`).join(', ')}`
              : 'Final operation — output goes to finished goods'}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

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

  const operationGroups = useMemo(() => groupByWorkOrderLine(operations), [operations]);
  const showLineGroups = shouldShowLineGroups(operationGroups);

  // Materials that are not pinned to a specific operation are consumed at the start of THEIR OWN
  // line. Attributing them to the work order's first operation overall would hang line 2's raw
  // material off line 1's opening operation.
  const firstOperationIdByLine = useMemo(() => {
    const map = new Map();
    sortedOps.forEach((op) => {
      const lineKey = op?.workOrderLineId ?? null;
      if (!map.has(lineKey)) map.set(lineKey, op?.id);
    });
    return map;
  }, [sortedOps]);

  const opsById = useMemo(() => {
    const map = new Map();
    operations.forEach(o => { if (o?.id != null) map.set(o.id, o); });
    return map;
  }, [operations]);

  const dependencyIdsOf = (op) => {
    const raw = op?.dependsOnOperationIds;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : Array.from(raw);
  };

  const describeOp = (o) => ({
    id: o.id,
    sequence: o.sequence,
    name: o.operationName || o.routingOperation?.name || 'Operation',
    status: o.status,
    completed: toNumberValue(o.completedQuantity),
    planned: toNumberValue(o.plannedQuantity),
  });

  // Mirrors the backend: use the explicit dependency graph when the routing defines one,
  // otherwise fall back to the legacy previous-by-sequence chain.
  const getDependencies = (op) => {
    const ids = dependencyIdsOf(op);
    if (ids.length > 0) return ids.map(id => opsById.get(id)).filter(Boolean).map(describeOp);
    const idx = sortedOps.findIndex(o => o.id != null && o.id === op.id);
    return idx > 0 ? [describeOp(sortedOps[idx - 1])] : [];
  };

  const getDependents = (op) => {
    const explicit = operations.filter(o => dependencyIdsOf(o).includes(op.id));
    if (explicit.length > 0) return explicit.map(describeOp);
    const idx = sortedOps.findIndex(o => o.id != null && o.id === op.id);
    return idx >= 0 && idx < sortedOps.length - 1 ? [describeOp(sortedOps[idx + 1])] : [];
  };

  const getReadiness = (op) => {
    const plannedTotal = toNumberValue(op.plannedQuantity) || 1;
    const inputQty = toNumberValue(op.availableInputQuantity);
    const remainingQty = Math.max(toNumberValue(op.plannedQuantity) - toNumberValue(op.completedQuantity), 0);

    const lineFirstOpId = firstOperationIdByLine.has(op.workOrderLineId ?? null)
      ? firstOperationIdByLine.get(op.workOrderLineId ?? null)
      : firstOperationId;

    const opMaterials = materials.filter(m => {
      // Never let one line's operation claim another line's material.
      if (m.workOrderLineId != null && op.workOrderLineId != null
          && m.workOrderLineId !== op.workOrderLineId) {
        return false;
      }
      return m.workOrderOperationId === op.id
        || (op.id === lineFirstOpId && !m.workOrderOperationId && !m.operationName);
    });

    let materialReady = Infinity;
    let issuedReady = Infinity;
    let issuedLimitedBy = null;
    const requirements = [];

    opMaterials.forEach(m => {
      const onFloor = Math.max(toNumberValue(m.issuedQuantity) - toNumberValue(m.consumedQuantity), 0);
      const totalReq = toNumberValue(m.netRequiredQuantity || m.plannedRequiredQuantity);

      const reqPerUnit = totalReq / plannedTotal;
      const issuedReadyFor = unitsCovered(onFloor, reqPerUnit);
      if (issuedReadyFor < issuedReady) {
        issuedReady = issuedReadyFor;
        issuedLimitedBy = m.component?.itemCode || 'Material';
      }

      const warehouseAvailable = toNumberValue(m.component?.availableQuantity);
      const warehouseReserved = toNumberValue(m.component?.reservedQuantity);
      const totalAccessible = onFloor + warehouseAvailable + warehouseReserved;
      const readyFor = unitsCovered(totalAccessible, reqPerUnit);

      // Backflush lets an operation run against stock that has not been issued yet, so it
      // never gates the start — the shortfall is still surfaced for information.
      if (!allowBackflush && readyFor < materialReady) materialReady = readyFor;

      const needQty = reqPerUnit * remainingQty;
      requirements.push({
        id: m.id,
        itemCode: m.component?.itemCode || 'Material',
        itemName: m.component?.name || '',
        uom: m.component?.uom || '',
        perUnit: reqPerUnit,
        needQty,
        onFloor,
        warehouse: warehouseAvailable + warehouseReserved,
        unitsFromFloor: issuedReadyFor,
        shortOnFloor: Math.max(needQty - onFloor, 0),
        blocking: !allowBackflush && reqPerUnit > 0 && totalAccessible < reqPerUnit,
        mrPending: !!m.mrStatus && !['APPROVED', 'PARTIAL'].includes(m.mrStatus),
      });
    });

    const finalReadiness = Math.min(inputQty, materialReady);
    const dependencies = getDependencies(op);
    const blockedByInput = inputQty < 1;
    const blockingMaterials = requirements.filter(r => r.blocking);
    const shortMaterials = requirements.filter(r => !r.blocking && r.shortOnFloor > 0);

    let blockedReason = null;
    if (op.status === 'PLANNED') {
      // Nothing is forwarded to any operation until the work order is released.
      blockedReason = 'Work order not released yet';
    } else if (blockedByInput) {
      const pending = dependencies.filter(d => d.status !== 'COMPLETED');
      blockedReason = pending.length > 0
        ? `Waiting on ${pending.slice(0, 2).map(d => `Op ${d.sequence} ${d.name}`).join(', ')}${pending.length > 2 ? ` +${pending.length - 2} more` : ''}`
        : 'No input quantity forwarded from upstream yet';
    } else if (blockingMaterials.length > 0) {
      blockedReason = `No stock: ${blockingMaterials.slice(0, 2).map(r => r.itemCode).join(', ')}${blockingMaterials.length > 2 ? ` +${blockingMaterials.length - 2} more` : ''}`;
    }

    return {
      units: finalReadiness === Infinity ? inputQty : finalReadiness,
      isStartable: finalReadiness >= 1,
      issuedUnits: issuedReady,
      // Units that can actually be batched right now — floor stock only, capped by upstream
      // input. This is what gates Submit Batch, and is usually lower than `units`, which also
      // counts stock still sitting in the warehouse. Also capped by what is left to produce:
      // an operation cannot usefully batch past its planned quantity unless it is explicitly
      // allowed to over-complete.
      completableNow: Math.min(
        inputQty,
        issuedReady === Infinity ? inputQty : issuedReady,
        op.allowOverCompletion ? Infinity : remainingQty,
      ),
      issuedLimitedBy,
      inputQty,
      remainingQty,
      dependencies,
      requirements,
      blockedByInput,
      blockingMaterials,
      shortMaterials,
      blockedReason,
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

  // Opens the labour dialog pre-filled but commits NOTHING yet. The batch quantity is only
  // committed when the user confirms the labour dialog (see commitPendingCompletion); cancelling
  // the dialog discards the whole batch so nothing is logged.
  const submitBatch = (operation, index, reasonCodes) => {
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

    const routingOp = operation?.routingOperation;
    const batchQty = toNumberValue(payload.completedQuantity);
    const runTime = parseFloat(routingOp?.runTime) || 0;

    // Piece-rate operations: cost is rate × eaches-per-unit × units completed (no time basis).
    const isPieceRate = routingOp?.costType === 'RATE_TIMES_QTY';
    let pieceRateCost = null;
    if (isPieceRate) {
      const rate = parseFloat(routingOp?.costRate ?? routingOp?.productionJob?.defaultPieceRate) || 0;
      const eachesPerUnit = parseFloat(routingOp?.costQuantity) || 0;
      pieceRateCost = (rate * eachesPerUnit * batchQty).toFixed(2);
    }

    setLabourDialog({
      open: true,
      operationId: operation?.id,
      operationName: operation?.operationName || routingOp?.name,
      operation,
      entry: null,
      pendingCompletion: { operationId: operation?.id, payload, rowKey },
      defaultValues: {
        laborRoleId: isPieceRate ? '' : (routingOp?.laborRole?.id || ''),
        costRatePerHour: isPieceRate ? '' : (routingOp?.laborRole?.costPerHour || ''),
        laborType: 'RUN',
        durationMinutes: !isPieceRate && runTime > 0 && batchQty > 0 ? (runTime * batchQty).toFixed(2) : '',
        operatorName: routingOp?.productionJob?.jobName || '',
        numberOfOperators: routingOp?.numberOfOperators || 1,
        batchQty,
        pieceRate: isPieceRate,
        totalCost: pieceRateCost ?? '',
      },
    });
  };

  // Commits the deferred batch quantity when the labour dialog is confirmed. Returns the
  // completion result (truthy) on success, or a falsy value when the backend rejects it
  // (e.g. material/input gate) so the dialog can abort before logging labour.
  const commitPendingCompletion = async () => {
    const pending = labourDialog.pendingCompletion;
    if (!pending) return true;                    // standalone labour entry — nothing to commit
    if (!onCompleteOperation) return false;
    const result = await onCompleteOperation(pending.operationId, pending.payload);
    if (!result) return false;                    // parent surfaced the gate/validation error
    if (result.warnings?.length) {
      setOverCompletionWarning(result.warnings[0]);
    }
    setPartialDrafts(prev => ({
      ...prev,
      [pending.rowKey]: { completedQuantity: '', rejectedQuantity: '', scrappedQuantity: '', remarks: '' },
    }));
    return result;
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
                operationGroups.flatMap((group) => [
                  ...(showLineGroups ? [(
                    <LineGroupHeaderRow
                      key={`group-${group.key}`}
                      group={group}
                      colSpan={5}
                      countLabel={`${group.entries.length} operation${group.entries.length === 1 ? '' : 's'}`}
                    />
                  )] : []),
                  ...group.entries.map(({ row: op, index }) => {
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
                  // Mirrors the backend gate: it rounds each material's consumption for the batch
                  // to 5 decimals and compares that against the floor quantity, rather than
                  // comparing whole units against a divided-out unit count.
                  const insufficientIssued = !allowBackflush && draftGood > 0 &&
                    readiness.requirements.some(r => round5(draftGood * r.perUnit) > r.onFloor);
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
                            {!['COMPLETED', 'CANCELLED'].includes(op.status) && (readiness.blockedReason || readiness.shortMaterials.length > 0) && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 700, fontSize: '0.68rem',
                                  color: readiness.blockedReason ? REQ_TONE.blocked.main : REQ_TONE.warn.main,
                                }}
                              >
                                {readiness.blockedReason
                                  ? <><Block sx={{ fontSize: 12 }} /> {readiness.blockedReason}</>
                                  : <><Warning sx={{ fontSize: 12 }} /> {fmtQty(readiness.completableNow)} units batchable — short {readiness.shortMaterials.slice(0, 2).map(r => `${r.itemCode} ×${fmtQty(r.shortOnFloor)}`).join(', ')}{readiness.shortMaterials.length > 2 ? ` +${readiness.shortMaterials.length - 2} more` : ''}</>}
                              </Typography>
                            )}
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
                               <Tooltip title={readiness.isStartable ? '' : (readiness.blockedReason || 'Not enough input or material to start a unit')}>
                                 <span>
                                   <Button
                                     variant="contained" size="small" disableElevation
                                     disabled={!readiness.isStartable || isCurrentAction}
                                     onClick={() => onStartOperation(op.id)}
                                     startIcon={<PlayArrow fontSize="small" />}
                                     sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2, bgcolor: '#1677ff' }}
                                   >
                                     Start
                                   </Button>
                                 </span>
                               </Tooltip>
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
                              {!['COMPLETED', 'CANCELLED'].includes(op.status) && (
                                <OperationRequirements
                                  readiness={readiness}
                                  outputItem={formik.values?.selectedItem}
                                  dependents={getDependents(op)}
                                  allowBackflush={allowBackflush}
                                />
                              )}
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
                                            Only {fmtQty(readiness.issuedUnits)} units can be made from the material issued to the floor
                                            {readiness.shortMaterials.length > 0
                                              ? ` — issue ${readiness.shortMaterials.slice(0, 2).map(r => `${fmtQty(r.shortOnFloor)} ${r.uom} of ${r.itemCode}`).join(', ')}.`
                                              : '.'}
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
                                      <Typography variant="caption" fontWeight={700} color={readiness.completableNow >= 1 ? 'success.main' : 'warning.main'}>
                                        {fmtQty(readiness.completableNow)} units batchable now
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
                  }),
                ])
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
        onCommitBeforeSave={labourDialog.pendingCompletion ? commitPendingCompletion : undefined}
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
