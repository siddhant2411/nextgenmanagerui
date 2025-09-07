import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Toolbar,
  Divider
} from "@mui/material";
import { Tune as TuneIcon } from "@mui/icons-material";
import apiService from "../../../services/apiService";
import { useNavigate } from "react-router-dom";

const allColumns = [
  { field: 'orderNumber', headerName: 'Order No.', width: 160, align: 'left' },
  { field: 'orderDate', headerName: 'Order Date', width: 120, align: 'center', valueFormatter: p => formatDate(p) },
  { field: 'customerName', headerName: 'Customer', width: 180, align: 'left' },
  { field: 'poNumber', headerName: 'PO Number', width: 150, align: 'left' },
  { field: 'quotationRef', headerName: 'Quotation', width: 150, align: 'left' },
  { field: 'netAmount', headerName: 'Net Amount', width: 130, align: 'right', valueFormatter: p => formatAmount(p) },
  { field: 'status', headerName: 'Status', width: 120, align: 'center' },
  { field: 'deliveryDate', headerName: 'Delivery Date', width: 120, align: 'center', valueFormatter: p => formatDate(p) },
  { field: 'dispatchThrough', headerName: 'Dispatch', width: 150, align: 'left' },
  { field: 'updatedDate', headerName: 'Updated', width: 150, align: 'center', valueFormatter: p => formatDateTime(p) },
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



const SalesOrderRegister = () => {
  const [rows, setRows] = useState([]);
  const [visibleCols, setVisibleCols] = useState(allColumns.map(c => c.field));
  const [anchorEl, setAnchorEl] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    // Update this as per your API response
    const res = await apiService.get("/sales-orders");
    // Use res.data or res as per your data shape
    const data = (res.data || res).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerName: order.customer?.companyName,
      poNumber: order.poNumber,
      quotationRef: order.quotation?.qtnNo,
      netAmount: order.netAmount,
      status: order.status,
      deliveryDate: order.deliveryDate,
      dispatchThrough: order.dispatchThrough,
      updatedDate: order.updatedDate
    }));
    setRows(data);
  };

  const handleColumnToggle = (field) => {
    setVisibleCols(prev =>
      prev.includes(field) ? prev.filter(c => c !== field) : [...prev, field]
    );
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedColumns = allColumns.filter(col => visibleCols.includes(col.field));
  const navigate = useNavigate();


  const onAdd = () => {
    navigate(`/sales/sales-order/add`)
  }
  return (
    <Box sx={{
      background: "#f6f7fb",
      minHeight: "100vh",
      padding: 3,
      fontFamily: "Roboto, Helvetica, Arial, sans-serif"
    }}>
      <Paper elevation={3} sx={{ padding: 2, maxWidth: "100%", margin: "auto", borderRadius: 2 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pb: 1 }}>
          <Typography variant="h5" fontWeight={700} color="primary.main">Sales Order Register</Typography>
          <Box sx={{ position: 'relative', /* rest of styling above */ }}>
            {/* ...existing header and table */}

            {/* Floating action button for "Create Sales Order" */}
            <Box sx={{
              position: "fixed",
              bottom: 32,
              right: 32,
              zIndex: 1000
            }}>
              <Button
                onClick={onAdd}
                color="primary"
                variant="contained"
                sx={{ boxShadow: 3, borderRadius: 8, px: 3, py: 1.5, fontWeight: 700 }}
              >
                + Create Sales Order
              </Button>
            </Box>
            <Button
              startIcon={<TuneIcon />}
              variant="outlined"
              sx={{ minWidth: 120, ml: 1 }}
              onClick={e => setAnchorEl(e.currentTarget)}
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
        <TableContainer component={Box} sx={{ maxHeight: 450, borderRadius: 2, background: "white" }}>
          <Table stickyHeader size="small" aria-label="Sales Orders Table">
            <TableHead>
              <TableRow>
                {displayedColumns.map(col => (
                  <TableCell
                    key={col.field}
                    align={col.align || 'left'}
                    sx={{
                      minWidth: col.width,
                      background: "#e3e8ef",
                      fontWeight: 600,
                      fontSize: "1rem",
                      color: "#345",
                      letterSpacing: 0.4,
                      borderBottom: "2px solid #dae3ee"
                    }}
                  >
                    {col.headerName}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell align="center" colSpan={displayedColumns.length}>
                    <Typography color="text.secondary">No data found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, idx) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => {
                      navigate(`/sales/sales-order/edit/${row.id}`)
                    }}
                    sx={{
                      bgcolor:
                        idx % 2 === 0 ? "#f7fafc" : "white",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      "&:hover": {
                        background: "#e5f1fb"
                      }
                    }}
                  >
                    {displayedColumns.map(col => (
                      <TableCell
                        key={col.field}
                        align={col.align || 'left'}
                        sx={{
                          fontSize: ".94rem",
                          fontWeight: 400,
                          color: "#222",
                          borderBottom: "1px solid #f0f0f0"
                        }}
                      >
                        {col.valueFormatter
                          ? col.valueFormatter(row[col.field])
                          : row[col.field]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          sx={{
            ".MuiTablePagination-toolbar": { pl: 0, pr: 0, bgcolor: "white", borderRadius: 1 },
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { fontWeight: 400, fontSize: ".95rem" }
          }}
        />
      </Paper>
    </Box>
  );
};

export default SalesOrderRegister;
