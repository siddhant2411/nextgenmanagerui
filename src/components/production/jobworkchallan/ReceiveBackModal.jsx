import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Paper,
} from '@mui/material';
import { MoveToInbox } from '@mui/icons-material';
import dayjs from 'dayjs';

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

export default function ReceiveBackModal({ open, challan, onConfirm, onClose, isLoading }) {
    const [receiptDate, setReceiptDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [remarks, setRemarks] = useState('');
    const [lineInputs, setLineInputs] = useState([]);
    const [errors, setErrors] = useState({});

    const pendingLines = challan?.lines?.filter(l => (l.quantityPending ?? 0) > 0) ?? [];

    useEffect(() => {
        if (open && challan) {
            setReceiptDate(dayjs().format('YYYY-MM-DD'));
            setRemarks('');
            setErrors({});
            setLineInputs(
                (challan.lines ?? [])
                    .filter(l => (l.quantityPending ?? 0) > 0)
                    .map(l => ({
                        lineId: l.id,
                        quantityReceived: '',
                        quantityRejected: '',
                        remarks: '',
                    }))
            );
        }
    }, [open, challan]);

    const updateLine = (index, field, value) => {
        setLineInputs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setErrors(prev => ({ ...prev, [`line_${index}`]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!receiptDate) newErrors.receiptDate = 'Receipt date is required';

        lineInputs.forEach((li, idx) => {
            const pending = pendingLines[idx]?.quantityPending ?? 0;
            const recv = parseFloat(li.quantityReceived) || 0;
            const rej = parseFloat(li.quantityRejected) || 0;
            if (recv < 0) newErrors[`line_${idx}`] = 'Qty received cannot be negative';
            else if (rej < 0) newErrors[`line_${idx}`] = 'Qty rejected cannot be negative';
            else if (recv + rej > pending) newErrors[`line_${idx}`] = `Total (${recv + rej}) exceeds pending (${pending})`;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const payload = {
            receiptDate,
            remarks: remarks.trim() || null,
            lines: lineInputs
                .filter((li, idx) => {
                    const recv = parseFloat(li.quantityReceived) || 0;
                    const rej = parseFloat(li.quantityRejected) || 0;
                    return recv > 0 || rej > 0;
                })
                .map(li => ({
                    lineId: li.lineId,
                    quantityReceived: parseFloat(li.quantityReceived) || 0,
                    quantityRejected: parseFloat(li.quantityRejected) || 0,
                    remarks: li.remarks.trim() || null,
                })),
        };
        onConfirm(payload);
    };

    return (
        <Dialog open={open} onClose={() => { if (!isLoading) onClose(); }} maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <MoveToInbox sx={{ color: '#1565c0' }} />
                    Receive Back Materials
                </Box>
                {challan && (
                    <Typography variant="body2" color="text.secondary" fontWeight={400}>
                        {challan.challanNumber} — {challan.vendorName}
                    </Typography>
                )}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                {/* Header fields */}
                <Box display="flex" gap={2} mb={2.5} flexWrap="wrap">
                    <TextField
                        label="Receipt Date"
                        type="date"
                        size="small"
                        value={receiptDate}
                        onChange={e => { setReceiptDate(e.target.value); setErrors(p => ({ ...p, receiptDate: null })); }}
                        error={!!errors.receiptDate}
                        helperText={errors.receiptDate}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 200 }}
                        required
                    />
                    <TextField
                        label="Remarks"
                        size="small"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Optional notes..."
                        sx={{ flex: 1, minWidth: 200 }}
                    />
                </Box>

                {/* Lines */}
                {pendingLines.length === 0 ? (
                    <Alert severity="info">No pending lines to receive.</Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Item / Description</TableCell>
                                    <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Dispatched</TableCell>
                                    <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Already Received</TableCell>
                                    <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Pending</TableCell>
                                    <TableCell sx={{ ...headerCellSx, width: 130 }}>Qty Received</TableCell>
                                    <TableCell sx={{ ...headerCellSx, width: 130 }}>Qty Rejected</TableCell>
                                    <TableCell sx={{ ...headerCellSx, width: 160 }}>Remarks</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingLines.map((line, idx) => (
                                    <TableRow key={line.id}
                                        sx={{ bgcolor: idx % 2 === 0 ? '#fafbfc' : '#fff', '& td': { fontSize: '0.8125rem', py: 0.75 } }}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                                                {line.itemCode ? `${line.itemCode} — ` : ''}{line.description}
                                            </Typography>
                                            {errors[`line_${idx}`] && (
                                                <Typography variant="caption" color="error">{errors[`line_${idx}`]}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{line.quantityDispatched}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{line.quantityReceived}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#e65100' }}>
                                            {line.quantityPending}
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={lineInputs[idx]?.quantityReceived ?? ''}
                                                onChange={e => updateLine(idx, 'quantityReceived', e.target.value)}
                                                inputProps={{ min: 0, max: line.quantityPending, step: 'any' }}
                                                error={!!errors[`line_${idx}`]}
                                                sx={{ width: 110, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={lineInputs[idx]?.quantityRejected ?? ''}
                                                onChange={e => updateLine(idx, 'quantityRejected', e.target.value)}
                                                inputProps={{ min: 0, step: 'any' }}
                                                error={!!errors[`line_${idx}`]}
                                                sx={{ width: 110, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                value={lineInputs[idx]?.remarks ?? ''}
                                                onChange={e => updateLine(idx, 'remarks', e.target.value)}
                                                sx={{ width: 150, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
                                                placeholder="Optional"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} disabled={isLoading} sx={{ textTransform: 'none', color: '#374151' }}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isLoading || pendingLines.length === 0}
                    startIcon={<MoveToInbox />}
                    sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                    {isLoading ? 'Saving...' : 'Confirm Receipt'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
