import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert, CircularProgress, Chip,
} from '@mui/material';
import { completeOperationPartial } from '../../../services/workOrderService';

const PRIORITY_COLORS = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };

export default function ShopFloorCompleteDialog({ open, onClose, task, onSuccess }) {
  const [qty, setQty] = useState('');
  const [scrap, setScrap] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setQty('');
    setScrap('');
    setRemarks('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    const completedQuantity = Number(qty) || 0;
    const scrappedQuantity = Number(scrap) || 0;

    if (completedQuantity + scrappedQuantity <= 0) {
      setError('Enter completed or scrapped quantity greater than zero.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await completeOperationPartial(task.operationId, {
        completedQuantity,
        scrappedQuantity,
        remarks,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      const apiError = err?.response?.data;
      const errMsg = apiError?.error || '';
      if (errMsg.toLowerCase().includes('material') || apiError?.errorCode === 'MATERIAL_GATE_FAILED') {
        setError(`Material gate: ${errMsg || 'Required materials have not been fully issued.'}`);
      } else if (errMsg.toLowerCase().includes('previous operation') || errMsg.toLowerCase().includes('input') || apiError?.errorCode === 'INPUT_GATE_FAILED') {
        setError(`Input gate: ${errMsg || 'Previous operation has not forwarded sufficient quantity.'}`);
      } else {
        setError(errMsg || 'Failed to record completion.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const progressPct = task.plannedQuantity > 0
    ? Math.min((task.completedQuantity / task.plannedQuantity) * 100, 100)
    : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontFamily: "'IBM Plex Sans', system-ui", pb: 1 }}>
        Record Completion
      </DialogTitle>
      <DialogContent>
        {/* Task Info Banner */}
        <Box
          sx={{
            mb: 2,
            mt: 0.5,
            p: 1.5,
            borderRadius: 1.5,
            border: '1px solid #e3e8ef',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {task.workOrderNumber}
            </Typography>
            {task.priority && (
              <Chip
                label={task.priority}
                size="small"
                sx={{
                  bgcolor: PRIORITY_COLORS[task.priority] || '#3b82f6',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {task.operationName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Progress: {task.completedQuantity} / {task.plannedQuantity} ({Math.round(progressPct)}%)
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{error}</Alert>
        )}

        <TextField
          label="Completed Qty"
          type="number"
          fullWidth
          size="small"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputProps={{ min: 0 }}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          label="Scrapped Qty"
          type="number"
          fullWidth
          size="small"
          value={scrap}
          onChange={(e) => setScrap(e.target.value)}
          inputProps={{ min: 0 }}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Remarks (optional)"
          fullWidth
          size="small"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          multiline
          rows={2}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 1.25,
            px: 2,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 1.25,
            px: 3,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.22)',
          }}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
