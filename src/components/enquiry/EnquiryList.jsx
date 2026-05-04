import React from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button, Paper, TableBody, Table, TableCell, TableContainer, TableHead, TableRow,
  Typography, Box, Pagination, IconButton, Tooltip,
  Chip, Stack, Avatar
} from "@mui/material";
import {
  DeleteForever, EditOutlined, Business, Warning, ArrowUpward, ArrowDownward,
  CurrencyRupee, Email
} from "@mui/icons-material";
import FilterBar from '../ui/filterbar/FilterBar';

const STATUS_CONFIG = {
  NEW:        { label: 'New',       color: '#2563eb', bg: '#eff6ff' },
  CONTACTED:  { label: 'Contacted', color: '#7c3aed', bg: '#f5f3ff' },
  FOLLOW_UP:  { label: 'Follow Up', color: '#d97706', bg: '#fffbeb' },
  CONVERTED:  { label: 'Won',       color: '#059669', bg: '#ecfdf5' },
  LOST:       { label: 'Lost',      color: '#dc2626', bg: '#fef2f2' },
  CLOSED:     { label: 'Closed',    color: '#475569', bg: '#f8fafc' },
};

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';

const EnquiryList = ({ 
  enquiryList, filters, handleSort, currentPage, totalPages, 
  handlePageChange, handleFilterChange, handleDelete 
}) => {
  const navigate = useNavigate();

  const handleEdit = (enquiryId) => navigate(`/enquiry/edit/${enquiryId}`);

  const columns = [
    { field: 'enqNo', headerName: 'Enquiry No', type: 'string' },
    { field: 'companyName', headerName: 'Company', type: 'string' },
    { field: 'opportunityName', headerName: 'Opportunity', type: 'string' },
    { field: 'expectedRevenue', headerName: 'Value', type: 'number' },
    { field: 'status', headerName: 'Status', type: 'enum', options: Object.keys(STATUS_CONFIG) },
    { field: 'lastContactedDate', headerName: 'Last Contact', type: 'date' },
    { field: 'enqDate', headerName: 'Enquiry Date', type: 'date' },
    { field: 'daysForNextFollowup', headerName: 'Days for Followup', type: 'number' },
  ];

  const SortHeader = ({ column, label, sortable = true, align = 'left' }) => {
    const isActive = filters?.sortBy === column;
    return (
      <TableCell
        align={align}
        sx={{
          fontWeight: 700, fontSize: '0.65625rem', color: '#64748b',
          bgcolor: HEADER_BG, cursor: sortable ? 'pointer' : 'default',
          borderBottom: `1px solid ${BORDER_COLOR}`, whiteSpace: 'nowrap',
          userSelect: 'none', letterSpacing: '0.05em', textTransform: 'uppercase',
          '&:hover': sortable ? { color: '#1e293b' } : {},
        }}
        onClick={() => sortable && handleSort(column)}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={align === 'center' ? 'center' : 'flex-start'}>
          <span>{label}</span>
          {sortable && isActive && (
            filters?.sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />
          )}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Box>
      <Box sx={{ p: 2, mb: 2 }}>
        <FilterBar
          allColumns={columns}
          filters={[]} // Handle this if needed
          setFilters={(f) => console.log('Filters', f)}
          handleApplyFilters={(f) => {
             // Logic to convert FilterBar filters to Enquiry filters
             // For now, let's stick to the current basic filters if FilterBar is too different
          }}
        />
        {/* Fallback to original filter row if FilterBar integration is complex */}
        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
           <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Showing {enquiryList.length} results
          </Typography>
        </Stack>
      </Box>

      <TableContainer component={Box} sx={{ borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeader column="enqNo" label="Enquiry" />
              <SortHeader column="companyName" label="Company" />
              <SortHeader column="expectedRevenue" label="Value" align="center" />
              <SortHeader column="status" label="Status" align="center" />
              <SortHeader column="lastContactedDate" label="Last Contact" align="center" />
              <SortHeader column="daysForNextFollowup" label="Follow-up" align="center" />
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
            {enquiryList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary" variant="body2">No enquiries found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              enquiryList.map((enquiry) => {
                const cfg = STATUS_CONFIG[enquiry.status] || STATUS_CONFIG.NEW;
                const revenue = parseFloat(enquiry.expectedRevenue) || 0;
                const isOverdue = enquiry.daysForNextFollowup != null && enquiry.daysForNextFollowup <= 0 &&
                  !['CONVERTED', 'LOST', 'CLOSED'].includes(enquiry.status);

                return (
                  <TableRow
                    key={enquiry.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      transition: 'background-color 0.1s',
                      ...(isOverdue && { borderLeft: '3px solid #ef4444' }),
                    }}
                    onClick={() => handleEdit(enquiry.id)}
                  >
                    <TableCell sx={{ py: 1.2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                        {enquiry.opportunityName || 'Untitled Opportunity'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {enquiry.enqNo} · {enquiry.enqDate}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 22, height: 22, bgcolor: '#f1f5f9', color: '#64748b' }}>
                          <Business sx={{ fontSize: 12 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                          {enquiry.companyName || 'N/A'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      {revenue > 0 ? (
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>
                          ₹{revenue.toLocaleString('en-IN')}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          height: 20, fontWeight: 700, fontSize: '0.625rem',
                          bgcolor: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}30`,
                          textTransform: 'uppercase',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="caption" sx={{ color: '#64748b', fontFamily: '"IBM Plex Mono", monospace' }}>
                        {enquiry.lastContactedDate || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {enquiry.daysForNextFollowup != null ? (
                        <Chip
                          icon={isOverdue ? <Warning sx={{ fontSize: '10px !important' }} /> : undefined}
                          label={isOverdue ? 'OVERDUE' : `${enquiry.daysForNextFollowup}D`}
                          size="small"
                          sx={{
                            height: 20, fontWeight: 700, fontSize: '0.625rem',
                            bgcolor: isOverdue ? '#fef2f2' : '#f8fafc',
                            color: isOverdue ? '#dc2626' : '#64748b',
                            border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: 1,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            const phone = enquiry.phone || '';
                            if (phone) {
                              const message = encodeURIComponent(`Hello, following up regarding Enquiry: ${enquiry.enqNo} (${enquiry.opportunityName || 'Untitled'})`);
                              window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${message}`, '_blank');
                            }
                          }}
                          sx={{ color: '#64748b', '&:hover': { color: '#25d366' } }}
                          disabled={!enquiry.phone}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            if (enquiry.email) window.location.href = `mailto:${enquiry.email}?subject=${encodeURIComponent(`Regarding Enquiry: ${enquiry.enqNo}`)}`;
                          }}
                          sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}
                          disabled={!enquiry.email}
                        >
                          <Email sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEdit(enquiry.id)} sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}>
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(enquiry.id)} sx={{ color: '#64748b', '&:hover': { color: '#dc2626' } }}>
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

      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          shape="rounded"
          size="small"
          sx={{ '& .MuiPaginationItem-root': { borderRadius: 1.5, fontWeight: 600 } }}
        />
      </Box>
    </Box>
  );
};

export default EnquiryList;
