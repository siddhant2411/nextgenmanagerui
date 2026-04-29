import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Build,
  Delete,
  Refresh,
  ThumbUp,
  Warning,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  getYieldMetrics,
  getWorkOrderRejections,
  disposeRejection,
} from '../../../../services/workOrderService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (v) => {
  if (!v) return '—';
  const d = dayjs(v);
  return d.isValid() ? d.format('DD MMM YY, hh:mm A') : '—';
};

const DISPOSITION_CONFIG = {
  PENDING: { label: 'Pending', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  ACCEPT:  { label: 'Accepted', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  REWORK:  { label: 'Rework', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  SCRAP:   { label: 'Scrapped', color: '#9f1239', bg: '#ffe4e6', border: '#fda4af' },
};

// ─── Yield Metric Chip ────────────────────────────────────────────────────────
function YieldChip({ label, value, color, bg, border }) {
  return (
    <Paper elevation={0} sx={{ px: 2.5, py: 1.5, borderRadius: 3, border: `1px solid ${border}`, bgcolor: bg, minWidth: 120, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em', display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color, fontWeight: 800, lineHeight: 1 }}>
        {value !== null && value !== undefined ? `${value}%` : '—'}
      </Typography>
    </Paper>
  );
}

// ─── Disposition Dialog ───────────────────────────────────────────────────────
function DispositionDialog({ open, rejection, onClose, onSubmit, submitting }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    if (open) {
      setStatus('');
      setReason('');
      setQuantity(rejection?.rejectedQuantity != null ? String(rejection.rejectedQuantity) : '');
    }
  }, [open, rejection]);

  if (!rejection) return null;

  const maxQty = Number(rejection.rejectedQuantity) || 0;
  const qtyNum = Number(quantity);
  const qtyValid = !Number.isNaN(qtyNum) && qtyNum > 0 && qtyNum <= maxQty;
  const isPartial = qtyValid && qtyNum < maxQty;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', pb: 0.5 }}>
        Dispose Rejection
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="body2" color="text.secondary">
            <b>Operation:</b> {rejection.operationName} (Seq {rejection.operationSequence})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <b>Rejected Qty:</b> {rejection.rejectedQuantity}
          </Typography>
        </Box>

        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            size="small" fullWidth required type="number"
            label={`Quantity to Dispose (max ${maxQty})`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 0, max: maxQty, step: 'any' }}
            error={quantity !== '' && !qtyValid}
            helperText={
              quantity !== '' && !qtyValid
                ? `Must be greater than 0 and at most ${maxQty}`
                : isPartial
                  ? `Partial: remaining ${(maxQty - qtyNum).toFixed(2)} unit(s) will stay PENDING`
                  : 'Full disposition'
            }
          />

          <FormControl size="small" fullWidth required>
            <InputLabel>Disposition Decision *</InputLabel>
            <Select value={status} label="Disposition Decision *" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="ACCEPT">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ThumbUp fontSize="small" sx={{ color: '#166534' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Accept (Concession)</Typography>
                    <Typography variant="caption" color="text.secondary">Units accepted as-is. No rework required.</Typography>
                  </Box>
                </Stack>
              </MenuItem>
              <MenuItem value="REWORK">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Build fontSize="small" sx={{ color: '#1d4ed8' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Send to Rework</Typography>
                    <Typography variant="caption" color="text.secondary">Creates a child Work Order for rework.</Typography>
                  </Box>
                </Stack>
              </MenuItem>
              <MenuItem value="SCRAP">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Delete fontSize="small" sx={{ color: '#9f1239' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Scrap</Typography>
                    <Typography variant="caption" color="text.secondary">Units permanently written off.</Typography>
                  </Box>
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small" fullWidth multiline rows={2}
            label="Notes / Justification"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional: explain the decision..."
          />

          {status === 'REWORK' && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              A child Work Order will be created automatically with the same BOM and routing.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained" disableElevation disabled={!status || !qtyValid || submitting}
          onClick={() => onSubmit({
            dispositionStatus: status,
            dispositionReason: reason,
            quantity: qtyNum,
          })}
          sx={{
            textTransform: 'none', fontWeight: 700, borderRadius: 2,
            bgcolor: status === 'SCRAP' ? '#9f1239' : status === 'REWORK' ? '#1d4ed8' : '#166534',
            '&:hover': { opacity: 0.88 },
          }}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {submitting ? 'Saving...' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function WorkOrderRejectionsTab({ workOrderId, setError, setSnackbar }) {
  const [yield_,  setYield]      = useState(null);
  const [entries, setEntries]    = useState([]);
  const [filter,  setFilter]     = useState('PENDING');
  const [loading, setLoading]    = useState(false);
  const [dispDialog, setDispDialog] = useState({ open: false, rejection: null });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const [yieldRes, rejRes] = await Promise.all([
        getYieldMetrics(workOrderId),
        getWorkOrderRejections(workOrderId, filter === 'ALL' ? null : filter),
      ]);
      setYield(yieldRes || null);
      setEntries(rejRes || []);
    } catch (err) {
      setError?.(err?.response?.data?.error || 'Failed to load rejection data.');
    } finally {
      setLoading(false);
    }
  }, [workOrderId, filter, setError]);

  useEffect(() => { load(); }, [load]);

  const handleDispose = async (payload) => {
    setSubmitting(true);
    try {
      await disposeRejection(dispDialog.rejection.id, payload);
      setDispDialog({ open: false, rejection: null });
      setSnackbar?.('Rejection disposed successfully.', 'success');
      load();
    } catch (err) {
      setError?.(err?.response?.data?.error || 'Failed to dispose rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  const planned = yield_?.plannedQuantity ?? 0;

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Yield Metrics ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
          Yield Metrics
        </Typography>
        {loading && !yield_ ? (
          <CircularProgress size={24} />
        ) : (
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <YieldChip
              label="First Pass Yield"
              value={yield_?.firstPassYield}
              color="#166534" bg="#dcfce7" border="#86efac"
            />
            <YieldChip
              label="Overall Yield"
              value={yield_?.overallYield}
              color="#1d4ed8" bg="#dbeafe" border="#93c5fd"
            />
            <YieldChip
              label="Rework Rate"
              value={yield_?.reworkRate}
              color="#b45309" bg="#fef3c7" border="#fcd34d"
            />
            <YieldChip
              label="Scrap Rate"
              value={yield_?.scrapRate}
              color="#9f1239" bg="#ffe4e6" border="#fda4af"
            />
            {yield_ && (
              <Paper elevation={0} sx={{ px: 2.5, py: 1.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', minWidth: 140 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>
                  Quantity Breakdown
                </Typography>
                <Stack spacing={0.25}>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>Good: {yield_.totalGoodQuantity}</Typography>
                  <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>Rejected: {yield_.totalRejectedQuantity}</Typography>
                  <Typography variant="caption" sx={{ color: '#9f1239', fontWeight: 600 }}>Scrap: {yield_.totalScrapQuantity}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Planned: {planned}</Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Box>

      {/* ── Rejection Entries ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Rejection Entries
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select value={filter} label="Filter Status" onChange={(e) => setFilter(e.target.value)} sx={{ fontSize: '0.8rem' }}>
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="ACCEPT">Accepted</MenuItem>
              <MenuItem value="REWORK">Rework</MenuItem>
              <MenuItem value="SCRAP">Scrapped</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" startIcon={<Refresh fontSize="small" />} onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#64748b', px: 2 }}>Operation</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Rejected Qty</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Disposition</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Child WO</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Created</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                  {filter === 'PENDING' ? 'No pending rejections. All units have been disposed.' : 'No rejection entries found.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const dispCfg = DISPOSITION_CONFIG[entry.dispositionStatus] || DISPOSITION_CONFIG.PENDING;
                return (
                  <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} color="#1e293b">
                        {entry.operationSequence}. {entry.operationName}
                      </Typography>
                      {entry.createdBy && (
                        <Typography variant="caption" color="text.secondary">by {entry.createdBy}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#b45309' }}>
                        {entry.rejectedQuantity}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={dispCfg.label} size="small"
                        sx={{ fontWeight: 700, fontSize: '0.7rem', color: dispCfg.color, bgcolor: dispCfg.bg, border: `1px solid ${dispCfg.border}` }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      {entry.dispositionReason ? (
                        <Tooltip title={entry.dispositionReason} arrow>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {entry.dispositionReason}
                          </Typography>
                        </Tooltip>
                      ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      {entry.childWorkOrderNumber ? (
                        <Typography variant="caption" fontWeight={600} sx={{ color: '#1565c0' }}>
                          {entry.childWorkOrderNumber}
                        </Typography>
                      ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">{fmtDate(entry.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {entry.dispositionStatus === 'PENDING' ? (
                        <Button
                          size="small" variant="outlined"
                          onClick={() => setDispDialog({ open: true, rejection: entry })}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#b45309', color: '#b45309', '&:hover': { bgcolor: '#fef3c7', borderColor: '#b45309' } }}
                        >
                          Dispose
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.disabled">{fmtDate(entry.disposedAt)}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Disposition Dialog ── */}
      <DispositionDialog
        open={dispDialog.open}
        rejection={dispDialog.rejection}
        onClose={() => setDispDialog({ open: false, rejection: null })}
        onSubmit={handleDispose}
        submitting={submitting}
      />
    </Box>
  );
}
