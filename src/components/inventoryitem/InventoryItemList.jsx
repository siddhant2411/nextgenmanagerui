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
  CircularProgress
} from '@mui/material';
import { BuildCircle, DiamondRounded, Done, FmdGoodRounded, GppGoodSharp, Inventory2Rounded, ProductionQuantityLimits, Tune as TuneIcon, WorkOff } from "@mui/icons-material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useNavigate } from 'react-router-dom';
import './style/InventoryItem.css';
import FilterBar from '../ui/filterbar/FilterBar';
import apiService from '../../services/apiService';
import { CheckCircleIcon, Hammer, PackageIcon } from 'lucide-react';
import BulkImportItems from './BulkImportItems';

const allColumns = [
  { field: 'itemCode', headerName: 'Product Code', width: 120, type: 'string' },
  { field: 'name', headerName: 'Product Name', width: 180, type: 'string' },
  { field: 'hsnCode', headerName: 'HSN Code', width: 90, type: 'string' },
  { field: 'uom', headerName: 'UOM', width: 80, type: "enum", options: ["NOS", "KG", "METER", "INCH"] },
  { field: 'itemType', headerName: 'Type', width: 120, type: "enum", options: ["RAW_MATERIAL", "ASSEMBLY", "FINISHED_GOOD"] },
  { field: 'basicMaterial', headerName: 'Material', width: 130, type: 'string' },
  { field: 'dimension', headerName: 'Dimension', width: 100, type: 'string' },
  { field: 'weight', headerName: 'Weight', width: 90, type: 'number' },
  { field: 'availableQuantity', headerName: 'Stock', width: 130, type: 'number' },
  { field: 'sellingPrice', headerName: 'Price', width: 120, type: 'number' },
  { field: 'revision', headerName: 'Revision', width: 80, type: 'string' },
  { field: 'drawingNumber', headerName: 'Drawing No.', width: 130, type: 'string' },
];


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
  const debounceTimeout = useRef(null);
  const [openRow, setOpenRow] = React.useState(null);
  const [visibleCols, setVisibleCols] = useState(allColumns.map(c => c.field));
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
    handleApplyFilters(filters,currentPage,sortBy,sortDir)
    
  }

    useEffect(() => {
      return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
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
      displayedColumns.reduce((acc, col) => {
        acc[col.field] = col.width || 150;
        return acc;
      }, {})
    );

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

    return (
      <Box sx={{
        minHeight: "100%",
        padding: 3,
        fontFamily: "Roboto, Helvetica, Arial, sans-serif",
        maxWidth: "300lvh"

      }}>


        <Paper elevation={3} sx={{ padding: 2, maxWidth: "100%", margin: "auto", borderRadius: 2 }}>
          <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pb: 1 }}>
            <Typography variant="h4" fontWeight={700} color="primary.main" >Manage Products</Typography>
            <Box sx={{ position: 'relative' }}>

              <BulkImportItems />

              <Button
                onClick={handleAddNewItemClick}
                color="primary"
                variant="contained"
                sx={{ boxShadow: 3, borderRadius: 1, fontWeight: 200, ml:2 }}
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

          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between", // 👈 key: space between FilterBar and button
            }}
          >
            <FilterBar
              allColumns={allColumns}
              filters={filters}
              setFilters={setFilters}
              page={currentPage}
              handleApplyFilters={handleApplyFilters}
            />

            <Button
              startIcon={<TuneIcon />}
              variant="outlined"
              sx={{
                minWidth: 120,
                ml: 1,
                height: 36,
                alignContent: "center",
                textTransform: "none", // optional: keeps text normal case
              }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              COLUMNS
            </Button>
          </div>


          {
            loading &&

            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading data...</Typography>
            </Box>
          }
          {!loading &&
            <>
              <TableContainer component={Box} sx={{ borderRadius: 2, background: "white" }}>
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  {/* ===== Table Head ===== */}

                  <TableHead
                  >
                    <TableRow
                      sx={{ bgcolor: "red" }}
                      style={{ backgroundColor: "#FF0000" }}
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
                          background: "#00162cff",
                          fontWeight: 600,
                          fontSize: "1rem",
                          color: "white",
                          letterSpacing: 0.4,
                          borderBottom: "2px solid #dae3ee",

                        }}
                      >
                        #
                      </TableCell>

                      {/* Dynamic Columns */}
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
                          onClick={()=>handleSortChange(col.field)}
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
                              width: col.width || "150px",
                              minWidth: col.width || "150px",
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
            </>
          }
        </Paper>

      </Box>
    );
  };

  export default InventoryItemList;
