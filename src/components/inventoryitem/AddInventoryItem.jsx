import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Divider, Paper, IconButton, Stack,
  Checkbox, FormControlLabel, Tabs, Tab,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, UploadFile as UploadFileIcon, PictureAsPdf, FileDownload, OpenInNew } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiService, { postFile, putWithFile } from '../../services/apiService';
import { getActiveBomByItemid, getBomHistoryByInventoryItem } from '../../services/bomService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ImageUploadBox from '../ui/imageupload/ImageUploadBox';
import PDFUploadBox from '../ui/pdfupload/PDFUploadBox';

export default function AddInventoryItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [images, setImages] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isItemCodeAuto, setIsItemCodeAuto] = useState(false)
  const [activeBom, setActiveBom] = useState(null);
  const [bomHistory, setBomHistory] = useState([]);
  const [isBomLoading, setIsBomLoading] = useState(false);
  const [itemData, setItemData] = useState({
    itemCode: '', name: '', hsnCode: '', uom: 'NOS', itemType: 'RAW_MATERIAL',
    productSpecification: { dimension: '', size: '', weight: '', basicMaterial: '', drawingNumber: '', processType: '', }, revision: 1, remarks: '',
    productInventorySettings: {
      leadTime: '',
      reorderLevel: '',
      minStock: '',
      maxStock: '',
      purchased: false,
      manufactured: false,
      batchTracked: false,
      serialTracked: false
    },
    productFinanceSettings: {
      standardCost: '', sellingPrice: '',
      taxCategory: ''
    },
    itemGroupCode: '',
    fileAttachments: [{
      originalName: '',
      contentType: '',
      size: '',
      uploadedBy: '',
      uploadedAt: '',
      presignedUrl: '',

    }],
    attachments: [],
    pdfAttachments: []
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  const openNewTab = (path) => {
    if (!path) return;
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  const extractArray = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.content)) return response.content;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.content)) return response.data.content;
    return [];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB');
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

  const fetchManufacturingData = useCallback(async () => {
    if (!id) return;
    setIsBomLoading(true);
    try {
      const [activeBomResponse, bomHistoryResponse] = await Promise.all([
        getActiveBomByItemid(id),
        getBomHistoryByInventoryItem(id),
      ]);
      setActiveBom(activeBomResponse?.bom || activeBomResponse || null);
      setBomHistory(extractArray(bomHistoryResponse));
    } catch (error) {
      setActiveBom(null);
      setBomHistory([]);
      // showSnackbar('Failed to load BOM details', 'error');
    } finally {
      setIsBomLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchManufacturingData();
    }
  }, [id, fetchManufacturingData]);



  // 🖼️ Handle Image Updates
  useEffect(() => {
    setItemData(prev => {
      const newAttachments = images.filter(
        img => img != null && typeof img !== "string" && !img.presignedUrl
      );

      const existingAttachments = images.filter(
        img => img && typeof img === "object" && img.presignedUrl
      );

      const updatedFileAttachments = (prev.fileAttachments || []).filter(fa =>
        existingAttachments.some(ea => ea.presignedUrl === fa.presignedUrl) ||
        (fa.contentType?.includes("pdf") || fa.originalName?.match(/\.(pdf)$/i))
      );

      existingAttachments.forEach(ea => {
        if (!updatedFileAttachments.some(fa => fa.presignedUrl === ea.presignedUrl)) {
          updatedFileAttachments.push(ea);
        }
      });

      return {
        ...prev,
        attachments: newAttachments,
        fileAttachments: updatedFileAttachments,
      };
    });
  }, [images]);


  // 📄 Handle PDF Updates
  useEffect(() => {
    setItemData(prev => {
      if (!pdfFiles) return prev;

      const newPdfAttachments = pdfFiles.filter(
        pdf => pdf != null && typeof pdf !== "string" && !pdf.presignedUrl
      );

      const existingPdfAttachments = pdfFiles.filter(
        pdf => pdf && typeof pdf === "object" && pdf.presignedUrl
      );

      console.log(existingPdfAttachments)
      const updatedFileAttachments = (prev.fileAttachments || []).filter(fa =>
        existingPdfAttachments.some(ea => ea.presignedUrl === fa.presignedUrl) ||

        (fa.contentType?.includes("image") || fa.originalName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i))
      );




      existingPdfAttachments.forEach(ea => {
        if (!updatedFileAttachments.some(fa => fa.presignedUrl === ea.presignedUrl)) {
          updatedFileAttachments.push(ea);
        }
      });

      return {
        ...prev,
        // Add PDFs to same attachments array — unified upload handling
        attachments: [...(prev.attachments || []), ...newPdfAttachments],
        fileAttachments: updatedFileAttachments, // single unified backend metadata list
      };
    });
  }, [pdfFiles]);

  useEffect(() => {
    if (itemData?.fileAttachments && itemData.fileAttachments.length > 0) {
      // Split attachments based on type
      const imageFiles = [];
      const pdfFilesList = [];

      itemData.fileAttachments.forEach(fa => {
        const fileObj = {
          ...fa,
          preview: fa.presignedUrl,
          url: fa.presignedUrl,
        };

        if (
          fa.contentType?.includes("image") ||
          fa.originalName?.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)
        ) {
          imageFiles.push(fileObj);
        } else if (
          fa.contentType?.includes("pdf") ||
          fa.originalName?.match(/\.pdf$/i)
        ) {
          pdfFilesList.push(fileObj);
        }
      });

      // Set state separately
      setImages(imageFiles);
      setPdfFiles(pdfFilesList);
    } else {
      // clear when no attachments
      setImages([]);
      setPdfFiles([]);
    }
  }, [isEditMode]);

  const handleChange = (e) => {

    const { name, value, type, checked } = e.target;


    const fieldValue = type === 'checkbox' ? checked : value;
    // handle nested fields like productSpecification.dimension
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setItemData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: fieldValue,
        },
      }));
    } else {
      setItemData(prev => ({
        ...prev,
        [name]: fieldValue,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await putWithFile(
          `/inventory_item/${id}`,
          itemData,
          [
            ...(itemData.attachments || []),
            ...(itemData.pdfAttachments || []),
          ]
        );
        showSnackbar('Item updated successfully');
      } else {
        await postFile('/inventory_item/add', itemData, [
          ...(itemData.attachments || []),
          ...(itemData.pdfAttachments || []),
        ]);
        showSnackbar('Item added successfully');
      }

      setTimeout(() => navigate('/inventory-item'), 1200);
    } catch (error) {
      console.error(error);
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
    // Flatten the nested structure
    const flattenedData = {
      itemCode: itemData.itemCode || '',
      name: itemData.name || '',
      hsnCode: itemData.hsnCode || '',
      uom: itemData.uom || 'NOS',
      itemType: itemData.itemType || 'RAW_MATERIAL',
      dimension: itemData.productSpecification?.dimension || '',
      size: itemData.productSpecification?.size || '',
      weight: itemData.productSpecification?.weight || '',
      basicMaterial: itemData.productSpecification?.basicMaterial || '',
      drawingNumber: itemData.productSpecification?.drawingNumber || '',
      processType: itemData.productSpecification?.processType || '',
      revision: itemData.revision || 1,
      remarks: itemData.remarks || '',
      leadTime: itemData.productInventorySettings?.leadTime || '',
      reorderLevel: itemData.productInventorySettings?.reorderLevel || '',
      minStock: itemData.productInventorySettings?.minStock || '',
      maxStock: itemData.productInventorySettings?.maxStock || '',
      purchased: itemData.productInventorySettings?.purchased ? 'true' : 'false',
      manufactured: itemData.productInventorySettings?.manufactured ? 'true' : 'false',
      batchTracked: itemData.productInventorySettings?.batchTracked ? 'true' : 'false',
      serialTracked: itemData.productInventorySettings?.serialTracked ? 'true' : 'false',
      standardCost: itemData.productFinanceSettings?.standardCost || '',
      sellingPrice: itemData.productFinanceSettings?.sellingPrice || '',
      taxCategory: itemData.productFinanceSettings?.taxCategory || '',
      itemGroupCode: itemData.itemGroupCode || ''
    };

    // Custom headers with better formatting
    const headers = {
      itemCode: 'Item Code',
      name: 'Product Name',
      hsnCode: 'HSN Code',
      uom: 'Unit of Measure',
      itemType: 'Item Type',
      dimension: 'Dimension',
      size: 'Size',
      weight: 'Weight',
      basicMaterial: 'Basic Material',
      drawingNumber: 'Drawing Number',
      processType: 'Process Type',
      revision: 'Revision',
      remarks: 'Remarks',
      leadTime: 'Lead Time (Days)',
      reorderLevel: 'Reorder Level',
      minStock: 'Min Stock',
      maxStock: 'Max Stock',
      purchased: 'Purchased',
      manufactured: 'Manufactured',
      batchTracked: 'Batch Tracked',
      serialTracked: 'Serial Tracked',
      standardCost: 'Standard Cost',
      sellingPrice: 'Selling Price',
      taxCategory: 'Tax Category',
      itemGroupCode: 'Item Group Code'
    };

    // Create worksheet data with headers
    const wsData = [
      Object.values(headers), // Header row
      Object.values(flattenedData) // Data row
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 15 }, // Item Code
      { wch: 25 }, // Product Name
      { wch: 12 }, // HSN Code
      { wch: 18 }, // Unit of Measure
      { wch: 18 }, // Item Type
      { wch: 18 }, // Dimension
      { wch: 15 }, // Size
      { wch: 12 }, // Weight
      { wch: 20 }, // Basic Material
      { wch: 18 }, // Drawing Number
      { wch: 20 }, // Process Type
      { wch: 10 }, // Revision
      { wch: 30 }, // Remarks
      { wch: 18 }, // Lead Time
      { wch: 15 }, // Reorder Level
      { wch: 12 }, // Min Stock
      { wch: 12 }, // Max Stock
      { wch: 12 }, // Purchased
      { wch: 15 }, // Manufactured
      { wch: 15 }, // Batch Tracked
      { wch: 15 }, // Serial Tracked
      { wch: 15 }, // Standard Cost
      { wch: 15 }, // Selling Price
      { wch: 15 }, // Tax Category
      { wch: 18 }  // Item Group Code
    ];

    // Apply styling to header row (row 1)
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;

      ws[cellAddress].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
          sz: 12
        },
        fill: {
          fgColor: { rgb: "4472C4" }
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Apply borders and alignment to data rows
    for (let row = 1; row <= headerRange.e.r; row++) {
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

        ws[cellAddress].s = {
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: false
          },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      }
    }

    // Set row height for header
    ws['!rows'] = [{ hpt: 25 }]; // Header row height

    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Item");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${itemData.itemCode || 'inventory-item'}_${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename, { cellStyles: true });
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

  const downloadAttachment = async (fileId, fileName) => {

    try {
      await apiService.download(`/inventory_item/download/${fileId}`, '', fileName);
      showSnackbar('File Downloaded');
      fetchItem();
    } catch (e) {
      showSnackbar('File Downloaded failed', 'error');
    }

  }
  return (
    <Box component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        borderRadius: 2,
        minHeight: "100%",

      }}>

      <Paper elevation={3} sx={{ padding: 2, maxWidth: "100%", margin: "auto", borderRadius: 2, }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pb: 1 }}>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            {isEditMode
              ? itemData.name
              : 'Add Product'}
          </Typography>





          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>

            <Stack direction="row" spacing={2}>
              <Typography sx={{ paddingTop: "8px" }}>
                {isEditMode
                  ? 'Rev. ' + itemData.revision
                  : ''}
              </Typography>
              <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPDF}>Export PDF</Button>
              <Button variant="outlined" startIcon={<FileDownload />} onClick={exportExcel}>Export Excel</Button>
              <Button variant="contained" type="submit" sx={{ mt: 3 }}>Save</Button>
            </Stack>
          </Box>
        </Toolbar>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={8}>
            <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
              <Tab label="Basic Info" />
              {/* <Tab label="Specifications" /> */}
              <Tab label="Inventory Settings" />
              <Tab label="Finance" />
              <Tab label="Manufacturing" />
            </Tabs>

            {selectedTab === 0 && (
              <Grid container spacing={2} alignItems="center" >
                {/* Item Code */}
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      size="small"
                      label="Item Code *"
                      name="itemCode"
                      value={itemData.itemCode}
                      onChange={handleChange}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": { fontSize: 14 },
                        "& .MuiInputLabel-root": { fontSize: 14 },
                      }}
                      disabled={isItemCodeAuto}

                    />
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={isEditMode}
                      sx={{
                        fontSize: 13,
                        textTransform: "none",
                        height: 36,
                        px: 2,
                        borderRadius: 2,
                      }}
                      onClick={() => {
                        setIsItemCodeAuto(!isItemCodeAuto);
                        setItemData(prev => ({
                          ...prev,
                          itemCode: '',
                        }))
                      }}
                    >
                      Auto
                    </Button>
                  </Box>
                </Grid>

                {/* Item Name */}
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="Item Name"
                    name="name"
                    value={itemData.name}
                    onChange={handleChange}
                    fullWidth
                    required
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }}
                  />
                </Grid>

                {/* HSN Code */}
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="HSN Code"
                    name="hsnCode"
                    value={itemData.hsnCode}
                    onChange={handleChange}
                    fullWidth
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },
                    }}
                  />
                </Grid>

                {/* Divider Section */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      mt: 2,
                      mb: 1,
                      borderBottom: "1px solid #ddd",
                      width: "100%",
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Classification
                  </Typography>
                </Grid>

                {/* UOM */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>UOM</InputLabel>
                    <Select
                      name="uom"
                      value={itemData.uom}
                      label="UOM"
                      onChange={handleChange}
                    >
                      <MenuItem value="NOS">Nos</MenuItem>
                      <MenuItem value="KG">KG</MenuItem>
                      <MenuItem value="METER">Meter</MenuItem>
                      <MenuItem value="INCH">Inch</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Type */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="itemType"
                      value={itemData.itemType}
                      label="Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="RAW_MATERIAL">Raw Material</MenuItem>
                      <MenuItem value="FINISHED_GOOD">Finished Good</MenuItem>
                      <MenuItem value="ASSEMBLY">Assembly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Group Code */}
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="Group Code"
                    fullWidth
                    name="itemGroupCode"
                    value={itemData.itemGroupCode}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },
                    }}
                  />
                </Grid>

                {/* Divider */}


                <Grid item xs={12}>
                  <Box
                    sx={{
                      mt: 2,
                      mb: 1,
                      borderBottom: "1px solid #ddd",
                      width: "100%",
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Specifications
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="Dimension"
                    name="productSpecification.dimension"
                    value={itemData.productSpecification?.dimension}
                    onChange={handleChange}
                    fullWidth
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="Size"
                    fullWidth
                    name="productSpecification.size"
                    value={itemData.productSpecification?.size}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="Weight (kg)"
                    fullWidth
                    name="productSpecification.weight"
                    value={itemData.productSpecification?.weight}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }}
                    type='number'
                  />
                </Grid>

                <Grid item xs={12} md={4} mt={3}>
                  <TextField
                    size="small"
                    label="Basic Material"
                    fullWidth
                    name="productSpecification.basicMaterial"
                    value={itemData.productSpecification?.basicMaterial}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }} />
                </Grid>

                <Grid item xs={12} md={4} mt={3}>
                  <TextField
                    size="small"
                    label="Drawing Number"
                    fullWidth
                    name="productSpecification.drawingNumber"
                    value={itemData.productSpecification?.drawingNumber}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }} />
                </Grid>

                <Grid item xs={12} md={4} mt={3}>
                  <TextField
                    size="small"
                    label="Process Type"
                    fullWidth
                    name="productSpecification.processType"
                    value={itemData.productSpecification?.processType}
                    onChange={handleChange}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 14 },
                      "& .MuiInputLabel-root": { fontSize: 14 },

                    }} />
                </Grid>

                <Grid item xs={12}>
                  <Box
                    sx={{
                      mt: 2,
                      mb: 1,
                      borderBottom: "1px solid #ddd",
                      width: "100%",
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Description
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    size="small"
                    label="Description"
                    fullWidth
                    name="remarks"
                    value={itemData.remarks}
                    onChange={handleChange} />
                </Grid>

              </Grid>
            )}



            {/* {
              selectedTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Dimension" fullWidth name="dimension" value={itemData.dimension} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Size 1" fullWidth name="size" value={itemData.size} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Basic Material" fullWidth name="basicMaterial" value={itemData.basicMaterial} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Weight (kg)" fullWidth name="weight" value={itemData.weight} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Drawing Number" fullWidth name="drawingNumber" value={itemData.drawingNumber} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Process Type" fullWidth name="processType" value={itemData.processType} onChange={handleChange} /></Grid>
                </Grid>
              )
            } */}

            {
              selectedTab === 1 && (
                <Grid container spacing={2}>

                  <Grid item xs={12}>

                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Stock Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small"
                      label="Lead Time (days)"
                      fullWidth
                      name="productInventorySettings.leadTime"
                      value={itemData.productInventorySettings?.leadTime}
                      onChange={handleChange}
                      sx={{
                        "& .MuiInputBase-input": { fontSize: 14 },
                        "& .MuiInputLabel-root": { fontSize: 14 },
                        width: "100%"

                      }}

                      type='number'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small"
                      label="Reorder Level"
                      fullWidth
                      name="productInventorySettings.reorderLevel"
                      value={itemData.productInventorySettings?.reorderLevel}
                      onChange={handleChange}
                      sx={{
                        "& .MuiInputBase-input": { fontSize: 14 },
                        "& .MuiInputLabel-root": { fontSize: 14 },
                        width: "100%"

                      }}
                      type='number'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} mt={3}>
                    <TextField
                      size="small"
                      label="Min Stock"
                      fullWidth
                      name="productInventorySettings.minStock"
                      value={itemData.productInventorySettings?.minStock}
                      onChange={handleChange}
                      sx={{
                        "& .MuiInputBase-input": { fontSize: 14 },
                        "& .MuiInputLabel-root": { fontSize: 14 },
                        width: "100%"

                      }}
                      type='number'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} mt={3}>
                    <TextField
                      size="small"
                      label="Max Stock"
                      fullWidth
                      name="productInventorySettings.maxStock"
                      value={itemData.productInventorySettings?.maxStock}
                      onChange={handleChange}
                      sx={{
                        "& .MuiInputBase-input": { fontSize: 14 },
                        "& .MuiInputLabel-root": { fontSize: 14 },
                        width: "100%"

                      }}
                      type='number'
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 2,
                        mb: 1,
                        borderBottom: "1px solid #ddd",
                        width: "100%",
                      }}
                    />
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Inventory Tracking
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!itemData.productInventorySettings?.batchTracked}
                          onChange={handleChange}
                          name="productInventorySettings.batchTracked"
                        />
                      }
                      label="Batch Tracking Enabled" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Checkbox checked={itemData.productInventorySettings?.serialTracked}
                        onChange={handleChange}
                        name="productInventorySettings.serialTracked" />}
                      label="Serial Number Tracking Enabled" />
                  </Grid>



                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 2,
                        mb: 1,
                        borderBottom: "1px solid #ddd",
                        width: "100%",
                      }}
                    />
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Inventory Source
                    </Typography>
                  </Grid>

                  {/* Checkboxes */}
                  <Grid item xs={12} md={4}>
                    <Box display="flex" alignItems="center" gap={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={itemData.productInventorySettings?.purchased}
                            onChange={handleChange}
                            name="productInventorySettings.purchased"
                          />
                        }
                        label="Purchased"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={itemData.productInventorySettings?.manufactured}
                            onChange={handleChange}
                            name="productInventorySettings.manufactured"
                          />
                        }
                        label="Manufactured"
                      />
                    </Box>
                  </Grid>

                </Grid>
              )
            }

            {
              selectedTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Standard Cost" fullWidth name="productFinanceSettings.standardCost" value={itemData.productFinanceSettings?.standardCost} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Selling Price" fullWidth name="productFinanceSettings.sellingPrice" value={itemData.productFinanceSettings?.sellingPrice} onChange={handleChange} /></Grid>
                  <Grid item xs={12} sm={6}><TextField size="small" label="Tax Category" fullWidth name="productFinanceSettings.taxCategory" value={itemData.productFinanceSettings?.taxCategory} onChange={handleChange} /></Grid>
                  {/* <Grid item xs={12} sm={6}><TextField size="small" label="Revision" fullWidth name="revision" value={itemData.revision} onChange={handleChange} /></Grid> */}

                </Grid>
              )
            }

            {
              selectedTab === 3 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                      Active BOM
                    </Typography>
                    {isBomLoading ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" color="text.secondary">Loading BOM details...</Typography>
                      </Box>
                    ) : activeBom ? (
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">BOM Name</Typography>
                            <Typography variant="body1" fontWeight={500}>{activeBom.bomName || '-'}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Revision</Typography>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body1" fontWeight={500}>{activeBom.revision ?? '-'}</Typography>
                              <Tooltip title="Open BOM details in new tab">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => openNewTab(activeBom?.id ? `/bom/edit/${activeBom.id}` : null)}
                                    disabled={!activeBom?.id}
                                    aria-label="Open BOM details"
                                  >
                                    <OpenInNew fontSize="inherit" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Status</Typography>
                            <Chip size="small" label={activeBom.bomStatus || 'ACTIVE'} color="success" variant="outlined" />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Effective From</Typography>
                            <Typography variant="body1">{formatDate(activeBom.effectiveFrom)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Effective To</Typography>
                            <Typography variant="body1">{formatDate(activeBom.effectiveTo)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">BOM Code</Typography>
                            <Typography variant="body1">{activeBom.bomCode || activeBom.id || '-'}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No active BOM found for this inventory item.
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                      BOM History
                    </Typography>
                    {bomHistory.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No BOM history available for this inventory item.
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>BOM Name</TableCell>
                              <TableCell>Revision</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Effective From</TableCell>
                              <TableCell>Effective To</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bomHistory.map((bom, index) => (
                              <TableRow key={bom.id || `${bom.bomName || 'bom'}-${index}`}>
                                <TableCell>{bom.bomName || '-'}</TableCell>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="body2">{bom.revision ?? '-'}</Typography>
                                    <Tooltip title="Open BOM details in new tab">
                                      <span>
                                        <IconButton
                                          size="small"
                                          onClick={() => openNewTab(bom?.id ? `/bom/edit/${bom.id}` : null)}
                                          disabled={!bom?.id}
                                          aria-label="Open BOM details"
                                        >
                                          <OpenInNew fontSize="inherit" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>{bom.bomStatus || '-'}</TableCell>
                                <TableCell>{formatDate(bom.effectiveFrom)}</TableCell>
                                <TableCell>{formatDate(bom.effectiveTo)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Grid>
                </Grid>
              )
            }



          </Grid>


          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={500} mb={1}>Product Images</Typography>
            <ImageUploadBox handleChange={handleChange} images={images} setImages={setImages} />

            <Typography variant="h6" fontWeight={500} mb={1} mt={1} >Technical Documents</Typography>
            <PDFUploadBox handleChange={handleChange} pdfFiles={pdfFiles} setPdfFiles={setPdfFiles} />
          </Grid>
        </Grid>
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
      </Paper >
    </Box >
  );
}
