import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, TextField, Autocomplete, Checkbox, FormControlLabel, FormHelperText, Select, MenuItem, InputLabel, FormControl, Divider, Typography, IconButton, Tooltip, Chip, Alert, Paper } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import apiService from '../../../../services/apiService';
import { getAllInventoryItems } from '../../../../services/inventoryService';
import { getActiveBomByItemid } from '../../../../services/bomService';
import { getWorkOrderList } from '../../../../services/workOrderService';


export default function WorkOrderBasicDetails({ formik, setError, workOrderId }) {
  const [searchedItemList, setSearchedItemList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [referenceInputValue, setReferenceInputValue] = useState('');

  useEffect(() => {
    if (formik.values.selectedItem?.id) {
      handleGetBom(formik.values.selectedItem.id);
    }
  }, [formik.values.selectedItem]);


  const handleGetBom = async (itemId) => {
    try {
      const response = await getActiveBomByItemid(itemId);
      formik.setFieldValue('bom', response?.bom);
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching BOMs');
    }
  };

  const handleProductSearch = async (e, value = '') => {
    try {
      const params = {
        size: 5,
        sortBy: 'name',
        sortDir: 'asc',
        search: value
      };
      const response = await getAllInventoryItems(params);
      const filteredData = response.content.map(item => ({
        id: item.inventoryItemId,
        name: item.name,
        itemCode: item.itemCode,
        hsnCode: item.hsnCode,
        uom: item.uom,
      }));
      setSearchedItemList(filteredData);
    } catch (err) {
      // handled
    }
  };

  useEffect(() => {
    setInputValue(formik.values.selectedItem?.name || '');
  }, [formik.values.selectedItem]);

  useEffect(() => {
    if (formik.values.sourceType === 'MANUAL') {
      setReferenceInputValue(
        typeof formik.values.referenceDocument === 'string'
          ? formik.values.referenceDocument
          : ''
      );
      return;
    }
    setReferenceInputValue(formik.values.referenceDocument?.label || '');
  }, [formik.values.referenceDocument, formik.values.sourceType]);

  const handleSourceTypeChange = (event) => {
    const nextValue = event.target.value;
    formik.setFieldValue('sourceType', nextValue);
    formik.setFieldValue('referenceDocument', '');
    setReferenceInputValue('');
    setReferenceOptions([]);
  };

  const extractArray = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.content)) return response.content;
    if (Array.isArray(response.data?.content)) return response.data.content;
    return [];
  };

  const handleReferenceSearch = async (value = '') => {
    const searchValue = value?.trim();
    if (!searchValue) {
      setReferenceOptions([]);
      return;
    }
    try {
      if (formik.values.sourceType === 'SALES_ORDER') {
        const response = await apiService.get('/sales-orders', {
          search: searchValue,
          size: 8,
          sortBy: 'orderNumber',
          sortDir: 'asc',
        });
        const rows = extractArray(response);
        const filtered = rows
          .filter((row) =>
            (row.orderNumber || '')
              .toString()
              .toLowerCase()
              .includes(searchValue.toLowerCase())
          )
          .slice(0, 8)
          .map((row) => ({
            id: row.id,
            label: row.orderNumber,
          }))
          .filter((row) => row.label);
        setReferenceOptions(filtered);
      }
      if (formik.values.sourceType === 'PARENT_WORK_ORDER') {
        const response = await getWorkOrderList({
          page: 0,
          size: 8,
          sortBy: 'workOrderNumber',
          sortDir: 'asc',
          filters: [
            {
              field: 'workOrderNumber',
              operator: 'contains',
              value: searchValue
            }
          ],
        });
        const rows = extractArray(response);
        const filtered = rows
          .filter((row) => row.id !== workOrderId)
          .map((row) => ({
            id: row.id,
            label: row.workOrderNumber,
          }))
          .filter((row) => row.label);
        setReferenceOptions(filtered);
      }
    } catch (err) {
      setError('Failed to load reference documents. Please try again.');
    }
  };

  const selectedReferenceOption = useMemo(() => {
    const selectedId = formik.values.referenceDocument?.id;
    if (!selectedId) return null;
    return referenceOptions.find((option) => option.id === selectedId) || formik.values.referenceDocument;
  }, [referenceOptions, formik.values.referenceDocument]);


  const handleProductSelect = (selectedProduct) => {
    formik.setFieldValue('selectedItem', selectedProduct);
    setInputValue(selectedProduct?.name || '');
    if (selectedProduct?.id) {
      try {
        handleGetBom(selectedProduct.id);
      }
      catch (err) {
        // handled
      }
    }
  };

  const isProductionStarted = ["IN_PROGRESS", "READY", "COMPLETED"].includes(
    formik.values.status
  );
  const isPlanningEditable = ["DRAFT", "CREATED"].includes(formik.values.status);

  const openNewTab = (path) => {
    if (!path) return;
    window.open(path, "_blank", "noopener,noreferrer");
  };

  const inventoryItemId = formik.values.selectedItem?.id;
  const referenceId = formik.values.referenceDocument?.id;
  const referencePath =
    formik.values.sourceType === 'SALES_ORDER'
      ? referenceId
        ? `/sales/sales-order/edit/${referenceId}`
        : null
      : formik.values.sourceType === 'PARENT_WORK_ORDER'
        ? referenceId
          ? `/production/work-order/edit/${referenceId}`
          : null
        : null;

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden', minWidth: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* --- PRIMARY INFORMATION CARD --- */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Primary Information
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              size="small"
              options={searchedItemList}
              value={formik.values.selectedItem}
              inputValue={inputValue || ''}
              onChange={(e, newValue) => handleProductSelect(newValue)}
              onInputChange={(e, newInputValue, reason) => {
                if (reason === 'input') {
                  setInputValue(newInputValue);
                  handleProductSearch(e, newInputValue);
                }
              }}
              getOptionLabel={(option) => option?.name || ''}
              isOptionEqualToValue={(option, value) => option.itemCode === value.itemCode}
              renderOption={(props, option) => (
                <li {...props} style={{ width: '100%', padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}>
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
                  label="Item Name"
                  fullWidth
                  size="small"
                  autoFocus={!workOrderId}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <Tooltip title="Open item in new tab">
                          <span>
                            <IconButton size="small" onClick={() => openNewTab(`/inventory-item/edit/${inventoryItemId}`)} disabled={!inventoryItemId} edge="end">
                              <OpenInNew fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    ),
                  }}
                  error={!!formik.errors.selectedItem}
                  helperText={formik.errors.selectedItem}
                />
              )}
            />
            {formik.values.selectedItem?.id && !formik.values.bom && (
              <Box mt={0.5}>
                <Chip size="small" color="warning" variant="outlined" label="No BOM found for this item" />
              </Box>
            )}
            {formik.values.bom?.parentInventoryItem?.purchased && !formik.values.bom?.parentInventoryItem?.manufactured && (
              <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                This item is marked as <strong>Purchased Only</strong> and cannot be manufactured.
              </Alert>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select
                labelId="priority-label"
                id="priority"
                label="Priority"
                value={formik.values.priority || 'NORMAL'}
                onChange={(e) => formik.setFieldValue('priority', e.target.value)}
                renderValue={(selected) => {
                  const colorMap = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };
                  return (
                    <Chip size="small" label={selected} sx={{ bgcolor: colorMap[selected] || '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '0.75rem', height: 20 }} />
                  );
                }}
              >
                {[
                  { value: 'URGENT', color: '#ef4444', label: 'Urgent' },
                  { value: 'HIGH', color: '#f97316', label: 'High' },
                  { value: 'NORMAL', color: '#3b82f6', label: 'Normal' },
                  { value: 'LOW', color: '#9ca3af', label: 'Low' },
                ].map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />
                      <span>{opt.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small" error={formik.touched.sourceType && Boolean(formik.errors.sourceType)}>
              <InputLabel id="sourceType-label">Order Source</InputLabel>
              <Select
                labelId="sourceType-label"
                id="sourceType"
                label="Order Source"
                value={formik.values.sourceType || 'MANUAL'}
                onChange={handleSourceTypeChange}
              >
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="SALES_ORDER">Sales Order</MenuItem>
                <MenuItem value="PARENT_WORK_ORDER">Work Order</MenuItem>
              </Select>
              {formik.touched.sourceType && formik.errors.sourceType && (
                <FormHelperText>{formik.errors.sourceType}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            {formik.values.sourceType === 'MANUAL' ? (
              <TextField
                label="Reference Doc."
                fullWidth
                size="small"
                value={typeof formik.values.referenceDocument === 'string' ? formik.values.referenceDocument : ''}
                onChange={(e) => formik.setFieldValue('referenceDocument', e.target.value)}
                helperText="Enter the reference document number."
              />
            ) : (
              <Autocomplete
                fullWidth
                size="small"
                options={referenceOptions}
                value={selectedReferenceOption}
                inputValue={referenceInputValue || ''}
                onChange={(_, newValue) => formik.setFieldValue('referenceDocument', newValue || null)}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setReferenceInputValue(newInputValue);
                    handleReferenceSearch(newInputValue);
                  }
                }}
                getOptionLabel={(option) => option?.label || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={formik.values.sourceType === 'SALES_ORDER' ? 'Sales Order' : 'Work Order'}
                    fullWidth
                    size="small"
                    helperText="Search and select the reference document."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          <Tooltip title="Open reference in new tab">
                            <span>
                              <IconButton size="small" onClick={() => openNewTab(referencePath)} disabled={!referencePath} edge="end">
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
            )}
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description / Remarks"
              fullWidth
              size="small"
              multiline
              rows={2}
              {...formik.getFieldProps('remarks')}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* --- QUANTITIES & CONFIGURATION CARD --- */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Production Quantities & Rules
          </Typography>
          {(formik.values.selectedItem?.uom || formik.values.inventoryItem?.uom) && (
             <Chip size="small" label={`UOM: ${formik.values.selectedItem?.uom || formik.values.inventoryItem?.uom}`} sx={{ fontWeight: 600, color: '#334155', bgcolor: '#e2e8f0' }} />
          )}
        </Box>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Planned Qty"
              type="number"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!isPlanningEditable}
              {...formik.getFieldProps('plannedQuantity')}
              sx={{ bgcolor: '#fff' }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Completed Qty"
              type="number"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!isPlanningEditable}
              {...formik.getFieldProps('completedQuantity')}
              sx={{ bgcolor: '#fff' }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Scrapped Qty"
              type="number"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!isPlanningEditable}
              {...formik.getFieldProps('scrappedQuantity')}
              sx={{ bgcolor: '#fff' }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!formik.values.allowBackflush}
                  onChange={(e) => formik.setFieldValue('allowBackflush', e.target.checked)}
                  disabled={!isPlanningEditable}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>Allow Backflush</Typography>
                  <Typography variant="caption" color="text.secondary">Auto-consume materials proportionally when operation output is recorded</Typography>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* --- TIMELINE CARD --- */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scheduling & Execution Timeline
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={4} md={4}>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              {...formik.getFieldProps('dueDate')}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <TextField
              label="Planned Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              {...formik.getFieldProps('plannedStartDate')}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <TextField
              label="Planned End Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              {...formik.getFieldProps('plannedEndDate')}
            />
          </Grid>
          <Grid item xs={12} md={12}>
            <Divider sx={{ my: 0.5 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Actual Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!isProductionStarted}
              {...formik.getFieldProps('actualStartDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Actual End Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!isProductionStarted}
              {...formik.getFieldProps('actualEndDate')}
            />
          </Grid>
        </Grid>
      </Paper>

    </Box>
  );
}
