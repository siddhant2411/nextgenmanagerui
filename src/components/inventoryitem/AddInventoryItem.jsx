import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Divider, Paper, IconButton, Stack,
  Checkbox, FormControlLabel, Tabs, Tab,
  Toolbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { PictureAsPdf, FileDownload, OpenInNew } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiService, { postFile, putWithFile } from '../../services/apiService';
import { getActiveBomByItemid, getBomHistoryByInventoryItem, getWhereUsedByItemId } from '../../services/bomService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ImageUploadBox from '../ui/imageupload/ImageUploadBox';
import PDFUploadBox from '../ui/pdfupload/PDFUploadBox';
import TestTemplateSection from './TestTemplateSection';
import VendorPricesTab from './VendorPricesTab';

/* ── Theme constants ── */
const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';

/* ── Reusable section heading ── */
const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
      <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </Typography>
    </Box>
  </Grid>
);

/* ── Consistent text field styling ── */
const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 13.5 },
  "& .MuiInputLabel-root": { fontSize: 13.5 },
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
  },
};

export default function AddInventoryItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [images, setImages] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isItemCodeAuto, setIsItemCodeAuto] = useState(false);
  const [activeBom, setActiveBom] = useState(null);
  const [bomHistory, setBomHistory] = useState([]);
  const [whereUsedList, setWhereUsedList] = useState([]);
  const [isBomLoading, setIsBomLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const hydratingAttachmentsRef = useRef(false);
  const imagesInitializedRef = useRef(false);
  const pdfInitializedRef = useRef(false);
  const [itemData, setItemData] = useState({
    itemCode: '', name: '', hsnCode: '', uom: 'NOS', itemType: 'RAW_MATERIAL',
    leadTime: '', purchased: false, manufactured: false, standardCost: '',
    productSpecification: { dimension: '', size: '', weight: '', basicMaterial: '', drawingNumber: '', processType: '' },
    revision: 1, remarks: '',
    productInventorySettings: { leadTime: '', reorderLevel: '', minStock: '', maxStock: '', purchased: false, manufactured: false, batchTracked: false, serialTracked: false },
    productFinanceSettings: { standardCost: '', sellingPrice: '', taxCategory: '' },
    itemGroupCode: '',
    fileAttachments: [{ originalName: '', contentType: '', size: '', uploadedBy: '', uploadedAt: '', presignedUrl: '' }],
    attachments: [], pdfAttachments: []
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const openNewTab = (path) => { if (path) window.open(path, '_blank', 'noopener,noreferrer'); };

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
      setItemData((prev) => ({
        ...prev, ...data,
        leadTime: data?.leadTime ?? data?.productInventorySettings?.leadTime ?? '',
        purchased: data?.purchased ?? data?.productInventorySettings?.purchased ?? false,
        manufactured: data?.manufactured ?? data?.productInventorySettings?.manufactured ?? false,
        standardCost: data?.standardCost ?? data?.productFinanceSettings?.standardCost ?? '',
      }));
      setIsEditMode(true);
      setIsDirty(false);
    } catch (error) {
      showSnackbar('Failed to fetch item', 'error');
    }
  }, [id]);

  useEffect(() => { if (id) fetchItem(); }, [id, fetchItem]);

  const fetchManufacturingData = useCallback(async () => {
    if (!id) return;
    setIsBomLoading(true);
    try {
      const [activeBomResponse, bomHistoryResponse, whereUsedResponse] = await Promise.all([
        getActiveBomByItemid(id), getBomHistoryByInventoryItem(id),
        getWhereUsedByItemId(id).catch(() => []),
      ]);
      setActiveBom(activeBomResponse?.bom || activeBomResponse || null);
      setBomHistory(extractArray(bomHistoryResponse));
      setWhereUsedList(extractArray(whereUsedResponse));
    } catch (error) {
      setActiveBom(null);
      setBomHistory([]);
      setWhereUsedList([]);
    } finally {
      setIsBomLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchManufacturingData(); }, [id, fetchManufacturingData]);

  useEffect(() => {
    if (hydratingAttachmentsRef.current) return;
    setItemData(prev => {
      const newAttachments = images.filter(img => img != null && typeof img !== "string" && !img.presignedUrl);
      const existingAttachments = images.filter(img => img && typeof img === "object" && img.presignedUrl);
      const updatedFileAttachments = (prev.fileAttachments || []).filter(fa =>
        existingAttachments.some(ea => ea.presignedUrl === fa.presignedUrl) ||
        (fa.contentType?.includes("pdf") || fa.originalName?.match(/\.(pdf)$/i))
      );
      existingAttachments.forEach(ea => {
        if (!updatedFileAttachments.some(fa => fa.presignedUrl === ea.presignedUrl)) updatedFileAttachments.push(ea);
      });
      return { ...prev, attachments: newAttachments, fileAttachments: updatedFileAttachments };
    });
    if (!imagesInitializedRef.current) {
      imagesInitializedRef.current = true;
      return;
    }
    if (!hydratingAttachmentsRef.current) {
      setIsDirty(true);
    }
  }, [images]);

  useEffect(() => {
    if (hydratingAttachmentsRef.current) return;
    setItemData(prev => {
      if (!pdfFiles) return prev;
      const newPdfAttachments = pdfFiles.filter(pdf => pdf != null && typeof pdf !== "string" && !pdf.presignedUrl);
      const existingPdfAttachments = pdfFiles.filter(pdf => pdf && typeof pdf === "object" && pdf.presignedUrl);
      const updatedFileAttachments = (prev.fileAttachments || []).filter(fa =>
        existingPdfAttachments.some(ea => ea.presignedUrl === fa.presignedUrl) ||
        (fa.contentType?.includes("image") || fa.originalName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i))
      );
      existingPdfAttachments.forEach(ea => {
        if (!updatedFileAttachments.some(fa => fa.presignedUrl === ea.presignedUrl)) updatedFileAttachments.push(ea);
      });
      return { ...prev, attachments: [...(prev.attachments || []), ...newPdfAttachments], fileAttachments: updatedFileAttachments };
    });
    if (!pdfInitializedRef.current) {
      pdfInitializedRef.current = true;
      return;
    }
    if (!hydratingAttachmentsRef.current) {
      setIsDirty(true);
    }
  }, [pdfFiles]);

  useEffect(() => {
    hydratingAttachmentsRef.current = true;
    if (itemData?.fileAttachments && itemData.fileAttachments.length > 0) {
      const imageFiles = [];
      const pdfFilesList = [];
      itemData.fileAttachments.forEach(fa => {
        const fileObj = { ...fa, preview: fa.presignedUrl, url: fa.presignedUrl };
        if (fa.contentType?.includes("image") || fa.originalName?.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
          imageFiles.push(fileObj);
        } else if (fa.contentType?.includes("pdf") || fa.originalName?.match(/\.pdf$/i)) {
          pdfFilesList.push(fileObj);
        }
      });
      setImages((prev) => {
        if (prev.some(img => img?.file && !img?.presignedUrl)) return prev;
        const prevUrls = prev.map(img => img?.presignedUrl).filter(Boolean);
        const nextUrls = imageFiles.map(img => img?.presignedUrl).filter(Boolean);
        if (prevUrls.length === nextUrls.length && prevUrls.every((u, i) => u === nextUrls[i])) {
          return prev;
        }
        return imageFiles;
      });
      setPdfFiles((prev) => {
        if (prev.some(pdf => pdf?.file && !pdf?.presignedUrl)) return prev;
        const prevUrls = prev.map(pdf => pdf?.presignedUrl).filter(Boolean);
        const nextUrls = pdfFilesList.map(pdf => pdf?.presignedUrl).filter(Boolean);
        if (prevUrls.length === nextUrls.length && prevUrls.every((u, i) => u === nextUrls[i])) {
          return prev;
        }
        return pdfFilesList;
      });
    } else {
      setImages((prev) => (prev.length ? [] : prev));
      setPdfFiles((prev) => (prev.length ? [] : prev));
    }
    setTimeout(() => {
      hydratingAttachmentsRef.current = false;
    }, 0);
  }, [isEditMode, itemData?.fileAttachments]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    setIsDirty(true);
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setItemData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: fieldValue } }));
    } else {
      setItemData(prev => ({ ...prev, [name]: fieldValue }));
    }
  };


  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setShowSaveConfirm(true);
  };

  const persistItem = async () => {
    const payload = {
      ...itemData, leadTime: itemData.leadTime, purchased: itemData.purchased, manufactured: itemData.manufactured,
      standardCost: itemData.standardCost === '' ? null : itemData.standardCost,
      productInventorySettings: { ...(itemData.productInventorySettings || {}), leadTime: itemData.leadTime, purchased: itemData.purchased, manufactured: itemData.manufactured },
      productFinanceSettings: { ...(itemData.productFinanceSettings || {}), standardCost: itemData.standardCost === '' ? null : itemData.standardCost },
    };
    try {
      if (isEditMode) {
        await putWithFile(`/inventory_item/${id}`, payload, [...(itemData.attachments || []), ...(itemData.pdfAttachments || [])]);
        showSnackbar('Item updated successfully');
      } else {
        await postFile('/inventory_item/add', payload, [...(itemData.attachments || []), ...(itemData.pdfAttachments || [])]);
        showSnackbar('Item added successfully');
      }
      setIsDirty(false);
      setTimeout(() => navigate('/inventory-item'), 1200);
    } catch (error) {
      showSnackbar('Error saving item', 'error');
    }
  };

  const confirmSave = async () => {
    setShowSaveConfirm(false);
    await persistItem();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventory Item Details", 14, 16);
    const fields = Object.entries(itemData).filter(([key]) => typeof itemData[key] !== 'object');
    autoTable(doc, { startY: 20, head: [['Field', 'Value']], body: fields.map(([key, value]) => [key, value]) });
    doc.save(`${itemData.itemCode || 'inventory-item'}.pdf`);
  };

  const exportExcel = () => {
    const flattenedData = {
      itemCode: itemData.itemCode || '', name: itemData.name || '', hsnCode: itemData.hsnCode || '',
      uom: itemData.uom || 'NOS', itemType: itemData.itemType || 'RAW_MATERIAL',
      dimension: itemData.productSpecification?.dimension || '', size: itemData.productSpecification?.size || '',
      weight: itemData.productSpecification?.weight || '', basicMaterial: itemData.productSpecification?.basicMaterial || '',
      drawingNumber: itemData.productSpecification?.drawingNumber || '', processType: itemData.productSpecification?.processType || '',
      revision: itemData.revision || 1, remarks: itemData.remarks || '', leadTime: itemData.leadTime || '',
      reorderLevel: itemData.productInventorySettings?.reorderLevel || '', minStock: itemData.productInventorySettings?.minStock || '',
      maxStock: itemData.productInventorySettings?.maxStock || '', purchased: itemData.purchased ? 'true' : 'false',
      manufactured: itemData.manufactured ? 'true' : 'false', batchTracked: itemData.productInventorySettings?.batchTracked ? 'true' : 'false',
      serialTracked: itemData.productInventorySettings?.serialTracked ? 'true' : 'false', standardCost: itemData.standardCost || '',
      sellingPrice: itemData.productFinanceSettings?.sellingPrice || '', taxCategory: itemData.productFinanceSettings?.taxCategory || '',
      itemGroupCode: itemData.itemGroupCode || ''
    };
    const headers = {
      itemCode: 'Item Code', name: 'Product Name', hsnCode: 'HSN Code', uom: 'Unit of Measure',
      itemType: 'Item Type', dimension: 'Dimension', size: 'Size', weight: 'Weight',
      basicMaterial: 'Basic Material', drawingNumber: 'Drawing Number', processType: 'Process Type',
      revision: 'Revision', remarks: 'Remarks', leadTime: 'Lead Time (Days)', reorderLevel: 'Reorder Level',
      minStock: 'Min Stock', maxStock: 'Max Stock', purchased: 'Purchased', manufactured: 'Manufactured',
      batchTracked: 'Batch Tracked', serialTracked: 'Serial Tracked', standardCost: 'Standard Cost',
      sellingPrice: 'Selling Price', taxCategory: 'Tax Category', itemGroupCode: 'Item Group Code'
    };
    const wsData = [Object.values(headers), Object.values(flattenedData)];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 10 },
      { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ];
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } }
      };
    }
    for (let row = 1; row <= headerRange.e.r; row++) {
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
        ws[cellAddress].s = {
          alignment: { horizontal: "left", vertical: "center", wrapText: false },
          border: { top: { style: "thin", color: { rgb: "CCCCCC" } }, bottom: { style: "thin", color: { rgb: "CCCCCC" } }, left: { style: "thin", color: { rgb: "CCCCCC" } }, right: { style: "thin", color: { rgb: "CCCCCC" } } }
        };
      }
    }
    ws['!rows'] = [{ hpt: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Item");
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${itemData.itemCode || 'inventory-item'}_${timestamp}.xlsx`, { cellStyles: true });
  };


  /* ── BOM table header style ── */
  const bomHeaderSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.75rem',
    py: 1,
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          maxWidth: "100%",
          margin: "auto",
          borderRadius: 2,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {/* ── Header ── */}
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 0.5,
            pb: 1,
            minHeight: 'auto !important',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}
            >
              {isEditMode ? itemData.name : 'New Product'}
            </Typography>
            {isEditMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Rev. {itemData.revision} &middot; {itemData.itemCode}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={exportPDF}
              sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownload />}
              onClick={exportExcel}
              sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}
            >
              Excel
            </Button>
            <Button
              variant="contained"
              type="submit"
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                borderRadius: 1.5,
                bgcolor: '#1565c0',
                boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                '&:hover': { bgcolor: '#0d47a1' },
              }}
            >
              {isEditMode ? 'Update' : 'Save'}
            </Button>
          </Stack>
        </Toolbar>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2.5}>
          {/* ── Left: Main Content ── */}
          <Grid item xs={12} md={8}>
            <Tabs
              value={selectedTab}
              onChange={(e, v) => setSelectedTab(v)}
              sx={{
                mb: 2,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 40 },
                '& .Mui-selected': { color: '#1565c0' },
                '& .MuiTabs-indicator': { backgroundColor: '#1565c0', height: 2.5 },
              }}
            >
              <Tab label="Basic Info" />
              <Tab label="Inventory Settings" />
              <Tab label="Finance" />
              <Tab label="Manufacturing" />
              {isEditMode && <Tab label="Vendor Prices" />}
            </Tabs>

            {/* ── Tab 0: Basic Info ── */}
            {selectedTab === 0 && (
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={6} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField size="small" label="Item Code *" name="itemCode" value={itemData.itemCode} onChange={handleChange} fullWidth sx={fieldSx} disabled={isItemCodeAuto} />
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={isEditMode}
                      sx={{ fontSize: 12, textTransform: "none", height: 36, px: 1.5, borderRadius: 1.5, minWidth: 'auto', borderColor: isItemCodeAuto ? '#1565c0' : BORDER_COLOR, color: isItemCodeAuto ? '#1565c0' : '#6b7280' }}
                      onClick={() => { setIsItemCodeAuto(!isItemCodeAuto); setItemData(prev => ({ ...prev, itemCode: '' })); }}
                    >
                      Auto
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Item Name *" name="name" value={itemData.name} onChange={handleChange} fullWidth required sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="HSN Code" name="hsnCode" value={itemData.hsnCode} onChange={handleChange} fullWidth sx={fieldSx} />
                </Grid>

                <SectionHeading>Classification</SectionHeading>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13.5 }}>UOM</InputLabel>
                    <Select name="uom" value={itemData.uom} label="UOM" onChange={handleChange} sx={{ borderRadius: 1.5, fontSize: 13.5 }}>
                      {["NOS", "KG", "GRAM", "TON", "METER", "CENTIMETER", "INCH", "LITER", "SET"].map(u => (
                        <MenuItem key={u} value={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13.5 }}>Type</InputLabel>
                    <Select name="itemType" value={itemData.itemType} label="Type" onChange={handleChange} sx={{ borderRadius: 1.5, fontSize: 13.5 }}>
                      <MenuItem value="RAW_MATERIAL">Raw Material</MenuItem>
                      <MenuItem value="SEMI_FINISHED">Semi-Finished</MenuItem>
                      <MenuItem value="FINISHED_GOOD">Finished Good</MenuItem>
                      <MenuItem value="SUB_CONTRACTED">Sub-Contracted</MenuItem>
                      <MenuItem value="CONSUMABLE">Consumable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Group Code" fullWidth name="itemGroupCode" value={itemData.itemGroupCode} onChange={handleChange} sx={fieldSx} />
                </Grid>

                <SectionHeading>Specifications</SectionHeading>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Dimension" name="productSpecification.dimension" value={itemData.productSpecification?.dimension} onChange={handleChange} fullWidth sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Size" fullWidth name="productSpecification.size" value={itemData.productSpecification?.size} onChange={handleChange} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Weight (kg)" fullWidth name="productSpecification.weight" value={itemData.productSpecification?.weight} onChange={handleChange} sx={fieldSx} type='number' />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Basic Material" fullWidth name="productSpecification.basicMaterial" value={itemData.productSpecification?.basicMaterial} onChange={handleChange} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Drawing Number" fullWidth name="productSpecification.drawingNumber" value={itemData.productSpecification?.drawingNumber} onChange={handleChange} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Process Type" fullWidth name="productSpecification.processType" value={itemData.productSpecification?.processType} onChange={handleChange} sx={fieldSx} />
                </Grid>

                <SectionHeading>Description</SectionHeading>
                <Grid item xs={12}>
                  <TextField size="small" label="Description / Remarks" fullWidth multiline rows={2} name="remarks" value={itemData.remarks} onChange={handleChange} sx={fieldSx} />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 1: Inventory Settings ── */}
            {selectedTab === 1 && (
              <Grid container spacing={2}>
                <SectionHeading>Stock Settings</SectionHeading>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Lead Time (days)" fullWidth name="leadTime" value={itemData.leadTime} onChange={handleChange} sx={fieldSx} type='number' />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Reorder Level" fullWidth name="productInventorySettings.reorderLevel" value={itemData.productInventorySettings?.reorderLevel} onChange={handleChange} sx={fieldSx} type='number' />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Min Stock" fullWidth name="productInventorySettings.minStock" value={itemData.productInventorySettings?.minStock} onChange={handleChange} sx={fieldSx} type='number' />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Max Stock" fullWidth name="productInventorySettings.maxStock" value={itemData.productInventorySettings?.maxStock} onChange={handleChange} sx={fieldSx} type='number' />
                </Grid>

                <SectionHeading>Inventory Tracking</SectionHeading>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox checked={!!itemData.productInventorySettings?.batchTracked} onChange={handleChange} name="productInventorySettings.batchTracked" size="small" />}
                    label={<Typography variant="body2">Batch Tracking Enabled</Typography>}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox checked={itemData.productInventorySettings?.serialTracked} onChange={handleChange} name="productInventorySettings.serialTracked" size="small" />}
                    label={<Typography variant="body2">Serial Number Tracking</Typography>}
                  />
                </Grid>

                <SectionHeading>Inventory Source</SectionHeading>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={3}>
                    <FormControlLabel
                      control={<Checkbox checked={itemData.purchased} onChange={handleChange} name="purchased" size="small" />}
                      label={<Typography variant="body2">Purchased</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemData.manufactured} onChange={handleChange} name="manufactured" size="small" />}
                      label={<Typography variant="body2">Manufactured In-House</Typography>}
                    />
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* ── Tab 2: Finance ── */}
            {selectedTab === 2 && (
              <Grid container spacing={2}>
                <SectionHeading>Pricing & Costs</SectionHeading>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" type="number" label="Standard Cost (INR)" fullWidth name="standardCost" value={itemData.standardCost} onChange={handleChange} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" type="number" label="Selling Price (INR)" fullWidth name="productFinanceSettings.sellingPrice" value={itemData.productFinanceSettings?.sellingPrice} onChange={handleChange} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField size="small" label="Tax Category / GST" fullWidth name="productFinanceSettings.taxCategory" value={itemData.productFinanceSettings?.taxCategory} onChange={handleChange} sx={fieldSx} />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 3: Manufacturing ── */}
            {selectedTab === 3 && (
              <Grid container spacing={2}>
                {/* Active BOM */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                    Active BOM
                  </Typography>
                  {isBomLoading ? (
                    <Box display="flex" alignItems="center" gap={1} sx={{ py: 3 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">Loading BOM details...</Typography>
                    </Box>
                  ) : activeBom ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">BOM Name</Typography>
                          <Typography variant="body2" fontWeight={500}>{activeBom.bomName || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Revision</Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="body2" fontWeight={500}>{activeBom.revision ?? '-'}</Typography>
                            <Tooltip title="Open BOM">
                              <span>
                                <IconButton size="small" onClick={() => openNewTab(activeBom?.id ? `/bom/edit/${activeBom.id}` : null)} disabled={!activeBom?.id}>
                                  <OpenInNew sx={{ fontSize: 14 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Status</Typography>
                          <Box><Chip size="small" label={activeBom.bomStatus || 'ACTIVE'} color="success" variant="outlined" sx={{ mt: 0.25 }} /></Box>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Effective From</Typography>
                          <Typography variant="body2">{formatDate(activeBom.effectiveFrom)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Effective To</Typography>
                          <Typography variant="body2">{formatDate(activeBom.effectiveTo)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">BOM Code</Typography>
                          <Typography variant="body2">{activeBom.bomCode || activeBom.id || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ) : (
                    <Box sx={{ py: 3, textAlign: 'center', background: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                      <Typography variant="body2" color="text.secondary" mb={1.5}>No active BOM found for this item.</Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => navigate('/bom/add', { state: { inventoryItem: itemData, inventoryItemId: id } })}
                        sx={{ textTransform: 'none', borderRadius: 1.5 }}
                      >
                        Create BOM
                      </Button>
                    </Box>
                  )}
                </Grid>

                {/* BOM History */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                    BOM History
                  </Typography>
                  {bomHistory.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', background: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                      <Typography variant="body2" color="text.secondary">No BOM history available.</Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={bomHeaderSx}>BOM Name</TableCell>
                            <TableCell sx={bomHeaderSx}>Revision</TableCell>
                            <TableCell sx={bomHeaderSx}>Status</TableCell>
                            <TableCell sx={bomHeaderSx}>Effective From</TableCell>
                            <TableCell sx={bomHeaderSx}>Effective To</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bomHistory.map((bom, index) => (
                            <TableRow key={bom.id || `${bom.bomName || 'bom'}-${index}`} sx={{ '&:hover': { bgcolor: '#f0f4f8' }, '& td': { fontSize: '0.8125rem', py: 0.75 } }}>
                              <TableCell>{bom.bomName || '-'}</TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Typography variant="body2">{bom.revision ?? '-'}</Typography>
                                  <Tooltip title="Open BOM">
                                    <span>
                                      <IconButton size="small" onClick={() => openNewTab(bom?.id ? `/bom/edit/${bom.id}` : null)} disabled={!bom?.id}>
                                        <OpenInNew sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={bom.bomStatus || '-'} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell>{formatDate(bom.effectiveFrom)}</TableCell>
                              <TableCell>{formatDate(bom.effectiveTo)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Grid>

                {/* Where Used (Reverse BOM) */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>
                    Where Used
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    BOMs that consume this item as a component
                  </Typography>
                  {whereUsedList.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', background: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                      <Typography variant="body2" color="text.secondary">This item is not used in any BOM.</Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={bomHeaderSx}>Parent BOM</TableCell>
                            <TableCell sx={bomHeaderSx}>Parent Item</TableCell>
                            <TableCell sx={bomHeaderSx}>Item Code</TableCell>
                            <TableCell sx={bomHeaderSx}>Qty Used</TableCell>
                            <TableCell sx={bomHeaderSx}>Status</TableCell>
                            <TableCell sx={bomHeaderSx}>Rev</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {whereUsedList.map((wu, index) => (
                            <TableRow key={wu.bomId || wu.id || index} sx={{ '&:hover': { bgcolor: '#f0f4f8' }, '& td': { fontSize: '0.8125rem', py: 0.75 } }}>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1565c0' }}>
                                    {wu.bomName || wu.parentBomName || '-'}
                                  </Typography>
                                  <Tooltip title="Open BOM">
                                    <span>
                                      <IconButton size="small" onClick={() => openNewTab((wu.bomId || wu.id) ? `/bom/edit/${wu.bomId || wu.id}` : null)} disabled={!(wu.bomId || wu.id)}>
                                        <OpenInNew sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                              <TableCell>{wu.parentItemName || wu.parentInventoryItemName || '-'}</TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>{wu.parentItemCode || wu.parentInventoryItemCode || '-'}</TableCell>
                              <TableCell>{wu.quantity ?? '-'}</TableCell>
                              <TableCell>
                                <Chip size="small" label={wu.bomStatus || '-'} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell>{wu.revision ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Grid>

                {/* QC Test Templates */}
                {isEditMode && (
                  <Grid item xs={12}>
                    <TestTemplateSection
                      itemId={id}
                      setError={(msg) => showSnackbar(msg, 'error')}
                      setSnackbar={showSnackbar}
                    />
                  </Grid>
                )}
              </Grid>
            )}

            {/* ── Tab 4: Vendor Prices ── */}
            {selectedTab === 4 && isEditMode && (
              <VendorPricesTab itemId={id} setSnackbar={showSnackbar} />
            )}
          </Grid>

          {/* ── Right: Attachments Panel ── */}
          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1.5,
                borderColor: BORDER_COLOR,
                bgcolor: '#fafbfc',
                position: { md: 'sticky' },
                top: { md: 80 },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                Product Images
              </Typography>
              <ImageUploadBox handleChange={handleChange} images={images} setImages={setImages} />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                Technical Documents
              </Typography>
              <PDFUploadBox handleChange={handleChange} pdfFiles={pdfFiles} setPdfFiles={setPdfFiles} />
            </Paper>
          </Grid>
        </Grid>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Dialog
          open={showSaveConfirm}
          onClose={() => setShowSaveConfirm(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>
            {isEditMode ? 'Confirm Product Update' : 'Confirm Product Save'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {isEditMode
                ? 'This will update the item master record. Continue?'
                : 'This will create a new item in the product master. Continue?'}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowSaveConfirm(false)} sx={{ textTransform: 'none', color: '#374151' }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={confirmSave}
              sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
              Confirm Save
            </Button>
          </DialogActions>
        </Dialog>

      </Paper>
    </Box>
  );
}
