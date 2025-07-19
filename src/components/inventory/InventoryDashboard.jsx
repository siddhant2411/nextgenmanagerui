import React, { useEffect, useState } from 'react';
import { Card, CardContent, Grid, Typography, Button } from '@mui/material';
import apiService from '../../services/apiService';

const InventoryDashboard = ({ onTabChange }) => {
  const [summary, setSummary] = useState({
    totalItems: 0,
    available: 0,
    requested: 0,
    booked: 0,
    consumed: 0,
    totalInventoryValue : 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiService.get('/inventory/summary');
        setSummary(res);
      } catch (err) {
        console.error('Failed to load inventory summary', err);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h5" gutterBottom>Inventory Dashboard</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Total Items</Typography><Typography variant="h6">{summary?.totalItems}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Available</Typography><Typography variant="h6">{summary?.available}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Requested</Typography><Typography variant="h6">{summary?.requested}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Booked</Typography><Typography variant="h6">{summary?.booked}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Consumed</Typography><Typography variant="h6">{summary?.consumed}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent><Typography>Inventory Value </Typography><Typography variant="h6">  &#8377; {summary?.totalInventoryValue}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => onTabChange('items')}>Go to Inventory Items</Button>
        <Button variant="contained" onClick={() => onTabChange('instances')}>Go to Inventory Instances</Button>
        <Button variant="contained" onClick={() => onTabChange('request')}>Request Inventory</Button>
        <Button variant="contained" onClick={() => onTabChange('arrival')}>Mark Arrival</Button>
      </div>
    </div>
  );
};

export default InventoryDashboard;
