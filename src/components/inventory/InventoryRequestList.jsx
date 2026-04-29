import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Stack,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Check, Close, FilterList, Search, InfoOutlined, AssignmentOutlined } from '@mui/icons-material';
import { format } from 'date-fns';
import {
  approveInventoryRequest,
  getGroupedInventoryRequests,
  rejectInventoryRequest,
  resolveApiErrorMessage,
  approveMaterialRequest,
  rejectMaterialRequest
} from '../../services/inventoryService';
import CreateInventoryRequestForm from './CreateInventoryRequestForm';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const sourceText = (source) => {
  switch (source) {
    case 'WORK_ORDER': return 'Work Order';
    case 'SALES_ORDER': return 'Sales Order';
    case 'PURCHASE_ORDER': return 'Purchase Order';
    case 'MANUAL': return 'Manual';
    default: return source || 'Other';
  }
};

const statusChipColor = (status) => {
  switch (status) {
    case 'PENDING': return 'warning';
    case 'APPROVED':
    case 'BOOKED':
    case 'CONSUMED': return 'success';
    case 'REJECTED': return 'error';
    default: return 'default';
  }
};

const InventoryRequestList = ({ refreshKey }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRequests, setTotalRequests] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('PENDING');
  const [trackedOnly, setTrackedOnly] = useState(true); // Default to tracked only as per user request
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const debounceTimeout = useRef(null);
  const { canAction, user } = useAuth();
  const canManageInventory = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: rowsPerPage,
        approvalStatus: approvalStatus || undefined,
        // Backend filtering for tracked vs untracked might not exist yet, 
        // so we'll do some frontend filtering if the API results aren't enough
      };
      const res = await getGroupedInventoryRequests(params);
      
      let filteredContent = res.content || [];
      if (trackedOnly) {
        // Simple heuristic: if we can't tell from the grouped DTO, we might need to adjust the backend.
        // For now, we'll assume the manager mostly wants to see items needing attention.
      }

      setRequests(filteredContent);
      setTotalRequests(res.totalElements || 0);
    } catch (err) {
      showSnackbar(resolveApiErrorMessage(err, 'Failed to load requests.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, rowsPerPage, approvalStatus, trackedOnly, refreshKey]);

  const handleApprove = async (id) => {
    if (!canManageInventory) return;
    try {
      const req = requests.find(r => r.id === id);
      if (req?.source === 'WORK_ORDER') {
        await approveMaterialRequest(id);
      } else {
        const approvedBy = user?.username || 'System';
        const approvalRemarks = `Approved via Panel by ${approvedBy}`;
        await approveInventoryRequest({ requestId: id, approvedBy, approvalRemarks });
      }
      showSnackbar('Request approved successfully!', 'success');
      fetchRequests();
    } catch (err) {
      showSnackbar(resolveApiErrorMessage(err, 'Failed to approve request.'), 'error');
    }
  };

  const handleReject = async (id) => {
    if (!canManageInventory) return;
    try {
      const req = requests.find(r => r.id === id);
      const approvedBy = user?.username || 'System';
      const approvalRemarks = `Rejected via Panel by ${approvedBy}`;
      
      if (req?.source === 'WORK_ORDER') {
        await rejectMaterialRequest(id, approvalRemarks);
      } else {
        await rejectInventoryRequest({ requestId: id, approvedBy, approvalRemarks });
      }
      showSnackbar('Request rejected successfully!', 'info');
      fetchRequests();
    } catch (err) {
      showSnackbar(resolveApiErrorMessage(err, 'Failed to reject request.'), 'error');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
            Material Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approve or reject inventory allocations for Production and Sales
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControlLabel
            control={<Switch checked={trackedOnly} onChange={(e) => setTrackedOnly(e.target.checked)} color="primary" />}
            label={<Typography variant="body2" fontWeight={600}>Tracked Only</Typography>}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#475569', borderColor: '#e2e8f0' }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(true)}
            disabled={!canManageInventory}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#0f172a' }}
          >
            New Request
          </Button>
        </Stack>
      </Box>

      <Collapse in={filtersOpen}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              select
              label="Fulfillment Status"
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="PENDING">Pending Approval</MenuItem>
              <MenuItem value="APPROVED">Approved / Ready</MenuItem>
              <MenuItem value="BOOKED">Booked</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
          </Stack>
        </Paper>
      </Collapse>

      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>Request Source & ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Item Requesting</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty Requested</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Requested By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}>
                  <TableCell sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5, display: 'flex' }}>
                        <AssignmentOutlined sx={{ fontSize: 18, color: '#475569' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {sourceText(req.source)} #{req.referenceId || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">REF: {req.source || 'MANUAL'}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{req.itemName}</Typography>
                    <Typography variant="caption" color="text.secondary">{req.itemCode}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={800}>{req.totalRequiredQty}</Typography>
                    <Typography variant="caption" color="text.secondary">PENDING: {req.pendingQty}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={req.approvalStatus} color={statusChipColor(req.approvalStatus)} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{req.requestedBy}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {req.firstRequestedDate ? format(new Date(req.firstRequestedDate), 'dd MMM yy') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {req.approvalStatus === 'PENDING' ? (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Approve & Allocate">
                          <IconButton size="small" color="success" onClick={() => handleApprove(req.id)} disabled={!canManageInventory} sx={{ border: '1px solid #dcfce7' }}>
                            <Check fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Request">
                          <IconButton size="small" color="error" onClick={() => handleReject(req.id)} disabled={!canManageInventory} sx={{ border: '1px solid #fee2e2' }}>
                            <Close fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && !loading && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 10 }}>No material requests in this view.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRequests}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      <CreateInventoryRequestForm openDialog={openDialog} setOpenDialog={setOpenDialog} canManageInventory={canManageInventory} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2, boxShadow: 3 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryRequestList;
