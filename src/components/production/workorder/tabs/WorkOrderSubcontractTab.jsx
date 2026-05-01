import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse,
    Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, IconButton, Stack, Table, TableBody,
    TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
    Autocomplete,
} from '@mui/material';
import {
    Add, CallReceived, CheckCircle, ContentPaste,
    ExpandLess, ExpandMore, LocalShipping, PictureAsPdf, Warning,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
    getJobWorkChallans,
    createJobWorkChallan,
    dispatchChallan,
    receiveChallan,
    cancelChallan,
    getVendorDropdown,
    searchInventoryItemsForChallan,
    downloadChallanPdf,
} from '../../../../services/jobWorkChallanService';

// ── Status config ────────────────────────────────────────────────────────────

const STATUS = {
    DRAFT:               { label: 'Draft',              color: '#64748b', bg: '#f1f5f9' },
    DISPATCHED:          { label: 'Dispatched',          color: '#1d4ed8', bg: '#eff6ff' },
    PARTIALLY_RECEIVED:  { label: 'Partially Received',  color: '#b45309', bg: '#fffbeb' },
    COMPLETED:           { label: 'Completed',           color: '#166534', bg: '#f0fdf4' },
    CANCELLED:           { label: 'Cancelled',           color: '#9ca3af', bg: '#f9fafb' },
};

function StatusChip({ status }) {
    const s = STATUS[status] || STATUS.DRAFT;
    return (
        <Chip size="small" label={s.label}
            sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
    );
}

function DaysChip({ days }) {
    if (days == null) return null;
    const overdue = days < 0;
    return (
        <Chip size="small"
            label={overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
            sx={{
                bgcolor: overdue ? '#fef2f2' : days < 30 ? '#fffbeb' : '#f0fdf4',
                color:   overdue ? '#b91c1c' : days < 30 ? '#92400e' : '#15803d',
                fontWeight: 600, fontSize: '0.65rem', height: 18,
            }} />
    );
}

// ── Inline "receive back" dialog ─────────────────────────────────────────────

function ReceiveDialog({ open, onClose, challan, onSaved }) {
    const [lines, setLines] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && challan) {
            setLines((challan.lines || []).map(l => ({
                lineId: l.id,
                description: l.description || l.itemName || '',
                dispatched: l.quantityDispatched,
                pending: l.quantityPending,
                quantityReceived: '',
                quantityRejected: '',
                remarks: '',
            })));
            setError('');
        }
    }, [open, challan]);

    const setLine = (i, field, val) =>
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await receiveChallan(challan.id, {
                receiptDate: new Date().toISOString(),
                remarks: '',
                lines: lines.map(l => ({
                    lineId: l.lineId,
                    quantityReceived: l.quantityReceived !== '' ? Number(l.quantityReceived) : 0,
                    quantityRejected: l.quantityRejected !== '' ? Number(l.quantityRejected) : 0,
                    remarks: l.remarks || null,
                })),
            });
            onSaved();
            onClose();
        } catch {
            setError('Failed to record receipt.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2744' }}>
                Receive Back — {challan?.challanNumber}
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
                {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.8rem' }}>{error}</Alert>}
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            {['Material', 'Dispatched', 'Pending', 'Received', 'Rejected', 'Remarks'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((l, i) => (
                            <TableRow key={l.lineId}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{l.description}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{l.dispatched}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{l.pending}</TableCell>
                                <TableCell>
                                    <TextField size="small" type="number" value={l.quantityReceived}
                                        onChange={e => setLine(i, 'quantityReceived', e.target.value)}
                                        sx={{ width: 90, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }} />
                                </TableCell>
                                <TableCell>
                                    <TextField size="small" type="number" value={l.quantityRejected}
                                        onChange={e => setLine(i, 'quantityRejected', e.target.value)}
                                        sx={{ width: 90, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }} />
                                </TableCell>
                                <TableCell>
                                    <TextField size="small" value={l.remarks}
                                        onChange={e => setLine(i, 'remarks', e.target.value)}
                                        sx={{ width: 130, '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.5 } }} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button size="small" onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
                <Button size="small" variant="contained" disableElevation onClick={handleSave} disabled={saving}
                    sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
                    {saving ? <CircularProgress size={13} sx={{ mr: 1, color: '#fff' }} /> : null}
                    {saving ? 'Saving…' : 'Record Receipt'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Create Challan Dialog ────────────────────────────────────────────────────

const EMPTY_LINE = { item: null, description: '', hsnCode: '', quantityDispatched: '', uom: 'NOS', valuePerUnit: '', _fromBom: false };
const UOM_OPTIONS = ['KG', 'NOS', 'MTR', 'LTR', 'PCS', 'SQM', 'FT', 'INCH', 'MT', 'TON', 'GMS', 'SET', 'BOX'];

const resolveStdCost = (item) => {
    const cost = item?.standardCost ?? item?.productFinanceSettings?.standardCost;
    return cost != null ? String(cost) : '';
};

/**
 * Build challan lines from WO materials.
 * - Normal mode: only materials that have been inventory-approved and issued.
 * - Backflush mode: all BOM materials (stock is auto-consumed on completion so
 *   no formal issue step is required before dispatch).
 */
function buildBomLines(operationMaterials, allowBackflush = false) {
    return operationMaterials
        .filter(m => allowBackflush || (m.issueStatus && m.issueStatus !== 'NOT_ISSUED'))
        .map(m => {
            const comp = m.component || {};
            const compId = comp.id ?? comp.inventoryItemId;
            if (!compId) return null;
            const issued = Number(m.issuedQuantity ?? 0);
            const consumed = Number(m.consumedQuantity ?? 0);
            const planned = Number(m.effectiveRequiredQuantity ?? m.plannedRequiredQuantity ?? 0);
            const isIssued = m.issueStatus && m.issueStatus !== 'NOT_ISSUED';
            // Backflush: use planned qty (no formal issue); otherwise use available issued stock
            const available = isIssued ? Math.max(0, issued - consumed) : planned;
            const stdCost = resolveStdCost(comp);
            return {
                item: { ...comp, id: compId },
                description: comp.name || '',
                hsnCode: comp.hsnCode || '',
                quantityDispatched: available > 0 ? String(available) : '',
                uom: comp.uom || 'NOS',
                valuePerUnit: stdCost,
                _fromBom: true,
                _available: available,
                _issued: issued,
            };
        })
        .filter(Boolean);
}

function CreateChallanDialog({ open, onClose, operation, workOrderId, operationMaterials, allowBackflush, onSaved }) {
    const [vendors, setVendors] = useState([]);
    const [vendor, setVendor] = useState(null);
    const [agreedRate, setAgreedRate] = useState('');
    const [dispatchDetails, setDispatchDetails] = useState('');
    const [remarks, setRemarks] = useState('');
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
    const [extraItemOptions, setExtraItemOptions] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setVendor(null);
            setAgreedRate(operation?.routingOperation?.fixedCostPerUnit ?? '');
            setDispatchDetails('');
            setRemarks('');
            setExpectedReturnDate('');
            setError('');
            // Pre-populate from WO materials. Backflush: include unissued BOM lines too.
            const bomLines = buildBomLines(operationMaterials || [], allowBackflush);
            setLines(bomLines.length > 0 ? bomLines : [{ ...EMPTY_LINE }]);
            getVendorDropdown().then(r => {
                const list = Array.isArray(r) ? r : (r?.data ?? []);
                setVendors(list);
            }).catch(() => {});
        }
    }, [open, operation, operationMaterials, allowBackflush]);

    const searchExtraItems = async (q) => {
        if (!q || q.length < 2) return;
        try {
            const r = await searchInventoryItemsForChallan(q);
            setExtraItemOptions(Array.isArray(r) ? r : (r?.content ?? r?.data ?? []));
        } catch { /* ignore */ }
    };

    const setLine = (i, field, val) =>
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

    const setLineItem = (i, item) => {
        if (!item) { setLine(i, 'item', null); return; }
        const stdCost = resolveStdCost(item);
        setLines(prev => prev.map((l, idx) => idx === i ? {
            ...l, item,
            description: item.name || '',
            hsnCode: item.hsnCode || '',
            uom: item.uom || l.uom,
            valuePerUnit: stdCost || l.valuePerUnit,
            _fromBom: false,
        } : l));
    };

    const handleSave = async () => {
        if (!vendor) { setError('Please select a vendor.'); return; }
        if (lines.some(l => !l.quantityDispatched || Number(l.quantityDispatched) <= 0)) {
            setError('All material lines need a dispatch quantity.'); return;
        }
        setSaving(true);
        setError('');
        try {
            await createJobWorkChallan({
                vendorId: vendor.id,
                workOrderId,
                workOrderOperationId: operation?.id,
                agreedRatePerUnit: agreedRate !== '' ? Number(agreedRate) : null,
                dispatchDetails: dispatchDetails || null,
                remarks: remarks || null,
                expectedReturnDate: expectedReturnDate || null,
                lines: lines.map(l => ({
                    inventoryItemId: l.item?.id ?? null,
                    description: l.description || null,
                    hsnCode: l.hsnCode || null,
                    quantityDispatched: Number(l.quantityDispatched),
                    uom: l.uom,
                    valuePerUnit: l.valuePerUnit !== '' ? Number(l.valuePerUnit) : null,
                    remarks: null,
                })),
            });
            onSaved();
            onClose();
        } catch {
            setError('Failed to create challan.');
        } finally {
            setSaving(false);
        }
    };

    const hasBomLines = lines.some(l => l._fromBom);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2744', pb: 0.5 }}>
                New Job Work Challan — {operation?.operationName}
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
                {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.8rem' }}>{error}</Alert>}
                {hasBomLines && (
                    <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.78rem', py: 0.5 }}>
                        Materials pre-filled from issued WO stock. Adjust quantities as needed.
                    </Alert>
                )}
                <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5}>
                        <Autocomplete
                            options={vendors}
                            getOptionLabel={o => `${o.name || o.companyName || ''} ${o.gstNumber ? `(${o.gstNumber})` : ''}`.trim()}
                            value={vendor}
                            onChange={(_, v) => setVendor(v)}
                            renderInput={p => <TextField {...p} label="Vendor / Subcontractor *" size="small" />}
                            sx={{ flex: 2 }}
                            isOptionEqualToValue={(o, v) => o.id === v?.id}
                        />
                        <TextField label="Agreed Rate / Unit (₹)" size="small" type="number"
                            value={agreedRate} onChange={e => setAgreedRate(e.target.value)}
                            sx={{ flex: 1 }} />
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <TextField label="Dispatch Details" size="small" value={dispatchDetails}
                            onChange={e => setDispatchDetails(e.target.value)} sx={{ flex: 1 }} />
                        <TextField label="Remarks" size="small" value={remarks}
                            onChange={e => setRemarks(e.target.value)} sx={{ flex: 1 }} />
                    </Stack>
                    <TextField
                        label="Expected Return Date (Due Date)"
                        type="date"
                        size="small"
                        value={expectedReturnDate}
                        onChange={e => setExpectedReturnDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Optional — leave blank to auto-set to 180 days on dispatch"
                        inputProps={{ min: dayjs().format('YYYY-MM-DD') }}
                        sx={{ alignSelf: 'flex-start', width: 280 }}
                    />

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>
                            Materials to Dispatch
                        </Typography>
                        {hasBomLines && (
                            <Chip size="small" label="From WO BOM"
                                sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                        )}
                    </Stack>

                    {lines.map((l, i) => (
                        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            {/* Item — BOM lines show locked item; extra lines allow search */}
                            {l._fromBom ? (
                                <Box sx={{ flex: 2, minWidth: 180 }}>
                                    <TextField size="small" fullWidth
                                        value={l.item ? `${l.item.itemCode || ''} — ${l.description}` : l.description}
                                        InputProps={{ readOnly: true, sx: { bgcolor: '#f8fafc', fontSize: '0.8rem' } }}
                                        helperText={`Issued: ${l._issued ?? '—'} · Available: ${l._available ?? '—'}`}
                                        FormHelperTextProps={{ sx: { fontSize: '0.6rem', mt: 0, color: '#64748b' } }} />
                                </Box>
                            ) : (
                                <Autocomplete
                                    options={extraItemOptions}
                                    getOptionLabel={o => `${o.itemCode || ''} — ${o.name || ''}`.trim()}
                                    value={l.item}
                                    onChange={(_, v) => setLineItem(i, v)}
                                    onInputChange={(_, q) => searchExtraItems(q)}
                                    filterOptions={x => x}
                                    renderInput={p => <TextField {...p} label="Item (optional)" size="small" />}
                                    sx={{ flex: 2, minWidth: 180 }}
                                    isOptionEqualToValue={(o, v) => o.id === v?.id}
                                />
                            )}
                            <TextField label="HSN" size="small" value={l.hsnCode}
                                onChange={e => setLine(i, 'hsnCode', e.target.value)} sx={{ width: 80 }} />
                            <TextField label="Qty *" size="small" type="number" value={l.quantityDispatched}
                                onChange={e => setLine(i, 'quantityDispatched', e.target.value)}
                                sx={{ width: 85 }}
                                error={l._fromBom && l._available != null && Number(l.quantityDispatched) > l._available}
                                helperText={l._fromBom && l._available != null && Number(l.quantityDispatched) > l._available
                                    ? `Max ${l._available}` : ''}
                                FormHelperTextProps={{ sx: { fontSize: '0.6rem', mt: 0, color: '#dc2626' } }} />
                            <Autocomplete
                                options={UOM_OPTIONS} value={l.uom}
                                onChange={(_, v) => setLine(i, 'uom', v || 'NOS')}
                                renderInput={p => <TextField {...p} label="UOM" size="small" />}
                                sx={{ width: 90 }} disableClearable />
                            <TextField label="Value/Unit (₹)" size="small" type="number" value={l.valuePerUnit}
                                onChange={e => setLine(i, 'valuePerUnit', e.target.value)}
                                sx={{ width: 105 }}
                                helperText={l._fromBom && l.valuePerUnit ? 'Std cost' : ''}
                                FormHelperTextProps={{ sx: { fontSize: '0.6rem', mt: 0, color: '#64748b' } }} />
                            <IconButton size="small"
                                onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                                disabled={lines.length === 1 && !l._fromBom}
                                sx={{ color: '#dc2626', mt: 0.25 }}>
                                ✕
                            </IconButton>
                        </Stack>
                    ))}
                    <Button size="small" startIcon={<Add sx={{ fontSize: 14 }} />}
                        onClick={() => setLines(prev => [...prev, { ...EMPTY_LINE }])}
                        sx={{ textTransform: 'none', fontSize: '0.78rem', alignSelf: 'flex-start', color: '#1565c0' }}>
                        Add Extra Material
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button size="small" onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
                <Button size="small" variant="contained" disableElevation onClick={handleSave} disabled={saving}
                    sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
                    {saving ? <CircularProgress size={13} sx={{ mr: 1, color: '#fff' }} /> : null}
                    {saving ? 'Creating…' : 'Create Challan'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Challan row table for one operation ──────────────────────────────────────

function OperationChallanSection({ operation, challans, onAction }) {
    const [expanded, setExpanded] = useState(true);
    const rate = operation.routingOperation?.fixedCostPerUnit;
    const planned = operation.plannedQuantity ?? 0;
    const completed = operation.completedQuantity ?? 0;

    const activeChallan = challans.find(c => ['DISPATCHED', 'PARTIALLY_RECEIVED'].includes(c.status));
    const allDone = challans.length > 0 && challans.every(c => c.status === 'COMPLETED' || c.status === 'CANCELLED');

    return (
        <Box sx={{ mb: 2, border: '1px solid #e2e8f0', borderRadius: 1.5, overflow: 'hidden' }}>
            {/* Operation header */}
            <Box sx={{ bgcolor: '#f8fafc', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}
                onClick={() => setExpanded(o => !o)} style={{ cursor: 'pointer' }}>
                <ContentPaste sx={{ fontSize: 15, color: '#64748b' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>
                    {operation.sequence}. {operation.operationName}
                </Typography>
                {rate != null && (
                    <Typography sx={{ fontSize: '0.78rem', color: '#475569' }}>
                        Rate: <strong>₹{Number(rate).toLocaleString('en-IN')}/unit</strong>
                    </Typography>
                )}
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Planned: {planned} · Done: {completed}
                </Typography>
                {allDone && <CheckCircle sx={{ fontSize: 15, color: '#16a34a' }} />}
                {activeChallan && <DaysChip days={activeChallan.daysRemainingForReturn} />}
                <Button size="small" variant="outlined" startIcon={<Add sx={{ fontSize: 13 }} />}
                    onClick={e => { e.stopPropagation(); onAction('create', operation); }}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25, ml: 1 }}>
                    New Challan
                </Button>
                {expanded ? <ExpandLess sx={{ fontSize: 16, color: '#94a3b8' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#94a3b8' }} />}
            </Box>

            <Collapse in={expanded}>
                {challans.length === 0 ? (
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography sx={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>
                            No challans yet. Create one to dispatch materials to the subcontractor.
                        </Typography>
                    </Box>
                ) : (
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                {['Challan #', 'Vendor', 'Status', 'Dispatch Date', 'Return By', 'Materials', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {challans.map(c => (
                                <TableRow key={c.id} hover>
                                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8' }}>
                                        {c.challanNumber}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{c.vendorName}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <StatusChip status={c.status} />
                                            {['DISPATCHED', 'PARTIALLY_RECEIVED'].includes(c.status) &&
                                                <DaysChip days={c.daysRemainingForReturn} />}
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        {c.dispatchDate ? dayjs(c.dispatchDate).format('DD MMM YYYY') : '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        {c.expectedReturnDate ? dayjs(c.expectedReturnDate).format('DD MMM YYYY') : '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        {c.lines?.length ?? 0} line{(c.lines?.length ?? 0) !== 1 ? 's' : ''}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            {c.status === 'DRAFT' && (
                                                <Tooltip title="Dispatch">
                                                    <IconButton size="small" onClick={() => onAction('dispatch', c)}
                                                        sx={{ color: '#1d4ed8' }}>
                                                        <LocalShipping sx={{ fontSize: 15 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {['DISPATCHED', 'PARTIALLY_RECEIVED'].includes(c.status) && (
                                                <Tooltip title="Receive Back">
                                                    <IconButton size="small" onClick={() => onAction('receive', c)}
                                                        sx={{ color: '#16a34a' }}>
                                                        <CallReceived sx={{ fontSize: 15 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {['DRAFT', 'DISPATCHED'].includes(c.status) && (
                                                <Tooltip title="Cancel">
                                                    <IconButton size="small" onClick={() => onAction('cancel', c)}
                                                        sx={{ color: '#dc2626' }}>
                                                        <Warning sx={{ fontSize: 15 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Download PDF">
                                                <IconButton size="small"
                                                    onClick={() => downloadChallanPdf(c.id, c.challanNumber).catch(() => {})}
                                                    sx={{ color: '#7c3aed' }}>
                                                    <PictureAsPdf sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Collapse>
        </Box>
    );
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export default function WorkOrderSubcontractTab({ workOrderId, operations = [], workOrderMaterials = [], allowBackflush = false }) {
    const [challans, setChallans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [createDialog, setCreateDialog] = useState({ open: false, operation: null });
    const [receiveDialog, setReceiveDialog] = useState({ open: false, challan: null });
    const [dispatchConfirm, setDispatchConfirm] = useState({ open: false, challan: null });
    const [cancelConfirm, setCancelConfirm] = useState({ open: false, challan: null });
    const [actionSaving, setActionSaving] = useState(false);

    const subOps = operations.filter(op => op.routingOperation?.costType === 'SUB_CONTRACTED');

    const load = useCallback(async () => {
        if (!workOrderId) return;
        setLoading(true);
        setError('');
        try {
            const r = await getJobWorkChallans({ workOrderId });
            const list = Array.isArray(r) ? r : (r?.data ?? r?.content ?? []);
            setChallans(list);
        } catch {
            setError('Failed to load challans.');
        } finally {
            setLoading(false);
        }
    }, [workOrderId]);

    useEffect(() => { load(); }, [load]);

    const challansForOp = (opId) => challans.filter(c => c.workOrderOperationId === opId);

    // Materials gated to this operation OR with no operation gate (available to all ops)
    const materialsForOp = (opId) => workOrderMaterials.filter(
        m => m.workOrderOperationId === opId || m.workOrderOperationId == null
    );

    const handleAction = async (type, target) => {
        if (type === 'create') { setCreateDialog({ open: true, operation: target }); return; }
        if (type === 'receive') { setReceiveDialog({ open: true, challan: target }); return; }
        if (type === 'dispatch') { setDispatchConfirm({ open: true, challan: target }); return; }
        if (type === 'cancel') { setCancelConfirm({ open: true, challan: target }); return; }
    };

    const handleDispatch = async () => {
        setActionSaving(true);
        try {
            await dispatchChallan(dispatchConfirm.challan.id);
            setDispatchConfirm({ open: false, challan: null });
            load();
        } catch { setError('Failed to dispatch.'); } finally { setActionSaving(false); }
    };

    const handleCancel = async () => {
        setActionSaving(true);
        try {
            await cancelChallan(cancelConfirm.challan.id);
            setCancelConfirm({ open: false, challan: null });
            load();
        } catch { setError('Failed to cancel.'); } finally { setActionSaving(false); }
    };

    if (subOps.length === 0) {
        return (
            <Alert severity="info" sx={{ fontSize: '0.85rem', mt: 1 }}>
                No subcontracted operations in this work order. Mark an operation as <strong>SUB_CONTRACTED</strong> in the BOM routing to enable job work management here.
            </Alert>
        );
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2744' }}>
                        Subcontract / Job Work
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {subOps.length} subcontracted operation{subOps.length !== 1 ? 's' : ''} · {challans.length} challan{challans.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={load} disabled={loading}
                    sx={{ textTransform: 'none', fontSize: '0.78rem' }}>
                    {loading ? <CircularProgress size={13} sx={{ mr: 0.5 }} /> : null}Refresh
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.8rem' }}>{error}</Alert>}

            {subOps.map(op => (
                <OperationChallanSection
                    key={op.id}
                    operation={op}
                    challans={challansForOp(op.id)}
                    onAction={handleAction}
                />
            ))}

            {/* Create Dialog */}
            <CreateChallanDialog
                open={createDialog.open}
                onClose={() => setCreateDialog({ open: false, operation: null })}
                operation={createDialog.operation}
                workOrderId={workOrderId}
                operationMaterials={materialsForOp(createDialog.operation?.id)}
                allowBackflush={allowBackflush}
                onSaved={load}
            />

            {/* Receive Dialog */}
            <ReceiveDialog
                open={receiveDialog.open}
                onClose={() => setReceiveDialog({ open: false, challan: null })}
                challan={receiveDialog.challan}
                onSaved={load}
            />

            {/* Dispatch Confirm */}
            <Dialog open={dispatchConfirm.open} onClose={() => setDispatchConfirm({ open: false, challan: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Dispatch Challan?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: '0.85rem' }}>
                        Dispatching <strong>{dispatchConfirm.challan?.challanNumber}</strong> starts the 180-day GST return clock (CGST Act §143).
                        This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button size="small" onClick={() => setDispatchConfirm({ open: false, challan: null })}
                        sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
                    <Button size="small" variant="contained" disableElevation onClick={handleDispatch}
                        disabled={actionSaving} startIcon={<LocalShipping sx={{ fontSize: 14 }} />}
                        sx={{ textTransform: 'none', bgcolor: '#1d4ed8' }}>
                        {actionSaving ? 'Dispatching…' : 'Dispatch'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Confirm */}
            <Dialog open={cancelConfirm.open} onClose={() => setCancelConfirm({ open: false, challan: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Cancel Challan?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: '0.85rem' }}>
                        Are you sure you want to cancel <strong>{cancelConfirm.challan?.challanNumber}</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button size="small" onClick={() => setCancelConfirm({ open: false, challan: null })}
                        sx={{ textTransform: 'none', color: '#64748b' }}>Back</Button>
                    <Button size="small" variant="contained" disableElevation onClick={handleCancel}
                        disabled={actionSaving} sx={{ textTransform: 'none', bgcolor: '#dc2626' }}>
                        {actionSaving ? 'Cancelling…' : 'Cancel Challan'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
