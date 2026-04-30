import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  Paper, Typography, Divider, ListItemText, Toolbar,
  Menu, MenuItem, Checkbox, CircularProgress,
  useMediaQuery, useTheme, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon
} from '@mui/material';
import {
  BuildCircle, Inventory2Rounded, WorkOff, Calculate,
  Tune as TuneIcon, ArrowUpward, ArrowDownward, Download as DownloadIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import FilterBar from '../ui/filterbar/FilterBar';
import { filterInventoryItems, exportInventoryItems } from '../../services/inventoryService';
import { CheckCircleIcon, Hammer, PackageIcon } from 'lucide-react';
import BulkImportItems from './BulkImportItems';

/* ── Column definitions ── */
const allColumns = [
  { field: 'itemCode', headerName: 'Product Code', width: 120, type: 'string' },
  { field: 'name', headerName: 'Product Name', width: 180, type: 'string' },
  { field: 'hsnCode', headerName: 'HSN Code', width: 90, type: 'string' },
  { field: 'taxCategory', headerName: 'GST %', width: 70, type: 'string' },
  { field: 'uom', headerName: 'UOM', width: 70, type: "enum", options: ["NOS", "KG", "GRAM", "TON", "METER", "CENTIMETER", "INCH", "LITER", "SET"] },
  { field: 'itemType', headerName: 'Type', width: 130, type: "enum", options: ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD", "SUB_CONTRACTED", "CONSUMABLE"] },
  { field: 'basicMaterial', headerName: 'Material', width: 110, type: 'string' },
  { field: 'dimension', headerName: 'Dimension', width: 100, type: 'string' },
  { field: 'weight', headerName: 'Weight', width: 80, type: 'number' },
  { field: 'availableQuantity', headerName: 'Available', width: 90, type: 'number' },
  { field: 'reservedQuantity', headerName: 'Reserved', width: 90, type: 'number' },
  { field: 'sellingPrice', headerName: 'Price', width: 100, type: 'number' },
  { field: 'revision', headerName: 'Rev', width: 60, type: 'string' },
  { field: 'drawingNumber', headerName: 'Drawing No.', width: 120, type: 'string' },
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
  let cols = allColumns.map(c => c.field);
  if (isNarrowDesktop) {
    cols = cols.filter(f => !["dimension", "weight", "revision", "drawingNumber"].includes(f));
  }
  if (isMobile) {
    cols = cols.filter(f => !["hsnCode", "taxCategory", "basicMaterial", "dimension", "weight", "revision", "drawingNumber", "sellingPrice"].includes(f));
  }
  return cols;
};

/* ── Theme constants ── */
const HEADER_BG = '#0f2744';
const HEADER_TEXT = '#e8edf3';
const ROW_EVEN = '#fafbfc';
const ROW_ODD = '#ffffff';
const ROW_HOVER = '#e3f2fd';
const BORDER_COLOR = '#e5e7eb';

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
    icon: <Inventory2Rounded sx={{ color: "#00796b", fontSize: 16 }} />,
    label: "Consumable",
    color: "#e0f2f1",
    textColor: "#00796b",
  },
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
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: 0.3,
    borderBottom: `2px solid ${HEADER_TEXT}`,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
    py: 1.25,
    userSelect: 'none',
  };

  return (
    <Box sx={{
      minHeight: "100%",
      p: { xs: 1.5, sm: 2, md: 3 },
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflowX: "hidden",
    }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          margin: "auto",
          borderRadius: 2,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {/* ── Page Header ── */}
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 0.5,
            pb: 1.5,
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1,
            minHeight: 'auto !important',
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: '#0f2744', fontSize: { xs: '1.25rem', md: '1.5rem' } }}
            >
              Product Master
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Manage your product catalog and inventory items
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={handleExportClick}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: BORDER_COLOR, color: '#374151', bgcolor: '#fff' }}
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
              variant="contained"
              disabled={!canWriteInventoryItems}
              startIcon={<AddCircleOutlineIcon />}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                bgcolor: '#1565c0',
                '&:hover': { bgcolor: '#0d47a1' },
              }}
            >
              Add Product
            </Button>
          </Box>
        </Toolbar>

        <Divider sx={{ mb: 2 }} />

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

        {/* ── Table ── */}
        {!loading && (
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
                          color: 'rgba(255,255,255,0.7)',
                          '&.Mui-checked': { color: '#fff' },
                          '&.MuiCheckbox-indeterminate': { color: '#fff' },
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
                              ? <ArrowUpward sx={{ fontSize: 14, color: '#90caf9' }} />
                              : <ArrowDownward sx={{ fontSize: 14, color: '#90caf9' }} />
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
                        '& td': { borderBottom: `1px solid ${BORDER_COLOR}`, fontSize: '0.8125rem', py: 0.75 },
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
                          <IconButton onClick={() => navigate(`/production/make-or-buy?itemId=${item.inventoryItemId}`)} size="small">
                            <Calculate fontSize="small" sx={{ color: '#f57c00' }} />
                          </IconButton>
                        </Tooltip>
                        {canWriteInventoryItems && (
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleEditClick(item.inventoryItemId)} size="small">
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

            {/* ── Pagination ── */}
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
              }}
            />
          </Box>
        )}

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
      </Paper>
    </Box>
  );
};

export default InventoryItemList;
