import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow,
    TextField, Chip, Stack, Alert, CircularProgress, Divider, Collapse,
    IconButton, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
    Add, ExpandMore, ExpandLess, CheckCircle, Warning, Inventory2,
} from '@mui/icons-material';
import { getGRNsByPO, createGRN } from '../../../services/grnService';
import { useAuth } from '../../../auth/AuthContext';

const BORDER = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const fmtCur = (n) =>
    n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';

// ── GRN Result Dialog (shows generated batch/serial numbers) ──────────────────
function GRNResultDialog({ open, onClose, grn }) {
    if (!grn) return null;
    const trackedItems = (grn.items || []).filter(
        i => i.generatedBatchNumber || (i.generatedSerialNumbers || []).length > 0
    );
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CheckCircle sx={{ color: '#16a34a', fontSize: 24 }} />
                    <Box>
                        GRN Posted — {grn.grnNumber}
                        <Typography variant="body2" sx={{ fontWeight: 400, color: '#64748b', mt: 0.3 }}>
                            Inventory updated. Batch/serial numbers assigned by inventory system.
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {trackedItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No tracked items in this receipt.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {trackedItems.map((item, i) => (
                            <Box key={i} sx={{ p: 2, bgcolor: BG_SOFT, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
                                    {item.itemName} <Typography component="span" sx={{ fontWeight: 400, color: '#64748b', fontSize: '0.78rem' }}>({item.itemCode})</Typography>
                                </Typography>
                                {item.generatedBatchNumber && (
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                        <Chip label="Batch" size="small" color="warning"
                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                                        <Typography sx={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {item.generatedBatchNumber}
                                        </Typography>
                                    </Stack>
                                )}
                                {(item.generatedSerialNumbers || []).length > 0 && (
                                    <Box>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                            <Chip label="Serials" size="small" color="info"
                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {item.generatedSerialNumbers.length} assigned
                                            </Typography>
                                        </Stack>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {item.generatedSerialNumbers.map((s, si) => (
                                                <Chip key={si} label={s} size="small"
                                                    sx={{ height: 20, fontSize: '0.7rem', fontFamily: 'monospace', bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} variant="contained" disableElevation
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── GRN History row ───────────────────────────────────────────────────────────
function GRNHistoryRow({ grn }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TableRow sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                <TableCell sx={{ py: 1 }}>
                    <IconButton size="small" onClick={() => setOpen(v => !v)}>
                        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{grn.grnNumber}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{fmt(grn.grnDate)}</TableCell>
                <TableCell>
                    <Chip label={grn.status} size="small" color="success"
                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{grn.warehouse || '—'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    ₹{fmtCur(grn.totalAmount)}
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{grn.createdBy}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                    <Collapse in={open} unmountOnExit>
                        <Box sx={{ px: 6, py: 2, bgcolor: '#fafbfc', borderBottom: `1px solid ${BORDER}` }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Item', 'Ordered', 'Received', 'Accepted', 'Rejected', 'Rate', 'Amount', 'Batch / Serials'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#475569', py: 0.5 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(grn.items || []).map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{item.itemName}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{item.orderedQty}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{item.receivedQty}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>{item.acceptedQty}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: item.rejectedQty > 0 ? '#dc2626' : undefined }}>{item.rejectedQty}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>₹{fmtCur(item.rate)}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>₹{fmtCur(item.amount)}</TableCell>
                                            <TableCell>
                                                {item.generatedBatchNumber && (
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Chip label="Batch" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                        <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.generatedBatchNumber}</Typography>
                                                    </Stack>
                                                )}
                                                {(item.generatedSerialNumbers || []).length > 0 && (
                                                    <Box>
                                                        <Typography sx={{ fontSize: '0.7rem', color: '#64748b', mb: 0.3 }}>
                                                            {item.generatedSerialNumbers.length} serial(s):
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                                                            {item.generatedSerialNumbers.map((s, si) => (
                                                                <Chip key={si} label={s} size="small"
                                                                    sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace', bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                                {!item.generatedBatchNumber && !(item.generatedSerialNumbers || []).length && (
                                                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {grn.remarks && (
                                <Typography sx={{ mt: 1, fontSize: '0.78rem', color: '#64748b' }}>
                                    Remarks: {grn.remarks}
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

// ── New Receipt Form ──────────────────────────────────────────────────────────
function ReceiveForm({ po, grns, onPosted, onCancel }) {
    const { user } = useAuth();

    // Compute already-received qty per itemId from all past GRNs
    const receivedMap = {};
    (grns || []).forEach(g =>
        (g.items || []).forEach(gi => {
            receivedMap[gi.inventoryItemId] = (receivedMap[gi.inventoryItemId] || 0) + gi.acceptedQty;
        })
    );

    const eligibleItems = (po.items || []).filter(item => {
        const already = receivedMap[item.itemId] || 0;
        return already < item.quantityOrdered;
    });

    const initLines = () =>
        eligibleItems.map(item => {
            const already = receivedMap[item.itemId] || 0;
            const remaining = item.quantityOrdered - already;
            const needsTracking = item.batchTracked || item.serialTracked;
            return {
                itemId: item.itemId,
                itemName: item.itemName,
                itemCode: item.itemCode,
                uom: item.uom,
                orderedQty: item.quantityOrdered,
                alreadyReceived: already,
                remaining,
                rate: Number(item.unitPrice) || 0,
                receivedQty: remaining,
                acceptedQty: remaining,
                rejectedQty: 0,
                rejectionReason: '',
                batchTracked: item.batchTracked,
                serialTracked: item.serialTracked,
                supplierBatchNo: '',
                manufacturingDate: '',
                expiryDate: '',
                manualSerialNumbers: '',
                showTracking: needsTracking, // auto-expand for tracked items
            };
        });

    const [grnDate, setGrnDate] = useState(new Date().toISOString().slice(0, 10));
    const [warehouse, setWarehouse] = useState('');
    const [remarks, setRemarks] = useState('');
    const [lines, setLines] = useState(initLines);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const updateLine = (idx, field, value) => {
        setLines(prev => {
            const next = [...prev];
            const line = { ...next[idx], [field]: value };
            if (field === 'receivedQty' || field === 'acceptedQty') {
                const rec = field === 'receivedQty' ? Number(value) : Number(line.receivedQty);
                const acc = field === 'acceptedQty' ? Number(value) : Number(line.acceptedQty);
                line.rejectedQty = Math.max(0, rec - acc);
            }
            next[idx] = line;
            return next;
        });
    };

    const validate = () => {
        for (const l of lines) {
            const rec = Number(l.receivedQty);
            const acc = Number(l.acceptedQty);
            if (rec < 0 || acc < 0) return `${l.itemName}: quantities cannot be negative`;
            if (acc > rec) return `${l.itemName}: accepted qty cannot exceed received qty`;
            if (rec > l.remaining) return `${l.itemName}: received (${rec}) exceeds remaining (${l.remaining})`;
            if (l.serialTracked && l.manualSerialNumbers.trim()) {
                const serials = l.manualSerialNumbers.trim().split('\n').filter(s => s.trim());
                if (serials.length !== Math.round(acc)) {
                    return `${l.itemName}: enter exactly ${Math.round(acc)} serial number(s), or leave blank to auto-generate`;
                }
            }
        }
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                purchaseOrderId: po.id,
                vendorId: po.vendorId,
                grnDate,
                warehouse: warehouse || null,
                remarks: remarks || null,
                createdBy: user?.username || 'system',
                items: lines
                    .filter(l => Number(l.receivedQty) > 0)
                    .map(l => ({
                        inventoryItemId: l.itemId,
                        itemCode: l.itemCode,
                        itemName: l.itemName,
                        uom: l.uom,
                        orderedQty: l.orderedQty,
                        receivedQty: Number(l.receivedQty),
                        acceptedQty: Number(l.acceptedQty),
                        rejectedQty: Number(l.rejectedQty),
                        rate: l.rate,
                        amount: Number(l.acceptedQty) * l.rate,
                        rejectionReason: l.rejectionReason || null,
                        supplierBatchNo: l.batchTracked ? (l.supplierBatchNo || null) : null,
                        manufacturingDate: l.batchTracked && l.manufacturingDate ? l.manufacturingDate : null,
                        expiryDate: (l.batchTracked || l.serialTracked) && l.expiryDate ? l.expiryDate : null,
                        manualSerialNumbers: l.serialTracked && l.manualSerialNumbers.trim()
                            ? l.manualSerialNumbers.trim().split('\n').map(s => s.trim()).filter(Boolean)
                            : null,
                    })),
            };
            const result = await createGRN(payload);
            onPosted(result);
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to post receipt. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (eligibleItems.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 5, color: '#64748b' }}>
                <CheckCircle sx={{ fontSize: 40, color: '#16a34a', mb: 1 }} />
                <Typography variant="body2">All items have been fully received.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 1.5 }}>
                    {error}
                </Alert>
            )}

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <TextField label="GRN Date" type="date" size="small" value={grnDate}
                    onChange={e => setGrnDate(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
                <TextField label="Warehouse" size="small" value={warehouse}
                    onChange={e => setWarehouse(e.target.value)}
                    placeholder="e.g. Main Store" sx={{ width: 200 }} />
                <TextField label="Remarks" size="small" value={remarks}
                    onChange={e => setRemarks(e.target.value)} sx={{ flex: 1 }} />
            </Stack>

            <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: BG_SOFT }}>
                            {['#', 'Item', 'Ordered', 'Recd. So Far', 'Remaining', 'Receive Now', 'Accepted', 'Rejected', 'Rejection Reason'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <React.Fragment key={line.itemId}>
                                <TableRow sx={{ verticalAlign: 'top', '&:hover': { bgcolor: '#fafbfc' } }}>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#94a3b8', pt: 1.5 }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ pt: 1.5 }}>
                                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{line.itemName}</Typography>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{line.itemCode} · {line.uom}</Typography>
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                            {line.batchTracked && <Chip label="Batch Tracked" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                                            {line.serialTracked && <Chip label="Serial Tracked" size="small" color="info" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', pt: 1.5 }}>{line.orderedQty}</TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', pt: 1.5, color: '#64748b' }}>{line.alreadyReceived}</TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', pt: 1.5, fontWeight: 600, color: '#0891b2' }}>{line.remaining}</TableCell>
                                    <TableCell sx={{ pt: 1 }}>
                                        <TextField type="number" size="small" value={line.receivedQty}
                                            onChange={e => updateLine(idx, 'receivedQty', e.target.value)}
                                            inputProps={{ min: 0, max: line.remaining, step: 1 }}
                                            sx={{ width: 80 }} />
                                    </TableCell>
                                    <TableCell sx={{ pt: 1 }}>
                                        <TextField type="number" size="small" value={line.acceptedQty}
                                            onChange={e => updateLine(idx, 'acceptedQty', e.target.value)}
                                            inputProps={{ min: 0, max: line.receivedQty, step: 1 }}
                                            sx={{ width: 80 }} />
                                    </TableCell>
                                    <TableCell sx={{ pt: 1.5 }}>
                                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: line.rejectedQty > 0 ? '#dc2626' : '#94a3b8' }}>
                                            {line.rejectedQty}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ pt: 1 }}>
                                        {line.rejectedQty > 0 && (
                                            <TextField size="small" placeholder="Reason…" value={line.rejectionReason}
                                                onChange={e => updateLine(idx, 'rejectionReason', e.target.value)}
                                                sx={{ width: 160 }} />
                                        )}
                                    </TableCell>
                                </TableRow>

                                {/* Batch / Serial tracking — auto-expanded for tracked items */}
                                {(line.batchTracked || line.serialTracked) && (
                                    <TableRow>
                                        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                                            <Box sx={{ px: 4, py: 0.5, display: 'flex', alignItems: 'center', bgcolor: '#fafbfc', borderTop: `1px dashed ${BORDER}` }}>
                                                <Inventory2 sx={{ fontSize: 14, color: '#0369a1', mr: 0.8 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                                                    Inventory Tracking Details
                                                </Typography>
                                                <IconButton size="small" onClick={() => updateLine(idx, 'showTracking', !line.showTracking)}>
                                                    {line.showTracking ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                                </IconButton>
                                            </Box>
                                            <Collapse in={line.showTracking} unmountOnExit>
                                                <Box sx={{ px: 4, py: 2, bgcolor: '#f0f9ff', borderBottom: `1px solid ${BORDER}` }}>
                                                    <Alert severity="info" sx={{ mb: 2, py: 0.5, fontSize: '0.78rem' }}>
                                                        {line.batchTracked && !line.serialTracked && <>
                                                            System will auto-generate a batch number in the format{' '}
                                                            <strong>BTH-{line.itemCode}-YYYYMM-XXXX</strong>.
                                                            {' '}Optionally enter the supplier's lot number and dates below for traceability.
                                                        </>}
                                                        {line.serialTracked && <>
                                                            System will auto-generate {Math.round(Number(line.acceptedQty))} serial number(s) in the format{' '}
                                                            <strong>SN-{line.itemCode}-YYYYMM-XXXXXX</strong> (one per unit).
                                                            {' '}You can instead enter the manufacturer's serial numbers below — count must exactly match accepted qty and each must be globally unique.
                                                        </>}
                                                    </Alert>
                                                    <Stack direction="row" spacing={2} flexWrap="wrap">
                                                        {line.batchTracked && (
                                                            <>
                                                                <TextField label="Supplier Batch / Lot No." size="small"
                                                                    value={line.supplierBatchNo}
                                                                    onChange={e => updateLine(idx, 'supplierBatchNo', e.target.value)}
                                                                    placeholder="e.g. LOT-2025-001 (optional)"
                                                                    sx={{ width: 220 }} />
                                                                <TextField label="Mfg. Date" type="date" size="small"
                                                                    value={line.manufacturingDate}
                                                                    onChange={e => updateLine(idx, 'manufacturingDate', e.target.value)}
                                                                    InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                                                                <TextField label="Expiry Date" type="date" size="small"
                                                                    value={line.expiryDate}
                                                                    onChange={e => updateLine(idx, 'expiryDate', e.target.value)}
                                                                    InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                                                            </>
                                                        )}
                                                        {line.serialTracked && (
                                                            <>
                                                                {!line.batchTracked && (
                                                                    <TextField label="Expiry Date" type="date" size="small"
                                                                        value={line.expiryDate}
                                                                        onChange={e => updateLine(idx, 'expiryDate', e.target.value)}
                                                                        InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                                                                )}
                                                                <Box sx={{ flex: 1, minWidth: 280 }}>
                                                                    <TextField multiline fullWidth size="small"
                                                                        label={`Manufacturer Serial Numbers (optional) — ${Math.round(Number(line.acceptedQty))} required if entered`}
                                                                        placeholder={'Enter one serial number per line\nLeave blank to auto-generate (SN-{itemCode}-YYYYMM-XXXXXX)'}
                                                                        value={line.manualSerialNumbers}
                                                                        onChange={e => updateLine(idx, 'manualSerialNumbers', e.target.value)}
                                                                        rows={Math.min(Math.max(2, Math.round(Number(line.acceptedQty))), 6)}
                                                                        helperText={`Leave blank to auto-generate. If entered, must be exactly ${Math.round(Number(line.acceptedQty))} line(s), each globally unique.`}
                                                                    />
                                                                </Box>
                                                            </>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </Box>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
                <Button onClick={onCancel} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
                    Cancel
                </Button>
                <Button variant="contained" disableElevation onClick={handleSubmit} disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                    {saving ? 'Posting to Inventory…' : 'Post Receipt to Inventory'}
                </Button>
            </Stack>
        </Box>
    );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function POReceiveTab({ po, poId, onReceived }) {
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [resultGrn, setResultGrn] = useState(null);

    const canReceive = ['SENT', 'PARTIALLY_RECEIVED'].includes(po?.status);

    const loadGRNs = useCallback(() => {
        if (!poId) return;
        setLoading(true);
        getGRNsByPO(poId)
            .then(data => setGrns(data || []))
            .catch(() => setError('Failed to load receipts.'))
            .finally(() => setLoading(false));
    }, [poId]);

    useEffect(() => { loadGRNs(); }, [loadGRNs]);

    const handlePosted = (newGrn) => {
        setShowForm(false);
        loadGRNs();
        onReceived?.();
        setResultGrn(newGrn); // show result dialog with generated batch/serial numbers
    };

    const totalReceived = grns.reduce((sum, g) =>
        sum + (g.items || []).reduce((s, i) => s + i.acceptedQty, 0), 0);
    const totalOrdered = (po?.items || []).reduce((sum, i) => sum + i.quantityOrdered, 0);

    return (
        <Box sx={{ p: 3 }}>
            {/* Summary cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'GRNs Posted', value: grns.length, color: '#0f172a' },
                    { label: 'Total Ordered', value: totalOrdered, color: '#0f172a' },
                    { label: 'Total Accepted', value: totalReceived, color: '#16a34a' },
                    { label: 'Still Pending', value: Math.max(0, totalOrdered - totalReceived), color: totalOrdered - totalReceived > 0 ? '#d97706' : '#16a34a' },
                ].map(c => (
                    <Paper key={c.label} variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 2, flex: 1, borderColor: BORDER }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</Typography>
                        <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: c.color }}>{c.value}</Typography>
                    </Paper>
                ))}
            </Stack>

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            Receipt History
                        </Typography>
                        {canReceive && !showForm && (
                            <Button variant="contained" disableElevation size="small" startIcon={<Add />}
                                onClick={() => setShowForm(true)}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                                Post New Receipt
                            </Button>
                        )}
                    </Stack>

                    {grns.length === 0 && !showForm ? (
                        <Box sx={{ textAlign: 'center', py: 6, border: `1px dashed ${BORDER}`, borderRadius: 2, color: '#94a3b8' }}>
                            <Warning sx={{ fontSize: 36, mb: 1, color: '#cbd5e1' }} />
                            <Typography variant="body2">No receipts posted yet.</Typography>
                            {canReceive && (
                                <Button variant="outlined" size="small" startIcon={<Add />}
                                    onClick={() => setShowForm(true)}
                                    sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                                    Post First Receipt
                                </Button>
                            )}
                        </Box>
                    ) : grns.length > 0 ? (
                        <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', mb: showForm ? 3 : 0 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: BG_SOFT }}>
                                        <TableCell sx={{ width: 40 }} />
                                        {['GRN Number', 'Date', 'Status', 'Warehouse', 'Total Amount', 'Posted By'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 1 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {grns.map(grn => <GRNHistoryRow key={grn.id} grn={grn} />)}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : null}

                    {showForm && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
                                Post New Receipt
                            </Typography>
                            <ReceiveForm po={po} grns={grns} onPosted={handlePosted} onCancel={() => setShowForm(false)} />
                        </>
                    )}

                    {!canReceive && po?.status === 'RECEIVED' && (
                        <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2, borderRadius: 1.5 }}>
                            All items fully received. Use <strong>Mark as Completed</strong> to close this PO.
                        </Alert>
                    )}
                    {po?.status === 'COMPLETED' && (
                        <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2, borderRadius: 1.5 }}>
                            This purchase order is closed.
                        </Alert>
                    )}
                </>
            )}

            {/* Result dialog showing generated batch/serial numbers from inventory */}
            <GRNResultDialog open={!!resultGrn} grn={resultGrn} onClose={() => setResultGrn(null)} />
        </Box>
    );
}
