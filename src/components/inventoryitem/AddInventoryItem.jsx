import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Divider, Paper, IconButton, Stack,
  Checkbox, FormControlLabel, Tabs, Tab,
  Toolbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, InputAdornment, createFilterOptions, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  PictureAsPdf, PictureAsPdf as PdfIcon, FileDownload, OpenInNew, Sync, InfoOutlined,
  Lock as LockIcon, CloudUpload, AddPhotoAlternate, Delete, InsertDriveFile, ContentCopy
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService from '../../services/apiService';
import { getActiveBomByItemid, getBomHistoryByInventoryItem, getWhereUsedByItemId, getBomCostBreakdown } from '../../services/bomService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import TestTemplateSection from './TestTemplateSection';
import VendorPricesTab from './VendorPricesTab';
import ItemCodeSeriesPickerDialog from './ItemCodeSeriesPickerDialog';
import { useAuth } from '../../auth/AuthContext';
import {
  INVENTORY_ITEM_APPROVAL_ROLES,
  INVENTORY_MANAGE_ROLES,
  PRODUCTION_ACCESS_ROLES,
  hasAnyRole,
} from '../../auth/roles';
import {
  createInventoryItemWithFiles,
  getInventoryItem,
  updateInventoryItemWithFiles,
} from '../../services/inventoryService';

/* ── Theme ─────────────────────────────────────────────────────────────────── */
const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';

/* ── Indian GST slabs ───────────────────────────────────────────────────────── */
const GST_SLABS = [
  { value: '0',  label: '0% — Exempt / Nil rated' },
  { value: '3',  label: '3% — Gold, Silver & precious metals' },
  { value: '5',  label: '5% — Essential goods & services' },
  { value: '12', label: '12% — Standard goods' },
  { value: '18', label: '18% — Standard services & goods' },
  { value: '28', label: '28% — Luxury & sin goods' },
];

/* ── UOM options ────────────────────────────────────────────────────────────── */
const UOM_OPTIONS = ['NOS', 'KG', 'GRAM', 'TON', 'METER', 'CENTIMETER', 'INCH', 'LITER', 'SET'];

/* ── Autocomplete filter that allows "add new" option ───────────────────────── */
const autoFilter = createFilterOptions();

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
      <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
        sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </Typography>
    </Box>
  </Grid>
);

const fieldSx = {
  '& .MuiInputBase-input': { fontSize: 13.5 },
  '& .MuiInputLabel-root': { fontSize: 13.5 },
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
  },
};

const RestrictedTabPlaceholder = ({ reason }) => (
  <Box sx={{ py: 6, textAlign: 'center' }}>
    <LockIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1.5 }} />
    <Typography variant="body2" color="text.secondary">{reason}</Typography>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function AddInventoryItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  /* ── Role gates ── */
  const canWrite        = hasAnyRole(user?.roles, INVENTORY_MANAGE_ROLES);
  const isFinanceAdmin  = hasAnyRole(user?.roles, INVENTORY_ITEM_APPROVAL_ROLES);
  const canViewMfg      = hasAnyRole(user?.roles, [...INVENTORY_ITEM_APPROVAL_ROLES, ...PRODUCTION_ACCESS_ROLES]);
  const canExport       = isFinanceAdmin;

  /* ── Core state ── */
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [images, setImages] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [savedItem, setSavedItem] = useState(null); // { itemCode, name } for success dialog

  /* ── Item code series ── */
  const [isItemCodeAuto, setIsItemCodeAuto] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null); // { seriesId, seriesLabel }

  /* ── Lookup data ── */
  const [materialOptions, setMaterialOptions] = useState([]);
  const [processTypeOptions, setProcessTypeOptions] = useState([]);

  /* ── Manufacturing data ── */
  const [activeBom, setActiveBom] = useState(null);
  const [bomHistory, setBomHistory] = useState([]);
  const [whereUsedList, setWhereUsedList] = useState([]);
  const [isBomLoading, setIsBomLoading] = useState(false);

  /* ── Attachment refs ── */
  const hydratingRef = useRef(false);
  const hydrationDoneRef = useRef(false);
  const imagesInitRef = useRef(false);
  const pdfInitRef = useRef(false);

  /* ── Form data ── */
  const [itemData, setItemData] = useState({
    itemCode: '',
    name: '',
    hsnCode: '',
    uom: 'NOS',
    itemType: 'RAW_MATERIAL',
    revision: 1,
    remarks: '',
    itemGroupCode: '',
    purchased: false,
    manufactured: false,
    standardCost: '',
    leadTime: '',
    productSpecification: {
      dimension: '', size: '', weight: '', basicMaterial: '', processType: '', drawingNumber: ''
    },
    productInventorySettings: {
      leadTime: '', reorderLevel: '', minStock: '', maxStock: '',
      purchased: false, manufactured: false, batchTracked: false, serialTracked: false
    },
    productFinanceSettings: { standardCost: '', sellingPrice: '', taxCategory: '', gstRate: '' },
    fileAttachments: [],
    attachments: [],
    pdfAttachments: [],
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });

  /* ── Computed finance values ── */
  const standardCostVal = parseFloat(itemData.productFinanceSettings?.standardCost || itemData.standardCost) || 0;
  const sellingPriceVal = parseFloat(itemData.productFinanceSettings?.sellingPrice) || 0;
  const marginPct = sellingPriceVal > 0
    ? ((sellingPriceVal - standardCostVal) / sellingPriceVal * 100).toFixed(1)
    : null;
  const marginColor = marginPct === null ? '#9ca3af' : parseFloat(marginPct) >= 20 ? '#10b981' : parseFloat(marginPct) >= 5 ? '#f59e0b' : '#ef4444';

  /* ── Tab definitions ── */
  const tabs = [
    { key: 'basic',     label: 'Basic Info',          show: true },
    { key: 'inventory', label: 'Inventory Settings',  show: true },
    { key: 'finance',   label: 'Finance',             show: true },
    { key: 'mfg',       label: 'Manufacturing',       show: true },
    { key: 'docs',      label: 'Documents',           show: true },
    { key: 'vendors',   label: 'Vendor Prices',       show: isEditMode },
  ].filter(t => t.show);

  /* ── Load lookups once ── */
  useEffect(() => {
    apiService.get('/item-lookups/materials').then(d => setMaterialOptions((d || []).map(m => m.name))).catch(() => {});
    apiService.get('/item-lookups/process-types').then(d => setProcessTypeOptions((d || []).map(p => p.name))).catch(() => {});
  }, []);

  /* ── Load item (edit mode) ── */
  const fetchItem = useCallback(async () => {
    try {
      const data = await getInventoryItem(id);
      setItemData(prev => ({
        ...prev, ...data,
        leadTime: data?.leadTime ?? data?.productInventorySettings?.leadTime ?? '',
        purchased: data?.purchased ?? data?.productInventorySettings?.purchased ?? false,
        manufactured: data?.manufactured ?? data?.productInventorySettings?.manufactured ?? false,
        standardCost: data?.standardCost ?? data?.productFinanceSettings?.standardCost ?? '',
      }));
      setIsEditMode(true);
      setIsDirty(false);
    } catch {
      showSnackbar('Failed to fetch item', 'error');
    }
  }, [id]);

  useEffect(() => { if (id) fetchItem(); }, [id, fetchItem]);

  /* ── Hydrate from duplicate ── */
  useEffect(() => {
    const dup = location.state?.duplicateFrom;
    if (!dup || id) return;

    // Reset all state for a fresh "add" form
    setIsEditMode(false);
    setSelectedTab(0);
    setIsItemCodeAuto(false);
    setSelectedSeries(null);
    setImages([]);
    setPdfFiles([]);
    setActiveBom(null);
    setBomHistory([]);
    setWhereUsedList([]);
    setSavedItem(null);
    hydratingRef.current = false;
    hydrationDoneRef.current = false;
    imagesInitRef.current = false;
    pdfInitRef.current = false;

    setItemData({
      itemCode: '',
      inventoryItemId: undefined,
      name: dup.name || '',
      hsnCode: dup.hsnCode || '',
      uom: dup.uom || 'NOS',
      itemType: dup.itemType || 'RAW_MATERIAL',
      revision: 1,
      remarks: dup.remarks || '',
      itemGroupCode: dup.itemGroupCode || '',
      purchased: dup.purchased ?? false,
      manufactured: dup.manufactured ?? false,
      standardCost: dup.standardCost || '',
      leadTime: dup.leadTime || '',
      productSpecification: (({ id, ...rest }) => rest)(dup.productSpecification || { dimension: '', size: '', weight: '', basicMaterial: '', processType: '', drawingNumber: '' }),
      productInventorySettings: (({ id, ...rest }) => rest)(dup.productInventorySettings || { leadTime: '', reorderLevel: '', minStock: '', maxStock: '', purchased: false, manufactured: false, batchTracked: false, serialTracked: false }),
      productFinanceSettings: (({ id, ...rest }) => rest)(dup.productFinanceSettings || { standardCost: '', sellingPrice: '', taxCategory: '', gstRate: '' }),
      fileAttachments: [],
      attachments: [],
      pdfAttachments: [],
    });

    setIsDirty(true);
    window.history.replaceState({}, '');
  }, [id, location.state]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load BOM / manufacturing data ── */
  const fetchMfgData = useCallback(async () => {
    if (!id) return;
    setIsBomLoading(true);
    try {
      const [bomRes, histRes, whereRes] = await Promise.all([
        getActiveBomByItemid(id),
        getBomHistoryByInventoryItem(id),
        getWhereUsedByItemId(id).catch(() => []),
      ]);
      setActiveBom(bomRes?.bom || bomRes || null);
      setBomHistory(extractArray(histRes));
      setWhereUsedList(extractArray(whereRes));
    } catch {
      setActiveBom(null); setBomHistory([]); setWhereUsedList([]);
    } finally {
      setIsBomLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchMfgData(); }, [id, fetchMfgData]);

  /* ── Attachment sync effects ── */
  useEffect(() => {
    if (hydratingRef.current) return;
    setItemData(prev => {
      const newAtts = images.filter(img => img && !img.presignedUrl);
      const existing = images.filter(img => img?.presignedUrl);
      const kept = (prev.fileAttachments || []).filter(fa =>
        existing.some(e => e.presignedUrl === fa.presignedUrl) ||
        fa.contentType?.includes('pdf') || fa.originalName?.match(/\.pdf$/i)
      );
      existing.forEach(e => { if (!kept.some(f => f.presignedUrl === e.presignedUrl)) kept.push(e); });
      return { ...prev, attachments: newAtts, fileAttachments: kept };
    });
    if (!imagesInitRef.current) { imagesInitRef.current = true; return; }
    if (!hydratingRef.current) setIsDirty(true);
  }, [images]);

  useEffect(() => {
    if (hydratingRef.current) return;
    setItemData(prev => {
      if (!pdfFiles) return prev;
      const newPdfs = pdfFiles.filter(p => p && !p.presignedUrl);
      const existing = pdfFiles.filter(p => p?.presignedUrl);
      const kept = (prev.fileAttachments || []).filter(fa =>
        existing.some(e => e.presignedUrl === fa.presignedUrl) ||
        fa.contentType?.includes('image') || fa.originalName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
      );
      existing.forEach(e => { if (!kept.some(f => f.presignedUrl === e.presignedUrl)) kept.push(e); });
      return { ...prev, attachments: [...(prev.attachments || []), ...newPdfs], fileAttachments: kept };
    });
    if (!pdfInitRef.current) { pdfInitRef.current = true; return; }
    if (!hydratingRef.current) setIsDirty(true);
  }, [pdfFiles]);

  useEffect(() => {
    // Only hydrate once from server data on initial edit-mode load.
    // Skip subsequent runs caused by the images/pdfs sync effects updating fileAttachments.
    if (hydrationDoneRef.current) return;
    if (!isEditMode) return;
    if (!itemData?.fileAttachments) return;
    hydrationDoneRef.current = true;
    hydratingRef.current = true;
    if (itemData.fileAttachments.length > 0) {
      const imgs = [], pdfs = [];
      itemData.fileAttachments.forEach(fa => {
        const obj = { ...fa, preview: fa.presignedUrl, url: fa.presignedUrl };
        if (fa.contentType?.includes('image') || fa.originalName?.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) imgs.push(obj);
        else if (fa.contentType?.includes('pdf') || fa.originalName?.match(/\.pdf$/i)) pdfs.push(obj);
      });
      setImages(imgs);
      setPdfFiles(pdfs);
    }
    setTimeout(() => { hydratingRef.current = false; }, 0);
  }, [isEditMode, itemData?.fileAttachments]);

  /* ── Unsaved-changes guard ── */
  useEffect(() => {
    const handler = (e) => { if (!isDirty) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ── Change handlers ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    setIsDirty(true);
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setItemData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: v } }));
    } else {
      setItemData(prev => ({ ...prev, [name]: v }));
    }
  };

  const handleAutocompleteChange = (parentKey, childKey, value) => {
    setIsDirty(true);
    if (parentKey) {
      setItemData(prev => ({ ...prev, [parentKey]: { ...prev[parentKey], [childKey]: value || '' } }));
    } else {
      setItemData(prev => ({ ...prev, [childKey]: value || '' }));
    }
  };

  /* ── Create-new lookup value (material / process type) ── */
  const createLookupValue = async (endpoint, name, setter) => {
    try {
      const res = await apiService.post(endpoint, { name });
      setter(prev => [...prev, res.name]);
      return res.name;
    } catch {
      showSnackbar('Failed to add new value', 'error');
      return name;
    }
  };

  /* ── Standard cost sync ──────────────────────────────────────────────────────
     Priority: if manufactured (or both) → pull totalCost from active BOM.
     Purchased-only → pull from preferred vendor price.
     This mirrors real OEM logic: in-house is always preferred over buy cost.
  ─────────────────────────────────────────────────────────────────────────── */
  const syncStandardCost = async () => {
    if (!id) return;
    try {
      if (itemData.manufactured) {
        // Fetch the active BOM for this item
        const bomRes = await getActiveBomByItemid(id);
        const bom = bomRes?.bom || bomRes;
        if (!bom?.id) {
          showSnackbar('No active BOM found — create a BOM first to calculate manufacturing cost', 'warning');
          return;
        }
        const breakdown = await getBomCostBreakdown(bom.id);
        const cost = breakdown?.totalCost;
        if (cost == null) {
          showSnackbar('BOM cost is zero — ensure material costs and operation rates are set', 'warning');
          return;
        }
        setItemData(prev => ({
          ...prev,
          standardCost: cost,
          productFinanceSettings: { ...prev.productFinanceSettings, standardCost: cost }
        }));
        showSnackbar(`Standard cost synced from BOM "${bom.bomName}" — ₹${Number(cost).toFixed(2)}`, 'success');
        setIsDirty(true);
      } else if (itemData.purchased) {
        const prices = await apiService.get(`/items/${id}/vendor-prices`);
        const preferred = (prices || []).find(p => p.isPreferredVendor && p.priceType === 'PURCHASE')
          || (prices || []).find(p => p.priceType === 'PURCHASE');
        if (preferred) {
          setItemData(prev => ({
            ...prev,
            standardCost: preferred.pricePerUnit,
            productFinanceSettings: { ...prev.productFinanceSettings, standardCost: preferred.pricePerUnit }
          }));
          showSnackbar(`Standard cost synced from vendor "${preferred.vendorName}" — ₹${preferred.pricePerUnit}`, 'success');
          setIsDirty(true);
        } else {
          showSnackbar('No vendor price found — add a vendor price first', 'warning');
        }
      } else {
        showSnackbar('Set Inventory Source (Purchased / Manufactured) before syncing', 'info');
      }
    } catch {
      showSnackbar('Failed to sync standard cost', 'error');
    }
  };

  /* ── Series picker ── */
  const handleSeriesSelect = ({ seriesId, seriesLabel }) => {
    setSelectedSeries({ seriesId, seriesLabel });
    setIsItemCodeAuto(true);
    // Keep itemCode empty so backend generates from series
    setItemData(prev => ({ ...prev, seriesId, itemCode: '' }));
    setIsDirty(true);

    console.log(selectedSeries);
    console.log(isItemCodeAuto)
  };

  const toggleAutoCode = () => {
    if (!isItemCodeAuto) {
      setSeriesDialogOpen(true);
    } else {
      setIsItemCodeAuto(false);
      setSelectedSeries(null);
      setItemData(prev => ({ ...prev, itemCode: '', seriesId: null }));
    }
  };

  /* ── Submit / save ── */
  const handleSubmit = (e) => { e?.preventDefault?.(); setShowSaveConfirm(true); };

  const persistItem = async () => {
    const payload = {
      ...itemData,
      leadTime: itemData.leadTime,
      purchased: itemData.purchased,
      manufactured: itemData.manufactured,
      standardCost: itemData.standardCost === '' ? null : itemData.standardCost,
      seriesId: selectedSeries?.seriesId ?? itemData.seriesId ?? null,
      productInventorySettings: {
        ...(itemData.productInventorySettings || {}),
        leadTime: itemData.leadTime,
        purchased: itemData.purchased,
        manufactured: itemData.manufactured,
      },
      productFinanceSettings: {
        ...(itemData.productFinanceSettings || {}),
        standardCost: itemData.standardCost === '' ? null : itemData.standardCost,
      },
    };
    // On auto code: clear itemCode so backend generates from series
    if (isItemCodeAuto && selectedSeries) {
      payload.itemCode = '';
    }
    const newFiles = [
      ...images.filter(img => img?.file && !img?.presignedUrl),
      ...pdfFiles.filter(p => p?.file && !p?.presignedUrl),
    ];
    try {
      let response;
      if (isEditMode) {
        response = await updateInventoryItemWithFiles(id, payload, newFiles);
        showSnackbar('Item updated successfully');
        setIsDirty(false);
        setTimeout(() => navigate('/inventory-item'), 1200);
      } else {
        response = await createInventoryItemWithFiles(payload, newFiles);
        // Show success dialog with created item details
        setSavedItem({ itemCode: response.itemCode, name: response.name });
        setIsDirty(false);
      }
    } catch {
      showSnackbar('Error saving item', 'error');
    }
  };

  const confirmSave = async () => { setShowSaveConfirm(false); await persistItem(); };

  /* ── Export ── */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Inventory Item Details', 14, 16);
    const fields = Object.entries(itemData).filter(([, v]) => typeof v !== 'object');
    autoTable(doc, { startY: 20, head: [['Field', 'Value']], body: fields.map(([k, v]) => [k, v]) });
    doc.save(`${itemData.itemCode || 'inventory-item'}.pdf`);
  };

  const exportExcel = () => {
    const row = {
      itemCode: itemData.itemCode || '', name: itemData.name || '',
      hsnCode: itemData.hsnCode || '', uom: itemData.uom || '',
      itemType: itemData.itemType || '', dimension: itemData.productSpecification?.dimension || '',
      basicMaterial: itemData.productSpecification?.basicMaterial || '',
      processType: itemData.productSpecification?.processType || '',
      drawingNumber: itemData.productSpecification?.drawingNumber || '',
      standardCost: itemData.productFinanceSettings?.standardCost || '',
      sellingPrice: itemData.productFinanceSettings?.sellingPrice || '',
      taxCategory: itemData.productFinanceSettings?.taxCategory || '',
    };
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([Object.keys(row), Object.values(row)]);
    XLSX.utils.book_append_sheet(wb, ws, 'Item');
    XLSX.writeFile(wb, `${itemData.itemCode || 'item'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /* ── BOM table header style ── */
  const bomHeaderSx = { background: HEADER_BG, color: '#e8edf3', fontWeight: 600, fontSize: '0.75rem', py: 1, whiteSpace: 'nowrap' };

  const openNewTab = (path) => { if (path) window.open(path, '_blank', 'noopener,noreferrer'); };
  const formatDate = (d) => { if (!d) return '-'; const dt = new Date(d); return isNaN(dt) ? '-' : dt.toLocaleDateString('en-GB'); };

  /* ── Active tab key ── */
  const activeKey = tabs[selectedTab]?.key;

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: '100%' }}>
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>

        {/* ── Header ── */}
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, pb: 1, minHeight: 'auto !important', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
              {isEditMode ? itemData.name : 'New Product'}
            </Typography>
            {isEditMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Rev. {itemData.revision} &middot; {itemData.itemCode}
                {itemData.purchased && !itemData.manufactured && <Chip label="Purchased" size="small" sx={{ ml: 1, bgcolor: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', height: 18 }} />}
                {itemData.manufactured && !itemData.purchased && <Chip label="Manufactured" size="small" sx={{ ml: 1, bgcolor: '#dcfce7', color: '#166534', fontSize: '0.65rem', height: 18 }} />}
                {itemData.purchased && itemData.manufactured && <Chip label="Purchased + Manufactured" size="small" sx={{ ml: 1, bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.65rem', height: 18 }} />}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {isEditMode && canWrite && (
              <Button variant="outlined" size="small" startIcon={<ContentCopy />}
                onClick={() => setShowDuplicateConfirm(true)}
                sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}>
                Duplicate
              </Button>
            )}
            {canExport && (
              <>
                <Button variant="outlined" size="small" startIcon={<PictureAsPdf />} onClick={exportPDF}
                  sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}>PDF</Button>
                <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={exportExcel}
                  sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}>Excel</Button>
              </>
            )}
            {canWrite && (
              <Button variant="contained" type="submit" size="small"
                sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 1.5, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            )}
          </Stack>
        </Toolbar>

        <Divider sx={{ mb: 2 }} />

        {/* ── Tabs ── */}
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 40 },
            '& .Mui-selected': { color: '#1565c0' },
            '& .MuiTabs-indicator': { backgroundColor: '#1565c0', height: 2.5 },
          }}
        >
          {tabs.map(t => <Tab key={t.key} label={t.label} />)}
        </Tabs>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 0 — BASIC INFO
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'basic' && (
          <Grid container spacing={2} alignItems="flex-start">
            <SectionHeading>Identity</SectionHeading>

            {/* Item Code */}
            <Grid item xs={12} sm={6} md={4}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                {isItemCodeAuto && selectedSeries ? (
                  <Box display="flex" flexDirection="column" gap={0.5} width="100%">
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Item Code *</Typography>
                    <Chip
                      label={`${selectedSeries.seriesLabel} (Auto)`}
                      color="primary"
                      variant="outlined"
                      sx={{ width: 'fit-content', fontWeight: 600 }}
                    />
                  </Box>
                ) : (
                  <TextField
                    size="small" label="Item Code *" name="itemCode"
                    value={itemData.itemCode}
                    onChange={handleChange} fullWidth sx={fieldSx}
                    disabled={isEditMode}
                    helperText="Leave blank for legacy auto-gen or select a series"
                  />
                )}
                {!isEditMode && (
                  <Button
                    variant={isItemCodeAuto ? 'contained' : 'outlined'}
                    size="small"
                    onClick={toggleAutoCode}
                    sx={{ fontSize: 12, textTransform: 'none', height: 36, px: 1.5, borderRadius: 1.5, minWidth: 60,
                      ...(isItemCodeAuto ? { bgcolor: '#1565c0' } : { borderColor: BORDER_COLOR, color: '#6b7280' }) }}
                  >
                    Auto
                  </Button>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={5}>
              <TextField size="small" label="Item Name *" name="name" value={itemData.name}
                onChange={handleChange} fullWidth required sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="HSN Code" name="hsnCode" value={itemData.hsnCode}
                onChange={handleChange} fullWidth sx={fieldSx}
                helperText="4 or 8-digit HSN for GST" />
            </Grid>

            <SectionHeading>Classification</SectionHeading>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: 13.5 }}>Unit of Measure</InputLabel>
                <Select name="uom" value={itemData.uom} label="Unit of Measure" onChange={handleChange} sx={{ borderRadius: 1.5, fontSize: 13.5 }}>
                  {UOM_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: 13.5 }}>Item Type</InputLabel>
                <Select name="itemType" value={itemData.itemType} label="Item Type" onChange={handleChange} sx={{ borderRadius: 1.5, fontSize: 13.5 }}>
                  <MenuItem value="RAW_MATERIAL">Raw Material</MenuItem>
                  <MenuItem value="SEMI_FINISHED">Semi-Finished</MenuItem>
                  <MenuItem value="FINISHED_GOOD">Finished Good</MenuItem>
                  <MenuItem value="SUB_CONTRACTED">Sub-Contracted</MenuItem>
                  <MenuItem value="CONSUMABLE">Consumable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Group Code" name="itemGroupCode"
                value={itemData.itemGroupCode} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Revision" name="revision" type="number"
                value={itemData.revision} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>

            <SectionHeading>Specifications</SectionHeading>
            <Grid item xs={12} sm={6} md={4}>
              <TextField size="small" label="Dimension" name="productSpecification.dimension"
                value={itemData.productSpecification?.dimension} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField size="small" label="Size" name="productSpecification.size"
                value={itemData.productSpecification?.size} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField size="small" label="Weight (kg)" name="productSpecification.weight" type="number"
                value={itemData.productSpecification?.weight} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>

            {/* Material — creatable autocomplete */}
            <Grid item xs={12} sm={6} md={4}>
              <Autocomplete
                freeSolo
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
                options={materialOptions}
                value={itemData.productSpecification?.basicMaterial || ''}
                filterOptions={(opts, params) => {
                  const filtered = autoFilter(opts, params);
                  if (params.inputValue && !opts.includes(params.inputValue)) {
                    filtered.push(`Add "${params.inputValue}"`);
                  }
                  return filtered;
                }}
                onChange={async (_, val) => {
                  let finalVal = val || '';
                  if (val && val.startsWith('Add "')) {
                    const raw = val.slice(5, -1);
                    finalVal = await createLookupValue('/item-lookups/materials', raw, setMaterialOptions);
                  }
                  handleAutocompleteChange('productSpecification', 'basicMaterial', finalVal);
                }}
                onInputChange={(_, val) => handleAutocompleteChange('productSpecification', 'basicMaterial', val)}
                renderInput={params => (
                  <TextField {...params} size="small" label="Material" sx={fieldSx}
                    helperText="Select or type to add new" />
                )}
              />
            </Grid>

            {/* Process Type — creatable autocomplete */}
            <Grid item xs={12} sm={6} md={4}>
              <Autocomplete
                freeSolo
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
                options={processTypeOptions}
                value={itemData.productSpecification?.processType || ''}
                filterOptions={(opts, params) => {
                  const filtered = autoFilter(opts, params);
                  if (params.inputValue && !opts.includes(params.inputValue)) {
                    filtered.push(`Add "${params.inputValue}"`);
                  }
                  return filtered;
                }}
                onChange={async (_, val) => {
                  let finalVal = val || '';
                  if (val && val.startsWith('Add "')) {
                    const raw = val.slice(5, -1);
                    finalVal = await createLookupValue('/item-lookups/process-types', raw, setProcessTypeOptions);
                  }
                  handleAutocompleteChange('productSpecification', 'processType', finalVal);
                }}
                onInputChange={(_, val) => handleAutocompleteChange('productSpecification', 'processType', val)}
                renderInput={params => (
                  <TextField {...params} size="small" label="Fabrication Process" sx={fieldSx}
                    helperText="e.g. CNC Machining, Welding, Casting" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField size="small" label="Drawing Number" name="productSpecification.drawingNumber"
                value={itemData.productSpecification?.drawingNumber} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>

            <SectionHeading>Description</SectionHeading>
            <Grid item xs={12}>
              <TextField size="small" label="Description / Remarks" name="remarks" fullWidth multiline rows={2}
                value={itemData.remarks} onChange={handleChange} sx={fieldSx} />
            </Grid>
          </Grid>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — INVENTORY SETTINGS
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'inventory' && (
          <Grid container spacing={2}>
            <SectionHeading>Inventory Source</SectionHeading>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={4}>
                <FormControlLabel
                  control={<Checkbox checked={itemData.purchased} onChange={handleChange} name="purchased" size="small" />}
                  label={<Typography variant="body2">Purchased (buy from vendors)</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={itemData.manufactured} onChange={handleChange} name="manufactured" size="small" />}
                  label={<Typography variant="body2">Manufactured In-House</Typography>}
                />
              </Box>
              {itemData.purchased && !itemData.manufactured && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem', py: 0.5 }}>
                  Purchased items can be added to BOMs for sub-contracting but will not be available in Work Orders for in-house manufacturing.
                </Alert>
              )}
            </Grid>

            <SectionHeading>Stock Levels</SectionHeading>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Lead Time (days)" name="leadTime" type="number"
                value={itemData.leadTime} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Reorder Level" name="productInventorySettings.reorderLevel" type="number"
                value={itemData.productInventorySettings?.reorderLevel} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Min Stock" name="productInventorySettings.minStock" type="number"
                value={itemData.productInventorySettings?.minStock} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" label="Max Stock" name="productInventorySettings.maxStock" type="number"
                value={itemData.productInventorySettings?.maxStock} onChange={handleChange} fullWidth sx={fieldSx} />
            </Grid>

            <SectionHeading>Tracking</SectionHeading>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!itemData.productInventorySettings?.batchTracked}
                  onChange={handleChange} name="productInventorySettings.batchTracked" size="small" />}
                label={<Typography variant="body2">Batch Tracking Enabled</Typography>}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Group inventory by batch/lot number for traceability.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={!!itemData.productInventorySettings?.serialTracked}
                  onChange={handleChange} name="productInventorySettings.serialTracked" size="small" />}
                label={<Typography variant="body2">Serial Number Tracking</Typography>}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Track individual units by unique serial number.
              </Typography>
            </Grid>
          </Grid>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — FINANCE  (restricted)
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'finance' && (
          isFinanceAdmin ? (
            <Grid container spacing={2}>
              <SectionHeading>Costing</SectionHeading>

              {/* Standard Cost */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small" type="number" label="Standard Cost (₹)" fullWidth
                  name="standardCost" value={itemData.standardCost} onChange={handleChange} sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    endAdornment: isEditMode && (itemData.purchased || itemData.manufactured) ? (
                      <InputAdornment position="end">
                        <Tooltip title={itemData.manufactured ? 'Sync from active BOM total cost' : 'Sync from preferred vendor price'}>
                          <IconButton size="small" onClick={syncStandardCost}><Sync fontSize="small" /></IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ) : null,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {itemData.manufactured ? '↑ Syncs from active BOM total cost (materials + operations).' : itemData.purchased ? '↑ Syncs from preferred vendor purchase price.' : ''}
                </Typography>
              </Grid>

              {/* Selling Price + Margin */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small" type="number" label="Selling Price (₹)" fullWidth
                  name="productFinanceSettings.sellingPrice"
                  value={itemData.productFinanceSettings?.sellingPrice} onChange={handleChange} sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />
                {marginPct !== null && (
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <Typography variant="caption" sx={{ color: marginColor, fontWeight: 600 }}>
                      Margin: {marginPct}%
                    </Typography>
                    <Tooltip title="Gross margin = (Selling − Standard Cost) ÷ Selling × 100">
                      <InfoOutlined sx={{ fontSize: 13, color: '#9ca3af' }} />
                    </Tooltip>
                  </Box>
                )}
              </Grid>

              {/* GST Slab / Tax Category */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 13.5 }}>Tax Category (GST Slab)</InputLabel>
                  <Select
                    name="productFinanceSettings.taxCategory"
                    value={itemData.productFinanceSettings?.taxCategory || ''}
                    label="Tax Category (GST Slab)"
                    onChange={(e) => {
                      const slab = e.target.value;
                      setIsDirty(true);
                      setItemData(prev => ({
                        ...prev,
                        productFinanceSettings: {
                          ...prev.productFinanceSettings,
                          taxCategory: slab,
                          ...(slab !== '' && { gstRate: slab }),
                        },
                      }));
                    }}
                    sx={{ borderRadius: 1.5, fontSize: 13.5 }}
                  >
                    <MenuItem value=""><em>— Not Set —</em></MenuItem>
                    {GST_SLABS.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* GST Rate % (numeric, precise override) */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small" type="number" label="GST Rate %" fullWidth
                  name="productFinanceSettings.gstRate"
                  value={itemData.productFinanceSettings?.gstRate ?? ''}
                  onChange={handleChange}
                  sx={fieldSx}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Auto-filled from slab; edit for custom rates"
                />
              </Grid>
            </Grid>
          ) : (
            <RestrictedTabPlaceholder reason="Finance data is restricted to Inventory Admins and Managers." />
          )
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — MANUFACTURING  (restricted)
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'mfg' && (
          canViewMfg ? (
            <Grid container spacing={2}>
              {/* Active BOM */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                  sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>Active BOM</Typography>
                {isBomLoading ? (
                  <Box display="flex" alignItems="center" gap={1} py={3}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Loading BOM details...</Typography>
                  </Box>
                ) : activeBom ? (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                    <Grid container spacing={2}>
                      {[
                        { label: 'BOM Name', value: activeBom.bomName },
                        { label: 'Revision', value: activeBom.revision, extra: activeBom?.id ? (
                          <Tooltip title="Open BOM"><IconButton size="small" onClick={() => openNewTab(`/bom/edit/${activeBom.id}`)}><OpenInNew sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        ) : null },
                        { label: 'Status', value: <Chip size="small" label={activeBom.bomStatus || 'ACTIVE'} color="success" variant="outlined" sx={{ mt: 0.25 }} /> },
                        { label: 'Effective From', value: formatDate(activeBom.effectiveFrom) },
                        { label: 'Effective To', value: formatDate(activeBom.effectiveTo) },
                        { label: 'BOM Code', value: activeBom.bomCode || activeBom.id },
                      ].map((f, i) => (
                        <Grid item xs={6} sm={4} key={i}>
                          <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="body2" fontWeight={500}>{f.value || '-'}</Typography>
                            {f.extra}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>No active BOM found for this item.</Typography>
                    <Button variant="outlined" size="small" sx={{ textTransform: 'none', borderRadius: 1.5 }}
                      onClick={() => navigate('/bom/add', { state: { inventoryItem: itemData, inventoryItemId: id } })}>
                      Create BOM
                    </Button>
                  </Box>
                )}
              </Grid>

              {/* BOM History */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                  sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>BOM History</Typography>
                {bomHistory.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                    <Typography variant="body2" color="text.secondary">No BOM history available.</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['BOM Name', 'Revision', 'Status', 'Effective From', 'Effective To'].map(h => (
                            <TableCell key={h} sx={bomHeaderSx}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bomHistory.map((bom, i) => (
                          <TableRow key={bom.id || i} sx={{ '& td': { fontSize: '0.8125rem', py: 0.75 } }}>
                            <TableCell>{bom.bomName || '-'}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                {bom.revision ?? '-'}
                                <Tooltip title="Open BOM"><IconButton size="small" onClick={() => openNewTab(bom?.id ? `/bom/edit/${bom.id}` : null)} disabled={!bom?.id}><OpenInNew sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell><Chip size="small" label={bom.bomStatus || '-'} variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                            <TableCell>{formatDate(bom.effectiveFrom)}</TableCell>
                            <TableCell>{formatDate(bom.effectiveTo)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Grid>

              {/* Where Used */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                  sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Where Used</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  BOMs that consume this item as a component
                </Typography>
                {whereUsedList.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#fafbfc', borderRadius: 1.5, border: `1px dashed ${BORDER_COLOR}` }}>
                    <Typography variant="body2" color="text.secondary">This item is not used in any BOM.</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Parent BOM', 'Parent Item', 'Item Code', 'Qty Used', 'Status', 'Rev'].map(h => (
                            <TableCell key={h} sx={bomHeaderSx}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {whereUsedList.map((wu, i) => (
                          <TableRow key={wu.bomId || i} sx={{ '& td': { fontSize: '0.8125rem', py: 0.75 } }}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1565c0' }}>{wu.bomName || wu.parentBomName || '-'}</Typography>
                                <Tooltip title="Open BOM"><IconButton size="small" onClick={() => openNewTab((wu.bomId || wu.id) ? `/bom/edit/${wu.bomId || wu.id}` : null)}><OpenInNew sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>{wu.parentItemName || wu.parentInventoryItemName || '-'}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{wu.parentItemCode || wu.parentInventoryItemCode || '-'}</TableCell>
                            <TableCell>{wu.quantity ?? '-'}</TableCell>
                            <TableCell><Chip size="small" label={wu.bomStatus || '-'} variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
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
                  <TestTemplateSection itemId={id} setError={msg => showSnackbar(msg, 'error')} setSnackbar={showSnackbar} />
                </Grid>
              )}
            </Grid>
          ) : (
            <RestrictedTabPlaceholder reason="Manufacturing data is restricted to Production and Inventory Admin roles." />
          )
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — DOCUMENTS
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'docs' && (
          <DocsTab
            images={images} setImages={setImages}
            pdfFiles={pdfFiles} setPdfFiles={setPdfFiles}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5 — VENDOR PRICES  (restricted, edit mode only)
            ══════════════════════════════════════════════════════════════════ */}
        {activeKey === 'vendors' && isEditMode && (
          isFinanceAdmin ? (
            <VendorPricesTab
              itemId={id}
              setSnackbar={showSnackbar}
              purchased={itemData.purchased}
              manufactured={itemData.manufactured}
            />
          ) : (
            <RestrictedTabPlaceholder reason="Vendor pricing is restricted to Inventory Admins and Managers." />
          )
        )}

      </Paper>

      {/* ── Series picker dialog ── */}
      <ItemCodeSeriesPickerDialog
        open={seriesDialogOpen}
        onClose={() => {
          setSeriesDialogOpen(false);
        }}
        onSelect={(sel) => {
          setIsItemCodeAuto(true);
          handleSeriesSelect(sel);
          setSeriesDialogOpen(false);
        }}
      />

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={3500}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity}
          variant="filled" sx={{ borderRadius: 1.5 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Save confirm dialog ── */}
      <Dialog open={showSaveConfirm} onClose={() => setShowSaveConfirm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>
          {isEditMode ? 'Confirm Product Update' : 'Confirm Product Save'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? 'This will update the item master record. Continue?' : 'This will create a new item in the product master. Continue?'}
          </Typography>
          {isItemCodeAuto && selectedSeries && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Item code will be auto-generated from series <strong>{selectedSeries.seriesLabel}</strong>.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowSaveConfirm(false)} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
          <Button variant="contained" onClick={confirmSave}
            sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            Confirm Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Duplicate confirm dialog ── */}
      <Dialog open={showDuplicateConfirm} onClose={() => setShowDuplicateConfirm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Duplicate Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will create a new product pre-filled with all details from <strong>{itemData.name}</strong> ({itemData.itemCode}).
          </Typography>
          <Alert severity="info" sx={{ mt: 1.5 }}>
            You will need to provide a new unique Item Code — either manually or by selecting an auto-generate series.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowDuplicateConfirm(false)} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
          <Button variant="contained" startIcon={<ContentCopy />}
            onClick={() => {
              setShowDuplicateConfirm(false);
              const { fileAttachments, attachments, pdfAttachments, ...rest } = itemData;
              navigate('/inventory-item/add', { state: { duplicateFrom: rest } });
            }}
            sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success dialog (item created) ── */}
      <Dialog open={!!savedItem} onClose={() => { setSavedItem(null); setTimeout(() => navigate('/inventory-item'), 300); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f0f7ff', borderBottom: '2px solid #1565c0' }}>
          <Typography variant="h6" fontWeight={600} color="#0f2744" mb={0.5}>✓ Product Saved Successfully</Typography>
        </Box>
        <DialogContent sx={{ py: 3 }}>
          {savedItem && (
            <Box>
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#fafbfc', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>ITEM CODE</Typography>
                <Typography variant="h5" fontWeight={700} color="#1565c0" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                  {savedItem.itemCode}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#fafbfc', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>PRODUCT NAME</Typography>
                <Typography variant="subtitle2" fontWeight={600} color="#374151">
                  {savedItem.name}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => { setSavedItem(null); setTimeout(() => navigate('/inventory-item'), 300); }}
            sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            Back to Products
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DocsTab — inline file manager replacing the old upload box components
   ═══════════════════════════════════════════════════════════════════════════ */
function DocsTab({ images, setImages, pdfFiles, setPdfFiles }) {
  const imgRef = useRef(null);
  const pdfRef = useRef(null);
  const [imgDrag, setImgDrag] = useState(false);
  const [pdfDrag, setPdfDrag] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const addImages = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newObjs = valid.slice(0, 5 - images.length).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newObjs].slice(0, 5));
  };

  const addPdfs = (files) => {
    const valid = Array.from(files).filter(f => f.type === 'application/pdf');
    const newObjs = valid.map(f => ({ file: f, name: f.name, url: URL.createObjectURL(f) }));
    setPdfFiles(prev => [...prev, ...newObjs]);
  };

  const removeImg = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removePdf = (i) => setPdfFiles(prev => prev.filter((_, idx) => idx !== i));

  const fmtSize = (bytes) => bytes ? (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`) : '';

  return (
    <Box>
      <Grid container spacing={3}>

        {/* ── Product Images ── */}
        <Grid item xs={12} md={6}>
          <Box sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#fafbfc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={600} color="#0f2744" fontSize="0.8rem">
                Product Images <Chip label={`${images.length}/5`} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
              </Typography>
              {images.length < 5 && (
                <Button size="small" startIcon={<AddPhotoAlternate fontSize="small" />} onClick={() => imgRef.current?.click()}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>
                  Add Image
                </Button>
              )}
            </Box>

            {/* Drop zone (compact, shown when empty) */}
            {images.length === 0 && (
              <Box
                onDragOver={(e) => { e.preventDefault(); setImgDrag(true); }}
                onDragLeave={() => setImgDrag(false)}
                onDrop={(e) => { e.preventDefault(); setImgDrag(false); addImages(e.dataTransfer.files); }}
                onClick={() => imgRef.current?.click()}
                sx={{
                  m: 1.5, borderRadius: 1.5, border: `2px dashed ${imgDrag ? '#1565c0' : '#d1d5db'}`,
                  bgcolor: imgDrag ? '#eff6ff' : '#fafbfc', py: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                  transition: '0.2s', '&:hover': { borderColor: '#1565c0', bgcolor: '#eff6ff' }
                }}
              >
                <CloudUpload sx={{ fontSize: 32, color: '#9ca3af', mb: 0.75 }} />
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">Drop images here or click to browse</Typography>
                <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP · up to 5 files</Typography>
              </Box>
            )}

            {/* Thumbnails grid */}
            {images.length > 0 && (
              <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {images.map((img, i) => {
                  const src = img.preview || img.presignedUrl;
                  return (
                    <Box key={i} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer', '&:hover .del-btn': { opacity: 1 } }}
                      onClick={() => setLightbox(src)}>
                      <Box component="img" src={src} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <Box className="del-btn" onClick={(e) => { e.stopPropagation(); removeImg(i); }}
                        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.15s', cursor: 'pointer' }}>
                        <Typography sx={{ color: '#fff', fontSize: 13, lineHeight: 1, fontWeight: 700 }}>×</Typography>
                      </Box>
                    </Box>
                  );
                })}
                {images.length < 5 && (
                  <Box onClick={() => imgRef.current?.click()} sx={{ width: 80, height: 80, border: '2px dashed #d1d5db', borderRadius: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1565c0', bgcolor: '#eff6ff' } }}>
                    <AddPhotoAlternate sx={{ fontSize: 22, color: '#9ca3af' }} />
                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem" mt={0.25}>Add</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          <input ref={imgRef} type="file" hidden multiple accept="image/*" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
        </Grid>

        {/* ── Technical Documents ── */}
        <Grid item xs={12} md={6}>
          <Box sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#fafbfc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={600} color="#0f2744" fontSize="0.8rem">
                Technical Documents <Chip label={`${pdfFiles.length}`} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
              </Typography>
              <Button size="small" startIcon={<PdfIcon fontSize="small" />} onClick={() => pdfRef.current?.click()}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>
                Add PDF
              </Button>
            </Box>

            {/* Drop zone (compact, shown when empty) */}
            {pdfFiles.length === 0 && (
              <Box
                onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
                onDragLeave={() => setPdfDrag(false)}
                onDrop={(e) => { e.preventDefault(); setPdfDrag(false); addPdfs(e.dataTransfer.files); }}
                onClick={() => pdfRef.current?.click()}
                sx={{
                  m: 1.5, borderRadius: 1.5, border: `2px dashed ${pdfDrag ? '#1565c0' : '#d1d5db'}`,
                  bgcolor: pdfDrag ? '#eff6ff' : '#fafbfc', py: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                  transition: '0.2s', '&:hover': { borderColor: '#1565c0', bgcolor: '#eff6ff' }
                }}
              >
                <CloudUpload sx={{ fontSize: 32, color: '#9ca3af', mb: 0.75 }} />
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">Drop PDFs here or click to browse</Typography>
                <Typography variant="caption" color="text.secondary">Drawings, datasheets, specs</Typography>
              </Box>
            )}

            {/* File list */}
            {pdfFiles.length > 0 && (
              <Box sx={{ p: 1 }}>
                {/* Drop-more zone */}
                <Box
                  onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
                  onDragLeave={() => setPdfDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setPdfDrag(false); addPdfs(e.dataTransfer.files); }}
                  sx={{
                    border: `1px dashed ${pdfDrag ? '#1565c0' : '#e5e7eb'}`, borderRadius: 1, p: 0.75, mb: 1,
                    textAlign: 'center', bgcolor: pdfDrag ? '#eff6ff' : 'transparent',
                    cursor: 'default', transition: '0.2s'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">Drop more PDFs here</Typography>
                </Box>

                <List dense disablePadding>
                  {pdfFiles.map((f, i) => (
                    <ListItem key={i} disablePadding
                      sx={{ borderRadius: 1, mb: 0.5, px: 1, py: 0.5, bgcolor: '#fff', border: '1px solid #f0f0f0', '&:hover': { bgcolor: '#f9fafb' } }}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => removePdf(i)}>
                          <Delete sx={{ fontSize: 16, color: '#ef4444' }} />
                        </IconButton>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <PdfIcon sx={{ color: '#dc2626', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontSize="0.8rem" sx={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, '&:hover': { color: '#1565c0', textDecoration: 'underline' } }}
                            onClick={() => window.open(f.url || f.presignedUrl, '_blank')}>
                            {f.originalName || f.name}
                          </Typography>
                        }
                        secondary={f.file?.size ? <Typography variant="caption" color="text.secondary">{fmtSize(f.file.size)}</Typography> : null}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
          <input ref={pdfRef} type="file" hidden multiple accept="application/pdf" onChange={(e) => { addPdfs(e.target.files); e.target.value = ''; }} />
        </Grid>
      </Grid>

      {/* Lightbox */}
      {lightbox && (
        <Box onClick={() => setLightbox(null)} sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <Box component="img" src={lightbox} sx={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 2, boxShadow: 8 }} />
        </Box>
      )}
    </Box>
  );
}

/* ── Utility ── */
function extractArray(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.content)) return res.content;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.content)) return res.data.content;
  return [];
}
