import React from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button, Paper, TableBody, Table, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Box, MenuItem, Select, Pagination, IconButton, Tooltip,
  Chip, Stack, Avatar, LinearProgress
} from "@mui/material";
import {
  DeleteForever, EditOutlined, AddCircleOutline, Visibility,
  CurrencyRupee, Business, Warning, ArrowUpward, ArrowDownward
} from "@mui/icons-material";

const STATUS_CONFIG = {
  NEW:        { label: 'New',       color: '#3b82f6', bg: '#eff6ff' },
  CONTACTED:  { label: 'Contacted', color: '#6366f1', bg: '#eef2ff' },
  FOLLOW_UP:  { label: 'Follow Up', color: '#f59e0b', bg: '#fffbeb' },
  CONVERTED:  { label: 'Won',       color: '#10b981', bg: '#ecfdf5' },
  LOST:       { label: 'Lost',      color: '#ef4444', bg: '#fef2f2' },
  CLOSED:     { label: 'Closed',    color: '#64748b', bg: '#f8fafc' },
};

const EnquiryList = ({ enquiryList, filters, handleSort, currentPage, totalPages, handlePageChange, handleFilterChange, handleDelete }) => {
  const navigate = useNavigate();

  const handleEdit = (enquiryId) => navigate(`/enquiry/edit/${enquiryId}`);

  const SortHeader = ({ column, label, sortable = true }) => {
    const isActive = filters?.sortBy === column;
    return (
      <TableCell
        align="center"
        sx={{
          fontWeight: 700, fontSize: '0.72rem', color: '#64748b',
          bgcolor: '#f8fafc', cursor: sortable ? 'pointer' : 'default',
          borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
          userSelect: 'none', letterSpacing: '0.03em',
          '&:hover': sortable ? { color: '#1e293b' } : {},
        }}
        onClick={() => sortable && handleSort(column)}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
          <span>{label}</span>
          {sortable && isActive && (
            filters?.sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />
          )}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Box>
      {/* Filters Row */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small" placeholder="Search enquiry no..."
            value={filters?.enqNo || ''}
            onChange={(e) => handleFilterChange('enqNo', e.target.value)}
            sx={{ width: 180, '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.82rem' } }}
          />
          <TextField
            size="small" placeholder="Search company..."
            value={filters?.companyName || ''}
            onChange={(e) => handleFilterChange('companyName', e.target.value)}
            sx={{ width: 180, '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.82rem' } }}
          />
          <Select
            value={filters?.statusFilter || ''}
            onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
            displayEmpty
            size="small"
            sx={{ width: 140, borderRadius: 2, fontSize: '0.82rem' }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
            ))}
          </Select>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {enquiryList.length} results
          </Typography>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeader column="enqNo" label="ENQUIRY" />
              <SortHeader column="companyName" label="COMPANY" />
              <SortHeader column="expectedRevenue" label="VALUE" />
              <SortHeader column="status" label="STATUS" />
              <SortHeader column="lastContactedDate" label="LAST CONTACT" />
              <SortHeader column="daysForNextFollowup" label="FOLLOW-UP" />
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enquiryList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary" variant="body2">No enquiries found. Create your first lead to get started.</Typography>
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
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.15s',
                      ...(isOverdue && { borderLeft: '3px solid #ef4444' }),
                    }}
                    onClick={() => handleEdit(enquiry.id)}
                  >
                    {/* Enquiry Info */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>
                        {enquiry.opportunityName || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {enquiry.enqNo} · {enquiry.enqDate}
                      </Typography>
                    </TableCell>

                    {/* Company */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 24, height: 24, bgcolor: '#f1f5f9', color: '#64748b' }}>
                          <Business sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                          {enquiry.companyName || 'N/A'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Value */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {revenue > 0 ? (
                        <Chip
                          icon={<CurrencyRupee sx={{ fontSize: '0.7rem !important' }} />}
                          label={revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          size="small"
                          sx={{
                            height: 24, fontWeight: 700, fontSize: '0.72rem',
                            bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                            '& .MuiChip-icon': { color: '#16a34a' },
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          height: 22, fontWeight: 800, fontSize: '0.65rem',
                          bgcolor: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                        }}
                      />
                    </TableCell>

                    {/* Last Contact */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {enquiry.lastContactedDate || '—'}
                      </Typography>
                    </TableCell>

                    {/* Follow-up */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {enquiry.daysForNextFollowup != null ? (
                        <Chip
                          icon={isOverdue ? <Warning sx={{ fontSize: '0.7rem !important' }} /> : undefined}
                          label={isOverdue ? 'Overdue' : `${enquiry.daysForNextFollowup}d`}
                          size="small"
                          sx={{
                            height: 22, fontWeight: 700, fontSize: '0.65rem',
                            bgcolor: isOverdue ? '#fef2f2' : '#f8fafc',
                            color: isOverdue ? '#dc2626' : '#64748b',
                            border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ py: 1.5 }} onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(enquiry.id)} sx={{ color: '#3b82f6' }}>
                            <EditOutlined sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(enquiry.id)} sx={{ color: '#ef4444' }}>
                            <DeleteForever sx={{ fontSize: 18 }} />
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

      {/* Pagination */}
      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          shape="rounded"
          size="small"
        />
      </Box>
    </Box>
  );
};

export default EnquiryList;
