import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Divider, Paper, IconButton
} from '@mui/material';
import { Delete as DeleteIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/apiService';
import './style/InventoryItem.css'
export default function AddInventoryItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [itemData, setItemData] = useState({
    itemCode: '', name: '', hsnCode: '', uom: 'NOS', itemType: 'RAW_MATERIAL',
    dimension: '', size1: '', size2: '', revision: 1, remarks: '', basicMaterial: '',
    inventoryItemAttachmentList: []
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchItem = useCallback(async () => {
    try {
      const data = await apiService.get(`/inventory_item/${id}`);
      setItemData(data);
      setIsEditMode(true);
    } catch (error) {
      showSnackbar('Failed to fetch item', 'error');
    }
  }, [id]);

  useEffect(() => { if (id) fetchItem(); }, [id, fetchItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItemData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await apiService.put(`/inventory_item/${id}`, itemData);
        showSnackbar('Item updated successfully');
      } else {
        await apiService.post('/inventory_item/add', itemData);
        showSnackbar('Item added successfully');
      }
      setTimeout(() => navigate('/inventory-item'), 1200);
    } catch (error) {
      showSnackbar('Error saving item', 'error');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return showSnackbar('Select file first', 'warning');
    try {
      await apiService.upload(`/inventory_item/${itemData.inventoryItemId}/upload`, selectedFile);
      showSnackbar('File uploaded');
      fetchItem();
    } catch (e) {
      showSnackbar('File upload failed', 'error');
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      await apiService.delete(`/inventory_item/delete/${fileId}`);
      showSnackbar('File deleted');
      fetchItem();
    } catch (e) {
      showSnackbar('Delete failed', 'error');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
      <Typography variant="h5" mb={2}>{isEditMode ? 'Edit' : 'Add'} Inventory Item</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Item Code" fullWidth name="itemCode" value={itemData.itemCode} onChange={handleChange} required size='small'/>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button variant="outlined" sx={{ height: '100%' }}>Assign New</Button>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField label="Item Name" fullWidth name="name" value={itemData.name} onChange={handleChange} required size='small'/>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="HSN Code" fullWidth name="hsnCode" value={itemData.hsnCode} onChange={handleChange} size='small'/>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>UOM</InputLabel>
            <Select label="UOM" name="uom" value={itemData.uom} onChange={handleChange} size='small'>
              <MenuItem value="NOS">Nos.</MenuItem>
              <MenuItem value="KG">Kg</MenuItem>
              <MenuItem value="METER">Meter</MenuItem>
              <MenuItem value="INCH">Inch</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" name="itemType" value={itemData.itemType} onChange={handleChange} size='small'>
              <MenuItem value="RAW_MATERIAL">Raw Material</MenuItem>
              <MenuItem value="ASSEMBLY">Assembly</MenuItem>
              <MenuItem value="FINISHED_GOOD">Finished Good</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}><TextField label="Dimension" fullWidth name="dimension" value={itemData.dimension} onChange={handleChange} size='small'/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Size 1" fullWidth name="size1" value={itemData.size1} onChange={handleChange} size='small'/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Size 2" fullWidth name="size2" value={itemData.size2} onChange={handleChange} size='small'/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Basic Material" fullWidth name="basicMaterial" value={itemData.basicMaterial} onChange={handleChange}size='small' /></Grid>

        <Grid item xs={12} sm={6}><TextField label="Revision" fullWidth name="revision" value={itemData.revision} onChange={handleChange} size='small'/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Remarks" fullWidth name="remarks" value={itemData.remarks} onChange={handleChange} size='small'/></Grid>

        {isEditMode && (
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>Attachments</Divider>
            {itemData.inventoryItemAttachmentList.map((file) => (
              <Paper key={file.id} sx={{ p: 1, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography onClick={() => apiService.download(`/inventory_item/download/${file.id}`, '', file.fileName)} sx={{ cursor: 'pointer' }}>{file.fileName}</Typography>
                <IconButton onClick={() => handleFileDelete(file.id)}><DeleteIcon /></IconButton>
              </Paper>
            ))}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={8}>
                <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
              </Grid>
              <Grid item xs={4}>
                <Button onClick={handleFileUpload} variant="outlined" startIcon={<UploadFileIcon />}>Upload</Button>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
      <Button variant="contained" type="submit" sx={{ mt: 3 }}>{isEditMode ? 'Update Item' : 'Add Item'}</Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
