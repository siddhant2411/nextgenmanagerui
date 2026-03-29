import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
    Box,
    Divider,
} from '@mui/material';
import { LocalShipping, Schedule } from '@mui/icons-material';

export default function DispatchConfirmDialog({ open, challan, onConfirm, onClose, isLoading }) {
    if (!challan) return null;

    const totalQty = challan.lines?.reduce((sum, l) => sum + (l.quantityDispatched || 0), 0) ?? 0;

    return (
        <Dialog open={open} onClose={() => { if (!isLoading) onClose(); }} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <LocalShipping sx={{ color: '#1565c0' }} />
                    Dispatch Challan
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                    {challan.challanNumber}
                </Typography>

                <Box sx={{ bgcolor: '#f8fafc', borderRadius: 1.5, p: 2, mb: 2, border: '1px solid #e5e7eb' }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Vendor</Typography>
                        <Typography variant="body2" fontWeight={600}>{challan.vendorName}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Material Lines</Typography>
                        <Typography variant="body2" fontWeight={600}>{challan.lines?.length ?? 0} items</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Total Qty</Typography>
                        <Typography variant="body2" fontWeight={600}>{totalQty.toLocaleString('en-IN')}</Typography>
                    </Box>
                </Box>

                <Box sx={{ bgcolor: '#fff8e1', border: '1px solid #ffe082', borderRadius: 1.5, p: 1.5 }}
                    display="flex" alignItems="flex-start" gap={1}>
                    <Schedule sx={{ color: '#f57f17', fontSize: 18, mt: 0.25 }} />
                    <Typography variant="body2" color="#7c5700">
                        Once dispatched, the <strong>180-day GST return clock</strong> starts under Section 143 / Rule 45. Materials must be returned before the deadline to avoid tax liability.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} disabled={isLoading}
                    sx={{ textTransform: 'none', color: '#374151' }}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={onConfirm} disabled={isLoading}
                    startIcon={<LocalShipping />}
                    sx={{
                        textTransform: 'none', fontWeight: 600,
                        bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                    }}>
                    {isLoading ? 'Dispatching...' : 'Dispatch'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
