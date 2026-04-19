import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem,
    Paper, Select, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { CheckCircle, Cancel, Splitscreen, Refresh, Search } from '@mui/icons-material';
import {
    getPendingMaterialRequests,
    approveMaterialRequest,
    partialApproveMaterialRequest,
    rejectMaterialRequest,
} from '../../services/inventoryService';

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e5e7eb';

const REJECTION_REASONS = [
    'Out of Stock',
    'Quality Hold',
    'Incorrect Item',
    'Purchase Order Pending',
    'Item Damaged',
    'Other',
];

const headerCellSx = {
    background: HEADER_BG,
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    py: 1.5,
    borderBottom: `2px solid ${BORDER_COLOR}`,
};

const statusChip = (status) => {
    if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
    if (status === 'PARTIAL') return <Chip label="Partial" color="warning" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
    if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
    return <Chip label="Pending" sx={{ bgcolor: '#fef9c3', color: '#92400e', fontWeight: 700, fontSize: '0.65rem', border: '1px solid #fde68a' }} size="small" />;
};

export default function MaterialRequestDashboard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState(null);

    // Action dialogs
    const [partialDialog, setPartialDialog] = useState({ open: false, request: null, qty: '' });
    const [rejectDialog, setRejectDialog] = useState({ open: false, request: null, reason: '', customReason: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getPendingMaterialRequests({ page, size: rowsPerPage });
            setRequests(res.content || []);
            setTotal(res.totalElements || 0);
        } catch (e) {
            setError('Failed to load material requests.');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleApprove = async (requestId) => {
        setActionLoading(true);
        try {
            await approveMaterialRequest(requestId);
            fetchRequests();
        } catch (e) {
            setError(e?.message || 'Approval failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePartialSubmit = async () => {
        const qty = parseFloat(partialDialog.qty);
        if (!qty || qty <= 0) return;
        setActionLoading(true);
        try {
            await partialApproveMaterialRequest(partialDialog.request.id, qty);
            setPartialDialog({ open: false, request: null, qty: '' });
            fetchRequests();
        } catch (e) {
            setError(e?.message || 'Partial approval failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectSubmit = async () => {
        const reason = rejectDialog.reason === 'Other' ? rejectDialog.customReason : rejectDialog.reason;
        if (!reason) return;
        setActionLoading(true);
        try {
            await rejectMaterialRequest(rejectDialog.request.id, reason);
            setRejectDialog({ open: false, request: null, reason: '', customReason: '' });
            fetchRequests();
        } catch (e) {
            setError(e?.message || 'Rejection failed.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <Fade in timeout={400}>
            <Box>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${BORDER_COLOR}`, bgcolor: '#fff' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} gap={2} flexWrap="wrap">
                        <Box>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                                Material Requests
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Approve or reject material requests raised against Work Orders
                            </Typography>
                        </Box>
                        <Tooltip title="Refresh">
                            <IconButton onClick={fetchRequests} disabled={loading} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                    <TableContainer sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Work Order</TableCell>
                                    <TableCell sx={headerCellSx}>Item</TableCell>
                                    <TableCell align="right" sx={headerCellSx}>Requested Qty</TableCell>
                                    <TableCell align="right" sx={headerCellSx}>Approved Qty</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Status</TableCell>
                                    <TableCell sx={headerCellSx}>Requested On</TableCell>
                                    <TableCell sx={headerCellSx}>Remarks / Reason</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 10 }}><CircularProgress size={28} /></TableCell></TableRow>
                                ) : requests.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8, color: 'text.secondary' }}>No pending material requests.</TableCell></TableRow>
                                ) : requests.map((req) => (
                                    <TableRow key={req.id} hover sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700} color="primary.main">
                                                {req.referenceNumber?.split('-MAT-')[0] || `WO-${req.sourceId}`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Ref: {req.referenceNumber}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{req.inventoryItem?.itemCode}</Typography>
                                            <Typography variant="caption" color="text.secondary">{req.inventoryItem?.name}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>{req.requestedQuantity ?? '-'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{req.inventoryItem?.uom}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {req.approvedQuantity != null ? (
                                                <Typography variant="body2" fontWeight={600} color="success.main">{req.approvedQuantity}</Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">{statusChip(req.approvalStatus)}</TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{req.requestedDate ? new Date(req.requestedDate).toLocaleDateString('en-IN') : '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {req.rejectionReason ? (
                                                <Tooltip title={req.rejectionReason} arrow>
                                                    <Typography variant="caption" color="error.main" sx={{ cursor: 'help' }}>
                                                        {req.rejectionReason.length > 22 ? req.rejectionReason.slice(0, 22) + '…' : req.rejectionReason}
                                                    </Typography>
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">{req.requestRemarks || '—'}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title="Full Approve">
                                                    <span>
                                                        <IconButton size="small" color="success"
                                                            onClick={() => handleApprove(req.id)}
                                                            disabled={actionLoading || req.approvalStatus === 'APPROVED'}>
                                                            <CheckCircle fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Partial Approve">
                                                    <span>
                                                        <IconButton size="small" color="warning"
                                                            onClick={() => setPartialDialog({ open: true, request: req, qty: '' })}
                                                            disabled={actionLoading || req.approvalStatus === 'APPROVED'}>
                                                            <Splitscreen fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Reject">
                                                    <span>
                                                        <IconButton size="small" color="error"
                                                            onClick={() => setRejectDialog({ open: true, request: req, reason: '', customReason: '' })}
                                                            disabled={actionLoading || req.approvalStatus === 'REJECTED'}>
                                                            <Cancel fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50]}
                        sx={{ mt: 1 }}
                    />
                </Paper>

                {/* Partial Approve Dialog */}
                <Dialog open={partialDialog.open} onClose={() => setPartialDialog({ open: false, request: null, qty: '' })} maxWidth="xs" fullWidth>
                    <DialogTitle fontWeight={700}>Partial Approve</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" mb={2} color="text.secondary">
                            Requested: <strong>{partialDialog.request?.requestedQuantity} {partialDialog.request?.inventoryItem?.uom}</strong> of{' '}
                            <strong>{partialDialog.request?.inventoryItem?.itemCode}</strong>
                        </Typography>
                        <TextField
                            label="Approved Quantity"
                            type="number"
                            fullWidth
                            size="small"
                            value={partialDialog.qty}
                            onChange={(e) => setPartialDialog((prev) => ({ ...prev, qty: e.target.value }))}
                            inputProps={{ min: 0.001, max: partialDialog.request?.requestedQuantity, step: '0.001' }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setPartialDialog({ open: false, request: null, qty: '' })}>Cancel</Button>
                        <Button variant="contained" color="warning" onClick={handlePartialSubmit} disabled={actionLoading || !partialDialog.qty}>
                            {actionLoading ? 'Approving…' : 'Approve Partial'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, request: null, reason: '', customReason: '' })} maxWidth="xs" fullWidth>
                    <DialogTitle fontWeight={700}>Reject Material Request</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" mb={2} color="text.secondary">
                            Item: <strong>{rejectDialog.request?.inventoryItem?.itemCode}</strong>
                        </Typography>
                        <Select
                            fullWidth
                            size="small"
                            value={rejectDialog.reason}
                            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value, customReason: '' }))}
                            displayEmpty
                            sx={{ mb: 2 }}
                        >
                            <MenuItem value="" disabled>Select reason</MenuItem>
                            {REJECTION_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                        {rejectDialog.reason === 'Other' && (
                            <TextField
                                label="Describe reason"
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={rejectDialog.customReason}
                                onChange={(e) => setRejectDialog((prev) => ({ ...prev, customReason: e.target.value }))}
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRejectDialog({ open: false, request: null, reason: '', customReason: '' })}>Cancel</Button>
                        <Button variant="contained" color="error" onClick={handleRejectSubmit}
                            disabled={actionLoading || !rejectDialog.reason || (rejectDialog.reason === 'Other' && !rejectDialog.customReason)}>
                            {actionLoading ? 'Rejecting…' : 'Reject'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
}
