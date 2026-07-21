import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { logLabour, updateLabourEntry, resolveApiErrorMessage } from '../../../../services/workOrderService';

const EMPTY_FORM = {
  operatorName: '',
  laborRoleId: '',
  laborType: 'RUN',
  startTime: null,
  endTime: null,
  durationMinutes: '',
  costRatePerHour: '',
  totalCost: '',
  remarks: '',
};

export default function LogLabourDialog({ open, onClose, operationId, operationName, laborRoles = [], entry = null, defaultValues = null, onCommitBeforeSave = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!entry;
  // Piece-rate (RATE_TIMES_QTY) operations record a direct total cost instead of time × rate.
  const isPieceRate = !isEdit && !!defaultValues?.pieceRate;

  useEffect(() => {
    if (open) {
      if (entry) {
        setForm({
          operatorName: entry.operatorName || '',
          laborRoleId: entry.laborRole?.id || '',
          laborType: entry.laborType || 'RUN',
          startTime: entry.startTime ? dayjs(entry.startTime) : null,
          endTime: entry.endTime ? dayjs(entry.endTime) : null,
          durationMinutes: entry.durationMinutes ?? '',
          costRatePerHour: entry.costRatePerHour ?? '',
          totalCost: entry.totalCost ?? '',
          remarks: entry.remarks || '',
        });
      } else {
        setForm({ ...EMPTY_FORM, ...(defaultValues || {}) });
      }
      setError('');
    }
  }, [open, entry, defaultValues]);

  // Auto-compute duration when start/end change
  useEffect(() => {
    if (form.startTime && form.endTime && form.endTime.isAfter(form.startTime)) {
      const minutes = form.endTime.diff(form.startTime, 'minute', true).toFixed(2);
      setForm(f => ({ ...f, durationMinutes: minutes }));
    }
  }, [form.startTime, form.endTime]);

  // Auto-fill rate from selected labor role
  useEffect(() => {
    if (form.laborRoleId) {
      const role = laborRoles.find(r => r.id === form.laborRoleId);
      if (role?.costPerHour) {
        setForm(f => ({ ...f, costRatePerHour: role.costPerHour }));
      }
    }
  }, [form.laborRoleId, laborRoles]);

  const computedCost = () => {
    const mins = parseFloat(form.durationMinutes);
    const rate = parseFloat(form.costRatePerHour);
    if (!isNaN(mins) && !isNaN(rate) && mins > 0 && rate > 0) {
      return ((mins / 60) * rate).toFixed(2);
    }
    return null;
  };

  // Whether the form carries recordable labour/cost data.
  const hasLabourData = isPieceRate
    ? (form.totalCost !== '' && !isNaN(parseFloat(form.totalCost)))
    : (!!form.durationMinutes || !!(form.startTime && form.endTime));

  const handleSave = async () => {
    setError('');
    // Standalone labour logging must carry labour data. In the batch-completion flow (onCommitBeforeSave)
    // labour is optional — some cost types have no time/rate — but invalid data is still rejected.
    if (!onCommitBeforeSave && !hasLabourData) {
      setError(isPieceRate
        ? 'Provide the total cost for this piece-rate operation.'
        : 'Provide either start/end time or duration.');
      return;
    }
    setSaving(true);
    try {
      // Commit the deferred batch quantity first. If it's rejected (e.g. material/input gate),
      // the parent surfaces the error — abort without logging labour and close so the error shows.
      if (onCommitBeforeSave) {
        const committed = await onCommitBeforeSave();
        if (!committed) {
          setSaving(false);
          onClose(false);
          return;
        }
      }
      // Only record a labour entry when there is data to record.
      if (hasLabourData) {
        const payload = {
          operatorName: form.operatorName || null,
          laborRoleId: form.laborRoleId || null,
          laborType: form.laborType,
          startTime: form.startTime ? form.startTime.toISOString() : null,
          endTime: form.endTime ? form.endTime.toISOString() : null,
          durationMinutes: form.durationMinutes !== '' ? parseFloat(form.durationMinutes) : null,
          costRatePerHour: form.costRatePerHour !== '' ? parseFloat(form.costRatePerHour) : null,
          totalCost: isPieceRate && form.totalCost !== '' ? parseFloat(form.totalCost) : null,
          remarks: form.remarks || null,
        };
        if (isEdit) {
          await updateLabourEntry(entry.id, payload);
        } else {
          await logLabour(operationId, payload);
        }
      }
      onClose(true);
    } catch (err) {
      setError(resolveApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const cost = computedCost();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEdit ? 'Edit Labour Entry' : 'Log Labour Time'}
          {operationName && (
            <Typography variant="body2" color="text.secondary">{operationName}</Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {onCommitBeforeSave && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Confirm to record this batch{defaultValues?.batchQty ? ` of ${defaultValues.batchQty}` : ''}.
              Cancel discards it — nothing is logged.
            </Alert>
          )}
          {!isEdit && !isPieceRate && defaultValues?.numberOfOperators > 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Routing shows <strong>{defaultValues.numberOfOperators} operators</strong> for this operation.
              The cost rate below is per operator — adjust if all are being logged together.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Operator Name"
                fullWidth size="small"
                value={form.operatorName}
                onChange={set('operatorName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Labour Type</InputLabel>
                <Select value={form.laborType} label="Labour Type" onChange={set('laborType')}>
                  <MenuItem value="SETUP">Setup</MenuItem>
                  <MenuItem value="RUN">Run</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Labour Role</InputLabel>
                <Select value={form.laborRoleId} label="Labour Role" onChange={set('laborRoleId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {laborRoles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.roleName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {isPieceRate ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Cost (₹)"
                  fullWidth size="small" type="number"
                  value={form.totalCost}
                  onChange={set('totalCost')}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Piece-rate: rate × qty × units completed"
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Cost Rate (₹/hr)"
                    fullWidth size="small" type="number"
                    value={form.costRatePerHour}
                    onChange={set('costRatePerHour')}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Start Time"
                    value={form.startTime}
                    onChange={v => setForm(f => ({ ...f, startTime: v }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="End Time"
                    value={form.endTime}
                    minDateTime={form.startTime}
                    onChange={v => setForm(f => ({ ...f, endTime: v }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Duration (minutes)"
                    fullWidth size="small" type="number"
                    value={form.durationMinutes}
                    onChange={set('durationMinutes')}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="Auto-calculated from start/end"
                  />
                </Grid>
                {cost && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Estimated Cost (₹)"
                      fullWidth size="small"
                      value={cost}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                )}
              </>
            )}
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                fullWidth size="small"
                multiline minRows={2}
                value={form.remarks}
                onChange={set('remarks')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : isEdit ? 'Update' : onCommitBeforeSave ? 'Confirm & Record' : 'Log Time'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
