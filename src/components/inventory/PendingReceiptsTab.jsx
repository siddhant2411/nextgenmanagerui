import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, IconButton,
    Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
    TextField, Typography,
} from '@mui/material';
import {
    CheckCircle, ExpandLess, ExpandMore, Inventory2, LocalShipping, Warning,
} from '@mui/icons-material';
import { getPendingReceiptPOs, getPurchaseOrder } from '../../services/purchaseOrderService';
import { createGRN, getGRNsByPO } from '../../services/grnService';
import { useAuth } from '../../auth/AuthContext';

const BORDER = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

// ── Result dialog showing generated batch/serial numbers ──────────────────────
function GRNResultDialog({ open, onClose, grn }) {
    if (!grn) return null;
    const tracked = (grn.items || []).filter(
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
                            Stock updated. Batch / serial numbers assigned below.
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {tracked.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No tracked items in this receipt.</Typography>
                ) : (
                    <Stack spacing={2}>
                        {tracked.map((item, i) => (
                            <Box key={i} sx={{ p: 2, bgcolor: BG_SOFT, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
                                    {item.itemName}{' '}
                                    <Typography component="span" sx={{ fontWeight: 400, color: '#64748b', fontSize: '0.78rem' }}>
                                        ({item.itemCode})
                                    </Typography>
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

// ── Inline receive form for one PO ────────────────────────────────────────────
function ReceiveForm({ po, existingGrns, onPosted, onCancel, readOnly = false }) {
    const { user } = useAuth();

    const receivedMap = {};
    (existingGrns || []).forEach(g =>
        (g.items || []).forEach(gi => {
            receivedMap[gi.inventoryItemId] = (receivedMap[gi.inventoryItemId] || 0) + gi.acceptedQty;
        })
    );

    const eligible = (po.items || []).filter(item => {
        const already = receivedMap[item.itemId] || 0;
        return already < item.quantityOrdered;
    });

    const initLines = () => eligible.map(item => {
        const already = receivedMap[item.itemId] || 0;
        const remaining = item.quantityOrdered - already;
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
            showTracking: item.batchTracked || item.serialTracked,
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
                if (serials.length !== Math.round(acc))
                    return `${l.itemName}: enter exactly ${Math.round(acc)} serial number(s), or leave blank to auto-generate`;
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
            const result = await createGRN({
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
            });
            onPosted(result);
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to post receipt. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (eligible.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                <CheckCircle sx={{ fontSize: 36, color: '#16a34a', mb: 1 }} />
                <Typography variant="body2">All items fully received for this PO.</Typography>
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
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                                            {line.batchTracked && <Chip label="Batch" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
                                            {line.serialTracked && <Chip label="Serial" size="small" color="info" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />}
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

                                {(line.batchTracked || line.serialTracked) && (
                                    <TableRow>
                                        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                                            <Box sx={{ px: 4, py: 0.5, display: 'flex', alignItems: 'center', bgcolor: '#fafbfc', borderTop: `1px dashed ${BORDER}` }}>
                                                <Inventory2 sx={{ fontSize: 14, color: '#0369a1', mr: 0.8 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                                                    Batch / Serial Assignment
                                                </Typography>
                                                <IconButton size="small" onClick={() => updateLine(idx, 'showTracking', !line.showTracking)}>
                                                    {line.showTracking ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                                </IconButton>
                                            </Box>
                                            <Collapse in={line.showTracking} unmountOnExit>
                                                <Box sx={{ px: 4, py: 2, bgcolor: '#f0f9ff', borderBottom: `1px solid ${BORDER}` }}>
                                                    <Alert severity="info" sx={{ mb: 2, py: 0.5, fontSize: '0.78rem' }}>
                                                        {line.batchTracked && !line.serialTracked && <>
                                                            System will auto-generate a batch number{' '}
                                                            <strong>BTH-{line.itemCode}-YYYYMM-XXXX</strong>.
                                                            {' '}Optionally enter the supplier's lot number and dates for traceability.
                                                        </>}
                                                        {line.serialTracked && <>
                                                            System will auto-generate {Math.round(Number(line.acceptedQty))} serial(s){' '}
                                                            <strong>SN-{line.itemCode}-YYYYMM-XXXXXX</strong>.
                                                            {' '}Or enter manufacturer serials below — count must match accepted qty and each must be globally unique.
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
                                                                        label={`Manufacturer Serials (optional) — ${Math.round(Number(line.acceptedQty))} required if entered`}
                                                                        placeholder={'One serial per line\nLeave blank to auto-generate'}
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

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
                <Button onClick={onCancel} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
                    Close
                </Button>
                {!readOnly && (
                    <Button variant="contained" disableElevation onClick={handleSubmit} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                        {saving ? 'Posting…' : 'Post Receipt to Inventory'}
                    </Button>
                )}
            </Stack>
        </Box>
    );
}

// ── One PO row (expandable) ───────────────────────────────────────────────────
function POReceiveRow({ poSummary, onPosted, canReceive }) {
    const [expanded, setExpanded] = useState(false);
    const [poDetail, setPoDetail] = useState(null);
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resultGrn, setResultGrn] = useState(null);

    const handleExpand = async () => {
        if (!expanded && !poDetail) {
            setLoading(true);
            try {
                const [detail, grnList] = await Promise.all([
                    getPurchaseOrder(poSummary.id),
                    getGRNsByPO(poSummary.id),
                ]);
                setPoDetail(detail);
                setGrns(grnList || []);
            } finally {
                setLoading(false);
            }
        }
        setExpanded(v => !v);
    };

    const canPost = canReceive;

    const handlePosted = (newGrn) => {
        setResultGrn(newGrn);
        setExpanded(false);
        setPoDetail(null); // force reload on next expand
        onPosted();
    };

    const isPartial = poSummary.status === 'PARTIALLY_RECEIVED';

    return (
        <>
            <TableRow sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }} onClick={handleExpand}>
                <TableCell sx={{ width: 40, py: 1 }}>
                    {loading
                        ? <CircularProgress size={16} />
                        : <IconButton size="small">{expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
                    }
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1565c0' }}>
                    {poSummary.purchaseOrderNumber}
                </TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{poSummary.vendorName || '—'}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{fmt(poSummary.orderDate)}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem', color: poSummary.expectedDeliveryDate && new Date(poSummary.expectedDeliveryDate) < new Date() ? '#dc2626' : undefined }}>
                    {fmt(poSummary.expectedDeliveryDate)}
                </TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{poSummary.itemCount} item(s)</TableCell>
                <TableCell>
                    <Chip
                        label={isPartial ? 'Partial' : 'Awaiting Receipt'}
                        size="small"
                        color={isPartial ? 'warning' : 'info'}
                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                    />
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                    <Collapse in={expanded} unmountOnExit>
                        <Box sx={{ px: 4, py: 3, bgcolor: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                            {!canPost && (
                                <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
                                    Only an Inventory Admin can post receipts and assign batch/serial numbers.
                                </Alert>
                            )}
                            {poDetail ? (
                                <ReceiveForm
                                    po={poDetail}
                                    existingGrns={grns}
                                    onPosted={handlePosted}
                                    onCancel={() => setExpanded(false)}
                                    readOnly={!canPost}
                                />
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>

            <GRNResultDialog open={!!resultGrn} grn={resultGrn} onClose={() => setResultGrn(null)} />
        </>
    );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function PendingReceiptsTab({ refreshKey, canReceive = false }) {
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listKey, setListKey] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPendingReceiptPOs();
            setPos(data || []);
        } catch {
            setError('Failed to load pending receipts.');
        } finally {
            setLoading(false);
        }
    }, [listKey, refreshKey]);

    useEffect(() => { load(); }, [load]);

    const handlePosted = () => setListKey(k => k + 1);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Pending Receipts
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Purchase orders awaiting stock receipt and batch/serial assignment
                    </Typography>
                </Box>
                <Button size="small" onClick={() => setListKey(k => k + 1)}
                    sx={{ textTransform: 'none', fontWeight: 600, color: '#1565c0' }}>
                    Refresh
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>
            ) : pos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, border: `1px dashed ${BORDER}`, borderRadius: 2, color: '#94a3b8' }}>
                    <LocalShipping sx={{ fontSize: 44, mb: 1, color: '#cbd5e1' }} />
                    <Typography variant="body2">No purchase orders are awaiting receipt.</Typography>
                    <Typography variant="caption">POs appear here once they are sent to the vendor.</Typography>
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: BG_SOFT }}>
                                <TableCell sx={{ width: 40 }} />
                                {['PO Number', 'Vendor', 'Order Date', 'Expected By', 'Items', 'Status'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 1 }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pos.map(po => (
                                <POReceiveRow key={po.id} poSummary={po} onPosted={handlePosted} canReceive={canReceive} />
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
}
