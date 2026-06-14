import React, { useMemo, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Table,
    TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { createSalesCreditNote, confirmSalesCreditNote } from '../../../services/salesOrderService';

const T = { primary: '#2563eb', error: '#dc2626', textSec: '#64748b', border: '#e2e8f0' };

const REASONS = ['DEFECTIVE', 'SHORT_SUPPLY', 'RATE_DIFFERENCE', 'QUALITY_ISSUE', 'OTHER'];

const fmtAmt = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Per-line GST rate inferred from the invoice item's tax amounts vs its taxable value. */
const gstRateOf = (item) => {
    const taxable = (item.qty ?? 0) * (item.pricePerUnit ?? 0);
    const tax = (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0) + (item.igstAmount ?? 0);
    if (!taxable) return 0;
    return Math.round((tax / taxable) * 10000) / 100; // 2-dp percentage
};

export default function RaiseCreditNoteDialog({ open, onClose, invoice, onCreated }) {
    const [reason, setReason] = useState('DEFECTIVE');
    const [remarks, setRemarks] = useState('');
    const [lines, setLines] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Initialise editable lines from the invoice items whenever the dialog opens.
    React.useEffect(() => {
        if (open && invoice?.items) {
            setLines(invoice.items.map((it, i) => ({
                inventoryItemId: it.inventoryItemId,
                name: it.inventoryItemName,
                lineNumber: i + 1,
                maxQty: it.qty ?? 0,
                returnedQty: it.qty ?? 0,
                rate: it.pricePerUnit ?? 0,
                gstRate: gstRateOf(it),
                include: true,
            })));
            setReason('DEFECTIVE');
            setRemarks('');
            setError(null);
        }
    }, [open, invoice]);

    const updateLine = (idx, patch) =>
        setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

    const selected = lines.filter(l => l.include && l.returnedQty > 0);

    const total = useMemo(() => selected.reduce((sum, l) => {
        const base = l.returnedQty * l.rate;
        return sum + base + base * (l.gstRate / 100);
    }, 0), [selected]);

    const handleSubmit = async () => {
        if (!selected.length) { setError('Select at least one line with a return quantity.'); return; }
        const overReturn = selected.find(l => l.returnedQty > l.maxQty);
        if (overReturn) { setError(`Return qty for "${overReturn.name}" exceeds invoiced qty (${overReturn.maxQty}).`); return; }

        setSubmitting(true);
        setError(null);
        try {
            const created = await createSalesCreditNote({
                taxInvoiceId: invoice.id,
                reason,
                remarks,
                items: selected.map(l => ({
                    inventoryItemId: l.inventoryItemId,
                    lineNumber: l.lineNumber,
                    returnedQty: Number(l.returnedQty),
                    rate: Number(l.rate),
                    gstRate: Number(l.gstRate),
                })),
            });
            // Confirm immediately so it posts the CREDIT_NOTE voucher to the ledger.
            const confirmed = await confirmSalesCreditNote(created.id);
            onCreated?.(confirmed);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message ?? e?.message ?? 'Failed to raise credit note.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 900 }}>
                Raise Credit Note
                <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 500 }}>
                    Against invoice {invoice?.invoiceNumber} · {invoice?.customerName}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                    <TextField select label="Reason" value={reason} onChange={e => setReason(e.target.value)}
                        sx={{ minWidth: 220 }} size="small">
                        {REASONS.map(r => <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>)}
                    </TextField>
                    <TextField label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)}
                        fullWidth size="small" />
                </Stack>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Invoiced</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Return Qty</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Rate</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>GST %</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((l, idx) => (
                            <TableRow key={idx} sx={{ opacity: l.include ? 1 : 0.4 }}>
                                <TableCell padding="checkbox">
                                    <Checkbox checked={l.include} onChange={e => updateLine(idx, { include: e.target.checked })} />
                                </TableCell>
                                <TableCell>{l.name}</TableCell>
                                <TableCell align="right">{l.maxQty}</TableCell>
                                <TableCell align="right" sx={{ width: 110 }}>
                                    <TextField type="number" size="small" value={l.returnedQty}
                                        disabled={!l.include}
                                        onChange={e => updateLine(idx, { returnedQty: e.target.value })}
                                        inputProps={{ min: 0, max: l.maxQty, step: 'any', style: { textAlign: 'right' } }}
                                        sx={{ width: 100 }} />
                                </TableCell>
                                <TableCell align="right">{fmtAmt(l.rate)}</TableCell>
                                <TableCell align="right">{l.gstRate}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 800, textTransform: 'uppercase' }}>Credit Note Total</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: T.primary }}>{fmtAmt(total)}</Typography>
                    </Box>
                </Stack>

                <Alert severity="info" sx={{ mt: 2 }}>
                    Confirming will issue the credit note and post a reversing entry to the books immediately.
                </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ textTransform: 'none', fontWeight: 800, bgcolor: T.primary }}>
                    {submitting ? 'Issuing…' : 'Issue Credit Note'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
