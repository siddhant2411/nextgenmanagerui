import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, Autocomplete, InputAdornment,
  RadioGroup, FormControlLabel, Radio, Switch, Grid, Button, Checkbox, CircularProgress, Divider
} from '@mui/material';
import { Close } from '@mui/icons-material';
import apiService from '../../services/apiService';
import dayjs from 'dayjs';

const DRAWER_WIDTH = 480;

const getDefaultContactType = (type) => type === 'JOB_WORK' ? 'JOB_WORKER' : 'SUPPLIER';

export default function AddEditVendorPriceDrawer({ open, onClose, itemId, editingPrice, defaultType, onSave, setSnackbar }) {
  const isEditing = !!editingPrice;
  const [loading, setLoading] = useState(false);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    vendorId: '',
    vendorRef: null,
    priceType: defaultType || 'PURCHASE',
    pricePerUnit: '',
    currency: 'INR',
    leadTimeDays: '',
    minimumOrderQuantity: '',
    validFrom: '',
    validTo: '',
    isPreferredVendor: false,
    gstRegistered: true,
    paymentTerms: '',
    remarks: ''
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({
        vendorId: editingPrice.vendorId,
        vendorRef: { id: editingPrice.vendorId, name: editingPrice.vendorName, gstNumber: editingPrice.vendorGstNumber, registeredDealer: editingPrice.gstRegistered },
        priceType: editingPrice.priceType,
        pricePerUnit: editingPrice.pricePerUnit,
        currency: editingPrice.currency || 'INR',
        leadTimeDays: editingPrice.leadTimeDays || '',
        minimumOrderQuantity: editingPrice.minimumOrderQuantity || '',
        validFrom: editingPrice.validFrom ? dayjs(editingPrice.validFrom).format('YYYY-MM-DD') : '',
        validTo: editingPrice.validTo ? dayjs(editingPrice.validTo).format('YYYY-MM-DD') : '',
        isPreferredVendor: !!editingPrice.isPreferredVendor,
        gstRegistered: editingPrice.gstRegistered ?? true,
        paymentTerms: editingPrice.paymentTerms || '',
        remarks: editingPrice.remarks || ''
      });
    } else {
      setFormData(prev => ({ ...prev, priceType: defaultType || 'PURCHASE', isPreferredVendor: true }));
      fetchVendors('', defaultType || 'PURCHASE');
    }
  }, [isEditing, editingPrice, defaultType]);

  const fetchVendors = async (query = '', type) => {
    setSearching(true);
    try {
      // Fetch from generic contacts endpoint based on type
      let contactTypeFilter = getDefaultContactType(type);
      const res = await apiService.get('/contact/search', { type: contactTypeFilter, search: query, page: 0, size: 20 });
      setVendorOptions(res?.content || []);
    } catch (e) {
      // default mock fallback if api differs
      setVendorOptions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleVendorChange = (e, val) => {
    setFormData(prev => ({
      ...prev,
      vendorRef: val,
      vendorId: val?.id || '',
      gstRegistered: val?.registeredDealer ?? true // inherit from vendor profile explicitly
    }));
  };

  const handleSave = async () => {
    if (!formData.vendorId || !formData.pricePerUnit) {
      setSnackbar?.('Vendor and Price per Unit are required', 'error');
      return;
    }

    const payload = {
      inventoryItemId: itemId,
      vendorId: formData.vendorId,
      priceType: formData.priceType,
      pricePerUnit: Number(formData.pricePerUnit),
      currency: formData.currency,
      leadTimeDays: formData.leadTimeDays ? Number(formData.leadTimeDays) : null,
      minimumOrderQuantity: formData.minimumOrderQuantity ? Number(formData.minimumOrderQuantity) : null,
      validFrom: formData.validFrom ? dayjs(formData.validFrom).toISOString() : null,
      validTo: formData.validTo ? dayjs(formData.validTo).toISOString() : null,
      isPreferredVendor: formData.isPreferredVendor,
      gstRegistered: formData.gstRegistered,
      paymentTerms: formData.paymentTerms,
      remarks: formData.remarks
    };

    setLoading(true);
    try {
      if (isEditing) {
        await apiService.put(`/api/items/${itemId}/vendor-prices/${editingPrice.id}`, payload);
        setSnackbar?.('Vendor price updated', 'success');
      } else {
        await apiService.post(`/api/items/${itemId}/vendor-prices`, payload);
        setSnackbar?.('Vendor price added', 'success');
      }
      onSave?.();
      onClose();
    } catch (error) {
      setSnackbar?.(error?.response?.data?.message || 'Failed to save vendor price', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: DRAWER_WIDTH } }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#0f2744', color: '#fff' }}>
        <Typography variant="h6" fontWeight={600} fontSize="1.1rem">
          {isEditing ? 'Edit' : 'Add'} Vendor Price
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}><Close /></IconButton>
      </Box>

      <Box sx={{ p: 3, overflowY: 'auto' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Price Context</Typography>
        <RadioGroup row name="priceType" value={formData.priceType} onChange={(e) => {
          handleChange(e);
          fetchVendors('', e.target.value);
        }}>
          <FormControlLabel value="PURCHASE" control={<Radio size="small" />} label="Purchase Price" />
          <FormControlLabel value="JOB_WORK" control={<Radio size="small" />} label="Job Work Rate" />
        </RadioGroup>
        
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={vendorOptions}
              value={formData.vendorRef}
              onChange={handleVendorChange}
              onInputChange={(e, val) => fetchVendors(val, formData.priceType)}
              getOptionLabel={(option) => option.name || ''}
              loading={searching}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Box display="flex" gap={1}>
                      <Typography variant="caption" color="text.secondary">GST: {option.gstNumber || 'N/A'}</Typography>
                      {!option.registeredDealer && <Typography variant="caption" color="error">⚠ Unregistered</Typography>}
                    </Box>
                  </Box>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Vendor *" size="small" />}
            />
          </Grid>

          <Grid item xs={12}>
             <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
               <Typography variant="body2">GST Registered</Typography>
               <Switch size="small" checked={formData.gstRegistered} onChange={e => setFormData(prev => ({...prev, gstRegistered: e.target.checked}))} />
             </Box>
             {!formData.gstRegistered && (
               <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                 ⚠ Purchases from unregistered vendors may attract Reverse Charge Mechanism (RCM) under GST.
               </Typography>
             )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth label="Price per Unit *" 
              name="pricePerUnit" value={formData.pricePerUnit} onChange={handleChange}
              type="number" size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
             <FormControlLabel
              control={<Checkbox size="small" name="isPreferredVendor" checked={formData.isPreferredVendor} onChange={handleChange} />}
              label={<Typography variant="body2">Set as Preferred</Typography>}
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Used automatically in Make vs Buy
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
             <TextField fullWidth label="Minimum Order Qty" name="minimumOrderQuantity" value={formData.minimumOrderQuantity} onChange={handleChange} type="number" size="small" />
          </Grid>
          
          <Grid item xs={12} sm={6}>
             <TextField fullWidth label="Lead Time (days)" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleChange} type="number" size="small" />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Valid From" type="date" name="validFrom" value={formData.validFrom} onChange={handleChange} size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Valid To" type="date" name="validTo" value={formData.validTo} onChange={handleChange} size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          
          <Grid item xs={12}>
             <TextField fullWidth label="Payment Terms" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} size="small" placeholder="e.g. 30 days net, Advance" />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} size="small" multiline rows={2} />
          </Grid>

        </Grid>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading} sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Price'}
        </Button>
      </Box>
    </Drawer>
  );
}
