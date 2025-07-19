import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  TablePagination,
  Tooltip,
  MenuItem
} from '@mui/material';
import { Search, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import { format } from 'date-fns';
import { Snackbar, Alert } from '@mui/material';
import CreateInventoryRequestForm from './CreateInventoryRequestForm';
const InventoryRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRequests, setTotalRequests] = useState(0);

  // Filters
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [source, setSource] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('PENDING');
  const [referenceId, setReferenceId] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const debounceTimeout = useRef(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    fetchRequests();
  }, [page, rowsPerPage]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: rowsPerPage,
        itemCode: itemCode || undefined,
        itemName: itemName || undefined,
        source: source || undefined,
        approvalStatus: approvalStatus || undefined,
        referenceId: referenceId || undefined
      };
      const res = await apiService.get('/inventory/requests/grouped', params);
      setRequests(res.content || []);
      setTotalRequests(res.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch grouped requests:', err);
      showSnackbar('Failed to load requests. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };



  // Watch these filters and debounce fetch
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setPage(0);
      fetchRequests();
    }, 500);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [itemCode, itemName, source, approvalStatus, referenceId, page, rowsPerPage]);


  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
  };
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleApprove = async (id) => {
    try {
      const approvedBy = 'managerUser';
      const approvalRemarks = 'Approved by manager';
      const endpoint =
        `/inventory/requests/approve?requestId=${id}` +
        `&approvedBy=${encodeURIComponent(approvedBy)}` +
        `&approvalRemarks=${encodeURIComponent(approvalRemarks)}`;
      await apiService.put(endpoint, {});
      showSnackbar('Request approved successfully!', 'success');
      fetchRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
      showSnackbar(err.response.data, 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      const approvedBy = 'managerUser';
      const approvalRemarks = 'Rejected by manager';
      const endpoint =
        `/inventory/requests/reject?requestId=${id}` +
        `&approvedBy=${encodeURIComponent(approvedBy)}` +
        `&approvalRemarks=${encodeURIComponent(approvalRemarks)}`;
      await apiService.put(endpoint, {});
      showSnackbar('Request rejected successfully!', 'info');
      fetchRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
      showSnackbar('Failed to reject the request. Please try again.', 'error');
    }
  };
  const statusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#f0ad4e';
      case 'APPROVED':
        return '#5cb85c';
      case 'REJECTED':
        return '#d9534f';
      default:
        return '#777';
    }
  };

  const sourceText = (source) => {
    switch (source) {
      case 'WORK_ORDER':
        return "Work Order"
      case 'SALES_ORDER':
        return "Sales Order"
      default:
        return "Other"
    }
  }
  return (
    <Box sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
      {/* Filters */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>

        <TextField
          value={referenceId}
          onChange={handleFilterChange(setReferenceId)}
          placeholder="Reference ID"
          size="small"
          label="request id"
          sx={{ width: '160px' }}
        />
        <TextField
          value={itemCode}
          onChange={handleFilterChange(setItemCode)}
          placeholder="Filter by Item Code"
          size="small"
          label="Item Code"
          sx={{ width: '160px' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          value={itemName}
          onChange={handleFilterChange(setItemName)}
          placeholder="Filter by Item Name"
          size="small"
          label="item Name"
          sx={{ width: '160px' }}
        />
        <TextField
          select
          value={source}
          onChange={handleFilterChange(setSource)}
          size="small"

          label="Request Source"
          sx={{ width: '160px' }}
        >
          <MenuItem value="">All Sources</MenuItem>
          <MenuItem value="WORK_ORDER">Work Order</MenuItem>
          <MenuItem value="PURCHASE_ORDER">Purchase Order</MenuItem>
        </TextField>
        <TextField
          select
          value={approvalStatus}
          onChange={handleFilterChange(setApprovalStatus)}
          size="small"
          label="Approval Status"
          sx={{ width: '160px' }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="BOOKED">Booked</MenuItem>
          <MenuItem value="CONSUMED">Consumed</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
        </TextField>

        <Button variant="contained" onClick={() => setOpenDialog(true)}>Create Request</Button>
      </Box>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Request Code</b></TableCell>
                <TableCell><b>Item</b></TableCell>
                <TableCell align="center"><b>Required Qty</b></TableCell>
                <TableCell align="center"><b>Available Qty</b></TableCell>
                <TableCell align="center"><b>Pending Qty</b></TableCell>
                <TableCell align="center"><b>Status</b></TableCell>
                <TableCell><b>Requested By</b></TableCell>
                <TableCell><b>Requested On</b></TableCell>
                <TableCell align="center"><b>Action</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>{sourceText(req.source)} / {req.referenceId}</TableCell>
                  <TableCell>{req.itemName}</TableCell>
                  <TableCell align="center">{req.totalRequiredQty}</TableCell>
                  <TableCell align="center">{req.requestedQty}</TableCell>
                  <TableCell align="center">{req.pendingQty}</TableCell>
                  <TableCell align="center">
                    <span style={{ fontWeight: 'bold', color: statusColor(req.approvalStatus) }}>
                      {req.approvalStatus}
                    </span>
                  </TableCell>
                  <TableCell>{req.requestedBy}</TableCell>
                  <TableCell> {req.firstRequestedDate ? format(new Date(req.firstRequestedDate), 'dd-MM-yyyy') : ''}</TableCell>
                  <TableCell align="center">
                    {req.approvalStatus === 'PENDING' ? (
                      <>
                        <Tooltip title="Approve Request">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Request">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReject(req.id)}
                          >
                            ✖️
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <span style={{ color: '#888' }}>—</span>
                    )}
                  </TableCell>

                </TableRow>
              ))}
              {requests.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRequests}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <CreateInventoryRequestForm
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </Box>
  );
};

export default InventoryRequestList;
