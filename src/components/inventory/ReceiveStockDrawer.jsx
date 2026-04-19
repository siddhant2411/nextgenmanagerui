import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  TextField,
  Button,
  Stack,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Close, MoveToInbox, Search as SearchIcon } from '@mui/icons-material';
import { receiveStock, searchInventoryItems, resolveApiErrorMessage } from '../../services/inventoryService';
import { useAuth } from '../../auth/AuthContext';
import { Autocomplete } from '@mui/material';

const ReceiveStockDrawer = ({ open, onClose, item: presetItem, onRowUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    quantity: 1,
    costPerUnit: 0,
    procurementDecision: 'PURCHASE_ORDER',
    referenceId: 0,
    remarks: '',
  });

  useEffect(() => {
    if (presetItem) {
      setSelectedItem(presetItem);
      setFormData(prev => ({
        ...prev,
        costPerUnit: presetItem.standardCost || 0,
      }));
    } else {
      setSelectedItem(null);
      setFormData({
        quantity: 1,
        costPerUnit: 0,
        procurementDecision: 'PURCHASE_ORDER',
        referenceId: 0,
        remarks: '',
      });
    }
  }, [presetItem, open]);

  useEffect(() => {
    if (!open || presetItem) return;
    
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchItems(searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, open, presetItem]);

  const fetchItems = async (query) => {
    setSearchLoading(true);
    try {
      const resp = await searchInventoryItems({ query, page: 0, size: 20 });
      setItems(resp.content || []);
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
      setError('Please select an item first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        inventoryItemId: selectedItem.inventoryItemId,
        procurementDecision: formData.procurementDecision,
        referenceId: Number(formData.referenceId) || 0,
        quantity: Number(formData.quantity),
        costPerUnit: Number(formData.costPerUnit),
        createdBy: user?.username || 'system'
      };

      await receiveStock(payload);
      onRowUpdate?.();
      onClose();
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Failed to add inventory.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 450 }, p: 0, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }
      }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'flex' }}>
              <MoveToInbox sx={{ color: '#0f172a' }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>Receive Stock</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {presetItem ? (
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0', mb: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
              Selected Item
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b' }}>
              {presetItem.itemCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {presetItem.name}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Search & Select Item
            </Typography>
            <Autocomplete
              openOnFocus
              options={items}
              getOptionLabel={(option) => `[${option.itemCode}] ${option.name}`}
              loading={searchLoading}
              onInputChange={(_, value) => setSearchTerm(value)}
              onChange={(_, value) => {
                setSelectedItem(value);
                if (value) {
                  setFormData(prev => ({ ...prev, costPerUnit: value.standardCost || 0 }));
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type code or name..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ borderBottom: '1px solid #f1f5f9' }}>
                   <Box>
                     <Typography variant="body2" fontWeight={700}>{option.itemCode}</Typography>
                     <Typography variant="caption" color="text.secondary">{option.name}</Typography>
                   </Box>
                </Box>
              )}
            />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Stack spacing={3} sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
          <TextField
              label="Quantity to Receive"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              fullWidth
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">{selectedItem?.uom || 'units'}</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Unit Cost"
              name="costPerUnit"
              type="number"
              value={formData.costPerUnit}
              onChange={handleChange}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              select
              label="Source / Procurement"
              name="procurementDecision"
              value={formData.procurementDecision}
              onChange={handleChange}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="PURCHASE_ORDER">Purchase Order / Procurement</MenuItem>
              <MenuItem value="WORK_ORDER">Work Order Production</MenuItem>
              <MenuItem value="OPENING_STOCK">Opening Stock</MenuItem>
              <MenuItem value="MANUAL_ENTRY">Manual Adjustment</MenuItem>
              <MenuItem value="UNDECIDED">Other</MenuItem>
            </TextField>

            <TextField
              label="Reference ID (Optional)"
              name="referenceId"
              type="number"
              value={formData.referenceId}
              onChange={handleChange}
              fullWidth
              helperText="e.g. PO Number or WO Number"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Remarks"
              name="remarks"
              multiline
              rows={3}
              value={formData.remarks}
              onChange={handleChange}
              fullWidth
              placeholder="Any additional notes..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" gap={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !selectedItem}
            sx={{ 
              borderRadius: 2, 
              py: 1.2, 
              textTransform: 'none', 
              fontWeight: 700, 
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Receipt'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ReceiveStockDrawer;
