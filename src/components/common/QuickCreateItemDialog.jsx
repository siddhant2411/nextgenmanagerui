import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, MenuItem,
  Alert, Chip, Box, ToggleButton, ToggleButtonGroup, Typography, CircularProgress
} from '@mui/material';
import apiService, { resolveApiErrorMessage } from '../../services/apiService';
import { createInventoryItemWithFiles } from '../../services/inventoryService';
import ItemCodeSeriesPickerDialog from '../inventoryitem/ItemCodeSeriesPickerDialog';

/*
 * Creates an item master without leaving the screen that needs it (enquiry lines today).
 *
 * Only the identity fields are asked for: name, code, HSN, unit, type and make/buy. Everything
 * else — specifications, stock policy, prices, drawings — is filled in later on the full item
 * screen. The backend gives the new item its inventory settings and its released revision A,
 * exactly as it does for an item saved from the full form.
 *
 * onCreated receives a slim item ({ inventoryItemId, itemCode, name, ... }) in the same shape the
 * item search returns, so the caller can drop it straight into a picker.
 */

const UOM_OPTIONS = ['NOS', 'KG', 'GRAM', 'TON', 'METER', 'CENTIMETER', 'INCH', 'LITER', 'SET', 'SQFT', 'SQM', 'SQIN'];
const ITEM_TYPES = [
  { value: 'FINISHED_GOOD', label: 'Finished Good' },
  { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'SUB_CONTRACTED', label: 'Sub-Contracted' },
  { value: 'CONSUMABLE', label: 'Consumable' },
];

const blankForm = (name) => ({
  name: name || '',
  itemCode: '',
  hsnCode: '',
  uom: 'NOS',
  itemType: 'FINISHED_GOOD',
  source: 'MAKE', // MAKE | BUY | BOTH
});

export default function QuickCreateItemDialog({ open, initialName = '', onClose, onCreated }) {
  const [form, setForm] = useState(blankForm(initialName));
  const [series, setSeries] = useState(null); // { seriesId, seriesLabel }
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(blankForm(initialName));
      setSeries(null);
      setCodeError('');
      setNameError('');
      setError(null);
    }
  }, [open, initialName]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const checkCode = async (code) => {
    if (!code || !code.trim() || series) { setCodeError(''); return; }
    try {
      const res = await apiService.get('/inventory_item/check-code', { itemCode: code.trim() });
      setCodeError(res?.exists ? 'An item with this item code already exists.' : '');
    } catch {
      // the save itself will reject a duplicate code
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setNameError('Item name is required.'); return; }
    if (codeError) return;
    setSaving(true);
    setError(null);
    const purchased = form.source !== 'MAKE';
    const manufactured = form.source !== 'BUY';
    try {
      const saved = await createInventoryItemWithFiles({
        name: form.name.trim(),
        // Blank code: the backend takes the next number from the series, or the default sequence.
        itemCode: series ? '' : form.itemCode.trim(),
        seriesId: series?.seriesId ?? null,
        hsnCode: form.hsnCode.trim(),
        uom: form.uom,
        itemType: form.itemType,
        productInventorySettings: {
          replenishmentStrategy: 'MAKE_TO_STOCK',
          purchased,
          manufactured,
        },
      });
      onCreated({
        inventoryItemId: saved.inventoryItemId,
        itemCode: saved.itemCode,
        name: saved.name,
        hsnCode: saved.hsnCode,
        uom: saved.uom,
        itemType: saved.itemType,
      });
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Could not create the item'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>
          New Item
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
            Specifications, stock policy and prices can be added later on the item screen.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Item Name" required fullWidth size="small" autoFocus
                value={form.name}
                onChange={(e) => { set('name')(e); if (nameError) setNameError(''); }}
                error={!!nameError} helperText={nameError}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                {series ? (
                  <Box sx={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'center' }}>
                    <Chip label={`${series.seriesLabel} (Auto)`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                  </Box>
                ) : (
                  <TextField
                    label="Item Code" fullWidth size="small"
                    value={form.itemCode}
                    onChange={(e) => { set('itemCode')(e); if (codeError) setCodeError(''); }}
                    onBlur={(e) => checkCode(e.target.value)}
                    error={!!codeError}
                    helperText={codeError || 'Leave blank to number it automatically'}
                  />
                )}
                <Button
                  variant={series ? 'contained' : 'outlined'} size="small"
                  onClick={() => (series ? setSeries(null) : setSeriesOpen(true))}
                  sx={{ textTransform: 'none', height: 40, minWidth: 64 }}
                >
                  {series ? 'Manual' : 'Series'}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField label="HSN Code" fullWidth size="small" value={form.hsnCode} onChange={set('hsnCode')} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Unit" fullWidth size="small" value={form.uom} onChange={set('uom')}>
                {UOM_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Item Type" fullWidth size="small" value={form.itemType} onChange={set('itemType')}>
                {ITEM_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <ToggleButtonGroup
                value={form.source} exclusive fullWidth size="small"
                onChange={(e, v) => v && setForm(f => ({ ...f, source: v }))}
              >
                <ToggleButton value="MAKE" sx={{ textTransform: 'none', fontWeight: 700 }}>We make it</ToggleButton>
                <ToggleButton value="BUY" sx={{ textTransform: 'none', fontWeight: 700 }}>We buy it</ToggleButton>
                <ToggleButton value="BOTH" sx={{ textTransform: 'none', fontWeight: 700 }}>Both</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained" disableElevation onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {saving ? 'Creating...' : 'Create Item'}
          </Button>
        </DialogActions>
      </Dialog>

      <ItemCodeSeriesPickerDialog
        open={seriesOpen}
        onClose={() => setSeriesOpen(false)}
        onSelect={(s) => { setSeries(s); setCodeError(''); setSeriesOpen(false); }}
      />
    </>
  );
}
