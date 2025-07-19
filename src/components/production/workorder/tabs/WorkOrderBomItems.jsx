import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

export default function WorkOrderBomItems({ formik }) {
  const bom = formik.values?.bom;
  const quantity = formik.values?.quantity || 1;
  const childItems = bom?.childInventoryItems || [];

  const jobLists = formik.values?.workOrderJobLists || [];
  return (
    
    <>
      <Typography variant="h6" gutterBottom>Required Items</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Item Code', 'Required Qty', 'Available Qty'].map((col, i) => (
                <TableCell key={i} align="center">{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {childItems.length > 0 ? (
              childItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell align="center">{item.childInventoryItem.itemCode}</TableCell>
                  <TableCell align="center">{(item.quantity * quantity).toFixed(2)}</TableCell>
                  <TableCell align="center">{item.childInventoryItem.availableQuantity?.toFixed(2) || '0.00'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">No child items found in BOM</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>


      {jobLists.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Operations</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell  align="center">#</TableCell>
                  <TableCell  align="center">Job Name</TableCell>
                  <TableCell align="center">Estimated Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobLists.map((job, index) => (
                  <TableRow key={index}>
                    <TableCell  align="center">{index + 1}</TableCell>
                    <TableCell  align="center">{job.productionJob?.jobName || 'N/A'}</TableCell>
                    <TableCell align="center">{job.numberOfHours* quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}