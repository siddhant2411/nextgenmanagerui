import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Divider, Paper, IconButton, Stack,
  Checkbox, FormControlLabel, Tabs, Tab,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Delete as DeleteIcon, UploadFile as UploadFileIcon, PictureAsPdf, FileDownload } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/apiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AddInventoryItem() {
    const { id } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [itemData, setItemData] = useState({
    itemCode: '', name: '', hsnCode: '', uom: 'NOS', itemType: 'RAW_MATERIAL',
    dimension: '', size: '', weight: '', revision: 1, remarks: '', basicMaterial: '',
    drawingNumber: '', processType: '', leadTime: '', standardCost: '', sellingPrice: '',
    reorderLevel: '', minStock: '', maxStock: '', taxCategory: '', isBatchTracked: false, isSerialTracked: false,
    purchased: false, manufactured: false, itemGroupCode: '',
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
    const { name, value, type, checked } = e.target;
    setItemData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventory Item Details", 14, 16);
    const fields = Object.entries(itemData).filter(([key]) => typeof itemData[key] !== 'object');
    autoTable(doc, {
      startY: 20,
      head: [['Field', 'Value']],
      body: fields.map(([key, value]) => [key, value])
    });
    doc.save(`${itemData.itemCode || 'inventory-item'}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([itemData]);
    XLSX.utils.book_append_sheet(wb, ws, "InventoryItem");
    XLSX.writeFile(wb, `${itemData.itemCode || 'inventory-item'}.xlsx`);
  };

  // File change handler
const handleFileChange = (event) => {
  setSelectedFile(event.target.files[0]);
};

// File upload handler
const handleFileUpload = async () => {
  if (!selectedFile) {
    return showSnackbar('Select file first', 'warning');
  }
  try {
    await apiService.upload(`/inventory_item/${itemData.inventoryItemId}/upload`, selectedFile);
    showSnackbar('File uploaded');
    setSelectedFile(null); // Clear after upload
    fetchItem(); // Refresh attachment list
  } catch (e) {
    showSnackbar('File upload failed', 'error');
  }
};

// File delete handler
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{isEditMode ? 'Edit' : 'Add'} Inventory Item</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPDF}>Export PDF</Button>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={exportExcel}>Export Excel</Button>
        </Stack>
      </Box>

      <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Basic Info" />
        <Tab label="Specifications" />
        <Tab label="Inventory Settings" />
        <Tab label="Finance" />
        {isEditMode && <Tab label="Attachments" />}
      </Tabs>

      {selectedTab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField size="small" label="Item Code *" fullWidth name="itemCode" value={itemData.itemCode} onChange={handleChange}   /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Item Name *" fullWidth name="name" value={itemData.name} onChange={handleChange} required /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="HSN Code" fullWidth name="hsnCode" value={itemData.hsnCode} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>UOM</InputLabel><Select name="uom" value={itemData.uom} label="UOM" onChange={handleChange}><MenuItem value="NOS">Nos</MenuItem><MenuItem value="KG">KG</MenuItem><MenuItem value="MTR">Meter</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>Type</InputLabel><Select name="itemType" value={itemData.itemType} label="Type" onChange={handleChange}><MenuItem value="RAW_MATERIAL">Raw Material</MenuItem><MenuItem value="FINISHED_GOOD">Finished Good</MenuItem><MenuItem value="ASSEMBLY">Assembly</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Group Code" fullWidth name="itemGroupCode" value={itemData.itemGroupCode} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={itemData.purchased} onChange={handleChange} name="purchased" />} label="Purchased" /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={itemData.manufactured} onChange={handleChange} name="manufactured" />} label="Manufactured" /></Grid>
        </Grid>
      )}


      {selectedTab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField size="small" label="Dimension" fullWidth name="dimension" value={itemData.dimension} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Size 1" fullWidth name="size" value={itemData.size} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Basic Material" fullWidth name="basicMaterial" value={itemData.basicMaterial} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Weight (kg)" fullWidth name="weight" value={itemData.weight} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Drawing Number" fullWidth name="drawingNumber" value={itemData.drawingNumber} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Process Type" fullWidth name="processType" value={itemData.processType} onChange={handleChange} /></Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField size="small" label="Lead Time (days)" fullWidth name="leadTime" value={itemData.leadTime} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Reorder Level" fullWidth name="reorderLevel" value={itemData.reorderLevel} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Min Stock" fullWidth name="minStock" value={itemData.minStock} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Max Stock" fullWidth name="maxStock" value={itemData.maxStock} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={itemData.isBatchTracked} onChange={handleChange} name="isBatchTracked" />} label="Batch Tracking Enabled" /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={itemData.isSerialTracked} onChange={handleChange} name="isSerialTracked" />} label="Serial Number Tracking Enabled" /></Grid>
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField size="small" label="Standard Cost" fullWidth name="standardCost" value={itemData.standardCost} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Selling Price" fullWidth name="sellingPrice" value={itemData.sellingPrice} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Tax Category" fullWidth name="taxCategory" value={itemData.taxCategory} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Revision" fullWidth name="revision" value={itemData.revision} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField size="small" label="Remarks" fullWidth name="remarks" value={itemData.remarks} onChange={handleChange} /></Grid>
        </Grid>
      )}

      {selectedTab === 4 && isEditMode && (
        <Box mt={3}>
          <Typography variant="h6">Attachments</Typography>

          <Box display="flex" alignItems="center" gap={2} mt={1}>
            <input type="file" onChange={handleFileChange} />
            <Button variant="outlined" onClick={handleFileUpload}>
              Upload
            </Button>
          </Box>

          <List sx={{ mt: 2 }}>
            {itemData.inventoryItemAttachmentList?.length > 0 ? (
              itemData.inventoryItemAttachmentList.map((file) => (
                <ListItem
                  key={file.id}
                  secondaryAction={
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={() => handleFileDelete(file.id)}
                    >
                      Delete
                    </Button>
                  }
                >
                  <ListItemText
                    primary={file.fileName}
                    secondary={`Uploaded on ${new Date(file.createdAt).toLocaleDateString()}`}
                  />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" sx={{ ml: 2 }}>
                No attachments uploaded yet.
              </Typography>
            )}
          </List>
        </Box>


      )}

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