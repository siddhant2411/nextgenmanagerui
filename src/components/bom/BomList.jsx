// BomList.jsx - List all BOMs with view/edit/delete/export functionality
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
    Button, TableContainer, Paper, IconButton, TextField, Pagination, InputAdornment,
    Tooltip,
    Menu,
    MenuItem,
    ListItemText,
    Toolbar,
    Divider,
    CircularProgress,
    Checkbox,
    TablePagination,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { Edit, Delete, Search, PictureAsPdf, FileDownload, Tune as TuneIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import './style/bom.css';
import apiService from '../../services/apiService';
import FilterBar from '../ui/filterbar/FilterBar';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../auth/AuthContext';
import {  PRODUCTION_APPROVAL_ROLES, PRODUCTION_MANAGE_ROLES } from '../../auth/roles';
const allColumns = [
    { field: 'bomName', headerName: 'Bom Name', width: 200, type: 'string' },
    { field: 'parentItemCode', headerName: 'Product Code', width: 200, type: 'string' },
    { field: 'parentItemName', headerName: 'Product Name', width: 200, type: 'string' },
    { field: 'bomStatus', headerName: 'Status', width: 150, type: 'enum', options: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "INACTIVE", "OBSOLETE", "ARCHIVED"] },
    { field: 'revision', headerName: 'Revision', width: 100, type: "string" },
    { field: 'parentDrawingNumber', headerName: 'Drawing Number', width: 150, type: "string" },
    { field: 'effectiveFrom', headerName: 'Effectvie From ', width: 150, type: "Date" },
    { field: 'effectiveTo', headerName: 'Effective To', width: 150, type: 'Date' }
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
    let cols = allColumns.map(c => c.field);
    if (isNarrowDesktop) {
        cols = cols.filter(
            (field) =>
                !["parentDrawingNumber", "effectiveFrom", "effectiveTo"].includes(field)
        );
    }
    if (isMobile) {
        cols = cols.filter((field) => field !== "parentItemName");
    }
    return cols;
};


function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

const BomList = ({
    setLoading,
    loading,
    setError,
    handleAddNewBomClick
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isNarrowDesktop = useMediaQuery(theme.breakpoints.down("xl"));
    const [visibleCols, setVisibleCols] = useState(() =>
        getDefaultVisibleCols(isNarrowDesktop, isMobile)
    );
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
    const [bomList, setBomList] = useState([])
    const { hasAnyRole } = useAuth();
    const canManageBom = hasAnyRole(PRODUCTION_MANAGE_ROLES);
    const isAdminRole = hasAnyRole(PRODUCTION_APPROVAL_ROLES);

    const onPageChange = (page) => {

        setCurrentPage(page)
        handleApplyFilters(filters, page, sortBy, sortDir)
    }



    const handleFilterApplied = (data) => {
        setBomList(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements)
    };




    const resizingCol = useRef(null);
    const handleMouseDown = (e, field) => {
        resizingCol.current = {
            field,
            startX: e.clientX,
            startWidth: columnWidths[field]
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!resizingCol.current) return;

        const { field, startX, startWidth } = resizingCol.current;
        const diff = e.clientX - startX;

        setColumnWidths((prev) => ({
            ...prev,
            [field]: Math.max(80, startWidth + diff),
        }));
    };

    const handleMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };


    const handleEditClick = (id) => {
        if (!canManageBom) {
            return;
        }
        navigate(`/bom/edit/${id}`);
    };

    const onDeleteItem = async (id) => {
        try {
            await apiService.delete(`/bom/${id}`);

        } catch (err) {
            console.error(err);
            setError(err);
        }
    };

    const handleDeleteClick = async (id) => {
        window.confirm('Delete this item?') && await onDeleteItem(id);
        handleApplyFilters(filters, currentPage, sortBy, sortDir)

    }
    useEffect(() => {
        return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
    }, []);

    const handleColumnToggle = (field) => {
        setVisibleCols((prev) =>
            prev.includes(field)
                ? prev.filter((c) => c !== field)
                : [...prev, field]
        );
    };

    // ✅ UseMemo to ensure stable, filtered columns
    const displayedColumns = useMemo(() => {
        return stableColumns.filter((col) => visibleCols.includes(col.field));
    }, [stableColumns, visibleCols]);


    const [columnWidths, setColumnWidths] = useState(
        displayedColumns.reduce((acc, col) => {
            acc[col.field] = col.width || 150;
            return acc;
        }, {})
    );

    const tableMinWidth = useMemo(() => {
        const dynamicCols = displayedColumns.reduce((sum, col) => {
            const width = columnWidths[col.field] || col.width || 150;
            return sum + width;
        }, 0);
        return dynamicCols + 56 + 40 + 100;
    }, [displayedColumns, columnWidths]);

    const handleSortChange = (sortField) => {
        const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(sortField);
        setSortDir(newSortDir);
        handleApplyFilters(filters, currentPage, sortField, newSortDir)
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allIds = bomList.map(bom => bom.id);
            setSelectedRows(allIds);
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev =>
            prev.includes(id)
                ? prev.filter(rowId => rowId !== id)
                : [...prev, id]
        );
    };

    const handleChangeRowsPerPage = (event) => {

        setItemPerPage(parseInt(event.target.value, 10));

    };



    useEffect(() => {
        onPageChange(0)

    }, [itemsPerPage])

    const handleApplyFilters = async (appliedFilters = filters, page = currentPage, sortKey = sortBy, sortIn = sortDir) => {
        setLoading(true)
        try {
            const payload = {
                page: page,
                size: itemsPerPage,
                sortBy: sortKey,
                sortDir: sortIn,
                filters: appliedFilters.map(f => ({
                    field: f.field,
                    operator: f.operator,
                    value: f.value,
                })),
            };
            const response = await apiService.post("/bom/filter", payload);
            handleFilterApplied(response);
        } catch (err) {
            setError(err.message || "Something went wrong")
            console.error("Filter apply failed:", err);
        }
        setLoading(false)
    };

    return (

        <Box sx={{
            minHeight: "100%",
            padding: { xs: 1, sm: 2, md: 3 },
            fontFamily: "Roboto, Helvetica, Arial, sans-serif",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "hidden"

        }}>
            <Paper
                elevation={3}
                sx={{
                    padding: { xs: 1.25, sm: 2 },
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    margin: "auto",
                    borderRadius: 2
                }}
            >
                <Toolbar
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        gap: 1,
                        px: 1,
                        pb: 1
                    }}
                >
                    <Typography variant="h4" fontWeight={700} color="primary.main" >Manage BOMs</Typography>
                    <Box sx={{ position: 'relative', display: "flex", width: { xs: "100%", md: "auto" }, justifyContent: { xs: "stretch", md: "flex-end" } }}>


                        {canManageBom ? (
                            <Button
                                onClick={handleAddNewBomClick}
                                color="primary"
                                variant="contained"
                                sx={{ boxShadow: 3, borderRadius: 1, fontWeight: 200, ml: { xs: 0, md: 2 } }}
                            >
                                Add BOM
                            </Button>
                        ) : null}

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            PaperProps={{ style: { maxHeight: 420 } }}
                        >
                            {allColumns.map(col => (
                                <MenuItem
                                    key={col.field}
                                    onClick={() => handleColumnToggle(col.field)}
                                    dense
                                >
                                    <Checkbox
                                        checked={visibleCols.includes(col.field)}
                                        size="small"
                                    />
                                    <ListItemText primary={col.headerName} />
                                </MenuItem>
                            ))}
                        </Menu>


                    </Box>
                </Toolbar>
                <Divider sx={{ mb: 2 }} />

                <Box
                    sx={{
                        display: "flex",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        alignItems: { xs: "stretch", xl: "center" },
                        flexDirection: { xs: "column", xl: "row" },
                        gap: 1.5,
                        justifyContent: "space-between", // 👈 key: space between FilterBar and button
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
                        sx={{
                            minWidth: { xs: "100%", xl: 120 },
                            height: 36,
                            alignContent: "center",
                            textTransform: "none", // optional: keeps text normal case
                            flexShrink: 0,
                            alignSelf: { xs: "stretch", xl: "flex-start" },
                        }}
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                        COLUMNS
                    </Button>
                </Box>

                {
                    loading &&

                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Loading data...</Typography>
                    </Box>
                }
                {!loading &&
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            overflowX: "auto", // Enable horizontal scroll
                            overflowY: "visible",
                            position: "relative",
                        }}
                    >
                        <TableContainer component={Box} sx={{
                            borderRadius: 2,
                            background: "white",
                            maxHeight: "calc(100vh - 200px)", // Adjust based on your layout
                            overflowY: "auto", // Vertical scroll for table body
                            overflowX: "auto", // Horizontal scroll
                            width: "100%",
                            maxWidth: "100%",
                        }}>
                            <Table
                                stickyHeader
                                size="small"
                                sx={{
                                    tableLayout: "auto",
                                    minWidth: tableMinWidth,
                                    width: "100%",
                                    borderCollapse: "collapse",
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell

                                            padding="checkbox"
                                            style={{ paddingRight: "24px" }}
                                            sx={{
                                                background: "#00162cff",
                                                fontWeight: 600,
                                                fontSize: "1rem",
                                                color: "#dae3ee",
                                                letterSpacing: 0.4,
                                                borderBottom: "2px solid #dae3ee"
                                            }}
                                        >

                                            <Checkbox
                                                indeterminate={
                                                    selectedRows?.length > 0 &&
                                                    selectedRows?.length < bomList?.length
                                                }
                                                checked={
                                                    bomList?.length > 0 &&
                                                    selectedRows?.length === bomList?.length
                                                }
                                                onChange={handleSelectAll}
                                                sx={{
                                                    color: "white",                       // border color when unchecked
                                                    '&.Mui-checked': {
                                                        color: "white",                     // check color
                                                    },
                                                    '& .MuiSvgIcon-root': {
                                                        fontSize: 22,                       // optional: make checkbox slightly larger
                                                        border: '1px solid white',          // white border around the box
                                                        borderRadius: '4px',                // round edges
                                                    },
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255,255,255,0.1)', // subtle hover
                                                    },
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell

                                            align="center"
                                            sx={{
                                                position: "relative",
                                                width: "40px",
                                                minWidth: "20px",
                                                background: "#00162cff",
                                                color: "white",
                                                fontWeight: 600,
                                                userSelect: "none",
                                                borderRight: "1px solid #2e3b4e",
                                                cursor: "pointer",
                                                letterSpacing: 0.4,
                                                borderBottom: "2px solid #dae3ee"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                <span>{"#"}</span>
                                            </div>
                                        </TableCell>
                                        {displayedColumns?.map((col) => (
                                            <TableCell

                                                key={col.field}
                                                sx={{
                                                    position: "relative",
                                                    width: columnWidths[col.field],
                                                    minWidth: columnWidths[col.field],
                                                    background: "#00162cff",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    userSelect: "none",
                                                    borderRight: "1px solid #2e3b4e",
                                                    cursor: "pointer",
                                                    letterSpacing: 0.4,
                                                    borderBottom: "2px solid #dae3ee"
                                                }}
                                                onClick={() => handleSortChange(col.field)}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                    }}
                                                >
                                                    <span>{col.headerName}</span>

                                                    {/* Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, col.field)}
                                                        style={{
                                                            position: "absolute",
                                                            right: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: "6px",
                                                            cursor: "col-resize",
                                                            zIndex: 1,
                                                        }}
                                                    />
                                                </div>
                                            </TableCell>
                                        ))}
                                        <TableCell
                                            key="header-actions"
                                            align="center"
                                            sx={{
                                                width: "100px",
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                                color: "white",
                                                background: "#00162cff"
                                            }}
                                        >
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {bomList?.map((item, index) => (
                                        <TableRow key={item.id}>

                                            <TableCell padding="checkbox" align="center">
                                                <Checkbox
                                                    color="primary"
                                                    checked={selectedRows.includes(item.id)}
                                                    onChange={() => handleSelectRow(item.id)}
                                                />
                                            </TableCell>
                                            <TableCell align="center" onClick={() => {
                                                handleEditClick(item.id)
                                            }}
                                                hover
                                            >{(index + 1) + (itemsPerPage) * currentPage}</TableCell>

                                            {displayedColumns?.map((col, idx) => (

                                                <TableCell
                                                    key={`${item.id}-${col.field}`}
                                                    sx={{
                                                        width: col.width || "150px",
                                                        minWidth: col.width || "150px",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",

                                                    }}
                                                    align={col.align || "left"}
                                                    onClick={() => {
                                                        handleEditClick(item.id)
                                                    }}
                                                    hover


                                                >
                                                    {col.type?.toLowerCase() === "date"
                                                        ? (formatDate(item[col.field]) || "-")
                                                        : item[col.field] !== undefined && item[col.field] !== null
                                                            ? item[col.field].toString()
                                                            : "-"}
                                                </TableCell>
                                            ))}

                                            {/* Actions */}

                                            <TableCell align="center" onClick={null}>

                                                {isAdminRole &&
                                                    <IconButton
                                                        onClick={() => handleDeleteClick(item.id)}
                                                        size="small"
                                                        disabled={!canManageBom}
                                                    >
                                                        <DeleteIcon fontSize="small" sx={{ color: "rgba(211, 0, 0, 1)" }} />
                                                    </IconButton>
                                                }
                                            </TableCell>

                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    </Box>
                }

                {/* ===== Pagination ===== */}
                <TablePagination
                    component="div"
                    count={totalElements}
                    page={currentPage}
                    onPageChange={(e, page) => onPageChange(page)}
                    rowsPerPage={itemsPerPage}
                    rowsPerPageOptions={[5, 10]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper >
        </Box >
    );
};

export default BomList;


