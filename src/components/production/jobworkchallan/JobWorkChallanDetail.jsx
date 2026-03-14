import React, { useEffect, useState } from 'react';
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
    Divider,
    Grid,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    ArrowBack,
    Business,
    Cancel,
    Delete,
    Edit,
    LocalShipping,
    MoveToInbox,
    Warning,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    cancelChallan,
    deleteJobWorkChallan,
    dispatchChallan,
    getJobWorkChallan,
    receiveChallan,
} from '../../../services/jobWorkChallanService';
import DispatchConfirmDialog from './DispatchConfirmDialog';
import ReceiveBackModal from './ReceiveBackModal';

const BORDER_COLOR = '#e5e7eb';
const HEADER_BG = '#0f2744';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.78rem',
    py: 1,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
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
    PARTIALLY_RECEIVED: 'Partially Received',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const formatDate = (d) => d ? dayjs(d).format('DD-MMM-YYYY') : '—';

const formatINR = (value) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
};

const InfoItem = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary"
            sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25, fontSize: '0.875rem' }}>
            {value || '—'}
        </Typography>
    </Box>
);

const DaysRemainingDisplay = ({ days, large = false }) => {
    if (days === null || days === undefined) return <Typography variant={large ? 'h6' : 'body2'} color="text.disabled">—</Typography>;
    if (days < 0) {
        return (
            <Box display="flex" alignItems="center" gap={0.5}>
                <Warning sx={{ color: '#c62828', fontSize: large ? 22 : 16 }} />
                <Typography variant={large ? 'h6' : 'body2'} fontWeight={700} color="#c62828">
                    {Math.abs(days)} days overdue
                </Typography>
            </Box>
        );
    }
    if (days <= 15) {
        return (
            <Box display="flex" alignItems="center" gap={0.5}>
                <Warning sx={{ color: '#e65100', fontSize: large ? 22 : 16 }} />
                <Typography variant={large ? 'h6' : 'body2'} fontWeight={700} color="#e65100">
                    {days} days left
                </Typography>
            </Box>
        );
    }
    return (
        <Typography variant={large ? 'h6' : 'body2'} fontWeight={600} color="#2e7d32">
            {days} days left
        </Typography>
    );
};

export default function JobWorkChallanDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [challan, setChallan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const loadChallan = async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError('');
            const data = await getJobWorkChallan(id);
            setChallan(data);
        } catch {
            setError('Failed to load challan details.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadChallan(); }, [id]);

    const handleDispatch = async () => {
        try {
            setActionLoading(true);
            await dispatchChallan(id);
            showSnack('Challan dispatched. 180-day return clock started.');
            setDispatchOpen(false);
            await loadChallan();
        } catch {
            showSnack('Failed to dispatch.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReceive = async (payload) => {
        try {
            setActionLoading(true);
            await receiveChallan(id, payload);
            const totalPending = challan?.lines?.reduce((s, l) => s + (l.quantityPending ?? 0), 0) ?? 0;
            const totalReceiving = payload.lines?.reduce((s, l) => s + (l.quantityReceived ?? 0) + (l.quantityRejected ?? 0), 0) ?? 0;
            showSnack(totalReceiving >= totalPending
                ? 'Challan completed — all materials received.'
                : 'Partially received — some units still pending.');
            setReceiveOpen(false);
            await loadChallan();
        } catch {
            showSnack('Failed to record receipt.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        try {
            setActionLoading(true);
            await cancelChallan(id);
            showSnack('Challan cancelled.');
            setCancelOpen(false);
            await loadChallan();
        } catch {
            showSnack('Failed to cancel.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setActionLoading(true);
            await deleteJobWorkChallan(id);
            showSnack('Challan deleted.');
            navigate('/production/job-work-challan');
        } catch {
            showSnack('Failed to delete.', 'error');
            setActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
                <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                <Typography variant="body2" color="text.secondary">Loading challan...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>
                <Button size="small" variant="outlined" onClick={loadChallan} sx={{ mt: 1, textTransform: 'none' }}>Retry</Button>
            </Box>
        );
    }

    if (!challan) return null;

    const { status } = challan;
    const canEdit = status === 'DRAFT';
    const canDispatch = status === 'DRAFT';
    const canDelete = status === 'DRAFT';
    const canReceive = status === 'DISPATCHED' || status === 'PARTIALLY_RECEIVED';
    const canCancel = status === 'DISPATCHED' || status === 'PARTIALLY_RECEIVED';

    const statusStyle = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#64748b' };
    const totalDispatched = challan.lines?.reduce((s, l) => s + (l.quantityDispatched ?? 0), 0) ?? 0;
    const totalPending = challan.lines?.reduce((s, l) => s + (l.quantityPending ?? 0), 0) ?? 0;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Page nav */}
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <IconButton size="small" onClick={() => navigate('/production/job-work-challan')} sx={{ color: '#374151' }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="body2" color="text.secondary">Job Work Challans</Typography>
                <Typography variant="body2" color="text.secondary">/</Typography>
                <Typography variant="body2" fontWeight={600} color="#0f2744">{challan.challanNumber}</Typography>
            </Box>

            {/* Header Card */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={800} color="#0f2744" sx={{ letterSpacing: -0.5 }}>
                                {challan.challanNumber}
                            </Typography>
                            <Chip label={STATUS_LABELS[status] || status} size="small"
                                sx={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontWeight: 700, fontSize: '0.75rem', height: 24 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            Created {formatDate(challan.creationDate)}
                            {challan.updatedDate && challan.updatedDate !== challan.creationDate && ` · Updated ${formatDate(challan.updatedDate)}`}
                        </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {canEdit && (
                            <Button variant="outlined" size="small" startIcon={<Edit />}
                                onClick={() => navigate(`/production/job-work-challan/${id}/edit`)}
                                sx={{ textTransform: 'none', borderRadius: 1.5, borderColor: '#1565c0', color: '#1565c0' }}>
                                Edit
                            </Button>
                        )}
                        {canDispatch && (
                            <Button variant="contained" size="small" startIcon={<LocalShipping />}
                                onClick={() => setDispatchOpen(true)}
                                sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                                Dispatch
                            </Button>
                        )}
                        {canReceive && (
                            <Button variant="contained" size="small" startIcon={<MoveToInbox />}
                                onClick={() => setReceiveOpen(true)}
                                sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
                                Receive Back
                            </Button>
                        )}
                        {canCancel && (
                            <Button variant="outlined" size="small" startIcon={<Cancel />} color="error"
                                onClick={() => setCancelOpen(true)}
                                sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                                Cancel
                            </Button>
                        )}
                        {canDelete && (
                            <Button variant="outlined" size="small" startIcon={<Delete />} color="error"
                                onClick={() => setDeleteOpen(true)}
                                sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                                Delete
                            </Button>
                        )}
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Info Grid */}
                <Grid container spacing={3}>
                    {/* Vendor column */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                            <Business sx={{ color: '#1565c0', mt: 0.25, fontSize: 18 }} />
                            <Typography variant="subtitle2" fontWeight={700} color="#0f2744">Vendor</Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }} display="flex" flexDirection="column" gap={1}>
                            <InfoItem label="Name" value={challan.vendorName} />
                            <InfoItem label="GST Number" value={challan.vendorGstNumber} />
                        </Box>
                    </Grid>

                    {/* Work Order */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <InfoItem label="Work Order" value={challan.workOrderNumber} />
                            <InfoItem label="Operation" value={challan.workOrderOperationName} />
                            <InfoItem label="Agreed Rate / Unit" value={challan.agreedRatePerUnit != null ? formatINR(challan.agreedRatePerUnit) : null} />
                        </Box>
                    </Grid>

                    {/* Dates */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <InfoItem label="Dispatch Date" value={formatDate(challan.dispatchDate)} />
                            <InfoItem label="Expected Return" value={formatDate(challan.expectedReturnDate)} />
                            {challan.actualReturnDate && (
                                <InfoItem label="Actual Return" value={formatDate(challan.actualReturnDate)} />
                            )}
                            {challan.daysRemainingForReturn !== null && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary"
                                        sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Days Remaining
                                    </Typography>
                                    <Box mt={0.5}>
                                        <DaysRemainingDisplay days={challan.daysRemainingForReturn} />
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Grid>

                    {/* Dispatch details & remarks */}
                    {(challan.dispatchDetails || challan.remarks) && (
                        <Grid item xs={12}>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                {challan.dispatchDetails && (
                                    <Grid item xs={12} sm={6}>
                                        <InfoItem label="Dispatch Details" value={challan.dispatchDetails} />
                                    </Grid>
                                )}
                                {challan.remarks && (
                                    <Grid item xs={12} sm={6}>
                                        <InfoItem label="Remarks" value={challan.remarks} />
                                    </Grid>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </Grid>

                {/* Summary chips */}
                <Box display="flex" gap={2} mt={2} flexWrap="wrap">
                    <Box sx={{ bgcolor: '#f1f5f9', borderRadius: 1.5, px: 1.5, py: 0.75 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Lines</Typography>
                        <Typography variant="body2" fontWeight={700}>{challan.lines?.length ?? 0}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#e3f2fd', borderRadius: 1.5, px: 1.5, py: 0.75 }}>
                        <Typography variant="caption" color="#1565c0" fontWeight={600}>Total Dispatched</Typography>
                        <Typography variant="body2" fontWeight={700} color="#1565c0">{totalDispatched.toLocaleString('en-IN')}</Typography>
                    </Box>
                    {totalPending > 0 && (
                        <Box sx={{ bgcolor: '#fff3e0', borderRadius: 1.5, px: 1.5, py: 0.75 }}>
                            <Typography variant="caption" color="#e65100" fontWeight={600}>Pending Return</Typography>
                            <Typography variant="body2" fontWeight={700} color="#e65100">{totalPending.toLocaleString('en-IN')}</Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Material Lines Table */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f2744" mb={1.5}>
                    Material Lines
                </Typography>
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellSx}>Item / Description</TableCell>
                                <TableCell sx={headerCellSx}>HSN</TableCell>
                                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Dispatched</TableCell>
                                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Received</TableCell>
                                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Rejected</TableCell>
                                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Pending</TableCell>
                                <TableCell sx={headerCellSx}>UOM</TableCell>
                                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Value/Unit</TableCell>
                                <TableCell sx={headerCellSx}>Last Receipt</TableCell>
                                <TableCell sx={headerCellSx}>Remarks</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(!challan.lines || challan.lines.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">No material lines.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                            {(challan.lines ?? []).map((line, idx) => {
                                const isOverdue = challan.daysRemainingForReturn !== null && challan.daysRemainingForReturn < 0;
                                const pendingColor = (line.quantityPending ?? 0) > 0
                                    ? (isOverdue ? '#c62828' : '#e65100')
                                    : undefined;
                                return (
                                    <TableRow key={line.id}
                                        sx={{
                                            bgcolor: idx % 2 === 0 ? '#fafbfc' : '#fff',
                                            '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                        }}>
                                        <TableCell>
                                            {line.itemCode && (
                                                <Typography variant="caption" color="text.secondary" display="block">{line.itemCode}</Typography>
                                            )}
                                            <Typography variant="body2" fontWeight={500}>{line.description}</Typography>
                                        </TableCell>
                                        <TableCell>{line.hsnCode || '—'}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontWeight: 500 }}>{(line.quantityDispatched ?? 0).toLocaleString('en-IN')}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', color: '#2e7d32', fontWeight: 500 }}>{(line.quantityReceived ?? 0).toLocaleString('en-IN')}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', color: '#c62828', fontWeight: 500 }}>{(line.quantityRejected ?? 0).toLocaleString('en-IN')}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: pendingColor }}>
                                            {(line.quantityPending ?? 0).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>{line.uom}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{line.valuePerUnit != null ? formatINR(line.valuePerUnit) : '—'}</TableCell>
                                        <TableCell>{formatDate(line.lastReceiptDate)}</TableCell>
                                        <TableCell sx={{ color: '#6b7280' }}>{line.remarks || '—'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Dialogs */}
            <DispatchConfirmDialog
                open={dispatchOpen}
                challan={challan}
                onConfirm={handleDispatch}
                onClose={() => setDispatchOpen(false)}
                isLoading={actionLoading}
            />

            <ReceiveBackModal
                open={receiveOpen}
                challan={challan}
                onConfirm={handleReceive}
                onClose={() => setReceiveOpen(false)}
                isLoading={actionLoading}
            />

            <Dialog open={cancelOpen} onClose={() => { if (!actionLoading) setCancelOpen(false); }}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Cancel Challan</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Cancel <strong>{challan.challanNumber}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCancelOpen(false)} disabled={actionLoading} sx={{ textTransform: 'none', color: '#374151' }}>Back</Button>
                    <Button color="error" variant="contained" onClick={handleCancel} disabled={actionLoading}
                        sx={{ textTransform: 'none' }}>{actionLoading ? 'Cancelling...' : 'Cancel Challan'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteOpen} onClose={() => { if (!actionLoading) setDeleteOpen(false); }}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete Challan</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Permanently delete <strong>{challan.challanNumber}</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteOpen(false)} disabled={actionLoading} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={actionLoading}
                        sx={{ textTransform: 'none' }}>{actionLoading ? 'Deleting...' : 'Delete'}</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
