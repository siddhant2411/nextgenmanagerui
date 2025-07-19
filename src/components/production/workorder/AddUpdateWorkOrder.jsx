import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Typography, Divider, Grid, TextField, MenuItem, Button
} from '@mui/material';
import { useParams, useLocation } from 'react-router-dom';
import apiService from '../../../services/apiService';
import WorkOrderBasicDetails from './tabs/WorkOrderBasicDetails';
import WorkOrderBomItems from './tabs/WorkOrderBomItems';
import { Formik } from 'formik';
import WorkOrderInventoryActions from './tabs/WorkOrderInventoryActions';
import WorkOrderCostDetails from './tabs/WorkOrderCostDetails';
import dayjs from 'dayjs';

export default function AddUpdateWorkOrder() {
  const [currentTab, setCurrentTab] = useState(0);
  const [initialValues, setInitialValues] = useState(null);
  const { workOrderId } = useParams();
  const location = useLocation();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const fetchWorkOrderDetails = useCallback(async () => {
    if (!workOrderId) return;
    try {
      const data = await apiService.get(`/production/workOrder?id=${workOrderId}`);
      console.log(data)
      setInitialValues({
        id: data.id || '',
        workOrderNumber: data.workOrderNumber || '',
        company: data.company || '',
        quantity: data.quantity || 1,
        selectedItem: data.workOrderProductionTemplate?.bom?.parentInventoryItem || null,
        bom: data.workOrderProductionTemplate?.bom || '',
        workOrderProductionTemplate: data.workOrderProductionTemplate || null,
        workOrderJobLists: data.workOrderProductionTemplate?.workOrderJobLists || [],
        salesOrder: data.salesOrder?.id || null,
        parentWorkOrder: data.parentWorkOrder?.id || null,
        dueDate: data.dueDate ? dayjs(data.dueDate).format('YYYY-MM-DD') : '',
        startDate: data.startDate ? dayjs(data.startDate).format('YYYY-MM-DD') : '',
        isCreateChildItems: data.isCreateChildItems || false,
        workOrderStatus: data.workOrderStatus || 'DRAFT',
        remarks: data.remarks || '',
        actualWorkHours: data.actualWorkHours || '',
        actualCostOfLabour: data.actualCostOfLabour || '',
        actualCostOfBom: data.actualCostOfBom || '',
        actualTotalCostOfWorkOrder: data.actualTotalCostOfWorkOrder || '',
        estimatedCostOfLabour: data.estimatedCostOfLabour || data.workOrderProductionTemplate?.estimatedCostOfLabour || '',
        estimatedCostOfBom: data.estimatedCostOfBom || data.workOrderProductionTemplate?.estimatedCostOfBom || '',
        overheadCostPercentage: data.overheadCostPercentage || data.workOrderProductionTemplate?.overheadCostPercentage || '',
        totalEstimatedCostOfWorkOrder: data.totalEstimatedCostOfWorkOrder || data.workOrderProductionTemplate?.totalCostOfWorkOrder || '',
        workOrderInventoryInstanceLists: data.workOrderInventoryInstanceLists || []
      });
    } catch (err) {
      console.error('Error fetching work order details:', err);
    }
  }, [workOrderId]);

  useEffect(() => {
    if (location.pathname.includes('/edit')) {
      fetchWorkOrderDetails();
    }
  }, [location]);

  const defaultValues = {
    company: 'Process Equipment Corporation',
    workOrderNumber: null,
    quantity: 1,
    selectedItem: null,
    bom: null,
    workOrderProductionTemplate: null,
    workOrderJobLists: [],
    salesOrder: null,
    parentWorkOrder: null,
    dueDate: '',
    startDate: '',
    isCreateChildItems: false,
    workOrderStatus: 'DRAFT',
    remarks: '',
    actualWorkHours: 0,
    actualCostOfLabour: 0,
    actualCostOfBom: 0,
    actualTotalCostOfWorkOrder: 0,
    estimatedCostOfLabour: 0,
    estimatedCostOfBom: 0,
    overheadCostPercentage: 0,
    totalEstimatedCostOfWorkOrder: 0,
    workOrderInventoryInstanceLists: []
  };

  const STATUS_OPTIONS = ['DRAFT', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'];

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const payload = {
        ...values,
        inventoryItem: values.selectedItem,
        workOrderProductionTemplate: values.workOrderProductionTemplate,
        workOrderJobLists: values.workOrderJobLists,
        workOrderInventoryInstanceLists: values.workOrderInventoryInstanceLists,
      };

      if (workOrderId) {
        await apiService.put(`/production/workOrder/${workOrderId}`, payload);
        alert('Work Order updated successfully!');
      } else {
        await apiService.post('/production/workOrder', payload);
        alert('Work Order created successfully!');
      }
    } catch (err) {
      console.error('Error submitting work order:', err);
      alert('An error occurred while saving the work order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (value) => {
    if (workOrderId) {
      console.log(value.target.value)
      await apiService.patch(`/production/workOrder/${workOrderId}/status?newStatus=${value.target.value}`);

    }
  }
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {(initialValues || !workOrderId) && (
        <Formik initialValues={initialValues || defaultValues} onSubmit={handleSubmit} enableReinitialize={true}>
          {(formik) => (
            <form onSubmit={formik.handleSubmit}>
              <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Grid item>
                  <Typography variant="h5">
                    {workOrderId ? formik.values.workOrderNumber : 'New Work Order'}
                  </Typography>
                </Grid>
                <Grid item sx={{ minWidth: 200 }}>
                  <TextField
                    label="Status"
                    select
                    fullWidth
                    size="small"
                    {...formik.getFieldProps('workOrderStatus')}
                    onChange={handleStatusChange}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                <Tab label="Basic Details" />
                <Tab label="BOM & Items" />
                <Tab label="Inventory Actions" />
                <Tab label="Cost Details" />
              </Tabs>

              <Divider sx={{ my: 2 }} />

              {currentTab === 0 && <WorkOrderBasicDetails formik={formik} />}
              {currentTab === 1 && <WorkOrderBomItems formik={formik} />}
              {currentTab === 2 && <WorkOrderInventoryActions formik={formik} />}
              {currentTab === 3 && <WorkOrderCostDetails formik={formik} />}

              <Box display="flex" justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button variant="contained" type="submit">
                  Submit
                </Button>
              </Box>
            </form>
          )}
        </Formik>
      )}
    </Box>
  );
}
