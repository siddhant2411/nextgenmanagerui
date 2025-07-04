import React, { useEffect, useState } from 'react';
import { Grid, TextField, Autocomplete, Checkbox, FormControlLabel, FormHelperText } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../../../services/apiService';

export default function WorkOrderBasicDetails({ initialValues }) {
  const [searchedItemList, setSearchedItemList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [bomList, setBomList] = useState([]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialValues || {
      company: 'Process Equipment Corporation',
      quantity: 1,
      selectedItem: null,
      bom: null,
      salesOrder: '',
      parentWorkOrder: '',
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
    onSubmit: (values) => {
      console.log('Submitting basic details', values);
    }
  });

  useEffect(() => {
    if (formik.values.selectedItem?.id) {
      handleGetBom(formik.values.selectedItem.id);
    }
  }, [formik.values.selectedItem]);

  const handleGetBom = async (itemId) => {
    try {
      const response = await apiService.get(`/bom/get-by-item/${itemId}`);
      const data = response.map(bomTemplate => ({
        id: bomTemplate.bom.id,
        bomName: bomTemplate.bom.bomName,
        childItems: bomTemplate.bom.childInventoryItems
      }));
      setBomList(data);
    } catch (err) {
      console.error('Error fetching BOMs', err);
    }
  };

  const handleProductSearch = async (value = '') => {
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
        hsnCode: item.hsnCode
      }));
      setSearchedItemList(filteredData);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Company Name"
          fullWidth
          size="small"
          {...formik.getFieldProps('company')}
          error={!!formik.errors.company}
          helperText={formik.errors.company}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Quantity"
          type="number"
          fullWidth
          size="small"
          {...formik.getFieldProps('quantity')}
          error={!!formik.errors.quantity}
          helperText={formik.errors.quantity}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Autocomplete
          fullWidth
          size="small"
          options={searchedItemList}
          value={formik.values.selectedItem}
          inputValue={inputValue}
          getOptionLabel={(option) => option?.name || ''}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          onChange={(e, newValue) => {
            formik.setFieldValue('selectedItem', newValue);
            setInputValue(newValue?.name || '');
          }}
          onInputChange={(e, newInputValue) => {
            setInputValue(newInputValue);
            handleProductSearch(newInputValue);
          }}
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
        <Autocomplete
          fullWidth
          size="small"
          options={bomList}
          value={formik.values.bom}
          onChange={(e, newValue) => formik.setFieldValue('bom', newValue)}
          getOptionLabel={(option) => option?.bomName || ''}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="BOM"
              fullWidth
              size="small"
              error={!!formik.errors.bom}
              helperText={formik.errors.bom}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Sales Order"
          fullWidth
          size="small"
          {...formik.getFieldProps('salesOrder')}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Parent Work Order"
          fullWidth
          size="small"
          {...formik.getFieldProps('parentWorkOrder')}
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
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={<Checkbox name="isCreateChildItems" checked={formik.values.isCreateChildItems} onChange={formik.handleChange} />}
          label="Create Work Orders for child items"
        />
        {formik.touched.isCreateChildItems && formik.errors.isCreateChildItems && (
          <FormHelperText error>{formik.errors.isCreateChildItems}</FormHelperText>
        )}
      </Grid>
    </Grid>
  );
}