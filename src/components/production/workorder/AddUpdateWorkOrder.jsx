
import React, { useEffect, useState, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box, Button, Grid, TextField, Autocomplete, Checkbox, FormControlLabel,
  FormHelperText, Typography, Paper, Divider, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TableFooter, TablePagination
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../../services/apiService';
import "./WorkOrder.css"
export default function AddUpdateWorkOrder({ showSuccess, showError }) {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchedItemList, setSearchedItemList] = useState([]);
  const [bomList, setBomList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const formik = useFormik({
    initialValues: {
      id: '',
      company: 'Process Equipment Corporation',
      quantity: 1,
      selectedItem: null,
      bom: '',
      salesOrder: null,
      parentWorkOrder: null,
      dueDate: '',
      isCreateChildItems: false,
      status: 'DRAFT'
    },
    validationSchema: Yup.object({
      company: Yup.string().required('Required'),
      quantity: Yup.number().min(1, 'Must be > 0').required('Required'),
      selectedItem: Yup.object().nullable().required('Select an item'),
      bom: Yup.object().nullable().required('Select BOM'),
      dueDate: Yup.date().nullable(),
      status: Yup.string().required('Select status')
    }),
    onSubmit: async (values) => {
      const payload = {
        id: values.id,
        company: values.company,
        quantity: values.quantity,
        inventoryItemId: values.selectedItem?.id,
        bom: values.bom,
        salesOrder: { id: values.salesOrder },
        parentWorkOrder: { id: values.parentWorkOrder },
        dueDate: values.dueDate,
        isCreateChildItems: values.isCreateChildItems,
        status: values.status
      };
      try {
        await apiService.post('/production/workOrder', payload);
        showSuccess('Work Order saved successfully');
        setTimeout(() => {
          navigate('/production/work-order');
        }, 1500);
        navigate('/production/work-order');
      } catch (err) {
        console.error('Save error', err);
        showError('Failed to save Work Order: ' + (err?.response?.data?.message || err.message || 'Unknown error'));

      }
    }
  });

  // Reusable Alert component

  const fetchWorkOrderDetails = useCallback(async () => {
    if (!workOrderId) return;
    try {
      const data = await apiService.get(`/production/workOrder?id=${workOrderId}`);
      formik.setValues({
        id: data.id || '',
        company: data.company || '',
        quantity: data.quantity || 1,
        selectedItem: data.inventoryItem || null,
        bom: data.bom || '',
        salesOrder: data.salesOrder?.id || null,
        parentWorkOrder: data.parentWorkOrder?.id || null,
        dueDate: data.dueDate || '',
        isCreateChildItems: data.isCreateChildItems || false,
        status: data.status || 'DRAFT'
      });
    } catch (err) {
      console.error('Error fetching details', err);
    }
  }, [workOrderId]);

  useEffect(() => {
    if (location.pathname.includes('/edit')) {
      fetchWorkOrderDetails();
    }
  }, [location]);

  const handleGetBom = async (itemId) => {
    try {
      const response = await apiService.get(`/bom/get-by-item/${itemId}`);
      console.log(response)
      const data = response.map(bomTemplate => ({ id: bomTemplate.bom.id, bomName: bomTemplate.bom.bomName, childItems: bomTemplate.bom.childInventoryItems }));
      console.log(data)
      setBomList(data);
    } catch (err) {
      console.error('Error fetching BOMs', err);
    }
  };

  const handleProductSearch = async (event, value = '') => {
    try {
      const params = {
        size: 5,
        sortBy: 'name',
        sortDir: 'asc',
        search: value,
      };
      const response = await apiService.get(`/inventory_item/all`, params);

      const filteredData = response.content.map(item => (
        {

          id: item.inventoryItemId,
          name: item.name,
          itemCode: item.itemCode,
          hsnCode: item.hsnCode
        }));
      console.log(filteredData)
      setSearchedItemList(filteredData);
    } catch (err) {
      console.error('Search error:', err);


    }
  };

  const childItems = formik.values.bom?.childItems || [];
  const totalElements = childItems.length;
  const paginatedItems = childItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Box className="add-work-order-form" sx={{ padding: 3 }} >
      <form onSubmit={formik.handleSubmit}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">{workOrderId ? 'Edit' : 'New'} Work Order</Typography>
          <Button type="submit" variant="contained">Save</Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Work Order ID" fullWidth size="small" value={formik.values.id} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Company Name" fullWidth size="small" {...formik.getFieldProps('company')} error={!!formik.errors.company} helperText={formik.errors.company} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              fullWidth
              size="small"
              options={searchedItemList}
              value={formik.values.selectedItem}
              inputValue={inputValue}
              openOnFocus // TEMP to debug
              onChange={(e, newValue) => {
                formik.setFieldValue('selectedItem', newValue);
                setInputValue(newValue?.name || '');
                if (newValue?.id) handleGetBom(newValue.id);
              }}
              onInputChange={(e, newInputValue) => {
                setInputValue(newInputValue);
                handleProductSearch(e, newInputValue);
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
                  error={!!formik.errors.selectedItem}
                  helperText={formik.errors.selectedItem}
                />
              )}
            />

          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Quantity" fullWidth type="number" size="small" {...formik.getFieldProps('quantity')} error={!!formik.errors.quantity} helperText={formik.errors.quantity} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              fullWidth
              size="small"
              options={bomList}
              value={formik.values.bom}
              onChange={(e, newValue) => formik.setFieldValue('bom', newValue)}
              getOptionLabel={(option) => (option?.bomName ? option.bomName : '')}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="BOM Name" fullWidth size="small" error={!!formik.errors.bom} helperText={formik.errors.bom} />}
            />
          </Grid>

          <Grid item xs={12} sm={6}><TextField label="Sales Order" fullWidth size="small" {...formik.getFieldProps('salesOrder')} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Parent Work Order" fullWidth size="small" {...formik.getFieldProps('parentWorkOrder')} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Due Date" fullWidth type="date" size="small" InputLabelProps={{ shrink: true }} {...formik.getFieldProps('dueDate')} /></Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Checkbox name="isCreateChildItems" checked={formik.values.isCreateChildItems} onChange={formik.handleChange} />}
              label="Create Work Orders for child items"
            />
            {formik.touched.isCreateChildItems && formik.errors.isCreateChildItems && <FormHelperText error>{formik.errors.isCreateChildItems}</FormHelperText>}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Required Items</Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Item Code', 'Required Qty', 'Available Qty', 'Transferred Qty', 'Consumed Qty'].map((col, i) => (
                  <TableCell key={i} align="center">{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell align="center">{item.childInventoryItem.itemCode}</TableCell>
                  <TableCell align="center">{(item.quantity * formik.values.quantity).toFixed(2)}</TableCell>
                  <TableCell align="center">{(item.childInventoryItem.availableQuantity).toFixed(2)}</TableCell>
                  <TableCell align="center">0</TableCell>
                  <TableCell align="center">0</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  colSpan={6}
                  rowsPerPageOptions={[5, 15, 20]}
                  count={totalElements}
                  page={currentPage - 1}
                  rowsPerPage={itemsPerPage}
                  onPageChange={(e, page) => setCurrentPage(page + 1)}
                  onRowsPerPageChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </form>


    </Box>


  );
}

// Component 3: WorkOrder.css (styles would go in external CSS as needed)
