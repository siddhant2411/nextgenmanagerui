import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Pagination, IconButton, Tooltip, Chip, Stack, Avatar, Button,
  Select, MenuItem
} from '@mui/material';
import {
  DeleteForever, EditOutlined, Business, Description, AttachMoney, Autorenew, PlayArrow, Email
} from '@mui/icons-material';
import FilterBar from '../ui/filterbar/FilterBar';
import QuotationTemplatePicker, { sendComposedQuotation, WhatsAppIcon } from './QuotationTemplatePicker';
import apiService from '../../services/apiService';
import { formatMoney } from '../common/currency';

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: '#f8fafc' },
  SENT:      { label: 'Sent',      color: '#2563eb', bg: '#eff6ff' },
  ACCEPTED:  { label: 'Accepted',  color: '#059669', bg: '#ecfdf5' },
  REJECTED:  { label: 'Rejected',  color: '#dc2626', bg: '#fef2f2' },
  REVISED:   { label: 'Revised',   color: '#d97706', bg: '#fffbeb' },
};

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';

const QuotationList = ({
  quotationList, filters, handleSort, currentPage, totalPages,
  handlePageChange, handleDelete, activeFilters, handleApplyFilters, refreshList
}) => {
  const navigate = useNavigate();
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [templatePicker, setTemplatePicker] = useState({ open: false, channel: 'WHATSAPP', quotation: null });

  const handleEdit = (id) => navigate(`/quotation/edit/${id}`);

  const handleStatusChange = async (id, newStatus, e) => {
    e.stopPropagation();
    setStatusUpdating(id);
    try {
      await apiService.patch(`/quotation/${id}/status`, { status: newStatus });
      refreshList();
    } catch (err) {
      alert('Failed to update status: ' + (err?.response?.data?.message || err.message));
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleRevise = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to revise this quotation? This will create a new draft and mark the current one as REVISED.')) return;
    try {
      const revised = await apiService.post(`/quotation/${id}/revise`);
      navigate(`/quotation/edit/${revised.id}`);
    } catch (err) {
      alert('Failed to revise quotation: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleDownloadPdf = async (id, e) => {
    e.stopPropagation();
    try {
      await apiService.download(`/quotation/pdf/${id}`);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  const handleTemplateSend = (text, subject, mail) =>
    sendComposedQuotation(templatePicker.channel, templatePicker.quotation, text, subject, mail);

  const columns = [
    { field: 'qtnNo', headerName: 'Quotation No', type: 'string' },
    { field: 'qtnDate', headerName: 'Quotation Date', type: 'date' },
    { field: 'enqNo', headerName: 'Enquiry No', type: 'string' },
    { field: 'companyName', headerName: 'Company', type: 'string' },
    { field: 'netAmount', headerName: 'Net Amount', type: 'number' },
    { field: 'totalAmount', headerName: 'Total Amount', type: 'number' },
    { field: 'quotationStatus', headerName: 'Status', type: 'enum', options: Object.keys(STATUS_CONFIG) },
  ];

  const SortHeader = ({ column, label, align = 'left' }) => {
    const isActive = filters?.sortBy === column;
    return (
      <TableCell
        align={align}
        sx={{
          fontWeight: 700, fontSize: '0.65625rem', color: '#64748b',
          bgcolor: HEADER_BG, cursor: 'pointer',
          borderBottom: `1px solid ${BORDER_COLOR}`, whiteSpace: 'nowrap',
          userSelect: 'none', letterSpacing: '0.05em', textTransform: 'uppercase',
          '&:hover': { color: '#1e293b' },
        }}
        onClick={() => handleSort(column)}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={align === 'center' ? 'center' : 'flex-start'}>
          <span>{label}</span>
          {isActive && <Typography variant="caption" sx={{ fontSize: 10 }}>{filters?.sortDir === 'asc' ? '↑' : '↓'}</Typography>}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Box>
      <Box sx={{ p: 2, mb: 2 }}>
        <FilterBar
          allColumns={columns}
          filters={activeFilters}
          handleApplyFilters={handleApplyFilters}
          setFilters={() => {}}
        />
        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Showing {quotationList.length} results
          </Typography>
        </Stack>
      </Box>

      <TableContainer component={Box} sx={{ borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeader column="qtnNo" label="Quotation No" />
              <SortHeader column="qtnDate" label="Date" />
              <SortHeader column="companyName" label="Client Details" />
              <SortHeader column="enqNo" label="Ref. Enquiry" />
              <SortHeader column="totalAmount" label="Financials" />
              <SortHeader column="quotationStatus" label="Status" align="center" />
              <TableCell align="center" sx={{
                fontWeight: 700, fontSize: '0.65625rem', color: '#64748b',
                bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER_COLOR}`,
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotationList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary" variant="body2">No quotations found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              quotationList.map((row) => {
                const cfg = STATUS_CONFIG[row.quotationStatus] || STATUS_CONFIG.DRAFT;
                const total = parseFloat(row.totalAmount) || 0;

                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      transition: 'background-color 0.1s',
                    }}
                    onClick={() => handleEdit(row.id)}
                  >
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#eff6ff', color: '#2563eb' }}>
                          <Description sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {row.qtnNo}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {row.qtnDate || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Business sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>
                          {row.companyName || 'N/A'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {row.enqNo ? (
                        <Typography variant="body2" sx={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>
                          {row.enqNo}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                          {formatMoney(total, row.currency)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                        Net: {formatMoney(row.netAmount, row.currency)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {statusUpdating === row.id ? (
                        <Typography variant="caption">Updating...</Typography>
                      ) : (
                        <Select
                          size="small"
                          value={row.quotationStatus}
                          onChange={(e) => handleStatusChange(row.id, e.target.value, e)}
                          sx={{
                            height: 28, fontSize: '0.75rem', fontWeight: 600,
                            bgcolor: cfg.bg, color: cfg.color,
                            '.MuiOutlinedInput-notchedOutline': { border: `1px solid ${cfg.color}30` },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: cfg.color },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: cfg.color },
                            '.MuiSelect-icon': { color: cfg.color },
                          }}
                        >
                          {Object.keys(STATUS_CONFIG).map(key => (
                            <MenuItem key={key} value={key} sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                              {STATUS_CONFIG[key].label}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </TableCell>

                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Send via WhatsApp">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setTemplatePicker({ open: true, channel: 'WHATSAPP', quotation: row })}
                              sx={{ color: '#64748b', '&:hover': { color: '#25d366' } }}
                              disabled={!row.phone}
                            >
                              <WhatsAppIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Send via Email">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setTemplatePicker({ open: true, channel: 'EMAIL', quotation: row })}
                              sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}
                              disabled={!row.email}
                            >
                              <Email sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Download PDF">
                          <IconButton size="small" onClick={(e) => handleDownloadPdf(row.id, e)} sx={{ color: '#64748b', '&:hover': { color: '#0ea5e9' } }}>
                            <Description sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {(row.quotationStatus === 'SENT' || row.quotationStatus === 'REJECTED') && (
                          <Tooltip title="Revise Quotation">
                            <IconButton size="small" onClick={(e) => handleRevise(row.id, e)} sx={{ color: '#64748b', '&:hover': { color: '#d97706' } }}>
                              <Autorenew sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(row.quotationStatus === 'ACCEPTED' || row.quotationStatus === 'SENT') && (
                          <Tooltip title="Convert to Sales Order">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate('/sales/sales-order/add', { state: { prefillQuotationId: row.id } }); }} sx={{ color: '#64748b', '&:hover': { color: '#059669' } }}>
                              <PlayArrow sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={() => handleEdit(row.id)} sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}>
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} sx={{ color: '#64748b', '&:hover': { color: '#dc2626' } }}>
                          <DeleteForever sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={3} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          shape="rounded"
          size="small"
        />
      </Box>

      <QuotationTemplatePicker
        open={templatePicker.open}
        onClose={() => setTemplatePicker({ open: false, channel: 'WHATSAPP', quotation: null })}
        channel={templatePicker.channel}
        quotation={templatePicker.quotation}
        onSend={handleTemplateSend}
      />
    </Box>
  );
};

export default QuotationList;