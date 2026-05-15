import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, Typography, Box, Alert, CircularProgress, Chip
} from '@mui/material';
import inventoryService from '../../../services/inventoryService';

export default function StockAllocationModal({ open, onClose, item, requiredQty, onAllocate }) {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (open && item) {
            fetchInstances();
        } else {
            setSelectedIds([]);
        }
    }, [open, item]);

    const fetchInstances = async () => {
        setLoading(true);
        setError(null);
        try {
            const itemId = item.inventoryItem?.inventoryItemId ?? item.inventoryItem?.id;
            const data = await inventoryService.getAvailableInstancesWithDetails(itemId);
            setInstances(data);
            // Auto-select if any previous allocation was made
            if (item.allocatedInstanceIds) {
                setSelectedIds(item.allocatedInstanceIds);
            }
        } catch (e) {
            setError(e?.message || 'Failed to load available stock instances.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onAllocate(selectedIds);
        onClose();
    };

    const totalSelectedQty = instances
        .filter(i => selectedIds.includes(i.instanceId))
        .reduce((sum, i) => sum + (i.quantity || 1), 0); // Handle NOS as 1

    const hasFailedQC = instances
        .filter(i => selectedIds.includes(i.instanceId))
        .some(i => i.qualityStatus === 'FAILED' || i.qualityStatus === 'PENDING_QC');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>
                Select Stock for {item?.inventoryItem?.name || 'Product'}
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <>
                        <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="textSecondary">
                                Required Qty: <b>{requiredQty}</b>
                            </Typography>
                            <Typography variant="body2" color={totalSelectedQty > requiredQty ? 'error' : 'primary'}>
                                Selected Qty: <b>{totalSelectedQty}</b>
                            </Typography>
                        </Box>
                        
                        {hasFailedQC && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Warning: You have selected items that are PENDING_QC or FAILED.
                            </Alert>
                        )}

                        <TableContainer sx={{ maxHeight: 400 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox" />
                                        <TableCell>Batch / Serial</TableCell>
                                        <TableCell>Available Qty</TableCell>
                                        <TableCell>QC Status</TableCell>
                                        <TableCell>Expiry</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {instances.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">No available instances found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        instances.map(inst => {
                                            const isSelected = selectedIds.includes(inst.instanceId);
                                            const isFailed = inst.qualityStatus === 'FAILED';
                                            const isPending = inst.qualityStatus === 'PENDING_QC';
                                            
                                            return (
                                                <TableRow key={inst.instanceId} hover selected={isSelected} onClick={() => handleToggle(inst.instanceId)} sx={{ cursor: 'pointer' }}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox checked={isSelected} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {inst.serialNumber ? `S/N: ${inst.serialNumber}` : inst.batchNumber ? `Batch: ${inst.batchNumber}` : `ID: ${inst.instanceId}`}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{inst.quantity}</TableCell>
                                                    <TableCell>
                                                        {inst.qualityStatus ? (
                                                            <Chip 
                                                                label={inst.qualityStatus} 
                                                                size="small" 
                                                                color={isFailed ? 'error' : isPending ? 'warning' : 'success'}
                                                            />
                                                        ) : (
                                                            <Chip label="N/A" size="small" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{inst.expiryDate || '—'}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleConfirm} variant="contained" color="primary" disabled={loading || instances.length === 0}>
                    Confirm Allocation
                </Button>
            </DialogActions>
        </Dialog>
    );
}
