import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Autocomplete, IconButton, Button,
  Tooltip, Chip, Alert, Divider,
} from '@mui/material';
import { Add, DeleteOutline, OpenInNew } from '@mui/icons-material';
import { getAllInventoryItems } from '../../../../services/inventoryService';
import { getActiveBomByItemid } from '../../../../services/bomService';
import WorkOrderLinesTab from './WorkOrderLinesTab';

const BORDER = '#e2e8f0';

/**
 * Every item a work order makes, in one place.
 *
 * Row 1 is still backed by the work order's own `selectedItem` / `bom` / `plannedQuantity`
 * fields — the whole downstream form (BOM material loading, routing operations, costing) reads
 * those, so it stays the canonical first line rather than becoming just another array entry.
 * Rows 2+ live in `additionalLines` and are turned into extra work order lines on save. The
 * split is an implementation detail; on screen they are one list.
 *
 * Once a work order exists the item mix is fixed — changing it is a split, not an edit — so the
 * saved lines are shown read-only.
 */
export default function WorkOrderItemsSection({ formik, setError, workOrderId, isPlanningEditable = true }) {
  const [options, setOptions] = useState([]);
  const [primaryInput, setPrimaryInput] = useState(formik.values.selectedItem?.name || '');

  const extras = formik.values.additionalLines || [];
  const editable = !workOrderId && isPlanningEditable;

  // Row 1's item can land after this component has mounted - a saved work order finishing its
  // fetch, or the BOM page's "Create Work Order" link dropping the item into form state a render
  // later. The input is controlled, so it has to follow rather than keep the value it was seeded
  // with. Keyed on the name so a user mid-typing is left alone.
  const primaryName = formik.values.selectedItem?.name || '';
  useEffect(() => {
    setPrimaryInput(primaryName);
  }, [primaryName]);

  const searchItems = async (value = '') => {
    try {
      const response = await getAllInventoryItems({
        size: 5, sortBy: 'name', sortDir: 'asc', search: value,
      });
      setOptions((response?.content || []).map((item) => ({
        id: item.inventoryItemId,
        name: item.name,
        itemCode: item.itemCode,
        hsnCode: item.hsnCode,
        uom: item.uom,
      })));
    } catch {
      // a failed search just means no options; not worth interrupting the user
    }
  };

  const openItem = (id) => {
    if (id) window.open(`/inventory-item/edit/${id}`, '_blank', 'noopener,noreferrer');
  };

  // ── Row 1 (the work order's own fields) ──────────────────────────────────
  // Only the item is set here. The parent already watches `selectedItem` and loads the BOM —
  // fetching it here too would just issue the same request twice per selection.
  const selectPrimary = (item) => {
    formik.setFieldValue('selectedItem', item);
    setPrimaryInput(item?.name || '');
    if (!item?.id) formik.setFieldValue('bom', null);
  };

  // ── Rows 2+ ──────────────────────────────────────────────────────────────
  const updateExtra = (index, patch) => {
    formik.setFieldValue('additionalLines',
      extras.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addExtra = () => {
    formik.setFieldValue('additionalLines', [...extras, { item: null, bom: null, plannedQuantity: '' }]);
  };

  const removeExtra = (index) => {
    formik.setFieldValue('additionalLines', extras.filter((_, i) => i !== index));
  };

  const selectExtra = async (index, item) => {
    updateExtra(index, { item, bom: null });
    if (!item?.id) return;
    try {
      const response = await getActiveBomByItemid(item.id);
      const bom = response?.bom || null;
      updateExtra(index, { item, bom });
      if (!bom) setError?.(`${item.itemCode} has no active BOM — it cannot be added to a work order.`);
    } catch (err) {
      setError?.(err.response?.data?.error || `Could not load a BOM for ${item.itemCode}`);
    }
  };

  const itemAutocomplete = ({ value, inputValue, onInput, onSelect, label, autoFocus, error, helperText }) => (
    <Autocomplete
      fullWidth
      size="small"
      options={options}
      value={value || null}
      inputValue={inputValue}
      disabled={!editable}
      onChange={(e, next) => onSelect(next)}
      onInputChange={(e, next, reason) => {
        if (reason === 'input') { onInput(next); searchItems(next); }
      }}
      getOptionLabel={(o) => o?.name || ''}
      isOptionEqualToValue={(o, v) => o.id === v?.id}
      renderOption={(props, option) => (
        <li {...props} style={{ width: '100%', padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 600 }}>{option.name}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#555' }}>
            <span>Item Code: {option.itemCode}</span>
            <span>HSN: {option.hsnCode}</span>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          autoFocus={autoFocus}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {params.InputProps.endAdornment}
                <Tooltip title="Open item in new tab">
                  <span>
                    <IconButton size="small" edge="end" disabled={!value?.id} onClick={() => openItem(value?.id)}>
                      <OpenInNew fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ),
          }}
        />
      )}
    />
  );

  const bomChip = (item, bom) => {
    if (bom) {
      return <Chip size="small" color="success" variant="outlined" label={bom.bomName || `BOM #${bom.id}`} />;
    }
    if (item?.id) {
      return <Chip size="small" color="warning" variant="outlined" label="No BOM found" />;
    }
    return <Chip size="small" variant="outlined" label="BOM" />;
  };

  // Saved work order: the item mix is fixed, so show what was built.
  if (workOrderId) {
    const lines = formik.values.lines || [];
    return (
      <Box>
        {lines.length > 0 ? (
          <WorkOrderLinesTab lines={lines} />
        ) : (
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formik.values.selectedItem?.name || 'No item recorded on this work order.'}
            </Typography>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: '#ffffff' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Items
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Each item is produced and costed independently on its own line.
          </Typography>
        </Box>
        {editable && (
          <Button size="small" startIcon={<Add />} onClick={addExtra} sx={{ textTransform: 'none' }}>
            Add item
          </Button>
        )}
      </Box>

      {/* Row 1 — the work order's own item and quantity */}
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          {itemAutocomplete({
            value: formik.values.selectedItem,
            inputValue: primaryInput || '',
            onInput: setPrimaryInput,
            onSelect: selectPrimary,
            label: 'Item 1',
            autoFocus: !workOrderId,
            error: !!formik.errors.selectedItem,
            helperText: formik.errors.selectedItem,
          })}
        </Grid>
        <Grid item xs={7} md={3} sx={{ pt: { md: 1 } }}>
          {bomChip(formik.values.selectedItem, formik.values.bom)}
          {formik.values.selectedItem?.uom && (
            <Chip size="small" label={`UOM: ${formik.values.selectedItem.uom}`}
              sx={{ ml: 1, fontWeight: 600, color: '#334155', bgcolor: '#e2e8f0' }} />
          )}
        </Grid>
        <Grid item xs={5} md={3}>
          <TextField
            label="Planned Qty"
            type="number"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={!isPlanningEditable}
            {...formik.getFieldProps('plannedQuantity')}
            error={!!formik.errors.plannedQuantity}
            helperText={formik.errors.plannedQuantity}
          />
        </Grid>
      </Grid>

      {formik.values.bom?.parentInventoryItem?.purchased
        && !formik.values.bom?.parentInventoryItem?.manufactured && (
        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
          This item is marked as <strong>Purchased Only</strong> and cannot be manufactured.
        </Alert>
      )}

      {/* Rows 2+ */}
      {extras.length > 0 && <Divider sx={{ my: 2 }} />}

      {extras.map((row, index) => (
        <Grid container spacing={2} alignItems="flex-start" key={index} sx={{ mb: 1.5 }}>
          <Grid item xs={12} md={6}>
            {itemAutocomplete({
              value: row.item,
              inputValue: undefined,
              onInput: () => {},
              onSelect: (next) => selectExtra(index, next),
              label: `Item ${index + 2}`,
            })}
          </Grid>
          <Grid item xs={6} md={3} sx={{ pt: { md: 1 } }}>
            {bomChip(row.item, row.bom)}
          </Grid>
          <Grid item xs={5} md={2}>
            <TextField
              label="Planned Qty"
              type="number"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={row.plannedQuantity}
              onChange={(e) => updateExtra(index, { plannedQuantity: e.target.value })}
            />
          </Grid>
          <Grid item xs={1}>
            <Tooltip title="Remove item">
              <IconButton size="small" onClick={() => removeExtra(index)} sx={{ mt: 0.5 }}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      ))}

      {extras.some((r) => r.item && !r.bom) && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Every item needs an active BOM. Rows without one will be rejected on save.
        </Alert>
      )}
    </Paper>
  );
}
