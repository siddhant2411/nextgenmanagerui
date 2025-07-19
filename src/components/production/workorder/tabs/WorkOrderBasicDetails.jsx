import React, { useEffect, useState } from 'react';
import { Grid, TextField, Autocomplete, Checkbox, FormControlLabel, FormHelperText } from '@mui/material';
import apiService from '../../../../services/apiService';

export default function WorkOrderBasicDetails({ formik }) {
  const [searchedItemList, setSearchedItemList] = useState([]);
  const [inputValue, setInputValue] = useState();
  const [bomList, setBomList] = useState([]);

  useEffect(() => {
    if (formik.values.selectedItem?.id) {
      handleGetBom(formik.values.selectedItem.id);
    }
  }, [formik.values.selectedItem]);

  const handleGetBom = async (itemId) => {
    try {
      const response = await apiService.get(`/bom/get-by-item/${itemId}`);

      const template = response;
      const data = response
        .map(bomTemplate => {
          if (!bomTemplate.workOrderProductionTemplate) return null;

          return {
            id: bomTemplate.bom.id,
            bomName: bomTemplate.bom.bomName,
            childInventoryItems: bomTemplate.bom.childInventoryItems,
            workOrderProductionTemplate: bomTemplate.workOrderProductionTemplate,
            workOrderJobLists: bomTemplate.workOrderProductionTemplate.workOrderJobLists || []
          };
        })
        .filter(Boolean); // remove nulls

      setBomList(data);






    } catch (err) {
      console.error('Error fetching BOMs', err);
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
        hsnCode: item.hsnCode
      }));
      setSearchedItemList(filteredData);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleCost = (value) => {

    console.log(value)
    formik.setFieldValue('workOrderProductionTemplate', value?.workOrderProductionTemplate || null);
    formik.setFieldValue('workOrderJobLists', value?.workOrderJobLists || []);
    formik.setFieldValue('estimatedCostOfLabour', Number(value?.workOrderProductionTemplate?.estimatedCostOfLabour) || 0);
    formik.setFieldValue('estimatedCostOfBom', Number(value?.workOrderProductionTemplate?.estimatedCostOfBom) || 0);
    formik.setFieldValue('overheadCostPercentage', Number(value?.workOrderProductionTemplate?.overheadCostPercentage) || 0);
    formik.setFieldValue('totalEstimatedCostOfWorkOrder', Number(value?.workOrderProductionTemplate?.totalCostOfWorkOrder) || 0);
  }


  useEffect(() => {
    if (formik.values.id) {
      formik.setFieldValue("selectedItem", formik.values.bom?.parentInventoryItem)
      setInputValue(formik.values.bom?.parentInventoryItem?.name || '');
    }
  }, [formik.values.bom]);


  useEffect(() => {
    setInputValue(formik.values.selectedItem)
  }, [])


  // useEffect(() => {
  //   console.log(formik.values.selectedItem)
  //   if (
  //     formik.values.selectedItem &&
  //     !searchedItemList.some(item => item.itemCode === formik.values.selectedItem.itemCode)
  //   ) {
  //     setSearchedItemList(prev => [...prev, formik.values.selectedItem]);
  //   }
  // }, [formik.values.selectedItem, searchedItemList]);

  return (
    <Grid container spacing={2}>
      {/* <Grid item xs={12} sm={6}>
        <TextField
          label="Company Name"
          fullWidth
          size="small"
          {...formik.getFieldProps('company')}
          error={!!formik.errors.company}
          helperText={formik.errors.company}
        />
      </Grid> */}


        {console.log(formik.values.dueDate)}
      <Grid item xs={12} sm={6}>
        <Autocomplete
          fullWidth
          size="small"
          options={searchedItemList}
          value={formik.values.selectedItem}
          inputValue={inputValue}
          onChange={(e, newValue) => {
            formik.setFieldValue('selectedItem', newValue);
            setInputValue(newValue?.name || '');
            if (newValue?.id) handleGetBom(newValue.id);
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
          onChange={(e, newValue) => { formik.setFieldValue('bom', newValue); handleCost(newValue) }}
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
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          {...formik.getFieldProps('startDate')}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Remarks"
          fullWidth
          size="small"
          {...formik.getFieldProps('remarks')}
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
