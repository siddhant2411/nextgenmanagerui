import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Chip, Button, CircularProgress
} from '@mui/material';
import { ShoppingCart, Handyman, Edit, Delete, Star, StarOutline, CheckCircle, Cancel } from '@mui/icons-material';
import apiService from '../../services/apiService';
import AddEditVendorPriceDrawer from './AddEditVendorPriceDrawer';
import dayjs from 'dayjs';

const BORDER_COLOR = '#e5e7eb';
const HEADER_BG = '#0f2744';

export default function VendorPricesTab({ itemId, setSnackbar }) {
  const [vendorPrices, setVendorPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [activeSection, setActiveSection] = useState('PURCHASE'); // 'PURCHASE' or 'JOB_WORK'

  const fetchVendorPrices = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const dbResponse = await apiService.get(`/api/items/${itemId}/vendor-prices`).catch(() => []);
      // Placeholder mock data if endpoint not yet live
      const data = dbResponse?.length ? dbResponse : []; 
      setVendorPrices(data);
    } catch (error) {
      setSnackbar?.('Failed to fetch vendor prices.', 'error');
    } finally {
      setLoading(false);
    }
  }, [itemId, setSnackbar]);

  useEffect(() => {
    fetchVendorPrices();
  }, [fetchVendorPrices]);

  const handleSetPreferred = async (id, type) => {
    try {
      await apiService.patch(`/api/items/${itemId}/vendor-prices/${id}/set-preferred`);
      setSnackbar?.('Vendor set as preferred.', 'success');
      fetchVendorPrices();
    } catch (error) {
      setSnackbar?.('Failed to set preferred vendor.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vendor price?')) return;
    try {
      await apiService.delete(`/api/items/${itemId}/vendor-prices/${id}`);
      setSnackbar?.('Vendor price removed.', 'success');
      fetchVendorPrices();
    } catch (error) {
      setSnackbar?.('Failed to delete vendor price.', 'error');
    }
  };

  const handleAddClick = (type) => {
    setActiveSection(type);
    setEditingPrice(null);
    setDrawerOpen(true);
  };

  const handleEditClick = (price) => {
    setActiveSection(price.priceType);
    setEditingPrice(price);
    setDrawerOpen(true);
  };

  const formatInr = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  
  const renderTable = (prices, typeTitle, typeIcon, emptyMessage, addLabel, typeConst) => (
    <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2, borderColor: BORDER_COLOR, overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafbfc' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {typeIcon}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0f2744">
              {typeTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {typeConst === 'PURCHASE' ? 'Vendors who supply this item as a finished/semi-finished good' : 'Vendors who process your raw material and return finished goods'}
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" size="small" sx={{ textTransform: 'none', borderRadius: 1.5 }} onClick={() => handleAddClick(typeConst)}>
          {addLabel}
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
      ) : prices.length === 0 ? (
        <Box textAlign="center" py={5} px={2} bgcolor="#fff">
          <Typography variant="body2" color="text.secondary" mb={2}>{emptyMessage}</Typography>
          <Button variant="contained" size="small" disableElevation onClick={() => handleAddClick(typeConst)} sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
            {addLabel}
          </Button>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: HEADER_BG }}>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem', width: 40 }} align="center">Pref</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>Vendor</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }} align="center">GST Reg.</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }} align="right">Price/Unit</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>Lead Time</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>Valid Until</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prices.map(row => {
                const isExpiringSoon = row.validTo && dayjs(row.validTo).diff(dayjs(), 'days') <= 30 && dayjs(row.validTo).isAfter(dayjs());
                const isExpired = row.validTo && dayjs(row.validTo).isBefore(dayjs());
                return (
                  <TableRow key={row.id} hover sx={{ '& td': { fontSize: '0.8125rem', py: 1.5 } }}>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleSetPreferred(row.id, row.priceType)}>
                        {row.isPreferredVendor ? <Star sx={{ color: '#f59e0b', fontSize: 18 }} /> : <StarOutline sx={{ color: '#9ca3af', fontSize: 18 }} />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#1565c0">{row.vendorName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.vendorGstNumber || 'No GST Number'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={row.gstRegistered ? "GST-registered supplier — ITC input tax credit applicable" : "Unregistered vendor — RCM may apply"}>
                        {row.gstRegistered ? <CheckCircle sx={{ color: '#10b981', fontSize: 16 }} /> : <Cancel sx={{ color: '#ef4444', fontSize: 16 }} />}
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatInr(row.pricePerUnit)}</TableCell>
                    <TableCell>{row.leadTimeDays ? `${row.leadTimeDays} days` : '-'}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {row.validTo ? dayjs(row.validTo).format('DD MMM YYYY') : '-'}
                        {isExpired && <Chip size="small" label="Expired" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />}
                        {isExpiringSoon && <Chip size="small" label="Expiring Soon" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEditClick(row)}><Edit sx={{ fontSize: 16, color: '#3b82f6' }} /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(row.id)}><Delete sx={{ fontSize: 16, color: '#ef4444' }} /></IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );

  const purchasePrices = vendorPrices.filter(p => p.priceType === 'PURCHASE');
  const jobWorkRates = vendorPrices.filter(p => p.priceType === 'JOB_WORK');

  return (
    <Box sx={{ mt: 2 }}>
      {renderTable(
        purchasePrices,
        "Supplier Purchase Prices",
        <ShoppingCart sx={{ color: '#1565c0' }} />,
        "No supplier prices added. Add a supplier price to enable BUY cost in Make or Buy analysis.",
        "+ Add Supplier Price",
        "PURCHASE"
      )}
      
      {renderTable(
        jobWorkRates,
        "Job Work / Subcontract Rates",
        <Handyman sx={{ color: '#f57c00' }} />,
        "No job work rates added. Add a job worker's rate to enable SUBCONTRACT option in Make or Buy analysis.",
        "+ Add Job Work Rate",
        "JOB_WORK"
      )}

      {drawerOpen && (
        <AddEditVendorPriceDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          itemId={itemId}
          editingPrice={editingPrice}
          defaultType={activeSection}
          onSave={fetchVendorPrices}
          setSnackbar={setSnackbar}
        />
      )}
    </Box>
  );
}
