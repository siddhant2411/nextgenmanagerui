import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, TextField, Grid, Chip,
  CircularProgress, Divider, List, ListItemButton, ListItemText,
  IconButton, Alert
} from '@mui/material';
import { Add, Close, Check } from '@mui/icons-material';
import apiService from '../../services/apiService';

const HEADER_BG = '#0f2744';

export default function ItemCodeSeriesPickerDialog({ open, onClose, onSelect }) {
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [newSeries, setNewSeries] = useState({
    seriesCode: '', description: '', prefix: '', separator: '-', padding: 4
  });

  useEffect(() => {
    if (open) {
      fetchSeries();
      setSelectedId(null);
      setShowCreate(false);
    }
  }, [open]);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      const data = await apiService.get('/item-code-series');
      setSeriesList(data || []);
    } catch {
      setSeriesList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (series) => {
    setSelectedId(series.id);
  };

  const handleConfirm = () => {
    const series = seriesList.find(s => s.id === selectedId);
    if (series) {
      // Code will be generated server-side on item save, no preview needed
      // onSelect handler in parent already closes the dialog (setSeriesDialogOpen(false))
      onSelect({ seriesId: series.id, seriesLabel: series.description || series.seriesCode });
    }
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setNewSeries(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    if (!newSeries.seriesCode || !newSeries.prefix) {
      setCreateError('Series Code and Prefix are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await apiService.post('/item-code-series', {
        ...newSeries,
        padding: Number(newSeries.padding) || 4,
        lastNumber: 0,
        isActive: true
      });
      setShowCreate(false);
      setNewSeries({ seriesCode: '', description: '', prefix: '', separator: '-', padding: 4 });
      await fetchSeries();
    } catch (e) {
      setCreateError(e?.response?.data?.message || 'Failed to create series. Code may already exist.');
    } finally {
      setCreating(false);
    }
  };

  const livePreview = newSeries.prefix
    ? `${newSeries.prefix}${newSeries.separator}${'0'.repeat(Math.max(1, Number(newSeries.padding) || 4) - 1)}1`
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: HEADER_BG, color: '#fff', px: 2.5, py: 1.5 }}>
        <Typography variant="h6" fontWeight={600} fontSize="1rem">Select Item Code Series</Typography>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}><Close fontSize="small" /></IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Series list */}
        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
        ) : (
          <List dense disablePadding>
            {seriesList.map((s) => (
              <ListItemButton
                key={s.id}
                selected={selectedId === s.id}
                onClick={() => handleSelect(s)}
                sx={{
                  px: 2.5, py: 1.25, borderBottom: '1px solid #f0f0f0',
                  '&.Mui-selected': { bgcolor: '#e3f2fd' },
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={s.seriesCode} size="small" sx={{ bgcolor: HEADER_BG, color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
                      <Typography variant="body2" fontWeight={500}>{s.description || s.prefix}</Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Pattern: <strong>{s.prefix}{s.separator}{'0'.repeat(s.padding - 1)}1</strong>
                      &nbsp;·&nbsp;Last: #{s.lastNumber}
                    </Typography>
                  }
                />
                {selectedId === s.id && <Check sx={{ color: '#1565c0', ml: 1 }} fontSize="small" />}
              </ListItemButton>
            ))}
            {seriesList.length === 0 && (
              <Box px={2.5} py={3} textAlign="center">
                <Typography variant="body2" color="text.secondary">No series found. Create one below.</Typography>
              </Box>
            )}
          </List>
        )}

        <Divider />

        {/* Create new series */}
        {showCreate ? (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} color="#0f2744" mb={1.5}>New Series</Typography>
            {createError && <Alert severity="error" sx={{ mb: 1.5 }}>{createError}</Alert>}
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Series Code *" name="seriesCode" value={newSeries.seriesCode}
                  onChange={handleCreateChange} inputProps={{ maxLength: 20, style: { textTransform: 'uppercase' } }}
                  helperText="Short unique key e.g. FBTM" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Prefix *" name="prefix" value={newSeries.prefix}
                  onChange={handleCreateChange} inputProps={{ maxLength: 20 }}
                  helperText="Prefix in generated code" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Description" name="description" value={newSeries.description}
                  onChange={handleCreateChange} helperText="e.g. Flush Bottom Valves" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Separator" name="separator" value={newSeries.separator}
                  onChange={handleCreateChange} inputProps={{ maxLength: 5 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Number Padding" name="padding" value={newSeries.padding}
                  onChange={handleCreateChange} type="number" inputProps={{ min: 1, max: 8 }} />
              </Grid>
              {livePreview && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Preview: <strong style={{ color: '#1565c0' }}>{livePreview}</strong>
                  </Typography>
                </Grid>
              )}
            </Grid>
            <Box display="flex" gap={1} mt={2}>
              <Button size="small" variant="contained" onClick={handleCreate} disabled={creating}
                sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
                {creating ? <CircularProgress size={16} color="inherit" /> : 'Create Series'}
              </Button>
              <Button size="small" variant="outlined" onClick={() => setShowCreate(false)}
                sx={{ textTransform: 'none' }}>Cancel</Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Button size="small" startIcon={<Add />} onClick={() => setShowCreate(true)}
              sx={{ textTransform: 'none', color: '#1565c0' }}>
              Create New Series
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#6b7280' }}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!selectedId}
          sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
          Use This Series
        </Button>
      </DialogActions>
    </Dialog>
  );
}
