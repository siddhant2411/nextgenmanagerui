import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Paper, Typography, Button, Chip, CircularProgress, Stack, Grid,
    TextField, MenuItem, IconButton, Divider, Alert, Container,
    Table, TableHead, TableRow, TableCell, TableBody, Autocomplete,
    Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material';
import {
    ArrowBack, Save, Send, CheckCircle, Cancel, Delete, Add,
    Assignment, ShoppingCart,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../../services/apiService';
import {
    getPurchaseRequisition, createPurchaseRequisition, updatePurchaseRequisition,
    submitPurchaseRequisition, approvePurchaseRequisition, rejectPurchaseRequisition,
    cancelPurchaseRequisition, deletePurchaseRequisition, convertRequisitionToPo,
    getNextPRNumber,
} from '../../../services/purchaseRequisitionService';
import { filterInventoryItems } from '../../../services/inventoryService';
import { searchWorkCenters } from '../../../services/machineAssetsService';
import { useAuth } from '../../../auth/AuthContext';
import { PURCHASE_MANAGE_ROLES } from '../../../auth/roles';
import { T, SHELL, STATUS, heroButtonSx, heroCtaSx } from '../../../theme/moduleTokens';


const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const APPROVAL_STYLE = {
    DRAFT: { bg: '#f1f5f9', color: '#475569' },
    PENDING_APPROVAL: { bg: '#fff7ed', color: '#c2410c' },
    APPROVED: { bg: '#f0fdf4', color: '#16a34a' },
    REJECTED: { bg: '#fef2f2', color: '#dc2626' },
};

const EMPTY_HEADER = {
    requestDate: new Date().toISOString().slice(0, 10),
    requiredByDate: '',
    requestedBy: '',
    department: '',
    workCenterId: null,
    priority: 'NORMAL',
    notes: '',
};

const EMPTY_LINE = {
    itemId: null, itemCode: '', itemName: '', uom: '',
    quantity: 1, requiredByDate: '', estimatedUnitPrice: 0,
    suggestedVendorId: null, notes: '',
};

function ConfirmDialog({ open, title, body, input, onClose, onConfirm, loading }) {
    const [val, setVal] = useState('');
    useEffect(() => { if (!open) setVal(''); }, [open]);
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: input ? 2 : 0 }}>{body}</Typography>
                {input && (
                    <TextField fullWidth size="small" label={input} multiline rows={3}
                        value={val} onChange={e => setVal(e.target.value)} />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button onClick={() => onConfirm(val)} variant="contained" disableElevation
                    disabled={loading || (!!input && !val.trim())}
                    sx={{ textTransform: 'none', background: T.accent }}>
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function ConvertToPoDialog({ open, vendors, lines, onClose, onConfirm, loading }) {
    const [vendorId, setVendorId] = useState(null);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (open) {
            setVendorId(null);
            setOrderDate(new Date().toISOString().slice(0, 10));
            setExpectedDeliveryDate('');
            setSelected(lines.filter(l => l.lineStatus === 'PENDING').map(l => l.id));
        }
    }, [open, lines]);

    const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Convert to Purchase Order</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} md={6}>
                        <Autocomplete size="small"
                            options={vendors}
                            getOptionLabel={(o) => o.companyName ?? ''}
                            onChange={(_, v) => setVendorId(v?.id ?? null)}
                            renderInput={(params) => <TextField {...params} label="Vendor *" />} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField fullWidth size="small" label="Order Date" type="date"
                            value={orderDate} onChange={e => setOrderDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField fullWidth size="small" label="Expected Delivery" type="date"
                            value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>
                <Typography sx={{ mt: 2, fontWeight: 700, fontSize: '0.8rem', color: T.accent }}>
                    Select lines
                </Typography>
                <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Qty</TableCell>
                            <TableCell align="right">Est. Price</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map(l => (
                            <TableRow key={l.id} hover sx={{ opacity: l.lineStatus !== 'PENDING' ? 0.5 : 1 }}>
                                <TableCell>
                                    <input type="checkbox" disabled={l.lineStatus !== 'PENDING'}
                                        checked={selected.includes(l.id)} onChange={() => toggle(l.id)} />
                                </TableCell>
                                <TableCell>{l.itemName ?? l.itemCode ?? '—'}</TableCell>
                                <TableCell align="right">{l.quantity}</TableCell>
                                <TableCell align="right">{l.estimatedUnitPrice ?? 0}</TableCell>
                                <TableCell><Chip size="small" label={l.lineStatus} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button variant="contained" disableElevation
                    disabled={!vendorId || selected.length === 0 || loading}
                    onClick={() => onConfirm({ vendorId, orderDate, expectedDeliveryDate: expectedDeliveryDate || null, requisitionItemIds: selected })}
                    sx={{ textTransform: 'none', background: T.accent }}>
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Create PO'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function AddUpdatePurchaseRequisition() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const canApprove = hasRole && PURCHASE_MANAGE_ROLES.some(r => hasRole(r));

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dialog, setDialog] = useState(null);

    const [pr, setPr] = useState(null);
    const [previewNumber, setPreviewNumber] = useState('');
    const [header, setHeader] = useState(EMPTY_HEADER);
    const [lines, setLines] = useState([]);

    const [items, setItems] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [workCenters, setWorkCenters] = useState([]);

    const isDraft = !pr || pr.approvalStatus === 'DRAFT' || pr.approvalStatus === 'REJECTED';
    const isApproved = pr?.approvalStatus === 'APPROVED';
    const isPending = pr?.approvalStatus === 'PENDING_APPROVAL';

    const itemSearchTimer = React.useRef(null);
    const searchItems = (query) => {
        clearTimeout(itemSearchTimer.current);
        itemSearchTimer.current = setTimeout(() => {
            const payload = { page: 0, size: 20, sortBy: "name", sortDir: "Asc", filters: query ? [{ field: 'name', operator: 'contains', value: query }] : [] };
            filterInventoryItems(payload).then(r => setItems(r?.content ?? r ?? [])).catch(() => { });
        }, 300);
    };

    // Load reference data
    useEffect(() => {
        filterInventoryItems({ page: 0, size: 10, sortBy: "name", sortDir: "Asc", filters: [] })
            .then(r => setItems(r?.content ?? r ?? [])).catch(() => { });
        apiService.get('/contact', { type: 'VENDOR', size: 20 })
            .then(r => setVendors(r?.content ?? r ?? [])).catch(() => { });
        searchWorkCenters({ size: 20 })
            .then(r => setWorkCenters(r?.content ?? r ?? [])).catch(() => { });
    }, []);

    // Load PR (if edit) or next number (if new)
    const reload = useCallback(async () => {
        if (!isEdit) {
            try { setPreviewNumber(await getNextPRNumber()); } catch { /* noop */ }
            return;
        }
        setLoading(true);
        try {
            const data = await getPurchaseRequisition(id);
            setPr(data);
            setHeader({
                requestDate: data.requestDate ? data.requestDate.slice(0, 10) : '',
                requiredByDate: data.requiredByDate ? data.requiredByDate.slice(0, 10) : '',
                requestedBy: data.requestedBy ?? '',
                department: data.department ?? '',
                workCenterId: data.workCenterId ?? null,
                priority: data.priority ?? 'NORMAL',
                notes: data.notes ?? '',
            });
            setLines((data.items ?? []).map(l => ({
                id: l.id,
                itemId: l.itemId,
                itemCode: l.itemCode,
                itemName: l.itemName,
                description: l.description,
                uom: l.uom,
                quantity: l.quantity,
                requiredByDate: l.requiredByDate ? l.requiredByDate.slice(0, 10) : '',
                suggestedVendorId: l.suggestedVendorId,
                suggestedVendorName: l.suggestedVendorName,
                estimatedUnitPrice: l.estimatedUnitPrice ?? 0,
                estimatedAmount: l.estimatedAmount ?? 0,
                lineStatus: l.lineStatus,
                purchaseOrderId: l.purchaseOrderId,
                notes: l.notes,
            })));
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to load requisition');
        } finally {
            setLoading(false);
        }
    }, [id, isEdit]);

    useEffect(() => { reload(); }, [reload]);

    const totalEstimated = useMemo(() =>
        lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.estimatedUnitPrice) || 0), 0)
        , [lines]);

    // ── Line ops ──────────────────────────────────────────────────────────────
    const addLine = () => setLines(s => [...s, { ...EMPTY_LINE }]);
    const removeLine = (idx) => setLines(s => s.filter((_, i) => i !== idx));
    const updateLine = (idx, patch) => setLines(s => s.map((l, i) => i === idx ? { ...l, ...patch } : l));
    const onItemPick = async (idx, item) => {
        if (!item) { updateLine(idx, { itemId: null, itemCode: '', itemName: '', uom: '' }); return; }
        updateLine(idx, { itemId: item.inventoryItemId, itemCode: item.itemCode, itemName: item.name, uom: item.uom });
        try {
            const prices = await apiService.get(`/items/${item.inventoryItemId}/vendor-prices`, { priceType: 'PURCHASE' });
            const preferred = (prices ?? []).find(p => p.isPreferredVendor)
                ?? (prices ?? []).sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];
            if (preferred) {
                updateLine(idx, {
                    suggestedVendorId: preferred.vendorId,
                    estimatedUnitPrice: preferred.pricePerUnit,
                });
            }
        } catch { /* no prices configured — leave blank */ }
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const buildPayload = () => ({
        ...header,
        requestDate: header.requestDate || null,
        requiredByDate: header.requiredByDate || null,
        workCenterId: header.workCenterId ?? null,
        priority: header.priority,
        items: lines.map((l, i) => ({
            itemId: l.itemId,
            lineNumber: i + 1,
            description: l.description ?? null,
            quantity: Number(l.quantity) || 0,
            requiredByDate: l.requiredByDate || null,
            suggestedVendorId: l.suggestedVendorId ?? null,
            estimatedUnitPrice: Number(l.estimatedUnitPrice) || 0,
            workOrderMaterialId: l.workOrderMaterialId ?? null,
            notes: l.notes ?? null,
        })),
    });

    const handleSave = async () => {
        if (lines.length === 0) { setError('Add at least one line item'); return; }
        if (lines.some(l => !l.itemId)) { setError('Every line must have an item'); return; }
        setSaving(true);
        setError(null);
        try {
            const payload = buildPayload();
            const res = isEdit
                ? await updatePurchaseRequisition(id, payload)
                : await createPurchaseRequisition(payload);
            if (!isEdit) navigate(`../${res.id}`, { replace: true });
            else { setPr(res); }
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (label, fn) => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fn();
            if (res?.id) setPr(res);
            else await reload();
            setDialog(null);
        } catch (e) {
            setError(e?.response?.data?.message ?? `${label} failed`);
        } finally {
            setActionLoading(false);
        }
    };

    const onSubmitApproval = () => runAction('Submit', () => submitPurchaseRequisition(id));
    const onApprove = () => runAction('Approve', () => approvePurchaseRequisition(id));
    const onReject = (reason) => runAction('Reject', () => rejectPurchaseRequisition(id, reason));
    const onCancel = (reason) => runAction('Cancel', () => cancelPurchaseRequisition(id, reason));
    const onDelete = () => runAction('Delete', async () => {
        await deletePurchaseRequisition(id);
        navigate('..');
    });
    const onConvert = async (payload) => {
        setActionLoading(true);
        setError(null);
        try {
            const po = await convertRequisitionToPo(id, payload);
            setDialog(null);
            navigate(`/purchase/${po.id}`);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Conversion failed');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>;
    }

    const as = pr ? APPROVAL_STYLE[pr.approvalStatus] : APPROVAL_STYLE.DRAFT;

    return (
        <Box sx={{ background: T.ground, minHeight: '100vh', pb: 6 }}>
            {/* Pinned action bar — the masthead's palette, kept in reach on a long form. */}
            <Paper elevation={0} sx={{
                position: 'sticky', top: 0, zIndex: 10, borderRadius: 0,
                borderBottom: `1px solid ${SHELL.heroLine}`,
                bgcolor: SHELL.heroBg, backgroundImage: SHELL.heroImage, color: SHELL.heroInk,
                px: { xs: 2, sm: 4 }, py: 2,
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <IconButton
                            onClick={() => navigate('..')}
                            sx={{
                                color: SHELL.heroInk, border: `1px solid ${SHELL.heroLine}`,
                                '&:hover': { bgcolor: SHELL.heroFill },
                            }}
                        >
                            <ArrowBack />
                        </IconButton>
                        <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: SHELL.heroInkDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {isEdit ? 'Edit Requisition' : 'New Requisition'}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: SHELL.heroInk, letterSpacing: '-0.02em' }}>
                                {pr?.prNumber ?? previewNumber ?? '—'}
                            </Typography>
                        </Box>
                        {pr && (
                            <Chip label={pr.approvalStatus?.replace(/_/g, ' ')}
                                sx={{ background: as.bg, color: as.color, fontWeight: 700, ml: 2 }} />
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        {isDraft && (
                            <Button variant="contained" disableElevation startIcon={<Save />}
                                disabled={saving} onClick={handleSave}
                                sx={{ ...heroCtaSx, px: 3, py: 0.9 }}>
                                {saving ? <CircularProgress size={20} color="inherit" /> : (isEdit ? 'Save Changes' : 'Save Draft')}
                            </Button>
                        )}
                        {isDraft && isEdit && (
                            <Button variant="outlined" startIcon={<Send />}
                                onClick={() => setDialog({ type: 'submit' })}
                                sx={heroButtonSx}>
                                Submit for Approval
                            </Button>
                        )}
                        {isPending && canApprove && (
                            <>
                                <Button variant="contained" disableElevation startIcon={<CheckCircle />}
                                    onClick={() => setDialog({ type: 'approve' })}
                                    sx={{ ...heroCtaSx, bgcolor: STATUS.good, boxShadow: 'none', px: 3, py: 0.9, '&:hover': { bgcolor: '#047857' } }}>
                                    Approve
                                </Button>
                                <Button variant="outlined" startIcon={<Cancel />}
                                    onClick={() => setDialog({ type: 'reject' })}
                                    sx={{ ...heroButtonSx, color: '#fca5a5', borderColor: 'rgba(252,165,165,0.4)' }}>
                                    Reject
                                </Button>
                            </>
                        )}
                        {isApproved && (
                            <Button variant="contained" disableElevation startIcon={<ShoppingCart />}
                                onClick={() => setDialog({ type: 'convert' })}
                                sx={{ ...heroCtaSx, bgcolor: STATUS.good, boxShadow: 'none', px: 3, py: 0.9, '&:hover': { bgcolor: '#047857' } }}>
                                Convert to PO
                            </Button>
                        )}
                        {isEdit && pr?.status !== 'CANCELLED' && pr?.status !== 'CLOSED' && (
                            <Tooltip title="Cancel Requisition">
                                <IconButton onClick={() => setDialog({ type: 'cancel' })} sx={{ color: SHELL.heroInk, border: `1px solid ${SHELL.heroLine}`, '&:hover': { bgcolor: SHELL.heroFill } }}>
                                    <Cancel />
                                </IconButton>
                            </Tooltip>
                        )}
                        {isDraft && isEdit && (
                            <Tooltip title="Delete">
                                <IconButton onClick={() => setDialog({ type: 'delete' })} sx={{ color: '#fca5a5', border: '1px solid rgba(252,165,165,0.4)', '&:hover': { bgcolor: SHELL.heroFill } }}>
                                    <Delete />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
                {pr?.rejectionReason && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Rejection reason: {pr.rejectionReason}</Alert>
                )}

                {/* Header card */}
                <Paper elevation={0} sx={{ p: 3, mb: 3, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: 'white' }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <Assignment sx={{ color: T.accent, fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: T.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Requisition Details
                        </Typography>
                    </Stack>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField fullWidth size="small" label="Request Date" type="date"
                                disabled={!isDraft}
                                value={header.requestDate}
                                onChange={e => setHeader(h => ({ ...h, requestDate: e.target.value }))}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField fullWidth size="small" label="Required By" type="date"
                                disabled={!isDraft}
                                value={header.requiredByDate}
                                onChange={e => setHeader(h => ({ ...h, requiredByDate: e.target.value }))}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField select fullWidth size="small" label="Priority"
                                disabled={!isDraft}
                                value={header.priority}
                                onChange={e => setHeader(h => ({ ...h, priority: e.target.value }))}>
                                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField fullWidth size="small" label="Requested By"
                                disabled={!isDraft}
                                value={header.requestedBy}
                                onChange={e => setHeader(h => ({ ...h, requestedBy: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField fullWidth size="small" label="Department"
                                disabled={!isDraft}
                                value={header.department}
                                onChange={e => setHeader(h => ({ ...h, department: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Autocomplete size="small"
                                options={workCenters}
                                disabled={!isDraft}
                                getOptionLabel={(o) => o.centerCode ? `${o.centerCode} · ${o.centerName}` : (o.centerName ?? '')}
                                value={workCenters.find(w => w.id === header.workCenterId) ?? null}
                                onChange={(_, v) => setHeader(h => ({ ...h, workCenterId: v?.id ?? null }))}
                                renderInput={(params) => <TextField {...params} label="Work Center" />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <TextField fullWidth size="small" label="Notes" multiline rows={1}
                                disabled={!isDraft}
                                value={header.notes}
                                onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} />
                        </Grid>
                    </Grid>
                    {pr?.source && pr.source !== 'MANUAL' && (
                        <Stack direction="row" spacing={1} mt={2}>
                            <Chip size="small" label={`Source: ${pr.source}${pr.sourceRefNumber ? ` · ${pr.sourceRefNumber}` : ''}`} />
                        </Stack>
                    )}
                </Paper>

                {/* Lines */}
                <Paper elevation={0} sx={{ p: 3, mb: 3, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: 'white' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: T.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Line Items ({lines.length})
                        </Typography>
                        {isDraft && (
                            <Button size="small" startIcon={<Add />} variant="outlined" onClick={addLine}
                                sx={{ textTransform: 'none' }}>
                                Add Line
                            </Button>
                        )}
                    </Stack>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', color: T.accent, background: '#f8fafc' } }}>
                                <TableCell width={40}>#</TableCell>
                                <TableCell>Item</TableCell>
                                <TableCell width={90}>UOM</TableCell>
                                <TableCell width={110} align="right">Qty</TableCell>
                                <TableCell width={140}>Required By</TableCell>
                                <TableCell width={180}>Suggested Vendor</TableCell>
                                <TableCell width={130} align="right">Est. Price</TableCell>
                                <TableCell width={130} align="right">Est. Amount</TableCell>
                                <TableCell width={110}>Status</TableCell>
                                {isDraft && <TableCell width={50}></TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.length === 0 ? (
                                <TableRow><TableCell colSpan={isDraft ? 10 : 9} align="center" sx={{ py: 4, color: T.ink2 }}>
                                    No line items. Click "Add Line" to add one.
                                </TableCell></TableRow>
                            ) : lines.map((l, idx) => {
                                const amt = (Number(l.quantity) || 0) * (Number(l.estimatedUnitPrice) || 0);
                                const isLineDone = l.lineStatus === 'CONVERTED' || l.lineStatus === 'CANCELLED';
                                const editable = isDraft && !isLineDone;
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>
                                            {editable ? (
                                                <Autocomplete size="small"
                                                    options={items}
                                                    getOptionLabel={(o) => o.name ? `${o.itemCode ?? ''} ${o.name}` : ''}
                                                    value={items.find(it => it.inventoryItemId === l.itemId) ?? null}
                                                    onChange={(_, v) => onItemPick(idx, v)}
                                                    onInputChange={(_, val) => searchItems(val)}
                                                    filterOptions={(x) => x}
                                                    renderInput={(params) => <TextField {...params} variant="standard" placeholder="Type to search..." />} />
                                            ) : (
                                                <Typography sx={{ fontSize: '0.85rem' }}>
                                                    {l.itemCode ? `${l.itemCode} · ` : ''}{l.itemName ?? '—'}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{l.uom ?? '—'}</TableCell>
                                        <TableCell align="right">
                                            {editable ? (
                                                <TextField variant="standard" size="small" type="number"
                                                    value={l.quantity}
                                                    onChange={e => updateLine(idx, { quantity: e.target.value })}
                                                    inputProps={{ style: { textAlign: 'right' }, min: 0 }} />
                                            ) : l.quantity}
                                        </TableCell>
                                        <TableCell>
                                            {editable ? (
                                                <TextField variant="standard" size="small" type="date"
                                                    value={l.requiredByDate}
                                                    onChange={e => updateLine(idx, { requiredByDate: e.target.value })}
                                                    InputLabelProps={{ shrink: true }} />
                                            ) : (l.requiredByDate ?? '—')}
                                        </TableCell>
                                        <TableCell>
                                            {editable ? (
                                                <Autocomplete size="small"
                                                    options={vendors}
                                                    getOptionLabel={(o) => o.companyName ?? ''}
                                                    value={vendors.find(v => v.id === l.suggestedVendorId) ?? null}
                                                    onChange={(_, v) => updateLine(idx, { suggestedVendorId: v?.id ?? null })}
                                                    renderInput={(params) => <TextField {...params} variant="standard" placeholder="—" />} />
                                            ) : (l.suggestedVendorName ?? '—')}
                                        </TableCell>
                                        <TableCell align="right">
                                            {editable ? (
                                                <TextField variant="standard" size="small" type="number"
                                                    value={l.estimatedUnitPrice}
                                                    onChange={e => updateLine(idx, { estimatedUnitPrice: e.target.value })}
                                                    inputProps={{ style: { textAlign: 'right' }, min: 0 }} />
                                            ) : Number(l.estimatedUnitPrice ?? 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right">{amt.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={l.lineStatus ?? 'PENDING'}
                                                sx={{ fontSize: '0.65rem', height: 20 }} />
                                        </TableCell>
                                        {isDraft && (
                                            <TableCell>
                                                {!isLineDone && (
                                                    <IconButton size="small" onClick={() => removeLine(idx)} sx={{ color: '#dc2626' }}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                        <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Total Estimated:</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                            ₹{totalEstimated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                    </Stack>
                </Paper>
            </Container>

            {/* Dialogs */}
            <ConfirmDialog open={dialog?.type === 'submit'}
                title="Submit for approval?" body="This will lock the requisition and route it for review."
                onClose={() => setDialog(null)} onConfirm={onSubmitApproval} loading={actionLoading} />
            <ConfirmDialog open={dialog?.type === 'approve'}
                title="Approve requisition?" body="Approved requisitions can be converted to a Purchase Order."
                onClose={() => setDialog(null)} onConfirm={onApprove} loading={actionLoading} />
            <ConfirmDialog open={dialog?.type === 'reject'}
                title="Reject requisition?" body="Provide a reason — visible to the requester."
                input="Rejection reason"
                onClose={() => setDialog(null)} onConfirm={onReject} loading={actionLoading} />
            <ConfirmDialog open={dialog?.type === 'cancel'}
                title="Cancel requisition?" body="This cannot be undone."
                input="Cancel reason (optional)"
                onClose={() => setDialog(null)} onConfirm={onCancel} loading={actionLoading} />
            <ConfirmDialog open={dialog?.type === 'delete'}
                title="Delete this draft?" body="This will permanently delete the requisition."
                onClose={() => setDialog(null)} onConfirm={onDelete} loading={actionLoading} />
            <ConvertToPoDialog open={dialog?.type === 'convert'}
                vendors={vendors} lines={lines}
                onClose={() => setDialog(null)} onConfirm={onConvert} loading={actionLoading} />
        </Box>
    );
}
