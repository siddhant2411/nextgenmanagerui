import React, { useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  CircularProgress
} from '@mui/material';
import apiService from '../../../../services/apiService';
import WorkOrderInstanceListTable from './WorkOrderInstanceListTable';


export default function WorkOrderInventoryActions({ formik }) {
  const [loading, setLoading] = useState(false);
  const workOrderId = formik.values.id;
  const childInventoryInstanceList = formik.values.workOrderInventoryInstanceLists || [];
  const quantity = formik.values.quantity || 1;
  console.log(childInventoryInstanceList)
  const handleInventoryAction = async (actionType) => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const url = `/production/workOrder/${workOrderId}/${actionType}`;
      const response = await apiService.post(url);
      console.log(`${actionType} success:`, response);
    } catch (err) {
      console.error(`${actionType} failed:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>Inventory Actions</Typography>

  

      <Button
        variant="outlined"
        color="secondary"
        onClick={() => handleInventoryAction('consume')}
        disabled={loading || !workOrderId}
      >
        {loading ? <CircularProgress size={20} /> : 'Consume Inventory'}
      </Button>

      <WorkOrderInstanceListTable childInventoryInstanceList={childInventoryInstanceList} />
    </>
  );
}
