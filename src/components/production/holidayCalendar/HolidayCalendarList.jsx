import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton,
    Snackbar, CircularProgress, Dialog, TextField, InputAdornment,
    DialogActions, DialogContent, DialogContentText, DialogTitle,
    Chip, TablePagination, Tooltip, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Search, Add, CalendarMonth } from '@mui/icons-material';
import { useAuth } from '../../../auth/AuthContext';
import { PRODUCTION_MANAGE_ROLES } from '../../../auth/roles';

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';
const ROW_HOVER = '#e3f2fd';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: 0.3,
    py: 1.25,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
};

const HolidayCalendarList = () => {
    const [calendars, setCalendars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();
    const { hasAnyRole } = useAuth();
    const canManage = hasAnyRole(PRODUCTION_MANAGE_ROLES);
    const debounceTimeout = useRef(null);
    const searchRef = useRef(search);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchCalendars = useCallback(async (searchOverride) => {
        setLoading(true);
        try {
            const searchTerm = searchOverride !== undefined ? searchOverride : searchRef.current;
            const res = await apiService.get('/production/calendar', {
                page, size: rowsPerPage, search: searchTerm
            });
            const list = res.content || res || [];
            setCalendars(Array.isArray(list) ? list : []);
            setTotalItems(res.totalElements || list.length || 0);
        } catch (error) {
            showSnackbar('Failed to load calendars', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => { fetchCalendars(); }, [fetchCalendars]);

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearch(query);
        searchRef.current = query;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setPage(0);
            fetchCalendars(query);
        }, 500);
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, []);

    const deleteCalendar = async (id) => {
        if (deleting) return;
        setDeleting(true);
        try {
            await apiService.delete(`/production/calendar/${id}`);
            showSnackbar('Calendar deleted successfully');
            fetchCalendars();
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete calendar';
            showSnackbar(msg, 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: 2,
                    border: `1px solid ${BORDER_COLOR}`,
                }}
            >
                {/* Header */}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={1.5}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            Holiday Calendars
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Manage scheduling calendars with Indian bank holidays, weekly offs & overrides
                        </Typography>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                        <TextField
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Search calendars..."
                            size="small"
                            variant="outlined"
                            InputProps={{
                                endAdornment: <InputAdornment position="end"><Search sx={{ color: '#9ca3af', fontSize: 20 }} /></InputAdornment>,
                            }}
                            sx={{
                                width: { xs: '100%', sm: 260 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5, fontSize: '0.875rem',
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/production/calendar/add')}
                            disabled={!canManage}
                            sx={{
                                textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                                bgcolor: '#1565c0', boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                                '&:hover': { bgcolor: '#0d47a1' }, whiteSpace: 'nowrap',
                            }}
                        >
                            New Calendar
                        </Button>
                    </Box>
                </Box>

                {/* Loading */}
                {loading && (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="30vh" gap={2}>
                        <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading calendars...</Typography>
                    </Box>
                )}

                {/* Table */}
                {!loading && (
                    <>
                        <TableContainer sx={{ borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}`, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={headerCellSx}>Calendar Name</TableCell>
                                        <TableCell sx={headerCellSx}>Description</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Weekly Off</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Holidays</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Overrides</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Status</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {calendars.map((cal, index) => (
                                        <TableRow
                                            key={cal.id}
                                            sx={{
                                                bgcolor: index % 2 === 0 ? '#fafbfc' : '#fff',
                                                transition: 'background 0.15s',
                                                '&:hover': { bgcolor: ROW_HOVER },
                                                '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => navigate(`/production/calendar/detail/${cal.id}`)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>{cal.name}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {cal.description || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" fontWeight={500}>
                                                    {cal.weeklyOffDays?.map(d => d.substring(0, 3)).join(', ') || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={cal.holidays?.length || 0} size="small" sx={{ bgcolor: '#e8f5e9', color: '#388e3c', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={cal.overrides?.length || 0} size="small" sx={{ bgcolor: '#f3e5f5', color: '#7b1fa2', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={cal.active ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: cal.active ? '#e8f5e9' : '#f5f5f5',
                                                        color: cal.active ? '#2e7d32' : '#757575',
                                                        fontWeight: 500, fontSize: '0.7rem', height: 24,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center" onClick={e => e.stopPropagation()}>
                                                <Tooltip title="View Calendar">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => navigate(`/production/calendar/detail/${cal.id}`)}
                                                            size="small"
                                                            sx={{ color: '#388e3c', '&:hover': { bgcolor: '#e8f5e9' } }}
                                                        >
                                                            <CalendarMonth fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => navigate(`/production/calendar/edit/${cal.id}`)}
                                                            size="small"
                                                            disabled={!canManage}
                                                            sx={{ color: '#1565c0', '&:hover': { bgcolor: '#e3f2fd' } }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => setConfirmDialog({ open: true, id: cal.id, name: cal.name })}
                                                            size="small"
                                                            disabled={!canManage}
                                                            sx={{ color: '#d32f2f', '&:hover': { bgcolor: '#ffebee' } }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {calendars.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">No holiday calendars found. Create one to get started.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={totalItems}
                            page={page}
                            onPageChange={(e, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            sx={{
                                borderTop: `1px solid ${BORDER_COLOR}`,
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
                            }}
                        />
                    </>
                )}
            </Paper>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, id: null, name: '' })} PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{confirmDialog.name || 'this calendar'}</strong>? All holidays and overrides will be permanently removed.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDialog({ open: false, id: null, name: '' })} disabled={deleting} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button
                        onClick={async () => {
                            await deleteCalendar(confirmDialog.id);
                            setConfirmDialog({ open: false, id: null, name: '' });
                        }}
                        variant="contained"
                        disabled={!canManage || deleting}
                        sx={{ textTransform: 'none', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default HolidayCalendarList;
