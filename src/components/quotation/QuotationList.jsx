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
import QuotationTemplatePicker from './QuotationTemplatePicker';
import apiService from '../../services/apiService';

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

  const handleTemplateSend = (text, subject) => {
    const qtn = templatePicker.quotation;
    if (templatePicker.channel === 'WHATSAPP') {
      const phone = qtn?.phone || '';
      if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const email = qtn?.email || '';
      if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  };

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
              <SortHeader column="qtnNo" label="Quotation Details" />
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
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
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
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {row.qtnNo}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Date: {row.qtnDate}
                          </Typography>
                        </Box>
                      </Stack>
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
                          {row.currency || 'INR'} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                        Net: {row.currency || 'INR'} {parseFloat(row.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
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