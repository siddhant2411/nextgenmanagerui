import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button, Paper, TableBody, Table, TableCell, TableContainer, TableHead, TableRow,
  Typography, Box, Pagination, IconButton, Tooltip, Chip, Stack, Avatar,
  Checkbox, Slide, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, CircularProgress
} from "@mui/material";
import {
  DeleteForever, EditOutlined, Business, Warning, ArrowUpward, ArrowDownward,
  CurrencyRupee, Email, LocalFireDepartment, Thermostat, AcUnit, Person, LocationOn,
  PersonAddAlt1, DeleteSweep, Close, CheckBox, CheckBoxOutlineBlank
} from "@mui/icons-material";
import FilterBar from '../ui/filterbar/FilterBar';
import TemplatePicker from './TemplatePicker';
import apiService from '../../services/apiService';
import { searchUsers } from '../../services/commonAPI';

const STATUS_CONFIG = {
  NEW:         { label: 'New',        color: '#2563eb', bg: '#eff6ff' },
  QUALIFIED:   { label: 'Qualified',  color: '#0ea5e9', bg: '#f0f9ff' },
  CONTACTED:   { label: 'Contacted',  color: '#7c3aed', bg: '#f5f3ff' },
  FOLLOW_UP:   { label: 'Follow Up',  color: '#d97706', bg: '#fffbeb' },
  QUOTED:      { label: 'Quoted',     color: '#0891b2', bg: '#ecfeff' },
  NEGOTIATION: { label: 'Negotiation',color: '#8b5cf6', bg: '#f5f3ff' },
  CONVERTED:   { label: 'Won',        color: '#059669', bg: '#ecfdf5' },
  LOST:        { label: 'Lost',       color: '#dc2626', bg: '#fef2f2' },
  JUNK:        { label: 'Junk',       color: '#64748b', bg: '#f8fafc' },
  CLOSED:      { label: 'Closed',     color: '#475569', bg: '#f8fafc' },
};

const PRIORITY_CONFIG = {
  HOT:  { label: 'Hot',  color: '#ef4444', bg: '#fef2f2', icon: <LocalFireDepartment sx={{ fontSize: 14 }} /> },
  WARM: { label: 'Warm', color: '#f59e0b', bg: '#fffbeb', icon: <Thermostat sx={{ fontSize: 14 }} /> },
  COLD: { label: 'Cold', color: '#3b82f6', bg: '#eff6ff', icon: <AcUnit sx={{ fontSize: 14 }} /> },
};

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';

const EnquiryList = ({
  enquiryList, filters, handleSort, currentPage, totalPages,
  handlePageChange, handleDelete, activeFilters, handleApplyFilters
}) => {
  const navigate = useNavigate();

  // Template picker
  const [templatePicker, setTemplatePicker] = useState({ open: false, channel: 'WHATSAPP', enquiry: null });

  // Selection state
  const [selected, setSelected] = useState(new Set());

  // Bulk assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Clear selection when list changes
  useEffect(() => { setSelected(new Set()); }, [enquiryList]);

  const handleEdit = (enquiryId) => navigate(`/enquiry/edit/${enquiryId}`);

  const handleTemplateSend = (text, subject) => {
    const enquiry = templatePicker.enquiry;
    if (templatePicker.channel === 'WHATSAPP') {
      const phone = enquiry?.phone || '';
      if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const email = enquiry?.email || '';
      if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  };

  // Selection helpers
  const allIds = enquiryList.map(e => e.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} selected enquiries? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await apiService.post('/enquiry/bulk-delete', { ids: [...selected] });
      setSelected(new Set());
      // Trigger parent refresh
      handleDelete(null);
    } catch (err) {
      alert('Bulk delete failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  // Open assign dialog
  const openAssignDialog = async () => {
    setAssignOpen(true);
    setAssignUserId('');
    try {
      const data = await searchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };

  // Bulk assign
  const handleBulkAssign = async () => {
    if (!assignUserId) return;
    setBulkLoading(true);
    try {
      await apiService.post('/enquiry/bulk-assign', { ids: [...selected], assignedToId: assignUserId });
      setAssignOpen(false);
      setSelected(new Set());
      handleDelete(null); // refresh
    } catch (err) {
      alert('Bulk assign failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  const columns = [
    { field: 'enqNo', headerName: 'Enquiry No', type: 'string' },
    { field: 'priority', headerName: 'Priority', type: 'enum', options: Object.keys(PRIORITY_CONFIG) },
    { field: 'companyName', headerName: 'Company', type: 'string' },
    { field: 'opportunityName', headerName: 'Opportunity', type: 'string' },
    { field: 'assignedToName', headerName: 'Owner', type: 'string' },
    { field: 'city', headerName: 'City', type: 'string' },
    { field: 'expectedRevenue', headerName: 'Value', type: 'number' },
    { field: 'status', headerName: 'Status', type: 'enum', options: Object.keys(STATUS_CONFIG) },
    { field: 'enquirySource', headerName: 'Source', type: 'string' },
    { field: 'closeReasonCode', headerName: 'Close Reason', type: 'string' },
    // Why the enquiry ended, grouped so a win rate is computable: LOST is a competitive defeat,
    // DECLINED_BY_US and NO_ENGAGEMENT are not.
    { field: 'outcome', headerName: 'Outcome', type: 'enum',
      options: ['WON', 'LOST', 'NO_ENGAGEMENT', 'DECLINED_BY_US', 'DEFERRED', 'INVALID'] },
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
      {/* Filters */}
      <Box sx={{ p: 2, mb: 2 }}>
        <FilterBar
          allColumns={columns}
          filters={activeFilters}
          handleApplyFilters={handleApplyFilters}
          setFilters={() => {}} // dummy because FilterBar uses handleApplyFilters internally
        />
        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Showing {enquiryList.length} results
          </Typography>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer component={Box} sx={{ borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {/* Select All Checkbox */}
              <TableCell padding="checkbox" sx={{ bgcolor: HEADER_BG, borderBottom: `1px solid ${BORDER_COLOR}`, width: 48 }}>
                <Checkbox
                  size="small"
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#2563eb' }, '&.MuiCheckbox-indeterminate': { color: '#2563eb' } }}
                />
              </TableCell>
              <SortHeader column="enqNo" label="Enquiry No" />
              <SortHeader column="enqDate" label="Enquiry Date" />
              <SortHeader column="priority" label="Priority" align="center" />
              <SortHeader column="companyName" label="Account & Location" />
              <SortHeader column="assignedToName" label="Owner" />
              <SortHeader column="expectedRevenue" label="Value" align="center" />
              <SortHeader column="status" label="Status" align="center" />
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
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary" variant="body2">No enquiries found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              enquiryList.map((enquiry) => {
                const cfg = STATUS_CONFIG[enquiry.status] || STATUS_CONFIG.NEW;
                const revenue = parseFloat(enquiry.expectedRevenue) || 0;
                const isOverdue = enquiry.daysForNextFollowup != null && enquiry.daysForNextFollowup <= 0 &&
                  !['CONVERTED', 'LOST', 'CLOSED'].includes(enquiry.status);
                const isSelected = selected.has(enquiry.id);

                return (
                  <TableRow
                    key={enquiry.id}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      '&.Mui-selected': { bgcolor: '#eff6ff !important' },
                      '&.Mui-selected:hover': { bgcolor: '#dbeafe !important' },
                      transition: 'background-color 0.1s',
                      ...(isOverdue && !isSelected && { borderLeft: '3px solid #ef4444' }),
                    }}
                    onClick={() => handleEdit(enquiry.id)}
                  >
                    {/* Checkbox */}
                    <TableCell padding="checkbox" onClick={(e) => toggleSelect(enquiry.id, e)}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#2563eb' } }}
                      />
                    </TableCell>

                    <TableCell sx={{ py: 1.2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                        {enquiry.enqNo}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.75rem', mt: 0.25 }}>
                        {enquiry.opportunityName || 'Untitled Lead'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {enquiry.enqDate || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {enquiry.priority && (
                        <Chip
                          icon={PRIORITY_CONFIG[enquiry.priority]?.icon}
                          label={PRIORITY_CONFIG[enquiry.priority]?.label}
                          size="small"
                          sx={{
                            height: 20, fontWeight: 700, fontSize: '0.625rem',
                            bgcolor: PRIORITY_CONFIG[enquiry.priority]?.bg,
                            color: PRIORITY_CONFIG[enquiry.priority]?.color,
                            border: `1px solid ${PRIORITY_CONFIG[enquiry.priority]?.color}30`,
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 22, height: 22, bgcolor: '#f1f5f9', color: '#64748b' }}>
                            <Business sx={{ fontSize: 12 }} />
                          </Avatar>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
                            {enquiry.companyName || 'N/A'}
                          </Typography>
                        </Stack>
                        {(enquiry.city || enquiry.state) && (
                          <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5} ml={3.5}>
                            <LocationOn sx={{ fontSize: 10, color: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {[enquiry.city, enquiry.state].filter(Boolean).join(', ')}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 22, height: 22, bgcolor: '#e0e7ff', color: '#4338ca', fontSize: 10 }}>
                          <Person sx={{ fontSize: 12 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#4338ca' }}>
                          {enquiry.assignedToName || 'Unassigned'}
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
                          textTransform: 'uppercase', borderRadius: 1,
                        }}
                      />
                      {enquiry.lastContactedDate && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#94a3b8', fontSize: '0.625rem' }}>
                          LC: {enquiry.lastContactedDate}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {enquiry.daysForNextFollowup != null ? (
                        <Box>
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
                          {enquiry.nextFollowupDate && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#94a3b8', fontSize: '0.625rem' }}>
                              Due: {enquiry.nextFollowupDate}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Send via WhatsApp">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setTemplatePicker({ open: true, channel: 'WHATSAPP', enquiry })}
                              sx={{ color: '#64748b', '&:hover': { color: '#25d366' } }}
                              disabled={!enquiry.phone}
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
                              onClick={() => setTemplatePicker({ open: true, channel: 'EMAIL', enquiry })}
                              sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}
                              disabled={!enquiry.email}
                            >
                              <Email sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
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

      {/* ───────── Floating Bulk Action Toolbar ───────── */}
      <Slide direction="up" in={selected.size > 0} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1400, borderRadius: 3, px: 3, py: 1.5,
            display: 'flex', alignItems: 'center', gap: 2,
            bgcolor: '#0f172a', color: 'white', minWidth: 360,
            boxShadow: '0 8px 32px rgba(15,23,42,0.35)',
          }}
        >
          <Box sx={{
            width: 28, height: 28, borderRadius: '50%',
            bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
          }}>
            {selected.size}
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>
            {selected.size === 1 ? '1 lead selected' : `${selected.size} leads selected`}
          </Typography>

          <Tooltip title="Bulk Assign to User">
            <Button
              startIcon={<PersonAddAlt1 />}
              onClick={openAssignDialog}
              size="small"
              variant="outlined"
              disabled={bulkLoading}
              sx={{
                color: 'white', borderColor: 'rgba(255,255,255,0.3)',
                textTransform: 'none', fontWeight: 600, borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'white' }
              }}
            >
              Assign
            </Button>
          </Tooltip>

          <Tooltip title="Bulk Delete">
            <Button
              startIcon={bulkLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteSweep />}
              onClick={handleBulkDelete}
              size="small"
              variant="outlined"
              disabled={bulkLoading}
              sx={{
                color: '#fca5a5', borderColor: 'rgba(252,165,165,0.4)',
                textTransform: 'none', fontWeight: 600, borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', borderColor: '#fca5a5' }
              }}
            >
              Delete
            </Button>
          </Tooltip>

          <Tooltip title="Clear selection">
            <IconButton size="small" onClick={() => setSelected(new Set())} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Slide>

      {/* ───────── Assign Dialog ───────── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonAddAlt1 sx={{ color: '#2563eb' }} />
            <Typography fontWeight={700}>Assign {selected.size} Lead{selected.size > 1 ? 's' : ''}</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setAssignOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a sales representative to assign the selected leads to.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Select User</InputLabel>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              label="Select User"
              sx={{ borderRadius: 2 }}
            >
              {users.length === 0 && (
                <MenuItem disabled><em>Loading users...</em></MenuItem>
              )}
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#e0e7ff', color: '#4338ca', fontSize: '0.65rem' }}>
                      {u.username?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{u.username}</Typography>
                      {u.email && <Typography variant="caption" color="text.secondary">{u.email}</Typography>}
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            disableElevation
            disabled={!assignUserId || bulkLoading}
            onClick={handleBulkAssign}
            startIcon={bulkLoading ? <CircularProgress size={14} color="inherit" /> : <PersonAddAlt1 />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Picker */}
      <TemplatePicker
        open={templatePicker.open}
        onClose={() => setTemplatePicker({ open: false, channel: 'WHATSAPP', enquiry: null })}
        channel={templatePicker.channel}
        enquiry={templatePicker.enquiry}
        onSend={handleTemplateSend}
      />

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
