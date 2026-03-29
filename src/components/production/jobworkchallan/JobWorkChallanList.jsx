import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    FormControlLabel,
} from '@mui/material';
import {
    Add,
    Delete,
    Edit,
    LocalShipping,
    MoveToInbox,
    Search,
    Visibility,
    Warning,
    Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    cancelChallan,
    deleteJobWorkChallan,
    dispatchChallan,
    getJobWorkChallans,
    getOverdueChallans,
    receiveChallan,
} from '../../../services/jobWorkChallanService';
import DispatchConfirmDialog from './DispatchConfirmDialog';
import ReceiveBackModal from './ReceiveBackModal';

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
    borderRight: '1px solid rgba(255,255,255,0.06)',
};

const STATUS_STYLES = {
    DRAFT: { bg: '#f1f5f9', color: '#64748b' },
    DISPATCHED: { bg: '#e3f2fd', color: '#1565c0' },
    PARTIALLY_RECEIVED: { bg: '#fff3e0', color: '#e65100' },
    COMPLETED: { bg: '#e8f5e9', color: '#2e7d32' },
    CANCELLED: { bg: '#ffebee', color: '#c62828' },
};

const STATUS_LABELS = {
    DRAFT: 'Draft',
    DISPATCHED: 'Dispatched',
    PARTIALLY_RECEIVED: 'Partial',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const formatDate = (d) => d ? dayjs(d).format('DD-MMM-YYYY') : '-';

const formatINR = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
};

const DaysRemainingCell = ({ days }) => {
    if (days === null || days === undefined) return <Typography variant="body2" color="text.disabled">—</Typography>;
    if (days < 0) {
        return (
            <Typography variant="body2" fontWeight={700} color="#c62828">
                {Math.abs(days)}d overdue
            </Typography>
        );
    }
    if (days <= 15) {
        return (
            <Box display="flex" alignItems="center" gap={0.5}>
                <Warning sx={{ fontSize: 15, color: '#e65100' }} />
                <Typography variant="body2" fontWeight={600} color="#e65100">{days}d left</Typography>
            </Box>
        );
    }
    return <Typography variant="body2" fontWeight={500} color="#2e7d32">{days}d left</Typography>;
};

const StatusChip = ({ status }) => {
    const style = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
        <Chip
            label={STATUS_LABELS[status] || status}
            size="small"
            sx={{ backgroundColor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
        />
    );
};

export default function JobWorkChallanList() {
    const navigate = useNavigate();

    const [challans, setChallans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [overdueCount, setOverdueCount] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [vendorSearch, setVendorSearch] = useState('');
    const [woSearch, setWoSearch] = useState('');
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Dialog state
    const [dispatchTarget, setDispatchTarget] = useState(null);
    const [receiveTarget, setReceiveTarget] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const loadChallans = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const params = {};
            if (statusFilter) params.status = statusFilter;

            const [data, overdueData] = await Promise.all([
                getJobWorkChallans(params),
                getOverdueChallans().catch(() => []),
            ]);
            setChallans(Array.isArray(data) ? data : []);
            setOverdueCount(Array.isArray(overdueData) ? overdueData.length : 0);
        } catch (err) {
            setError('Failed to load challans. Please try again.');
            setChallans([]);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { loadChallans(); }, [loadChallans]);

    const filteredChallans = useMemo(() => {
        let result = challans;
        if (vendorSearch.trim()) {
            const q = vendorSearch.toLowerCase();
            result = result.filter(c => c.vendorName?.toLowerCase().includes(q));
        }
        if (woSearch.trim()) {
            const q = woSearch.toLowerCase();
            result = result.filter(c => c.workOrderNumber?.toLowerCase().includes(q));
        }
        if (showOverdueOnly) {
            result = result.filter(c => c.daysRemainingForReturn !== null && c.daysRemainingForReturn < 0);
        }
        return result;
    }, [challans, vendorSearch, woSearch, showOverdueOnly]);

    const paginatedChallans = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredChallans.slice(start, start + rowsPerPage);
    }, [filteredChallans, page, rowsPerPage]);

    // Actions
    const handleDispatch = async () => {
        if (!dispatchTarget) return;
        try {
            setActionLoading(true);
            await dispatchChallan(dispatchTarget.id);
            showSnack(`${dispatchTarget.challanNumber} dispatched. 180-day return clock started.`);
            setDispatchTarget(null);
            await loadChallans();
        } catch (err) {
            showSnack('Failed to dispatch challan.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReceive = async (payload) => {
        if (!receiveTarget) return;
        try {
            setActionLoading(true);
            await receiveChallan(receiveTarget.id, payload);
            const pendingAfter = receiveTarget.lines?.reduce((s, l) => {
                const inp = payload.lines?.find(p => p.lineId === l.id);
                return s + (l.quantityPending - (inp?.quantityReceived ?? 0) - (inp?.quantityRejected ?? 0));
            }, 0) ?? 0;
            showSnack(pendingAfter <= 0 ? 'Challan completed — all materials received.' : 'Partially received — some units still pending.');
            setReceiveTarget(null);
            await loadChallans();
        } catch (err) {
            showSnack('Failed to record receipt.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelTarget) return;
        try {
            setActionLoading(true);
            await cancelChallan(cancelTarget.id);
            showSnack(`${cancelTarget.challanNumber} cancelled.`);
            setCancelTarget(null);
            await loadChallans();
        } catch (err) {
            showSnack('Failed to cancel challan.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setActionLoading(true);
            await deleteJobWorkChallan(deleteTarget.id);
            showSnack(`${deleteTarget.challanNumber} deleted.`);
            setDeleteTarget(null);
            await loadChallans();
        } catch (err) {
            showSnack('Failed to delete challan.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const renderActions = (challan) => {
        const { status } = challan;
        return (
            <Box display="flex" alignItems="center" gap={0.25}>
                {(status === 'DRAFT' || status === 'DISPATCHED' || status === 'PARTIALLY_RECEIVED' || status === 'COMPLETED' || status === 'CANCELLED') && (
                    <Tooltip title="View">
                        <IconButton size="small" onClick={() => navigate(`/production/job-work-challan/${challan.id}`)}
                            sx={{ color: '#1565c0' }}>
                            <Visibility sx={{ fontSize: 17 }} />
                        </IconButton>
                    </Tooltip>
                )}
                {status === 'DRAFT' && (
                    <>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => navigate(`/production/job-work-challan/${challan.id}/edit`)}
                                sx={{ color: '#1565c0' }}>
                                <Edit sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Dispatch">
                            <IconButton size="small" onClick={() => setDispatchTarget(challan)}
                                sx={{ color: '#2e7d32' }}>
                                <LocalShipping sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(challan)}
                                sx={{ color: '#d32f2f' }}>
                                <Delete sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                {(status === 'DISPATCHED' || status === 'PARTIALLY_RECEIVED') && (
                    <>
                        <Tooltip title="Receive Back">
                            <IconButton size="small" onClick={() => setReceiveTarget(challan)}
                                sx={{ color: '#2e7d32' }}>
                                <MoveToInbox sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                            <IconButton size="small" onClick={() => setCancelTarget(challan)}
                                sx={{ color: '#d32f2f' }}>
                                <Cancel sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>
        );
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Overdue alert */}
            {overdueCount > 0 && (
                <Alert
                    severity="warning"
                    icon={<Warning />}
                    sx={{ mb: 2, borderRadius: 1.5, fontWeight: 500 }}
                    action={
                        <Button size="small" color="warning" onClick={() => setShowOverdueOnly(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                            View Overdue
                        </Button>
                    }
                >
                    {overdueCount} challan{overdueCount > 1 ? 's are' : ' is'} past the 180-day GST return deadline.
                </Alert>
            )}

            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>
                {/* Page header */}
                <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            Job Work Challans
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Track materials dispatched to subcontractors (GST Rule 45 / Sec 143)
                        </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Add />}
                        onClick={() => navigate('/production/job-work-challan/new')}
                        sx={{
                            borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5,
                            bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                            alignSelf: { xs: 'stretch', sm: 'center' },
                            boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                        }}>
                        New Challan
                    </Button>
                </Box>

                {/* Filters */}
                <Box display="flex" flexWrap="wrap" gap={1.5} mb={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select label="Status" value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                            <MenuItem value="">All</MenuItem>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <MenuItem key={k} value={k}>{v}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        placeholder="Search vendor..."
                        value={vendorSearch}
                        onChange={e => { setVendorSearch(e.target.value); setPage(0); }}
                        sx={{ width: 200 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#9ca3af' }} /></InputAdornment>,
                        }}
                    />
                    <TextField
                        size="small"
                        placeholder="Search work order..."
                        value={woSearch}
                        onChange={e => { setWoSearch(e.target.value); setPage(0); }}
                        sx={{ width: 200 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#9ca3af' }} /></InputAdornment>,
                        }}
                    />
                    <FormControlLabel
                        control={
                            <Switch checked={showOverdueOnly} size="small"
                                onChange={e => { setShowOverdueOnly(e.target.checked); setPage(0); }} />
                        }
                        label={<Typography variant="body2">Overdue Only</Typography>}
                        sx={{ ml: 0 }}
                    />
                    {(statusFilter || vendorSearch || woSearch || showOverdueOnly) && (
                        <Button size="small" sx={{ textTransform: 'none', color: '#64748b' }}
                            onClick={() => { setStatusFilter(''); setVendorSearch(''); setWoSearch(''); setShowOverdueOnly(false); setPage(0); }}>
                            Clear Filters
                        </Button>
                    )}
                </Box>

                {/* Loading */}
                {isLoading && (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh" gap={2} flexDirection="column">
                        <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading challans...</Typography>
                    </Box>
                )}

                {/* Error */}
                {!isLoading && error && (
                    <Box mb={2}>
                        <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>
                        <Button size="small" variant="outlined" onClick={loadChallans} sx={{ mt: 1, textTransform: 'none' }}>Retry</Button>
                    </Box>
                )}

                {/* Table */}
                {!isLoading && !error && (
                    <TableContainer component={Paper} variant="outlined"
                        sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR, overflowX: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Challan No.</TableCell>
                                    <TableCell sx={headerCellSx}>Vendor</TableCell>
                                    <TableCell sx={headerCellSx}>Work Order</TableCell>
                                    <TableCell sx={headerCellSx}>Status</TableCell>
                                    <TableCell sx={headerCellSx}>Dispatch Date</TableCell>
                                    <TableCell sx={headerCellSx}>Expected Return</TableCell>
                                    <TableCell sx={headerCellSx}>Days Remaining</TableCell>
                                    <TableCell sx={{ ...headerCellSx, textAlign: 'center', width: 140 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedChallans.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography variant="body2" color="text.secondary" mb={1}>
                                                No challans found.
                                            </Typography>
                                            {!statusFilter && !vendorSearch && !woSearch && !showOverdueOnly && (
                                                <Button variant="contained" size="small" startIcon={<Add />}
                                                    onClick={() => navigate('/production/job-work-challan/new')}
                                                    sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                                                    Create your first Job Work Challan
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {paginatedChallans.map((challan, index) => (
                                    <TableRow key={challan.id}
                                        sx={{
                                            bgcolor: index % 2 === 0 ? '#fafbfc' : '#fff',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: ROW_HOVER },
                                            '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                        }}
                                        onClick={() => navigate(`/production/job-work-challan/${challan.id}`)}>
                                        <TableCell sx={{ fontWeight: 700, color: '#1565c0', whiteSpace: 'nowrap' }}>
                                            {challan.challanNumber}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>{challan.vendorName}</Typography>
                                            {challan.vendorGstNumber && (
                                                <Typography variant="caption" color="text.secondary">{challan.vendorGstNumber}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{challan.workOrderNumber || '—'}</TableCell>
                                        <TableCell><StatusChip status={challan.status} /></TableCell>
                                        <TableCell>{formatDate(challan.dispatchDate)}</TableCell>
                                        <TableCell>{formatDate(challan.expectedReturnDate)}</TableCell>
                                        <TableCell><DaysRemainingCell days={challan.daysRemainingForReturn} /></TableCell>
                                        <TableCell onClick={e => e.stopPropagation()} sx={{ textAlign: 'center' }}>
                                            {renderActions(challan)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Pagination */}
                {!isLoading && !error && filteredChallans.length > 0 && (
                    <TablePagination
                        component="div"
                        count={filteredChallans.length}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                        rowsPerPageOptions={[10, 25, 50]}
                        sx={{ borderTop: `1px solid ${BORDER_COLOR}`, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' } }}
                    />
                )}
            </Paper>

            {/* Dispatch dialog */}
            <DispatchConfirmDialog
                open={Boolean(dispatchTarget)}
                challan={dispatchTarget}
                onConfirm={handleDispatch}
                onClose={() => setDispatchTarget(null)}
                isLoading={actionLoading}
            />

            {/* Receive back modal */}
            <ReceiveBackModal
                open={Boolean(receiveTarget)}
                challan={receiveTarget}
                onConfirm={handleReceive}
                onClose={() => setReceiveTarget(null)}
                isLoading={actionLoading}
            />

            {/* Cancel confirm */}
            <Dialog open={Boolean(cancelTarget)} onClose={() => { if (!actionLoading) setCancelTarget(null); }}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Cancel Challan</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Cancel <strong>{cancelTarget?.challanNumber}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCancelTarget(null)} disabled={actionLoading} sx={{ textTransform: 'none', color: '#374151' }}>Back</Button>
                    <Button color="error" variant="contained" onClick={handleCancel} disabled={actionLoading}
                        sx={{ textTransform: 'none' }}>{actionLoading ? 'Cancelling...' : 'Cancel Challan'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!actionLoading) setDeleteTarget(null); }}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete Challan</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Delete <strong>{deleteTarget?.challanNumber}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={actionLoading}
                        sx={{ textTransform: 'none' }}>{actionLoading ? 'Deleting...' : 'Delete'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
