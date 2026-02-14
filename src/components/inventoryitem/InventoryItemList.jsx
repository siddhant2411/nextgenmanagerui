import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  TextField, Paper, Typography, Collapse,
  Divider,
  ListItemText,
  Toolbar,
  Menu,
  MenuItem,
  Checkbox,
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { BuildCircle, DiamondRounded, Done, FmdGoodRounded, GppGoodSharp, Inventory2Rounded, ProductionQuantityLimits, Tune as TuneIcon, WorkOff } from "@mui/icons-material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useNavigate } from 'react-router-dom';
// import './style/InventoryItem.css';
import FilterBar from '../ui/filterbar/FilterBar';
import apiService from '../../services/apiService';
import { CheckCircleIcon, Hammer, PackageIcon } from 'lucide-react';
import BulkImportItems from './BulkImportItems';

const allColumns = [
  { field: 'itemCode', headerName: 'Product Code', width: 100, type: 'string' },
  { field: 'name', headerName: 'Product Name', width: 150, type: 'string' },
  { field: 'hsnCode', headerName: 'HSN Code', width: 80, type: 'string' },
  { field: 'uom', headerName: 'UOM', width: 70, type: "enum", options: ["NOS", "KG", "METER", "INCH"] },
  { field: 'itemType', headerName: 'Type', width: 100, type: "enum", options: ["RAW_MATERIAL", "ASSEMBLY", "FINISHED_GOOD"] },
  { field: 'basicMaterial', headerName: 'Material', width: 110, type: 'string' },
  { field: 'dimension', headerName: 'Dimension', width: 90, type: 'string' },
  { field: 'weight', headerName: 'Weight', width: 80, type: 'number' },
  { field: 'availableQuantity', headerName: 'Stock', width: 100, type: 'number' },
  { field: 'sellingPrice', headerName: 'Price', width: 100, type: 'number' },
  { field: 'revision', headerName: 'Revision', width: 70, type: 'string' },
  { field: 'drawingNumber', headerName: 'Drawing No.', width: 110, type: 'string' },
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
  let cols = allColumns.map(c => c.field);
  if (isNarrowDesktop) {
    cols = cols.filter(
      (field) =>
        !["dimension", "weight", "revision", "drawingNumber"].includes(field)
    );
  }
  if (isMobile) {
    cols = cols.filter(
      (field) =>
        !["hsnCode", "basicMaterial", "dimension", "weight", "revision", "drawingNumber"].includes(field)
    );
  }
  return cols;
};


function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB');
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatAmount(num) {
  if (num == null) return "";
  // You can set currency or localization as per your ERP
  return Number(num).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
}


const InventoryItemList = ({
  onDeleteItem,
  loading,
  setLoading,
  error,
  setError,
  handleAddNewItemClick,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isNarrowDesktop = useMediaQuery(theme.breakpoints.down('xl'));
  const debounceTimeout = useRef(null);
  const tableContainerRef = useRef(null);
  const [openRow, setOpenRow] = React.useState(null);
  const [visibleCols, setVisibleCols] = useState(() =>
    getDefaultVisibleCols(isNarrowDesktop, isMobile)
  );
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

  const handleFilterApplied = (data) => {
    setInventoryItems(data.content);
    setTotalPages(data.totalPages);
    setTotalElements(data.totalElements)
  };

  const handleEditClick = (id) => {
    navigate(`/inventory-item/edit/${id}`)

  };
  const handleDeleteClick = async (id) => {
    window.confirm('Delete this item?') && await onDeleteItem(id);
    handleApplyFilters(filters, currentPage, sortBy, sortDir)

  }

  useEffect(() => {
    return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
  }, []);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    const element = tableContainerRef.current;
    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth) {
        setTableContainerWidth(nextWidth);
      }
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) {
        setTableContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleRowToggle = (id) => {
    setOpenRow(openRow === id ? null : id);
  };


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


  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = inventoryItems.map(item => item.inventoryItemId);
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
      const response = await apiService.post("/inventory_item/filter", payload);
      handleFilterApplied(response);
    } catch (err) {
      setError(err.message || "Something went wrong")
      console.error("Filter apply failed:", err);
    }
    setLoading(false)
  };

  const onPageChange = (page) => {
    console.log("Current Page:" + currentPage)
    console.log("onPageChange " + page)
    setCurrentPage(page)
    handleApplyFilters(filters, page, sortBy, sortDir)
  }

  const typeIcons = {
    FINISHED_GOOD: {
      icon: <PackageIcon size={20} color='#4CAF50' aria-label="Finished Good" />, // green
      label: "Finished Good",
    },
    RAW_MATERIAL: {
      icon: <Hammer color="#FF9800" />, // orange
      label: "Raw Material",
    },
    ASSEMBLY: {
      icon: <BuildCircle sx={{ color: "#2196F3" }} size={15} />, // blue
      label: "Assembly",
    },
  };



  const handleSortChange = (sortField) => {
    console.log(sortField)
    const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(sortField);
    setSortDir(newSortDir);
    handleApplyFilters(filters, currentPage, sortField, newSortDir)
  };

  const handleChangeRowsPerPage = (event) => {

    setItemPerPage(parseInt(event.target.value, 10));

  };
  useEffect(() => {
    onPageChange(0)

  }, [itemsPerPage])

  const [columnWidths, setColumnWidths] = useState(
    allColumns.reduce((acc, col) => {
      acc[col.field] = col.width || 150;
      return acc;
    }, {})
  );

  const getBaseWidth = (field) => {
    return columnWidths[field] || allColumns.find((c) => c.field === field)?.width || 150;
  };

  const extraColumnsWidth = 56 + 40 + 100;

  const { scaledColumnWidths, tableMinWidth } = useMemo(() => {
    const baseWidths = displayedColumns.map((col) => ({
      field: col.field,
      width: getBaseWidth(col.field),
    }));
    const dataWidthTotal = baseWidths.reduce((sum, col) => sum + col.width, 0);
    const availableWidth = tableContainerWidth || dataWidthTotal + extraColumnsWidth;
    const availableForData = Math.max(0, availableWidth - extraColumnsWidth);
    const scale =
      dataWidthTotal > availableForData && availableForData > 0
        ? availableForData / dataWidthTotal
        : 1;

    const scaled = baseWidths.reduce((acc, col) => {
      acc[col.field] = Math.max(60, Math.floor(col.width * scale));
      return acc;
    }, {});

    return {
      scaledColumnWidths: scaled,
      tableMinWidth: Math.min(dataWidthTotal + extraColumnsWidth, availableWidth),
    };
  }, [displayedColumns, columnWidths, tableContainerWidth]);

  const resizingCol = useRef(null);
  const handleMouseDown = (e, field) => {
    resizingCol.current = {
      field,
      startX: e.clientX,
      startWidth: getBaseWidth(field)
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
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pb: 1, flexDirection: { xs: 'column', md: 'row' }, gap: 1 }}>
          <Typography variant="h4" fontWeight={700} color="primary.main" >Manage Products</Typography>
          <Box sx={{ position: 'relative', display: 'flex', gap: 1, flexWrap: 'wrap' }}>

            <BulkImportItems />

            <Button
              onClick={handleAddNewItemClick}
              color="primary"
              variant="contained"
              sx={{ boxShadow: 3, borderRadius: 1, fontWeight: 200, ml: { xs: 0, md: 2 } }}
            >
              Add Product
            </Button>


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
            justifyContent: "space-between",
            flexDirection: { xs: 'column', xl: 'row' },
            gap: 1.5
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
              textTransform: "none",
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
            <TableContainer
              component={Box}
              ref={tableContainerRef}
              sx={{
                borderRadius: 2,
                background: "white",
                maxHeight: "calc(100vh - 200px)", // Adjust based on your layout
                overflowY: "auto", // Vertical scroll for table body
                overflowX: "auto", // Horizontal scroll
                width: "100%",
                maxWidth: "100%",
            }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  tableLayout: "fixed",
                  minWidth: tableMinWidth,
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                {/* ===== Table Head ===== */}

                <TableHead
                >
                  <TableRow

                  >
                    {/* Select All Checkbox */}
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
                          selectedRows?.length < inventoryItems?.length
                        }
                        checked={
                          inventoryItems?.length > 0 &&
                          selectedRows?.length === inventoryItems?.length
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

                    {/* Index Column */}
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

                    {/* Dynamic Columns */}
                    {displayedColumns?.map((col) => (
                      <TableCell

                        key={col.field}
                        sx={{
                          position: "relative",
                          width: scaledColumnWidths[col.field] || col.width || 150,
                          maxWidth: scaledColumnWidths[col.field] || col.width || 150,
                          minWidth: 0,
                          background: "#00162cff",
                          color: "white",
                          fontWeight: 600,
                          userSelect: "none",
                          borderRight: "1px solid #2e3b4e",
                          cursor: "pointer",
                          letterSpacing: 0.4,
                          borderBottom: "2px solid #dae3ee",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        onClick={() => handleSortChange(col.field)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {col.headerName}
                          </span>

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

                    {/* Actions Column */}
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

                {/* ===== Table Body ===== */}
                <TableBody>
                  {inventoryItems?.map((item, index) => (
                    <TableRow key={item.inventoryItemId}
                      sx={{ background: index % 2 === 0 ? "#f1f1f1ff" : "white", cursor: "pointer", }}

                    >
                      {/* Row Checkbox */}
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          color="primary"
                          checked={selectedRows.includes(item.inventoryItemId)}
                          onChange={() => handleSelectRow(item.inventoryItemId)}
                        />
                      </TableCell>

                      {/* Index */}
                      <TableCell align="center" onClick={() => {
                        handleEditClick(item.inventoryItemId)
                      }}
                        hover
                      >{(index + 1) + (itemsPerPage) * currentPage}</TableCell>

                      {/* Dynamic Columns */}
                      {displayedColumns?.map((col, idx) => (

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
                          onClick={() => {
                            handleEditClick(item.inventoryItemId)
                          }}
                          hover


                        >
                          {
                            col.field == "itemType" ? typeIcons[item[col.field]].icon :
                              item[col.field] !== undefined && item[col.field] !== null
                                ? item[col.field].toString()
                                : "-"

                          }
                        </TableCell>
                      ))}

                      {/* Actions */}
                      <TableCell align="center" onClick={null}>

                        <IconButton
                          onClick={() => handleDeleteClick(item.inventoryItemId)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" sx={{ color: "rgba(211, 0, 0, 1)" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>


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
          </Box>
        }
      </Paper>

    </Box>
  );
};

export default InventoryItemList;
