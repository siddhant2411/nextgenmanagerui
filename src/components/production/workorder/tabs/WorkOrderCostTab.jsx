import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Refresh,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Inventory2,
  PrecisionManufacturing,
  Settings,
  AccountBalance,
} from '@mui/icons-material';
import { getCostReport, resolveApiErrorMessage } from '../../../../services/workOrderService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => {
  if (v === null || v === undefined) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtNum = (v, digits = 2) => {
  if (v === null || v === undefined) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

function VarianceChip({ variance, pct }) {
  const v = parseFloat(variance);
  if (isNaN(v) || v === 0) return (
    <Chip icon={<TrendingFlat fontSize="inherit" />} label="On target"
      size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} />
  );
  const over = v > 0;
  return (
    <Chip
      icon={over ? <TrendingUp fontSize="inherit" /> : <TrendingDown fontSize="inherit" />}
      label={`${over ? '+' : ''}${fmt(variance)}${pct != null ? ` (${over ? '+' : ''}${fmtNum(pct)}%)` : ''}`}
      size="small"
      sx={{
        bgcolor: over ? '#fef2f2' : '#f0fdf4',
        color: over ? '#dc2626' : '#16a34a',
        fontWeight: 700,
        fontSize: '0.7rem',
      }}
    />
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function CostCard({ icon, label, estimated, actual, variance, color }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', flex: 1, minWidth: 200 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <Box sx={{ bgcolor: `${color}18`, p: 0.75, borderRadius: 1.5, color, display: 'flex' }}>
          {icon}
        </Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={3} mb={1.5}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Estimated</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color: '#1e293b', letterSpacing: '-0.02em' }}>
            {fmt(estimated)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Actual</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color: '#1e293b', letterSpacing: '-0.02em' }}>
            {fmt(actual)}
          </Typography>
        </Box>
      </Stack>

      <VarianceChip variance={variance} />
    </Paper>
  );
}

// ─── Section header with expand toggle ────────────────────────────────────────

function SectionHeader({ title, open, onToggle, count }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between"
      onClick={onToggle} sx={{ cursor: 'pointer', py: 1, px: 0.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700} color="#1e293b">{title}</Typography>
        {count != null && (
          <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e2e8f0' }} />
        )}
      </Stack>
      <IconButton size="small">{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
    </Stack>
  );
}

// ─── Variance cell ────────────────────────────────────────────────────────────

function VarCell({ value }) {
  const v = parseFloat(value);
  if (isNaN(v) || v === 0) return <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>—</TableCell>;
  const over = v > 0;
  return (
    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: over ? '#dc2626' : '#16a34a' }}>
      {over ? '+' : ''}{fmt(value)}
    </TableCell>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkOrderCostTab({ workOrderId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matsOpen, setMatsOpen] = useState(true);
  const [opsOpen, setOpsOpen] = useState(true);

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCostReport(workOrderId);
      setReport(data);
    } catch (err) {
      setError(resolveApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Alert severity="error" action={<Button size="small" onClick={load}>Retry</Button>} sx={{ mt: 2 }}>
      {error}
    </Alert>
  );

  if (!report) return null;

  const r = report;
  const completedQty = parseFloat(r.completedQuantity) || 0;
  const hasActuals = completedQty > 0;

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={800} color="#1e293b">Cost of Production</Typography>
          <Typography variant="body2" color="text.secondary">
            {r.itemCode} — {r.itemName} &nbsp;·&nbsp;
            Planned: <strong>{fmtNum(r.plannedQuantity, 0)}</strong> units &nbsp;·&nbsp;
            Completed: <strong>{fmtNum(r.completedQuantity, 0)}</strong> units
          </Typography>
        </Box>
        <Tooltip title="Refresh cost report">
          <IconButton onClick={load} size="small"><Refresh /></IconButton>
        </Tooltip>
      </Stack>

      {/* ── Cost cards ── */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <CostCard icon={<Inventory2 fontSize="small" />}    label="Material"  color="#0ea5e9"
          estimated={r.estimatedMaterialCost} actual={r.actualMaterialCost} variance={r.materialVariance} />
        <CostCard icon={<PrecisionManufacturing fontSize="small" />} label="Labour" color="#8b5cf6"
          estimated={r.estimatedLabourCost}  actual={r.actualLabourCost}  variance={r.labourVariance} />
        <CostCard icon={<Settings fontSize="small" />}      label="Machine"   color="#f59e0b"
          estimated={r.estimatedMachineCost} actual={r.actualMachineCost} variance={r.machineVariance} />
        <CostCard icon={<AccountBalance fontSize="small" />} label="Overhead" color="#10b981"
          estimated={r.estimatedOverheadCost} actual={r.actualOverheadCost} variance={r.overheadVariance} />
      </Stack>

      {/* ── Total summary bar ── */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, bgcolor: '#f8fafc' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">TOTAL ESTIMATED</Typography>
            <Typography variant="h5" fontWeight={800} color="#1e293b">{fmt(r.totalEstimatedCost)}</Typography>
            <Typography variant="caption" color="text.secondary">{fmt(r.estimatedCostPerUnit)} / unit</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">TOTAL ACTUAL</Typography>
            <Typography variant="h5" fontWeight={800} color="#1e293b">{fmt(r.totalActualCost)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {hasActuals ? `${fmt(r.actualCostPerUnit)} / unit` : 'No completions yet'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">TOTAL VARIANCE</Typography>
            <Typography variant="h5" fontWeight={800}
              sx={{ color: parseFloat(r.totalVariance) > 0 ? '#dc2626' : parseFloat(r.totalVariance) < 0 ? '#16a34a' : '#64748b' }}>
              {parseFloat(r.totalVariance) > 0 ? '+' : ''}{fmt(r.totalVariance)}
            </Typography>
            <VarianceChip variance={r.totalVariance} pct={r.totalVariancePercentage} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>COST BREAKDOWN (Estimated)</Typography>
              {[
                { label: 'Material', val: r.estimatedMaterialCost, total: r.totalEstimatedCost, color: '#0ea5e9' },
                { label: 'Labour',   val: r.estimatedLabourCost,   total: r.totalEstimatedCost, color: '#8b5cf6' },
                { label: 'Machine',  val: r.estimatedMachineCost,  total: r.totalEstimatedCost, color: '#f59e0b' },
                { label: 'Overhead', val: r.estimatedOverheadCost, total: r.totalEstimatedCost, color: '#10b981' },
              ].map(({ label, val, total, color }) => {
                const pct = parseFloat(total) > 0 ? (parseFloat(val) / parseFloat(total) * 100) : 0;
                return (
                  <Box key={label} mb={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{label}</Typography>
                      <Typography variant="caption" fontWeight={700}>{pct.toFixed(1)}%</Typography>
                    </Stack>
                    <Box sx={{ height: 4, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                      <Box sx={{ height: '100%', width: `${Math.min(pct, 100)}%`, bgcolor: color, borderRadius: 2 }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 2 }} />

      {/* ── Materials breakdown ── */}
      <SectionHeader title="Material Cost Breakdown" open={matsOpen}
        onToggle={() => setMatsOpen(o => !o)} count={r.materials?.length} />
      <Collapse in={matsOpen}>
        <TableContainer component={Paper} elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                {['Item Code', 'Item Name', 'Std Cost (₹)', 'Planned Qty', 'Consumed Qty', 'Estimated', 'Actual', 'Variance'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', py: 1.5 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(r.materials || []).length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>No materials</TableCell></TableRow>
              ) : (r.materials || []).map((m, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{m.itemCode || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{m.itemName || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(m.standardCost)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmtNum(m.plannedQuantity)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmtNum(m.consumedQuantity)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{fmt(m.estimatedCost)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{fmt(m.actualCost)}</TableCell>
                  <VarCell value={m.variance} />
                </TableRow>
              ))}
              {(r.materials || []).length > 0 && (
                <TableRow sx={{ bgcolor: '#f8fafc', fontWeight: 800 }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Total Material Cost</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem' }}>{fmt(r.estimatedMaterialCost)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem' }}>{fmt(r.actualMaterialCost)}</TableCell>
                  <VarCell value={r.materialVariance} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>

      {/* ── Operations breakdown ── */}
      <SectionHeader title="Operation Cost Breakdown" open={opsOpen}
        onToggle={() => setOpsOpen(o => !o)} count={r.operations?.length} />
      <Collapse in={opsOpen}>
        <TableContainer component={Paper} elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', py: 1.5 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Operation</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Work Centre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Planned min</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Actual min (labour)</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Labour ₹/hr × ops</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Machine ₹/hr</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Ovhd %</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Est. Total</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Act. Total</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Variance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(r.operations || []).length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: '#94a3b8' }}>No operations</TableCell></TableRow>
              ) : (r.operations || []).map((op, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{op.sequence}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Typography variant="body2" fontSize="0.78rem" fontWeight={600}>{op.operationName}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.68rem">
                      Setup: {fmtNum(op.setupTimeMinutes, 1)}m · Run: {fmtNum(op.runTimePerUnitMinutes, 2)}m/unit
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{op.workCenterName || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmtNum(op.totalPlannedMinutes, 1)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    {fmtNum(op.actualLabourMinutes, 1)}
                    {parseFloat(op.actualLabourMinutes) === 0 && (
                      <Tooltip title="No labour entries logged — machine cost estimated from routing">
                        <Typography component="span" variant="caption" sx={{ color: '#f59e0b', ml: 0.5 }}>*</Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    {fmt(op.laborCostPerHour)} × {fmtNum(op.numberOfOperators, 0)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(op.machineCostPerHour)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{fmtNum(op.overheadPercentage, 1)}%</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Tooltip title={`Labour: ${fmt(op.estimatedLabourCost)} · Machine: ${fmt(op.estimatedMachineCost)} · Overhead: ${fmt(op.estimatedOverheadCost)}`} arrow>
                      <Typography fontSize="0.78rem" fontWeight={600}>{fmt(op.estimatedTotalCost)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Tooltip title={`Labour: ${fmt(op.actualLabourCost)} · Machine: ${fmt(op.actualMachineCost)} · Overhead: ${fmt(op.actualOverheadCost)}`} arrow>
                      <Typography fontSize="0.78rem" fontWeight={600}>{fmt(op.actualTotalCost)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <VarCell value={op.variance} />
                </TableRow>
              ))}
              {(r.operations || []).length > 0 && (
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell colSpan={8} sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Total Operation Cost</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                    {fmt((parseFloat(r.estimatedLabourCost || 0) + parseFloat(r.estimatedMachineCost || 0) + parseFloat(r.estimatedOverheadCost || 0)).toFixed(2))}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                    {fmt((parseFloat(r.actualLabourCost || 0) + parseFloat(r.actualMachineCost || 0) + parseFloat(r.actualOverheadCost || 0)).toFixed(2))}
                  </TableCell>
                  <VarCell value={(parseFloat(r.labourVariance || 0) + parseFloat(r.machineVariance || 0) + parseFloat(r.overheadVariance || 0)).toFixed(2)} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Asterisk note */}
        {(r.operations || []).some(op => parseFloat(op.completedQuantity) > 0) && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', pl: 0.5 }}>
            * Actual machine cost uses operation start/end timestamps when available, otherwise routing run time × completed quantity.
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}
