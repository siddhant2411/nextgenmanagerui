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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import './style/bom.css';
import apiService from '../../services/apiService';
import FilterBar from '../ui/filterbar/FilterBar';
import { useAuth } from '../../auth/AuthContext';
import { PRODUCTION_APPROVAL_ROLES, PRODUCTION_MANAGE_ROLES } from '../../auth/roles';

/* ── Theme constants ── */
const HEADER_BG = '#0f2744';
const HEADER_TEXT = '#e8edf3';
const BORDER_COLOR = '#e5e7eb';
const ROW_EVEN = '#fafbfc';
const ROW_ODD = '#ffffff';
const ROW_HOVER = '#e3f2fd';

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
        cols = cols.filter(f => !["parentDrawingNumber", "effectiveFrom", "effectiveTo"].includes(f));
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

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

const BomList = ({
    setLoading, loading, setError, handleAddNewBomClick
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isNarrowDesktop = useMediaQuery(theme.breakpoints.down("xl"));
    const [visibleCols, setVisibleCols] = useState(() => getDefaultVisibleCols(isNarrowDesktop, isMobile));
    const stableColumns = useMemo(() => [...allColumns], [allColumns]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [filters, setFilters] = useState([]);
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
    const { hasAnyRole } = useAuth();
    const canManageBom = hasAnyRole(PRODUCTION_MANAGE_ROLES);
    const isAdminRole = hasAnyRole(PRODUCTION_APPROVAL_ROLES);

    const onPageChange = (page) => {
        setCurrentPage(page);
        handleApplyFilters(filters, page, sortBy, sortDir);
    };

    const handleFilterApplied = (data) => {
        setBomList(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
    };

    const resizingCol = useRef(null);
    const handleMouseDown = (e, field) => {
        resizingCol.current = { field, startX: e.clientX, startWidth: columnWidths[field] };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };
    const handleMouseMove = (e) => {
        if (!resizingCol.current) return;
        const { field, startX, startWidth } = resizingCol.current;
        setColumnWidths((prev) => ({ ...prev, [field]: Math.max(80, startWidth + (e.clientX - startX)) }));
    };
    const handleMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    const handleEditClick = (id) => {
        if (!canManageBom) return;
        navigate(`/bom/edit/${id}`);
    };

    const onDeleteItem = async (id) => {
        try { await apiService.delete(`/bom/${id}`); } catch (err) { setError(err); }
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
        return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
    }, []);

    const handleColumnToggle = (field) => {
        setVisibleCols((prev) => prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field]);
    };

    const displayedColumns = useMemo(() => {
        return stableColumns.filter((col) => visibleCols.includes(col.field));
    }, [stableColumns, visibleCols]);

    const [columnWidths, setColumnWidths] = useState(
        displayedColumns.reduce((acc, col) => { acc[col.field] = col.width || 150; return acc; }, {})
    );

    const tableMinWidth = useMemo(() => {
        const dynamicCols = displayedColumns.reduce((sum, col) => sum + (columnWidths[col.field] || col.width || 150), 0);
        return dynamicCols + 56 + 40 + 100;
    }, [displayedColumns, columnWidths]);

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
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        gap: 1,
                        px: 0.5,
                        pb: 1.5,
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
                        {canManageBom && (
                            <Button
                                onClick={handleAddNewBomClick}
                                variant="contained"
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
                                Add BOM
                            </Button>
                        )}
                    </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

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

                {/* ── Loading ── */}
                {loading && (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="40vh" gap={2}>
                        <CircularProgress size={36} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading BOMs...</Typography>
                    </Box>
                )}

                {/* ── Table ── */}
                {!loading && (
                    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", position: "relative" }}>
                        <TableContainer
                            component={Box}
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
                                sx={{ tableLayout: "auto", minWidth: tableMinWidth, width: "100%", borderCollapse: "collapse" }}
                            >
                                {/* ── Head ── */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox" sx={{ ...headerCellSx, width: 56 }}>
                                            <Checkbox
                                                indeterminate={selectedRows?.length > 0 && selectedRows?.length < bomList?.length}
                                                checked={bomList?.length > 0 && selectedRows?.length === bomList?.length}
                                                onChange={handleSelectAll}
                                                sx={{
                                                    color: 'rgba(255,255,255,0.7)',
                                                    '&.Mui-checked': { color: '#fff' },
                                                    '&.MuiCheckbox-indeterminate': { color: '#fff' },
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell align="center" sx={{ ...headerCellSx, width: 44, minWidth: 44 }}>#</TableCell>

                                        {displayedColumns?.map((col) => (
                                            <TableCell
                                                key={col.field}
                                                sx={{
                                                    ...headerCellSx,
                                                    width: columnWidths[col.field] || col.width || 150,
                                                    minWidth: columnWidths[col.field] || col.width || 150,
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
                                                '& td': { borderBottom: `1px solid ${BORDER_COLOR}`, fontSize: '0.8125rem', py: 0.75 },
                                            }}
                                        >
                                            <TableCell padding="checkbox" align="center">
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
                                                        width: columnWidths[col.field] || col.width || 150,
                                                        minWidth: columnWidths[col.field] || col.width || 150,
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
            </Paper>
        </Box>
    );
};

export default BomList;
