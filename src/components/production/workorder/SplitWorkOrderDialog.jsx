import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { CallSplit } from '@mui/icons-material';
import { splitWorkOrder, resolveApiErrorMessage } from '../../../services/workOrderService';

const BORDER = '#e2e8f0';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value) => {
  const n = toNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
};

/**
 * Moves quantity off a work order into a new one.
 *
 * Quantities are entered per line because the header quantity is the sum across lines — on a
 * multi-item order a single total cannot say which item it refers to. The cap shown per line is
 * planned less produced: a split moves future work, so units already made stay where they were
 * made. Leaving a line blank keeps it whole on the source.
 */
export default function SplitWorkOrderDialog({ open, onClose, workOrderNumber, workOrderId, lines = [], onSplit }) {
  const [quantities, setQuantities] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const rows = useMemo(() => lines.map((line) => {
    const planned = toNumber(line.plannedQuantity);
    const produced = toNumber(line.completedQuantity);
    // A line may move in full — the constraint is that the work order as a whole keeps something
    // to make, checked across all lines below rather than line by line.
    const movable = Math.max(planned - produced, 0);
    return {
      id: line.id,
      lineNumber: line.lineNumber,
      itemCode: line.inventoryItem?.itemCode || line.itemCode || `Line ${line.lineNumber}`,
      itemName: line.inventoryItem?.name || line.itemName || '',
      planned,
      produced,
      movable,
    };
  }), [lines]);

  const entries = rows
    .map((row) => ({ row, value: toNumber(quantities[row.id]) }))
    .filter(({ value }) => value > 0);

  const rowError = (row) => {
    const value = toNumber(quantities[row.id]);
    if (!value) return '';
    if (value > row.movable) {
      return row.produced > 0
        ? `At most ${fmt(row.movable)} can move — ${fmt(row.produced)} already produced`
        : `At most ${fmt(row.movable)} can move`;
    }
    return '';
  };

  const hasRowError = rows.some((row) => !!rowError(row));

  // Mirrors the server: individual items may leave entirely, but the source has to go on making
  // something. A split that empties it is a cancellation wearing a different hat.
  const sourceKeepsWork = rows.some((row) => row.planned - toNumber(quantities[row.id]) > 0);
  const emptiesSource = entries.length > 0 && !hasRowError && !sourceKeepsWork;

  const canSubmit = entries.length > 0 && !hasRowError && sourceKeepsWork && !submitting;

  const handleClose = (result) => {
    if (submitting) return;
    setQuantities({});
    setRemarks('');
    setError('');
    onClose?.(result);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const created = await splitWorkOrder(workOrderId, {
        lines: entries.map(({ row, value }) => ({ lineId: row.id, quantity: value })),
        remarks: remarks || undefined,
      });
      onSplit?.(created);
      handleClose(created);
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Failed to split this work order.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => handleClose()} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', display: 'flex', alignItems: 'center', gap: 1 }}>
        <CallSplit fontSize="small" /> Split {workOrderNumber}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quantity you move here leaves this work order and becomes a new one. Units already
          produced and material already issued stay where they are — the new work order raises its
          own material requests and is released separately.
        </Typography>

        <TableContainer component={Box} sx={{ border: `1px solid ${BORDER}`, borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>Planned</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>Produced</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>Can move</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569', width: 170 }}>Move to new WO</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const message = rowError(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                        {row.itemCode}
                      </Typography>
                      {row.itemName && (
                        <Typography variant="caption" color="text.secondary">{row.itemName}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2">{fmt(row.planned)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">{fmt(row.produced)}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color={row.movable > 0 ? 'text.primary' : 'text.disabled'}>
                        {fmt(row.movable)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" type="number" fullWidth placeholder="0"
                        disabled={row.movable <= 0}
                        value={quantities[row.id] ?? ''}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        error={!!message}
                        helperText={message}
                        inputProps={{ min: 0, max: row.movable, step: 'any' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        <TextField
          label="Remarks" fullWidth size="small" multiline rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Why is this quantity being split off?"
        />

        {emptiesSource && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
            This moves every item off {workOrderNumber}, leaving nothing to make. Keep quantity on
            at least one item, or cancel the work order instead.
          </Alert>
        )}

        {entries.length > 0 && !hasRowError && sourceKeepsWork && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
            A new work order will be created with{' '}
            {entries.map(({ row, value }) => `${fmt(value)} × ${row.itemCode}`).join(', ')}.
            {entries.some(({ row, value }) => value >= row.planned) && (
              <> Items moved in full leave {workOrderNumber} entirely.</>
            )}
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => handleClose()} disabled={submitting} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained" disableElevation disabled={!canSubmit} onClick={handleSubmit}
          startIcon={<CallSplit fontSize="small" />}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
        >
          {submitting ? 'Splitting…' : 'Split work order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
