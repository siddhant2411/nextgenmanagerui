import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
    Button, TableContainer, Paper, IconButton, Tooltip, Menu, MenuItem,
    ListItemText, Divider, CircularProgress, Checkbox, TablePagination,
    useMediaQuery, useTheme, Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    Tune as TuneIcon, ArrowUpward, ArrowDownward
} from '@mui/icons-material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import BuildCircle from '@mui/icons-material/BuildCircle';
import WarningIcon from '@mui/icons-material/Warning';
import './style/bom.css';
import apiService from '../../services/apiService';
import {
    downloadFlatBomExcel,
    downloadIndentedBomExcel,
    downloadManufacturingBomPdf,
    downloadBomJobSheet,
} from '../../services/bomService';
import FilterBar from '../ui/filterbar/FilterBar';
import { useAuth } from '../../auth/AuthContext';
import { PRODUCTION_APPROVAL_ROLES, PRODUCTION_MANAGE_ROLES } from '../../auth/roles';
import { EditIcon } from 'lucide-react';
import { getAttachmentBlob } from '../../services/inventoryService';

/* ── Theme constants ── */
const HEADER_BG = '#f0f7ff';
const HEADER_TEXT = '#075985';
const BORDER_COLOR = '#e2e8f0';
const ROW_BORDER = '#f1f5f9';
const ROW_EVEN = '#ffffff';
const ROW_ODD = '#ffffff';
const ROW_HOVER = '#f8fafc';

/* ── Column definitions ── */
const allColumns = [
    { field: 'bomName', headerName: 'BOM Name', width: 200, type: 'string' },
    { field: 'parentItemCode', headerName: 'Product Code', width: 140, type: 'string' },
    { field: 'parentItemName', headerName: 'Product Name', width: 200, type: 'string' },
    { field: 'bomStatus', headerName: 'Status', width: 130, type: 'enum', options: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "INACTIVE", "OBSOLETE", "ARCHIVED"] },
    { field: 'revision', headerName: 'Revision', width: 80, type: "string" },
    { field: 'parentDrawingNumber', headerName: 'Drawing No.', width: 130, type: "string" },
    { field: 'effectiveFrom', headerName: 'Effective From', width: 120, type: "Date" },
    { field: 'effectiveTo', headerName: 'Effective To', width: 120, type: 'Date' }
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
    let cols = allColumns.map(c => c.field);
    if (isNarrowDesktop) {
        cols = cols.filter(f => !["effectiveFrom", "effectiveTo"].includes(f));
    }
    if (isMobile) {
        cols = cols.filter(f => f !== "parentItemName");
    }
    return cols;
};

/* ── Status chip styling ── */
const statusStyles = {
    DRAFT: { bg: '#e3f2fd', color: '#1565c0' },
    PENDING_APPROVAL: { bg: '#fff3e0', color: '#e65100' },
    APPROVED: { bg: '#e8f5e9', color: '#2e7d32' },
    ACTIVE: { bg: '#e8f5e9', color: '#2e7d32' },
    INACTIVE: { bg: '#fafafa', color: '#757575' },
    OBSOLETE: { bg: '#ffebee', color: '#c62828' },
    ARCHIVED: { bg: '#fafafa', color: '#9e9e9e' },
};

const statusLabels = {
    DRAFT: 'Draft', PENDING_APPROVAL: 'Under Review', APPROVED: 'Approved',
    ACTIVE: 'Active', INACTIVE: 'Inactive', OBSOLETE: 'Obsolete', ARCHIVED: 'Archived',
};

/* ── Mobile Card Component ── */
const BomCard = ({ item, onEdit, onDelete, canManage, isAdmin, statusStyles, statusLabels, onDrawingClick }) => {
    const statusStyle = statusStyles[item.bomStatus] || { bg: '#fafafa', color: '#757575' };
    const statusLabel = statusLabels[item.bomStatus] || item.bomStatus || '-';

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
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>
                        {item.parentItemCode}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.bomName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
                        {item.parentItemName}
                    </Typography>
                </Box>
                <Chip
                    label={statusLabel}
                    size="small"
                    sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: statusStyle.bg,
                        color: statusStyle.color,
                        ml: 1
                    }}
                />
            </Box>

            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary">Revision</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.revision || '-'}</Typography>
                </Box>
                {item.parentDrawingNumber && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">Drawing No.</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.parentDrawingNumber}</Typography>
                            {item.drawingFileId && (
                                <IconButton size="small" onClick={(e) => onDrawingClick(e, item)} sx={{ p: 0.25 }}>
                                    <FileDownloadIcon sx={{ fontSize: 14, color: '#1565c0' }} />
                                </IconButton>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                    size="small"
                    startIcon={<EditIcon size={16} />}
                    onClick={() => onEdit(item.id)}
                    disabled={!canManage}
                    sx={{ color: '#1565c0', textTransform: 'none', fontWeight: 600 }}
                >
                    Edit
                </Button>
                {isAdmin && (
                    <Button
                        size="small"
                        startIcon={<DeleteIcon sx={{ fontSize: '1rem !important' }} />}
                        onClick={() => onDelete(item.id)}
                        disabled={!canManage}
                        sx={{ color: '#c62828', textTransform: 'none', fontWeight: 600 }}
                    >
                        Delete
                    </Button>
                )}
            </Box>
        </Paper>
    );
};

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Header cell style ── */
const headerCellSx = {
    bgcolor: HEADER_BG,
    color: HEADER_TEXT,
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    py: 1.5,
    borderBottom: `1px solid ${BORDER_COLOR}`,
    '& .MuiCheckbox-root': { color: HEADER_TEXT },
};

const BomList = ({
    setLoading, loading, setError, handleAddNewBomClick, hideHeader = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isNarrowDesktop = useMediaQuery(theme.breakpoints.down("xl"));
    const [visibleCols, setVisibleCols] = useState(() => getDefaultVisibleCols(isNarrowDesktop, isMobile));
    const stableColumns = useMemo(() => [...allColumns], [allColumns]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [filters, setFilters] = useState([
        { field: 'bomStatus', operator: '!=', value: 'INACTIVE' },
        { field: 'bomStatus', operator: '!=', value: 'OBSOLETE' },
        { field: 'bomStatus', operator: '!=', value: 'ARCHIVED' }
    ]);
    const [totalElements, setTotalElements] = useState(0);
    const [itemsPerPage, setItemPerPage] = useState(10);
    const navigate = useNavigate();
    const debounceTimeout = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [totalPages, setTotalPages] = useState(1);
    const [anchorEl, setAnchorEl] = useState(null);
    const [bomList, setBomList] = useState([]);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [tableContainerWidth, setTableContainerWidth] = useState(0);
    const tableContainerRef = useRef(null);
    const { hasAnyRole } = useAuth();
    const canManageBom = hasAnyRole(PRODUCTION_MANAGE_ROLES);
    const isAdminRole = hasAnyRole(PRODUCTION_APPROVAL_ROLES);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [drawingPreview, setDrawingPreview] = useState({ open: false, url: '', contentType: '', fileName: '' });

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
                fileName: item.parentDrawingNumber || 'Drawing'
            });
        } catch (err) {
            console.error('Error fetching drawing:', err);
            setError('Failed to load drawing.');
        } finally {
            setLoading(false);
        }
    };

    const downloadExport = async (type) => {
        setExportAnchorEl(null);
        if (selectedRows.length === 0) return;

        try {
            if (type === 'flat') {
                await downloadFlatBomExcel(selectedRows);
            } else if (type === 'indented') {
                await downloadIndentedBomExcel(selectedRows);
            } else if (type === 'pdf') {
                await downloadManufacturingBomPdf(selectedRows);
            } else if (type === 'job-sheet') {
                await downloadBomJobSheet(selectedRows);
            }
        } catch (err) {
            setError("Export failed: " + (err.message || "Something went wrong"));
        }
    };

    const onPageChange = (page) => {
        setCurrentPage(page);
        handleApplyFilters(filters, page, sortBy, sortDir);
    };

    const handleFilterApplied = (data) => {
        setBomList(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
    };


    const handleEditClick = (id) => {
        if (!canManageBom) return;
        navigate(`/bom/edit/${id}`);
    };

    const onDeleteItem = async (id) => {
        try { await apiService.delete(`/bom/${id}`); } catch (err) { setError(err?.response?.data?.message || err?.message || "Failed to delete BOM"); }
    };

    const handleDeleteClick = (id) => {
        setDeleteDialog({ open: true, id });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.id) return;
        await onDeleteItem(deleteDialog.id);
        handleApplyFilters(filters, currentPage, sortBy, sortDir);
        setDeleteDialog({ open: false, id: null });
    };

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

    useEffect(() => {
        return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
    }, []);

    const handleColumnToggle = (field) => {
        setVisibleCols((prev) => prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field]);
    };

    const displayedColumns = useMemo(() => {
        return stableColumns.filter((col) => visibleCols.includes(col.field));
    }, [stableColumns, visibleCols]);

    const [columnWidths, setColumnWidths] = useState(
        allColumns.reduce((acc, col) => { acc[col.field] = col.width || 150; return acc; }, {})
    );
    const [utilityColumnWidths, setUtilityColumnWidths] = useState({
        selection: 60,
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

    const handleSortChange = (sortField) => {
        const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(sortField);
        setSortDir(newSortDir);
        handleApplyFilters(filters, currentPage, sortField, newSortDir);
    };

    const handleSelectAll = (event) => {
        setSelectedRows(event.target.checked ? bomList.map(bom => bom.id) : []);
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };

    const handleChangeRowsPerPage = (event) => {
        setItemPerPage(parseInt(event.target.value, 10));
    };

    useEffect(() => { onPageChange(0); }, [itemsPerPage]);

    const handleApplyFilters = async (appliedFilters = filters, page = currentPage, sortKey = sortBy, sortIn = sortDir) => {
        setLoading(true);
        try {
            const payload = {
                page, size: itemsPerPage, sortBy: sortKey, sortDir: sortIn,
                filters: appliedFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
            };
            const response = await apiService.post("/bom/filter", payload);
            handleFilterApplied(response);
        } catch (err) {
            setError(err.message || "Something went wrong");
        }
        setLoading(false);
    };

    const renderStatusChip = (status) => {
        const style = statusStyles[status] || { bg: '#fafafa', color: '#757575' };
        const label = statusLabels[status] || status || '-';
        return (
            <Chip
                label={label}
                size="small"
                sx={{
                    backgroundColor: style.bg,
                    color: style.color,
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: 24,
                }}
            />
        );
    };

    return (
        <Box sx={{
            minHeight: "100%",
            p: hideHeader ? 0 : { xs: 1.5, sm: 2, md: 3 },
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "hidden",
        }}>
            <Paper
                elevation={0}
                sx={{
                    p: 0,
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    borderRadius: hideHeader ? 0 : 2,
                    border: hideHeader ? 'none' : `1px solid ${BORDER_COLOR}`,
                    overflow: 'hidden'
                }}
            >
                {/* ── Page Header ── */}
                {!hideHeader && (
                    <>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: { xs: "stretch", md: "center" },
                                flexDirection: { xs: "column", md: "row" },
                                gap: 1.5,
                                p: { xs: 2, md: 2.5 },
                                pb: 2,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                    sx={{ color: '#0f2744', fontSize: { xs: '1.25rem', md: '1.5rem' } }}
                                >
                                    Bill of Materials
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                    Manage product structures and component lists
                                </Typography>
                            </Box>

                            <Box sx={{ display: "flex", gap: 1, alignItems: 'center' }}>
                                {selectedRows.length > 0 && (
                                    <>
                                        <Button
                                            variant="outlined"
                                            startIcon={<FileDownloadIcon />}
                                            onClick={(e) => setExportAnchorEl(e.currentTarget)}
                                            sx={{
                                                borderRadius: 1.5,
                                                textTransform: 'none',
                                                px: 2,
                                                borderColor: '#1565c0',
                                                color: '#1565c0',
                                                '&:hover': { borderColor: '#0d47a1', bgcolor: 'rgba(21,101,192,0.04)' }
                                            }}
                                        >
                                            Export ({selectedRows.length})
                                        </Button>
                                        <Menu
                                            anchorEl={exportAnchorEl}
                                            open={Boolean(exportAnchorEl)}
                                            onClose={() => setExportAnchorEl(null)}
                                            PaperProps={{ sx: { minWidth: 220, borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
                                        >
                                            <MenuItem onClick={() => downloadExport('job-sheet')} sx={{ py: 1 }}>
                                                <ListItemText
                                                    primary={<Typography variant="body2" fontWeight={600}>BOM Job Sheet (PDF)</Typography>}
                                                    secondary="Materials checklist + operator sign-off"
                                                />
                                            </MenuItem>
                                            <MenuItem onClick={() => downloadExport('pdf')} sx={{ py: 1 }}>
                                                <ListItemText
                                                    primary={<Typography variant="body2" fontWeight={600}>Manufacturing BOM Sheet (PDF)</Typography>}
                                                    secondary="For Shop Floor Execution"
                                                />
                                            </MenuItem>
                                            <Divider />
                                            <MenuItem onClick={() => downloadExport('flat')} sx={{ py: 1 }}>
                                                <ListItemText
                                                    primary={<Typography variant="body2" fontWeight={600}>Flat BOM Details (Excel)</Typography>}
                                                    secondary="For Costing & Planning"
                                                />
                                            </MenuItem>
                                            <MenuItem onClick={() => downloadExport('indented')} sx={{ py: 1 }}>
                                                <ListItemText
                                                    primary={<Typography variant="body2" fontWeight={600}>Indented BOM (Excel)</Typography>}
                                                    secondary="Multi-level Hierarchy"
                                                />
                                            </MenuItem>
                                        </Menu>
                                    </>
                                )}
                                {canManageBom && (
                                    <Button
                                        onClick={handleAddNewBomClick}
                                        variant="contained"
                                        startIcon={<AddCircleOutlineIcon />}
                                        sx={{
                                            borderRadius: 1.5,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            px: { xs: 1.5, sm: 2.5 },
                                            boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                                            bgcolor: '#1565c0',
                                            '&:hover': { bgcolor: '#0d47a1' },
                                            fontSize: { xs: '0.8125rem', sm: '0.875rem' }
                                        }}
                                    >
                                        {isMobile ? "Add" : "Add BOM"}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                    </>
                )}

                {/* ── Filter Bar + Column Toggle ── */}
                <Box
                    sx={{
                        display: "flex",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        alignItems: { xs: "stretch", xl: "center" },
                        flexDirection: { xs: "column", xl: "row" },
                        gap: 1.5,
                        justifyContent: "space-between",
                        mb: 2,
                        px: { xs: 2, md: 2.5 },
                        pt: hideHeader ? { xs: 2, md: 2.5 } : 0,
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
                    {hideHeader && selectedRows.length > 0 && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<FileDownloadIcon />}
                                onClick={(e) => setExportAnchorEl(e.currentTarget)}
                                size="small"
                                sx={{
                                    height: 36,
                                    borderRadius: 1.5,
                                    textTransform: 'none',
                                    borderColor: '#1565c0',
                                    color: '#1565c0',
                                    flexShrink: 0,
                                    '&:hover': { borderColor: '#0d47a1', bgcolor: 'rgba(21,101,192,0.04)' }
                                }}
                            >
                                Export ({selectedRows.length})
                            </Button>
                            <Menu
                                anchorEl={exportAnchorEl}
                                open={Boolean(exportAnchorEl)}
                                onClose={() => setExportAnchorEl(null)}
                                PaperProps={{ sx: { minWidth: 220, borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
                            >
                                <MenuItem onClick={() => downloadExport('job-sheet')} sx={{ py: 1 }}>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>BOM Job Sheet (PDF)</Typography>}
                                        secondary="Materials checklist + operator sign-off"
                                    />
                                </MenuItem>
                                <MenuItem onClick={() => downloadExport('pdf')} sx={{ py: 1 }}>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>Manufacturing BOM Sheet (PDF)</Typography>}
                                        secondary="For Shop Floor Execution"
                                    />
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={() => downloadExport('flat')} sx={{ py: 1 }}>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>Flat BOM Details (Excel)</Typography>}
                                        secondary="For Costing & Planning"
                                    />
                                </MenuItem>
                                <MenuItem onClick={() => downloadExport('indented')} sx={{ py: 1 }}>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>Indented BOM (Excel)</Typography>}
                                        secondary="Multi-level Hierarchy"
                                    />
                                </MenuItem>
                            </Menu>
                        </>
                    )}
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

                {/* ── Loading ── */}
                {loading && (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="40vh" gap={2}>
                        <CircularProgress size={36} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading BOMs...</Typography>
                    </Box>
                )}

                {/* ── Table / Card View ── */}
                {!loading && (
                    isMobile ? (
                        <Box sx={{ mt: 1 }}>
                            {bomList.map((item) => (
                                <BomCard
                                    key={item.id}
                                    item={item}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    canManage={canManageBom}
                                    isAdmin={isAdminRole}
                                    statusStyles={statusStyles}
                                    statusLabels={statusLabels}
                                    onDrawingClick={handleDrawingClick}
                                />
                            ))}
                            {bomList.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    <Typography variant="body2">No BOMs found</Typography>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", position: "relative", px: { xs: 2, md: 2.5 } }}>
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
                                {/* ── Head ── */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            sx={{
                                                ...headerCellSx,
                                                width: utilityColumnWidths.selection,
                                                maxWidth: utilityColumnWidths.selection,
                                                minWidth: 60,
                                                position: "relative",
                                                px: 1,
                                            }}
                                        >
                                            <Checkbox
                                                indeterminate={selectedRows?.length > 0 && selectedRows?.length < bomList?.length}
                                                checked={bomList?.length > 0 && selectedRows?.length === bomList?.length}
                                                onChange={handleSelectAll}
                                                size="small"
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

                                {/* ── Body ── */}
                                <TableBody>
                                    {bomList?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={displayedColumns.length + 3} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">No BOMs found. Adjust filters or create a new BOM.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {bomList?.map((item, index) => (
                                        <TableRow
                                            key={item.id}
                                            sx={{
                                                background: index % 2 === 0 ? ROW_EVEN : ROW_ODD,
                                                cursor: "pointer",
                                                transition: 'background 0.15s ease',
                                                '&:hover': { background: ROW_HOVER },
                                                '& td': { borderBottom: `1px solid ${ROW_BORDER}`, fontSize: '0.8125rem', py: '10px', px: '14px', color: '#475569' },
                                            }}
                                        >
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    width: utilityColumnWidths.selection,
                                                    maxWidth: utilityColumnWidths.selection,
                                                    minWidth: 60,
                                                    px: 1,
                                                }}
                                            >
                                                <Checkbox
                                                    color="primary"
                                                    size="small"
                                                    checked={selectedRows.includes(item.id)}
                                                    onChange={() => handleSelectRow(item.id)}
                                                />
                                            </TableCell>

                                            <TableCell
                                                align="center"
                                                onClick={() => handleEditClick(item.id)}
                                                sx={{ color: '#6b7280', fontWeight: 500 }}
                                            >
                                                {(index + 1) + itemsPerPage * currentPage}
                                            </TableCell>

                                            {displayedColumns?.map((col) => (
                                                <TableCell
                                                    key={`${item.id}-${col.field}`}
                                                    sx={{
                                                        width: scaledColumnWidths[col.field] || col.width || 150,
                                                        maxWidth: scaledColumnWidths[col.field] || col.width || 150,
                                                        minWidth: 0,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                    align={col.align || "left"}
                                                    onClick={() => handleEditClick(item.id)}
                                                >
                                                    {col.field === 'bomStatus'
                                                        ? renderStatusChip(item[col.field])
                                                        : col.field === 'bomName'
                                                            ? <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>{item[col.field] || '-'}</Typography>
                                                            : col.field === 'parentItemCode'
                                                                ? <Typography variant="body2" sx={{ fontWeight: 500 }}>{item[col.field] || '-'}</Typography>
                                                                : col.field === 'parentDrawingNumber'
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
                                                                    : col.type?.toLowerCase() === "date"
                                                                        ? formatDate(item[col.field])
                                                                        : (item[col.field] !== undefined && item[col.field] !== null ? item[col.field].toString() : "-")
                                                    }
                                                </TableCell>
                                            ))}

                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                {canManageBom && (
                                                    <Tooltip title="Edit">
                                                        <IconButton onClick={() => handleEditClick(item.id)} size="small">
                                                            <EditIcon fontSize="small" sx={{ color: '#1565c0' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isAdminRole && (
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            onClick={() => handleDeleteClick(item.id)}
                                                            size="small"
                                                            disabled={!canManageBom}
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
                        </Box>
                    )
                )}

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

                <Dialog
                    open={deleteDialog.open}
                    onClose={() => setDeleteDialog({ open: false, id: null })}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete BOM</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary">
                            This BOM will be removed permanently. Do you want to continue?
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
        </Box>
    );
};

export default BomList;
