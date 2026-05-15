import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Pagination, IconButton, Tooltip, Chip, Stack, Avatar,
  CircularProgress
} from '@mui/material';
import {
  DeleteForever, EditOutlined, Business, Description,
} from '@mui/icons-material';
import FilterBar from '../../ui/filterbar/FilterBar';
import { deleteSalesOrder, downloadSOPdf } from '../../../services/salesOrderService';

const STATUS_CONFIG = {
  DRAFT:                { label: 'Draft',             color: '#64748b', bg: '#f8fafc' },
  APPROVED:             { label: 'Approved',          color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS:          { label: 'In Progress',       color: '#7c3aed', bg: '#f5f3ff' },
  PARTIALLY_DISPATCHED: { label: 'Partial Dispatch',  color: '#d97706', bg: '#fffbeb' },
  FULLY_DISPATCHED:     { label: 'Fully Dispatched',  color: '#059669', bg: '#ecfdf5' },
  INVOICED:             { label: 'Invoiced',          color: '#0891b2', bg: '#ecfeff' },
  COMPLETED:            { label: 'Completed',         color: '#059669', bg: '#ecfdf5' },
  CANCELLED:            { label: 'Cancelled',         color: '#dc2626', bg: '#fef2f2' },
};

const APPROVAL_CONFIG = {
  DRAFT:            { label: 'Draft',            color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  APPROVED:         { label: 'Approved',         color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  REJECTED:         { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';

const SalesOrderList = ({
  quotationList, filters, handleSort, currentPage, totalPages,
  handlePageChange, activeFilters, handleApplyFilters, refreshList, loading
}) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);

  const handleEdit = (id) => navigate(`/sales/sales-order/edit/${id}`);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this sales order? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteSalesOrder(id);
      refreshList();
    } catch (err) {
      alert('Delete failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadPdf = async (id, orderNumber, e) => {
    e.stopPropagation();
    try {
      await downloadSOPdf(id, orderNumber);
    } catch {
      alert('Failed to download PDF.');
    }
  };

  const columns = [
    { field: 'orderNumber', headerName: 'Order Number', type: 'string' },
    { field: 'orderDate',   headerName: 'Date',         type: 'date' },
    { field: 'customerName',headerName: 'Customer',     type: 'string' },
    { field: 'poNumber',    headerName: 'PO Number',    type: 'string' },
    { field: 'netAmount',   headerName: 'Net Amount',   type: 'number' },
    { field: 'status',      headerName: 'Status',       type: 'enum', options: Object.keys(STATUS_CONFIG) },
  ];

  const SortHeader = ({ column, label, align = 'left' }) => {
    const isActive = filters?.sortBy === column;
    return (
      <TableCell align={align} sx={{
        fontWeight: 700, fontSize: '0.65625rem', color: '#64748b',
        bgcolor: HEADER_BG, cursor: 'pointer',
        borderBottom: `1px solid ${BORDER_COLOR}`, whiteSpace: 'nowrap',
        userSelect: 'none', letterSpacing: '0.05em', textTransform: 'uppercase',
        '&:hover': { color: '#1e293b' },
      }} onClick={() => handleSort(column)}>
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={align === 'center' ? 'center' : 'flex-start'}>
          <span>{label}</span>
          {isActive && <Typography variant="caption" sx={{ fontSize: 10 }}>{filters.sortDir === 'asc' ? '↑' : '↓'}</Typography>}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER_COLOR}` }}>
        <FilterBar allColumns={columns} filters={activeFilters} handleApplyFilters={handleApplyFilters} setFilters={() => {}} />
      </Box>

      <TableContainer component={Box}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeader column="orderNumber" label="Order Details" />
              <SortHeader column="customerName" label="Customer" />
              <SortHeader column="poNumber" label="Ref. PO" />
              <SortHeader column="netAmount" label="Financials" />
              <SortHeader column="status" label="Status" align="center" />
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.65625rem', color: '#64748b', bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER_COLOR}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : !quotationList?.length ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary" variant="body2">No sales orders found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              quotationList.map((row) => {
                const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.DRAFT;
                const apCfg = APPROVAL_CONFIG[row.approvalStatus] || APPROVAL_CONFIG.DRAFT;
                const total = parseFloat(row.netAmount) || 0;

                return (
                  <TableRow key={row.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.1s' }}
                    onClick={() => handleEdit(row.id)}>

                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: `${cfg.color}15`, color: cfg.color }}>
                          <Description sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{row.orderNumber}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {row.orderDate}
                            {row.deliveryDate && ` · Due ${row.deliveryDate}`}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Business sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>{row.customerName || 'N/A'}</Typography>
                          {row.email && <Typography variant="caption" color="text.secondary">{row.email}</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {row.poNumber
                        ? <Typography variant="body2" sx={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>{row.poNumber}</Typography>
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                        {row.currency || 'INR'} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack spacing={0.5} alignItems="center">
                        <Chip label={cfg.label} size="small"
                          sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: cfg.bg, color: cfg.color, height: 20, border: `1px solid ${cfg.color}30` }} />
                        {row.approvalStatus && row.approvalStatus !== 'DRAFT' && (
                          <Chip label={apCfg.label} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: apCfg.bg, color: apCfg.color, height: 18, border: `1px solid ${apCfg.border}` }} />
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Download PDF">
                          <IconButton size="small" onClick={(e) => handleDownloadPdf(row.id, row.orderNumber, e)} sx={{ color: '#64748b', '&:hover': { color: '#0ea5e9' } }}>
                            <Description sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Order">
                          <IconButton size="small" onClick={() => handleEdit(row.id)} sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}>
                            <EditOutlined sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" disabled={deleting === row.id}
                            onClick={(e) => handleDelete(row.id, e)}
                            sx={{ color: '#64748b', '&:hover': { color: '#dc2626' } }}>
                            {deleting === row.id ? <CircularProgress size={14} /> : <DeleteForever sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: HEADER_BG }}>
        <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" shape="rounded" size="small" />
      </Box>
    </Box>
  );
};

export default SalesOrderList;
