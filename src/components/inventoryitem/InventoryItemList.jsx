import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  Paper, Typography, Divider, ListItemText, Toolbar,
  Menu, MenuItem, Checkbox, CircularProgress,
  useMediaQuery, useTheme, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon, Container, Grid, Stack
} from '@mui/material';
import {
  BuildCircle, Inventory2Rounded, WorkOff, Calculate,
  Tune as TuneIcon, ArrowUpward, ArrowDownward, Download as DownloadIcon,
  Warning as WarningIcon, CheckCircle, CurrencyRupee, Refresh,
} from "@mui/icons-material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import FilterBar from '../ui/filterbar/FilterBar';
import { filterInventoryItems, exportInventoryItems, getAttachmentBlob, getInventorySummary } from '../../services/inventoryService';
import { CheckCircleIcon, Hammer, PackageIcon } from 'lucide-react';
import BulkImportItems from './BulkImportItems';

/* ── Column definitions ── */
const allColumns = [
  { field: 'itemCode', headerName: 'Product Code', width: 120, type: 'string' },
  { field: 'name', headerName: 'Product Name', width: 180, type: 'string' },
  { field: 'uom', headerName: 'UOM', width: 70, type: "enum", options: ["NOS", "KG", "GRAM", "TON", "METER", "CENTIMETER", "INCH", "LITER", "SET"] },
  { field: 'itemType', headerName: 'Type', width: 130, type: "enum", options: ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD", "SUB_CONTRACTED", "CONSUMABLE"] },
  { field: 'basicMaterial', headerName: 'Material', width: 110, type: 'string' },
  { field: 'dimension', headerName: 'Dimension', width: 100, type: 'string' },
  { field: 'weight', headerName: 'Weight', width: 80, type: 'number' },
  { field: 'drawingNumber', headerName: 'Drawing No.', width: 120, type: 'string' },
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
  let cols = allColumns.map(c => c.field);
  if (isNarrowDesktop) {
    cols = cols.filter(f => !["dimension", "weight", "drawingNumber"].includes(f));
  }
  if (isMobile) {
    cols = cols.filter(f => !["basicMaterial", "dimension", "weight", "drawingNumber"].includes(f));
  }
  return cols;
};

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
    header:  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
};

/* ── Theme constants ── */
const HEADER_BG = '#f0f7ff';
const HEADER_TEXT = '#075985';
const BORDER_COLOR = '#e2e8f0';
const ROW_BORDER = '#f1f5f9';
const ROW_EVEN = '#ffffff';
const ROW_ODD = '#ffffff';
const ROW_HOVER = '#f8fafc';

/* ── Summary stat card ── */
const StatCard = ({ title, value, accent = '#1565c0', onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: '11px 14px',
      borderRadius: 1.5,
      border: `1px solid ${BORDER_COLOR}`,
      borderLeft: `3px solid ${accent}`,
      background: '#fff',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s ease',
      '&:hover': onClick ? { boxShadow: '0 4px 12px rgba(0,0,0,0.07)', transform: 'translateY(-2px)' } : undefined,
    }}
  >
    <Typography sx={{ fontSize: '0.65625rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: '5px' }}>{title}</Typography>
    <Typography sx={{ fontSize: '1.625rem', fontWeight: 500, color: '#1e293b', lineHeight: 1 }}>{value}</Typography>
  </Paper>
);

/* ── Type icons ── */
const typeIcons = {
  FINISHED_GOOD: {
    icon: <PackageIcon size={16} color='#2e7d32' />,
    label: "Finished Good",
    color: "#e8f5e9",
    textColor: "#2e7d32",
  },
  RAW_MATERIAL: {
    icon: <Hammer size={16} color="#e65100" />,
    label: "Raw Material",
    color: "#fff3e0",
    textColor: "#e65100",
  },
  SEMI_FINISHED: {
    icon: <BuildCircle sx={{ color: "#1565c0", fontSize: 16 }} />,
    label: "Semi-Finished",
    color: "#e3f2fd",
    textColor: "#1565c0",
  },
  SUB_CONTRACTED: {
    icon: <WorkOff sx={{ color: "#6a1b9a", fontSize: 16 }} />,
    label: "Sub-Contracted",
    color: "#f3e5f5",
    textColor: "#6a1b9a",
  },
  CONSUMABLE: {
    icon: <Calculate sx={{ color: "#00838f", fontSize: 16 }} />,
    label: "Consumable",
    color: "#e0f2f1",
    textColor: "#00838f",
  }
};

/* ── Mobile Card Component ── */
const InventoryItemCard = ({ item, onEdit, onDelete, canWrite, typeIcons, onDrawingClick }) => {
  const typeInfo = typeIcons[item.itemType] || { label: item.itemType, color: "#f1f5f9", textColor: "#64748b" };
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${BORDER_COLOR}`,
        background: '#fff',
        '&:active': { transform: 'scale(0.98)' },
        transition: 'transform 0.1s ease',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>
            {item.itemCode}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, mt: 0.5 }}>
            {item.name}
          </Typography>
        </Box>
        <Chip
          icon={typeInfo.icon}
          label={typeInfo.label}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: typeInfo.color,
            color: typeInfo.textColor,
            '& .MuiChip-icon': { color: 'inherit' }
          }}
        />
      </Box>

      <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">UOM</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.uom}</Typography>
        </Box>
        {item.drawingNumber && (
          <Box>
            <Typography variant="caption" color="text.secondary">Drawing No.</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.drawingNumber}</Typography>
              {item.drawingFileId && (
                <IconButton size="small" onClick={() => onDrawingClick(item)} sx={{ p: 0.25 }}>
                  <DownloadIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          startIcon={<EditIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={() => onEdit(item.inventoryItemId)}
          disabled={!canWrite}
          sx={{ color: '#1565c0', textTransform: 'none', fontWeight: 600 }}
        >
          Edit
        </Button>
        <Button
          size="small"
          startIcon={<DeleteIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={() => onDelete(item.inventoryItemId)}
          disabled={!canWrite}
          sx={{ color: '#c62828', textTransform: 'none', fontWeight: 600 }}
        >
          Delete
        </Button>
      </Box>
    </Paper>
  );
};

const InventoryItemList = ({
  onDeleteItem,
  loading,
  setLoading,
  error,
  setError,
  handleAddNewItemClick,
  canWriteInventoryItems = false,
  isAdminRole = false
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isNarrowDesktop = useMediaQuery(theme.breakpoints.down('xl'));
  const debounceTimeout = useRef(null);
  const tableContainerRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState(() => getDefaultVisibleCols(isNarrowDesktop, isMobile));
  const stableColumns = useMemo(() => [...allColumns], [allColumns]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [filters, setFilters] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('inventoryItemId');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [tableContainerWidth, setTableContainerWidth] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [drawingPreview, setDrawingPreview] = useState({ open: false, url: '', contentType: '', fileName: '' });
  const [summary, setSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      setIsSummaryLoading(true);
      const response = await getInventorySummary();
      setSummary(response);
    } catch (err) {
      console.error('Error fetching inventory summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const summaryValue = (value) => value === null || value === undefined ? "-" : value;

  const handleDrawingClick = async (e, item) => {
    e.stopPropagation();
    if (!item.drawingFileId) return;

    setLoading(true);
    try {
      const result = await getAttachmentBlob(item.drawingFileId);
      setDrawingPreview({
        open: true,
        url: result.url,
        contentType: result.contentType,
        fileName: item.drawingNumber || 'Drawing'
      });
    } catch (err) {
      console.error('Error fetching drawing:', err);
      alert('Failed to load drawing.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportClick = (event) => setExportAnchorEl(event.currentTarget);
  const handleExportClose = () => setExportAnchorEl(null);

  const downloadExport = async (type) => {
      handleExportClose();
      try {
          await exportInventoryItems(type, selectedRows);
      } catch (err) {
          console.error('Error downloading file:', err);
          alert('Failed to download export.');
      }
  };

  const handleFilterApplied = (data) => {
    setInventoryItems(data.content);
    setTotalPages(data.totalPages);
    setTotalElements(data.totalElements);
  };

  const handleEditClick = (id) => {
    if (!canWriteInventoryItems) return;
    navigate(`/inventory-item/edit/${id}`);
  };

  const handleDeleteClick = (id) => {
    if (!canWriteInventoryItems) return;
    setDeleteDialog({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    await onDeleteItem(deleteDialog.id);
    handleApplyFilters(filters, currentPage, sortBy, sortDir);
    setDeleteDialog({ open: false, id: null });
  };

  useEffect(() => {
    return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
  }, []);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    const element = tableContainerRef.current;
    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth) setTableContainerWidth(nextWidth);
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) setTableContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleColumnToggle = (field) => {
    setVisibleCols((prev) =>
      prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field]
    );
  };

  const displayedColumns = useMemo(() => {
    return stableColumns.filter((col) => visibleCols.includes(col.field));
  }, [stableColumns, visibleCols]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRows(inventoryItems.map(item => item.inventoryItemId));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleApplyFilters = async (appliedFilters = filters, page = currentPage, sortKey = sortBy, sortIn = sortDir) => {
    setLoading(true);
    try {
      const payload = {
        page, size: itemsPerPage, sortBy: sortKey, sortDir: sortIn,
        filters: appliedFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
      };
      const response = await filterInventoryItems(payload);
      handleFilterApplied(response);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const onPageChange = (page) => {
    setCurrentPage(page);
    handleApplyFilters(filters, page, sortBy, sortDir);
  };

  const handleSortChange = (sortField) => {
    const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(sortField);
    setSortDir(newSortDir);
    handleApplyFilters(filters, currentPage, sortField, newSortDir);
  };

  const handleChangeRowsPerPage = (event) => {
    setItemPerPage(parseInt(event.target.value, 10));
  };

  useEffect(() => { onPageChange(0); }, [itemsPerPage]);

  const [columnWidths, setColumnWidths] = useState(
    allColumns.reduce((acc, col) => { acc[col.field] = col.width || 150; return acc; }, {})
  );
  const [utilityColumnWidths, setUtilityColumnWidths] = useState({
    selection: 56,
    rowNumber: 44,
  });

  const getBaseWidth = (field) => columnWidths[field] || allColumns.find((c) => c.field === field)?.width || 150;

  const extraColumnsWidth = utilityColumnWidths.selection + utilityColumnWidths.rowNumber + 100;

  const { scaledColumnWidths, tableMinWidth } = useMemo(() => {
    const baseWidths = displayedColumns.map((col) => ({ field: col.field, width: getBaseWidth(col.field) }));
    const dataWidthTotal = baseWidths.reduce((sum, col) => sum + col.width, 0);
    const availableWidth = tableContainerWidth || dataWidthTotal + extraColumnsWidth;
    const availableForData = Math.max(0, availableWidth - extraColumnsWidth);
    const scale = dataWidthTotal > availableForData && availableForData > 0 ? availableForData / dataWidthTotal : 1;
    const scaled = baseWidths.reduce((acc, col) => { acc[col.field] = Math.max(60, Math.floor(col.width * scale)); return acc; }, {});
    return { scaledColumnWidths: scaled, tableMinWidth: Math.min(dataWidthTotal + extraColumnsWidth, availableWidth) };
  }, [displayedColumns, columnWidths, tableContainerWidth, extraColumnsWidth]);

  const resizingCol = useRef(null);
  const handleMouseDown = (e, field) => {
    resizingCol.current = { type: 'data', field, startX: e.clientX, startWidth: getBaseWidth(field) };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleUtilityMouseDown = (e, field) => {
    resizingCol.current = { type: 'utility', field, startX: e.clientX, startWidth: utilityColumnWidths[field] };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    if (!resizingCol.current) return;
    const { type, field, startX, startWidth } = resizingCol.current;
    const nextWidth = Math.max(44, startWidth + (e.clientX - startX));
    if (type === 'utility') {
      setUtilityColumnWidths((prev) => ({ ...prev, [field]: nextWidth }));
      return;
    }
    setColumnWidths((prev) => ({ ...prev, [field]: Math.max(80, nextWidth) }));
  };
  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const renderTypeChip = (value) => {
    const typeInfo = typeIcons[value];
    if (!typeInfo) return value || "-";
    return (
      <Chip
        icon={typeInfo.icon}
        label={typeInfo.label}
        size="small"
        sx={{
          backgroundColor: typeInfo.color,
          color: typeInfo.textColor,
          fontWeight: 500,
          fontSize: '0.75rem',
          height: 26,
          '& .MuiChip-icon': { ml: 0.5 },
        }}
      />
    );
  };

  /* ── Header cell style ── */
  const headerCellSx = {
    background: HEADER_BG,
    color: HEADER_TEXT,
    fontWeight: 700,
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: `1px solid ${BORDER_COLOR}`,
    borderRight: 'none',
    whiteSpace: 'nowrap',
    py: '9px',
    px: '14px',
    userSelect: 'none',
  };

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
        {/* ── Hero Header ── */}
        <Box sx={{ 
            bgcolor: '#0f172a', 
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
            color: 'white', pt: 6, pb: 12 
        }}>
            <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={6} flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>Product Master</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Manage your product catalog and inventory items.</Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Tooltip title="Refresh Stats">
                            <IconButton onClick={fetchSummary} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                        <Button 
                            variant="outlined" 
                            startIcon={<DownloadIcon />}
                            onClick={handleExportClick}
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }}
                        >
                            Export
                        </Button>
                        <Menu
                            anchorEl={exportAnchorEl}
                            open={Boolean(exportAnchorEl)}
                            onClose={handleExportClose}
                            PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 200 } }}
                        >
                            <MenuItem onClick={() => downloadExport('catalog')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Product Catalog (Excel)" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <MenuItem onClick={() => downloadExport('bulk')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Bulk Item Master (Excel)" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <MenuItem onClick={() => downloadExport('pdf')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Product Data Sheet (PDF)" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => downloadExport('vendor-prices')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Vendor Price Comparison" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <MenuItem onClick={() => downloadExport('gst-import')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="GST / E-Way / Tally Import" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <MenuItem onClick={() => downloadExport('low-stock-indent')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Low Stock Purchase Indent" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                            <MenuItem onClick={() => downloadExport('job-work-items')}>
                                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Job Work Items" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                            </MenuItem>
                        </Menu>
                        {canWriteInventoryItems && <BulkImportItems />}
                        <Button
                          onClick={handleAddNewItemClick}
                          variant="contained" disableElevation
                          disabled={!canWriteInventoryItems}
                          startIcon={<AddCircleOutlineIcon />}
                          sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 3, py: 1, fontWeight: 800, textTransform: 'none', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)', '&:hover': { bgcolor: '#1d4ed8' } }}
                        >
                          {isMobile ? "Add" : "New Product"}
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={3}>
                    {[
                        { label: 'Total Products', value: summary?.totalItems ?? 0, icon: Inventory2Rounded, color: '#3b82f6', trend: 'All' },
                        { label: 'Available Stock', value: (summary?.available ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }), icon: CheckCircle, color: '#10b981', trend: 'In Hand' },
                        { label: 'Booked', value: summary?.booked ?? 0, icon: BuildCircle, color: '#f59e0b', trend: 'Reserved' },
                        { label: 'Total Value', value: `₹${((summary?.totalInventoryValue ?? 0) / 100000).toFixed(1)}L`, icon: CurrencyRupee, color: '#8b5cf6', trend: 'Valuation' },
                    ].map((stat, i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                            }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: 'flex' }}>
                                        <stat.icon />
                                    </Box>
                                    <Typography sx={{ color: stat.color, fontSize: '0.7rem', fontWeight: 800, bgcolor: `${stat.color}10`, px: 1, borderRadius: 1 }}>
                                        {stat.trend}
                                    </Typography>
                                </Stack>
                                <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: 'white' }}>
                                    {isSummaryLoading ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    {stat.label}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>

        <Container maxWidth="xl" sx={{ mt: -6 }}>
          <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 3 }}>


        {/* ── Filter Bar + Column Toggle ── */}
        <Box
          sx={{
            display: "flex",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            alignItems: { xs: "stretch", xl: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: 'column', xl: 'row' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
            <FilterBar
              allColumns={allColumns}
              filters={filters}
              setFilters={setFilters}
              page={currentPage}
              handleApplyFilters={handleApplyFilters}
              sortKey={sortBy}
              sortDir={sortDir}
            />
          </Box>
          <Button
            startIcon={<TuneIcon />}
            variant="outlined"
            size="small"
            sx={{
              minWidth: { xs: "100%", xl: 120 },
              height: 36,
              textTransform: "none",
              flexShrink: 0,
              borderColor: BORDER_COLOR,
              color: '#374151',
              fontWeight: 500,
              '&:hover': { borderColor: '#1565c0', color: '#1565c0' },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            Columns
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ style: { maxHeight: 420 } }}
          >
            {allColumns.map(col => (
              <MenuItem key={col.field} onClick={() => handleColumnToggle(col.field)} dense>
                <Checkbox checked={visibleCols.includes(col.field)} size="small" />
                <ListItemText primary={col.headerName} />
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* ── Loading State ── */}
        {loading && (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="40vh" gap={2}>
            <CircularProgress size={36} sx={{ color: '#1565c0' }} />
            <Typography variant="body2" color="text.secondary">Loading products...</Typography>
          </Box>
        )}

        {/* ── Table / Card View ── */}
        {!loading && (
          isMobile ? (
            <Box sx={{ mt: 1 }}>
              {inventoryItems.map((item) => (
                <InventoryItemCard
                  key={item.inventoryItemId}
                  item={item}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  canWrite={canWriteInventoryItems}
                  typeIcons={typeIcons}
                  onDrawingClick={(item) => handleDrawingClick({ stopPropagation: () => {} }, item)}
                />
              ))}
              {inventoryItems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="body2">No products found</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", position: "relative" }}>
              <TableContainer
                component={Box}
                ref={tableContainerRef}
                sx={{
                  borderRadius: 1.5,
                  border: `1px solid ${BORDER_COLOR}`,
                  maxHeight: "calc(100vh - 280px)",
                  overflowY: "auto",
                  overflowX: "auto",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
              <Table
                stickyHeader
                size="small"
                sx={{ tableLayout: "fixed", minWidth: tableMinWidth, width: "100%", borderCollapse: "collapse" }}
              >
                {/* ── Table Head ── */}
                <TableHead>
                  <TableRow>
                    <TableCell
                      padding="checkbox"
                      sx={{
                        ...headerCellSx,
                        width: utilityColumnWidths.selection,
                        maxWidth: utilityColumnWidths.selection,
                        minWidth: 44,
                        position: "relative",
                      }}
                    >
                      <Checkbox
                        indeterminate={selectedRows?.length > 0 && selectedRows?.length < inventoryItems?.length}
                        checked={inventoryItems?.length > 0 && selectedRows?.length === inventoryItems?.length}
                        onChange={handleSelectAll}
                        sx={{
                          color: '#94a3b8',
                          '&.Mui-checked': { color: '#2563eb' },
                          '&.MuiCheckbox-indeterminate': { color: '#2563eb' },
                        }}
                      />
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleUtilityMouseDown(e, 'selection'); }}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "5px", cursor: "col-resize", zIndex: 1 }}
                      />
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        ...headerCellSx,
                        width: utilityColumnWidths.rowNumber,
                        maxWidth: utilityColumnWidths.rowNumber,
                        minWidth: 44,
                        position: "relative",
                      }}
                    >
                      #
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleUtilityMouseDown(e, 'rowNumber'); }}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "5px", cursor: "col-resize", zIndex: 1 }}
                      />
                    </TableCell>

                    {displayedColumns?.map((col) => (
                      <TableCell
                        key={col.field}
                        sx={{
                          ...headerCellSx,
                          width: scaledColumnWidths[col.field] || col.width || 150,
                          maxWidth: scaledColumnWidths[col.field] || col.width || 150,
                          minWidth: 0,
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        onClick={() => handleSortChange(col.field)}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{col.headerName}</span>
                          {sortBy === col.field && (
                            sortDir === 'asc'
                              ? <ArrowUpward sx={{ fontSize: 14, color: '#64748b' }} />
                              : <ArrowDownward sx={{ fontSize: 14, color: '#64748b' }} />
                          )}
                          <div
                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, col.field); }}
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "5px", cursor: "col-resize", zIndex: 1 }}
                          />
                        </Box>
                      </TableCell>
                    ))}

                    <TableCell align="center" sx={{ ...headerCellSx, width: 90 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                {/* ── Table Body ── */}
                <TableBody>
                  {inventoryItems?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={displayedColumns.length + 3} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">No products found. Adjust filters or add a new product.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {inventoryItems?.map((item, index) => (
                    <TableRow
                      key={item.inventoryItemId}
                      sx={{
                        background: index % 2 === 0 ? ROW_EVEN : ROW_ODD,
                        cursor: "pointer",
                        transition: 'background 0.15s ease',
                        '&:hover': { background: ROW_HOVER },
                        '& td': { borderBottom: `1px solid ${ROW_BORDER}`, fontSize: '0.8125rem', py: '10px', px: '14px', color: '#475569' },
                      }}
                    >
                      <TableCell
                        padding="checkbox"
                        align="center"
                        sx={{
                          width: utilityColumnWidths.selection,
                          maxWidth: utilityColumnWidths.selection,
                          minWidth: 44,
                        }}
                      >
                        <Checkbox
                          color="primary"
                          size="small"
                          checked={selectedRows.includes(item.inventoryItemId)}
                          onChange={() => handleSelectRow(item.inventoryItemId)}
                        />
                      </TableCell>

                      <TableCell
                        align="center"
                        onClick={() => handleEditClick(item.inventoryItemId)}
                        sx={{
                          color: '#6b7280',
                          fontWeight: 500,
                          width: utilityColumnWidths.rowNumber,
                          maxWidth: utilityColumnWidths.rowNumber,
                          minWidth: 44,
                        }}
                      >
                        {(index + 1) + itemsPerPage * currentPage}
                      </TableCell>

                      {displayedColumns?.map((col) => (
                        <TableCell
                          key={`${item.inventoryItemId}-${col.field}`}
                          sx={{
                            width: scaledColumnWidths[col.field] || col.width || 150,
                            maxWidth: scaledColumnWidths[col.field] || col.width || 150,
                            minWidth: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          align={col.align || "left"}
                          onClick={() => handleEditClick(item.inventoryItemId)}
                        >
                          {col.field === "itemType"
                            ? renderTypeChip(item[col.field])
                            : col.field === "itemCode"
                              ? <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>{item[col.field] || "-"}</Typography>
                              : col.field === "name"
                                ? <Typography variant="body2" sx={{ fontWeight: 500 }}>{item[col.field] || "-"}</Typography>
                                : col.field === "drawingNumber"
                                  ? (item.drawingFileId ? (
                                    <Typography
                                      variant="body2"
                                      onClick={(e) => handleDrawingClick(e, item)}
                                      sx={{
                                        color: '#1565c0',
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        '&:hover': { color: '#0d47a1' }
                                      }}
                                    >
                                      {item[col.field] || "View Drawing"}
                                    </Typography>
                                  ) : (item[col.field] || "-"))
                                : col.field === "availableQuantity"
                                  ? (() => {
                                      const qty = item[col.field];
                                      if (qty === null || qty === undefined) return '-';
                                      if (qty <= 0) return (
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                          <Chip label={qty} size="small" sx={{ bgcolor: '#fdecea', color: '#c62828', fontWeight: 600, fontSize: '0.72rem', height: 20, px: 0.25 }} />
                                          <Tooltip title="Out of stock"><WarningIcon sx={{ fontSize: 13, color: '#ef5350' }} /></Tooltip>
                                        </Box>
                                      );
                                      return qty.toString();
                                    })()
                                  : col.field === "taxCategory"
                                    ? (item[col.field] != null && item[col.field] !== '' ? `${item[col.field]}%` : '-')
                                    : (item[col.field] !== undefined && item[col.field] !== null ? item[col.field].toString() : "-")
                          }
                        </TableCell>
                      ))}

                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Make/Buy Analysis">
                          <IconButton 
                            onClick={() => navigate(`/production/make-or-buy?itemId=${item.inventoryItemId}`)} 
                            size="small"
                            sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, mr: 0.5 }}
                          >
                            <Calculate fontSize="small" sx={{ color: '#f57c00' }} />
                          </IconButton>
                        </Tooltip>
                        {canWriteInventoryItems && (
                          <Tooltip title="Edit">
                            <IconButton 
                              onClick={() => handleEditClick(item.inventoryItemId)} 
                              size="small"
                              sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, mr: 0.5 }}
                            >
                              <EditIcon fontSize="small" sx={{ color: '#1565c0' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdminRole && (
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDeleteClick(item.inventoryItemId)}
                              size="small"
                              disabled={!canWriteInventoryItems}
                              sx={{ border: '1px solid #fee2e2', borderRadius: 1.5 }}
                            >
                              <DeleteIcon fontSize="small" sx={{ color: "#d32f2f" }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

          </Box>
        ))}

        {/* ── Pagination ── */}
        {!loading && (
          <TablePagination
            component="div"
            count={totalElements}
            page={currentPage}
            onPageChange={(e, page) => onPageChange(page)}
            rowsPerPage={itemsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: `1px solid ${BORDER_COLOR}`,
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
              '& .MuiTablePagination-toolbar': {
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                justifyContent: isMobile ? 'center' : 'flex-end',
                px: isMobile ? 1 : 2
              }
            }}
          />
        )}
        </Box>

        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, id: null })}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete Product</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This product record will be removed permanently. Do you want to continue?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteDialog({ open: false, id: null })}
              sx={{ textTransform: 'none', color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteConfirm}
              sx={{ textTransform: 'none' }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Drawing Preview Dialog ── */}
        <Dialog
          open={drawingPreview.open}
          onClose={() => {
            URL.revokeObjectURL(drawingPreview.url);
            setDrawingPreview({ ...drawingPreview, open: false });
          }}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2, height: '90vh' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: '#0f2744', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <BuildCircle sx={{ color: '#1565c0' }} />
              Drawing: {drawingPreview.fileName}
            </Box>
            <Button size="small" onClick={() => {
              URL.revokeObjectURL(drawingPreview.url);
              setDrawingPreview({ ...drawingPreview, open: false });
            }}>Close</Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center', bgcolor: '#f3f4f6' }}>
            {drawingPreview.contentType.startsWith('image/') ? (
              <Box sx={{ p: 2, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
                <img
                  src={drawingPreview.url}
                  alt={drawingPreview.fileName}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </Box>
            ) : drawingPreview.contentType === 'application/pdf' ? (
              <iframe
                src={`${drawingPreview.url}#toolbar=0`}
                title={drawingPreview.fileName}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={2}>
                <WarningIcon color="warning" sx={{ fontSize: 48 }} />
                <Typography>Preview not available for this file type ({drawingPreview.contentType}).</Typography>
                <Button variant="contained" onClick={() => {
                   const link = document.createElement("a");
                   link.href = drawingPreview.url;
                   link.setAttribute("download", drawingPreview.fileName);
                   document.body.appendChild(link);
                   link.click();
                   document.body.removeChild(link);
                }}>Download Instead</Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
          </Paper>
        </Container>
    </Box>
  );
};

export default InventoryItemList;
