import React from 'react';
import { Box, Grid, TextField, Typography } from '@mui/material';

export default function WorkOrderCostDetails({ formik }) {


  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 1, ml: 1 }}>Cost Details</Typography>
      <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Estimated Labour Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('estimatedCostOfLabour')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Estimated BOM Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('estimatedCostOfBom')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Overhead Cost (%)"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('overheadCostPercentage')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Total Estimated Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('totalEstimatedCostOfWorkOrder')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Actual Work Hours"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('actualWorkHours')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Actual Labour Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('actualCostOfLabour')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Actual BOM Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('actualCostOfBom')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Total Actual Cost"
              fullWidth
              size="small"
              type="number"
              {...formik.getFieldProps('actualTotalCostOfWorkOrder')}
            />
          </Grid>
        </Grid>

      </Box>
    </>
  );
}