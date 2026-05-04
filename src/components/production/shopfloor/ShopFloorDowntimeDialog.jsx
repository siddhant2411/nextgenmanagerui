import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, TextField, Stack, Typography, Box
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import productionAnalyticsService from '../../../services/productionAnalyticsService';

export default function ShopFloorDowntimeDialog({ open, onClose, machine, onSuccess }) {
  const [reasons, setReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      productionAnalyticsService.getDowntimeReasons().then(setReasons);
    }
  }, [open]);

  const handleStart = async () => {
    try {
      setLoading(true);
      await productionAnalyticsService.startDowntime({
        machineId: machine.id,
        reasonCodeId: selectedReason,
        remarks: remarks
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ bgcolor: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmber />
        <Typography variant="h6" fontWeight={700}>Report Downtime</Typography>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Logging downtime for <strong>{machine?.machineName}</strong>. 
          This will stop production time tracking until resumed.
        </Typography>
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Downtime Reason</InputLabel>
            <Select
              value={selectedReason}
              label="Downtime Reason"
              onChange={(e) => setSelectedReason(e.target.value)}
            >
              {reasons.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.code} - {r.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Remarks"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleStart}
          disabled={!selectedReason || loading}
          sx={{ fontWeight: 600 }}
        >
          Start Downtime
        </Button>
      </DialogActions>
    </Dialog>
  );
}
