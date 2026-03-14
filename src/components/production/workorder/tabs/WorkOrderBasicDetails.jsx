import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, TextField, Autocomplete, Checkbox, FormControlLabel, FormHelperText, Select, MenuItem, InputLabel, FormControl, Divider, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import apiService from '../../../../services/apiService';
import { getActiveBomByItemid } from '../../../../services/bomService';
import { getWorkOrderList } from '../../../../services/workOrderService';


export default function WorkOrderBasicDetails({ formik, setError, workOrderId }) {
  const [searchedItemList, setSearchedItemList] = useState([]);
  const [inputValue, setInputValue] = useState();
  const [bomList, setBomList] = useState([]);
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

      setError(err.response.data.error || 'Error fetching BOMs');
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
      const response = await apiService.get(`/inventory_item/all`, params);
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

  const handleCost = (value) => {

    formik.setFieldValue('workOrderProductionTemplate', value?.workOrderProductionTemplate || null);
    formik.setFieldValue('workOrderJobLists', value?.workOrderJobLists || []);
    formik.setFieldValue('estimatedCostOfLabour', Number(value?.workOrderProductionTemplate?.estimatedCostOfLabour) || 0);
    formik.setFieldValue('estimatedCostOfBom', Number(value?.workOrderProductionTemplate?.estimatedCostOfBom) || 0);
    formik.setFieldValue('overheadCostPercentage', Number(value?.workOrderProductionTemplate?.overheadCostPercentage) || 0);
    formik.setFieldValue('totalEstimatedCostOfWorkOrder', Number(value?.workOrderProductionTemplate?.totalCostOfWorkOrder) || 0);
  }


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
    <Box sx={{ width: '100%', overflowX: 'hidden', minWidth: 0, pb: 1 }}>
      <Grid container spacing={2}>

        <Grid item xs={12} sm={6}>
          <Autocomplete
            fullWidth
            size="small"
            options={searchedItemList}
            value={formik.values.selectedItem}
            inputValue={inputValue}
            onChange={(e, newValue) => {
              handleProductSelect(newValue)

            }}
            onInputChange={(e, newInputValue, reason) => {
              if (reason === 'input') {
                setInputValue(newInputValue);
                handleProductSearch(e, newInputValue);
              }
            }}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, value) => option.itemCode === value.itemCode}
            renderOption={(props, option) => (

              <li
                {...props}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  cursor: 'pointer'
                }}
              >
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
                          <IconButton
                            size="small"
                            onClick={() => openNewTab(`/inventory-item/edit/${inventoryItemId}`)}
                            disabled={!inventoryItemId}
                            edge="end"
                          >
                            <OpenInNew fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  ),
                }}
                error={!!formik.errors.selectedItem}
                helperText={formik.errors.selectedItem}
                sx={{
                  "& .MuiInputBase-input": { fontSize: 14 },
                  "& .MuiInputLabel-root": { fontSize: 14 },
                }}
              />
            )}
          />
          {formik.values.selectedItem?.id && !formik.values.bom && (
            <Box mt={0.5}>
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label="No BOM found for this item"
              />
            </Box>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl
            fullWidth
            size="small"
            error={formik.touched.sourceType && Boolean(formik.errors.sourceType)}
          >
            <InputLabel id="sourceType-label">
              Order Source
            </InputLabel>

            <Select
              labelId="orderSource-label"
              id="sourceType"
              label="Order Source"
              value={formik.values.sourceType}
              onChange={handleSourceTypeChange}
              sx={{
                "& .MuiInputBase-input": { fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            >
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="SALES_ORDER">Sales Order</MenuItem>
              <MenuItem value="PARENT_WORK_ORDER">Work Order</MenuItem>
            </Select>

            {formik.touched.sourceType && formik.errors.sourceType && (
              <FormHelperText>
                {formik.errors.sourceType}
              </FormHelperText>
            )}
          </FormControl>

        </Grid>
        <Grid item xs={12} sm={6}>
          {formik.values.sourceType === 'MANUAL' ? (
            <TextField
              label="Reference Doc."
              fullWidth
              size="small"
              value={
                typeof formik.values.referenceDocument === 'string'
                  ? formik.values.referenceDocument
                  : ''
              }
              onChange={(e) => formik.setFieldValue('referenceDocument', e.target.value)}
              sx={{
                "& .MuiInputBase-input": { fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            />
          ) : (
            <Autocomplete
              fullWidth
              size="small"
              options={referenceOptions}
              value={selectedReferenceOption}
              inputValue={referenceInputValue}
              onChange={(_, newValue) => {
                formik.setFieldValue('referenceDocument', newValue || null);
              }}
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
                  label={
                    formik.values.sourceType === 'SALES_ORDER'
                      ? 'Sales Order'
                      : 'Work Order'
                  }
                  fullWidth
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <Tooltip title="Open reference in new tab">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openNewTab(referencePath)}
                              disabled={!referencePath}
                              edge="end"
                            >
                              <OpenInNew fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-input": { fontSize: 14 },
                    "& .MuiInputLabel-root": { fontSize: 14 },
                  }}
                />
              )}
            />
          )}
          <FormHelperText>
            {formik.values.sourceType === 'MANUAL'
              ? "Enter the reference document number."
              : "Search and select the reference document."}
          </FormHelperText>
        </Grid>


        <Grid item xs={12} sm={6}>
          <TextField
            label="Description"
            fullWidth
            size="small"
            {...formik.getFieldProps('remarks')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="priority-label" sx={{ fontSize: 14 }}>Priority</InputLabel>
            <Select
              labelId="priority-label"
              id="priority"
              label="Priority"
              value={formik.values.priority || 'NORMAL'}
              onChange={(e) => formik.setFieldValue('priority', e.target.value)}
              sx={{
                "& .MuiInputBase-input": { fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
              renderValue={(selected) => {
                const colorMap = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };
                return (
                  <Chip
                    size="small"
                    label={selected}
                    sx={{
                      bgcolor: colorMap[selected] || '#3b82f6',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
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
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: opt.color }} />
                    <span>{opt.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

      </Grid>

      <Box
        sx={{
          mt: 4,
          mb: 2,
          borderBottom: "1px solid #ddd",
          width: "100%",
        }}
      />

      <Typography
        variant="subtitle1"
        fontWeight={600}
        color="text.secondary"
        sx={{ mb: 1, marginLeft: 1 }}
      >
        PRODUCTION TIMELINE
      </Typography>

      <Grid container spacing={2} mt={1}>




        <Grid item xs={12} sm={6}>
          <TextField
            label="Planned Start Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            {...formik.getFieldProps('plannedStartDate')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Start Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={!isProductionStarted}
            {...formik.getFieldProps('actualStartDate')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Planned End Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            {...formik.getFieldProps('plannedEndDate')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="End Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={!isProductionStarted}
            {...formik.getFieldProps('actualEndDate')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>


        <Grid item xs={12} sm={6}>
          <TextField
            label="Due Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            {...formik.getFieldProps('dueDate')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

      </Grid>

      <Box
        sx={{
          mt: 4,
          mb: 2,
          borderBottom: "1px solid #ddd",
          width: "100%",
        }}
      />

      <Typography
        variant="subtitle1"
        fontWeight={600}
        color="text.secondary"
        sx={{ mb: 1, marginLeft: 1 }}
      >
        {`PRODUCTION QUANTITY (${formik.values.selectedItem?.uom || formik.values.inventoryItem?.uom || '-'})`}
      </Typography>


      <Grid container spacing={2} mt={1}>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Planned Qty"
            type="number"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={!isPlanningEditable}
            {...formik.getFieldProps('plannedQuantity')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4} >
          <TextField
            label="Completed Qty"
            type="number"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={!isPlanningEditable}
            {...formik.getFieldProps('completedQuantity')}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
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
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiInputLabel-root": { fontSize: 14 },
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
