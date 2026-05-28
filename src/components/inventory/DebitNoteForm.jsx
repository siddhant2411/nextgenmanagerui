/**
 * DebitNoteForm — right-side Drawer
 *  - Create mode  : initialNote = null
 *  - View mode    : initialNote = { id, ... } — read-only, shows all details
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider,
    Drawer, FormControl, IconButton, InputLabel, MenuItem, Paper, Select,
    Stack, Table, TableBody, TableCell, TableHead, TableRow,
    TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Add, Close, Delete, Save, CheckCircleOutline, CancelOutlined,
} from '@mui/icons-material';
import { searchContacts }       from '../../services/commonAPI';
import { searchGRNs }           from '../../services/grnService';
import { getPurchaseOrders }    from '../../services/grnService';
import { inventoryItemSearch }  from '../../services/commonAPI';
import {
    createDebitNote, getDebitNote, getNextDebitNoteNumber,
    confirmDebitNote, cancelDebitNote,
} from '../../services/debitNoteService';
import { format } from 'date-fns';

const T = {
    primary: '#2563eb', success: '#059669', error: '#dc2626',
    warning: '#d97706', bg: '#f8fafc', text: '#0f172a', textSec: '#64748b',
    border: '#e2e8f0',
};

const RETURN_REASONS = [
    { value: 'DEFECTIVE',          label: 'Defective' },
    { value: 'EXCESS_QUANTITY',    label: 'Excess Quantity' },
    { value: 'WRONG_ITEM',         label: 'Wrong Item' },
    { value: 'QUALITY_ISSUE',      label: 'Quality Issue' },
    { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit' },
    { value: 'OTHER',              label: 'Other' },
];

const STATUS_COLOR = { DRAFT: 'default', CONFIRMED: 'success', CANCELLED: 'error' };

const fmt   = (d) => { try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; } catch { return d || '—'; } };
const curr  = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

// ── Empty line ───────────────────────────────────────────────────────────────
const emptyLine = () => ({
    _key:          Math.random(),
    inventoryItem: null,
    lineNumber:    1,
    returnedQty:   '',
    rate:          '',
    gstRate:       '',
    warehouseFrom: '',
    remarks:       '',
});

// ── Component ─────────────────────────────────────────────────────────────────
const DebitNoteForm = ({ open, onClose, initialNote = null, onSaved }) => {
    const isView = !!initialNote;

    // ── create-mode state ───────────────────────────────────────────────────
    const [nextNum,     setNextNum]     = useState('');
    const [vendor,      setVendor]      = useState(null);
    const [vendorOpts,  setVendorOpts]  = useState([]);
    const [grn,         setGrn]         = useState(null);
    const [grnOpts,     setGrnOpts]     = useState([]);
    const [po,          setPo]          = useState(null);
    const [poOpts,      setPoOpts]      = useState([]);
    const [dnDate,      setDnDate]      = useState(today());
    const [reason,      setReason]      = useState('OTHER');
    const [remarks,     setRemarks]     = useState('');
    const [lines,       setLines]       = useState([emptyLine()]);

    // ── view-mode state ──────────────────────────────────────────────────────
    const [detail,      setDetail]      = useState(null);

    // ── shared ──────────────────────────────────────────────────────────────
    const [saving,      setSaving]      = useState(false);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [success,     setSuccess]     = useState('');

    // ── load detail when viewing ─────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        setError(''); setSuccess('');
        if (isView && initialNote?.id) {
            setLoading(true);
            getDebitNote(initialNote.id)
                .then(setDetail)
                .catch(() => setError('Failed to load debit note details.'))
                .finally(() => setLoading(false));
        } else {
            // reset create form
            setVendor(null); setGrn(null); setPo(null);
            setDnDate(today()); setReason('OTHER'); setRemarks('');
            setLines([emptyLine()]);
            getNextDebitNoteNumber().then(setNextNum).catch(() => {});
        }
    }, [open, isView, initialNote]);

    // ── vendor search ────────────────────────────────────────────────────────
    const onVendorSearch = useCallback(async (q) => {
        try { setVendorOpts(await searchContacts(q)); } catch {}
    }, []);

    // ── GRN search by vendor ─────────────────────────────────────────────────
    const onGrnSearch = useCallback(async (q) => {
        if (!vendor) return;
        try {
            const res = await searchGRNs({ grnNumber: q || undefined, page: 0, size: 20 });
            setGrnOpts(res.content || []);
        } catch {}
    }, [vendor]);

    // ── PO search ────────────────────────────────────────────────────────────
    const onPoSearch = useCallback(async () => {
        try {
            const res = await getPurchaseOrders();
            setPoOpts(Array.isArray(res) ? res : (res?.content || []));
        } catch {}
    }, []);

    // ── line helpers ─────────────────────────────────────────────────────────
    const setLine = (key, field, value) =>
        setLines(ls => ls.map(l => l._key === key ? { ...l, [field]: value } : l));

    const addLine = () =>
        setLines(ls => [...ls, { ...emptyLine(), lineNumber: ls.length + 1 }]);

    const removeLine = (key) =>
        setLines(ls => ls.filter(l => l._key !== key));

    // ── computed totals ──────────────────────────────────────────────────────
    const lineTotal = (l) => {
        const base = (parseFloat(l.returnedQty) || 0) * (parseFloat(l.rate) || 0);
        const gst  = base * ((parseFloat(l.gstRate) || 0) / 100);
        return { base, gst, total: base + gst };
    };
    const subtotal    = lines.reduce((s, l) => s + lineTotal(l).base,  0);
    const totalGst    = lines.reduce((s, l) => s + lineTotal(l).gst,   0);
    const totalAmount = subtotal + totalGst;

    // ── save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!vendor) { setError('Please select a vendor.'); return; }
        if (lines.some(l => !l.inventoryItem || !l.returnedQty || !l.rate)) {
            setError('Each line must have an item, quantity, and rate.'); return;
        }
        setSaving(true); setError('');
        try {
            await createDebitNote({
                vendorId:       vendor.id,
                purchaseOrderId: po?.id ?? null,
                grnId:           grn?.id ?? null,
                debitNoteDate:   dnDate,
                returnReason:    reason,
                remarks,
                items: lines.map((l, i) => ({
                    inventoryItemId: l.inventoryItem.inventoryItemId,
                    lineNumber:      i + 1,
                    returnedQty:     parseFloat(l.returnedQty) || 0,
                    rate:            parseFloat(l.rate)        || 0,
                    gstRate:         parseFloat(l.gstRate)     || 0,
                    warehouseFrom:   l.warehouseFrom || '',
                    remarks:         l.remarks || '',
                })),
            });
            onSaved?.();
        } catch (e) {
            setError(e?.message || 'Failed to create debit note.');
        } finally {
            setSaving(false);
        }
    };

    // ── actions from view mode ───────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!detail) return;
        setSaving(true); setError('');
        try {
            await confirmDebitNote(detail.id);
            setSuccess('Confirmed — stock adjusted.');
            const updated = await getDebitNote(detail.id);
            setDetail(updated);
            onSaved?.();
        } catch (e) { setError(e?.message || 'Failed to confirm.'); }
        finally { setSaving(false); }
    };

    const handleCancel = async () => {
        if (!detail) return;
        if (!window.confirm('Cancel this debit note? Stock adjustment will be reversed if confirmed.')) return;
        setSaving(true); setError('');
        try {
            await cancelDebitNote(detail.id);
            setSuccess('Cancelled.');
            const updated = await getDebitNote(detail.id);
            setDetail(updated);
            onSaved?.();
        } catch (e) { setError(e?.message || 'Failed to cancel.'); }
        finally { setSaving(false); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Drawer
            anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100vw', sm: '85vw', lg: '72vw' }, maxWidth: 1100 } }}
        >
            {/* Header */}
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg,
                       display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="h6" fontWeight={700} color={T.text}>
                        {isView ? (detail?.debitNoteNumber || initialNote?.debitNoteNumber || 'Debit Note') : `New Purchase Return — ${nextNum}`}
                    </Typography>
                    {isView && detail && (
                        <Chip label={detail.status} size="small"
                              color={STATUS_COLOR[detail.status] || 'default'}
                              sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
                    )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    {isView && detail?.status === 'DRAFT' && (
                        <>
                            <Button size="small" variant="contained" startIcon={<CheckCircleOutline />}
                                disabled={saving}
                                onClick={handleConfirm}
                                sx={{ bgcolor: T.success, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#047857' } }}>
                                Confirm
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<CancelOutlined />}
                                disabled={saving}
                                onClick={handleCancel}
                                sx={{ color: T.error, borderColor: T.error, textTransform: 'none' }}>
                                Cancel
                            </Button>
                        </>
                    )}
                    {isView && detail?.status === 'CONFIRMED' && (
                        <Button size="small" variant="outlined" startIcon={<CancelOutlined />}
                            disabled={saving}
                            onClick={handleCancel}
                            sx={{ color: T.error, borderColor: T.error, textTransform: 'none' }}>
                            Cancel &amp; Reverse
                        </Button>
                    )}
                    {!isView && (
                        <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                            disabled={saving}
                            onClick={handleSave}
                            sx={{ bgcolor: T.primary, textTransform: 'none', fontWeight: 600 }}>
                            Save as Draft
                        </Button>
                    )}
                    <IconButton size="small" onClick={onClose}
                        sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
                        <Close fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            {/* Body */}
            <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
                {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
                ) : isView && detail ? (
                    <ViewBody detail={detail} />
                ) : !isView ? (
                    <CreateBody
                        nextNum={nextNum}
                        vendor={vendor} setVendor={setVendor} vendorOpts={vendorOpts} onVendorSearch={onVendorSearch}
                        grn={grn} setGrn={setGrn} grnOpts={grnOpts} onGrnSearch={onGrnSearch}
                        po={po} setPo={setPo} poOpts={poOpts} onPoSearch={onPoSearch}
                        dnDate={dnDate} setDnDate={setDnDate}
                        reason={reason} setReason={setReason}
                        remarks={remarks} setRemarks={setRemarks}
                        lines={lines} setLine={setLine} addLine={addLine} removeLine={removeLine}
                        lineTotal={lineTotal} subtotal={subtotal} totalGst={totalGst} totalAmount={totalAmount}
                    />
                ) : null}
            </Box>
        </Drawer>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// View-only body
// ─────────────────────────────────────────────────────────────────────────────
const ViewBody = ({ detail }) => {
    const fmt2 = fmt;
    const curr2 = curr;
    return (
        <Box>
            {/* Header info */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)' }} gap={2}>
                    <InfoField label="DN Number"     value={detail.debitNoteNumber} />
                    <InfoField label="Date"          value={fmt2(detail.debitNoteDate)} />
                    <InfoField label="Vendor"        value={detail.vendorName} />
                    <InfoField label="Return Reason" value={detail.returnReason?.replace(/_/g, ' ')} />
                    {detail.grnNumber && <InfoField label="GRN #" value={detail.grnNumber} />}
                    {detail.purchaseOrderNumber && <InfoField label="PO #" value={detail.purchaseOrderNumber} />}
                    {detail.remarks && <InfoField label="Remarks" value={detail.remarks} />}
                    <InfoField label="Created By" value={detail.createdBy} />
                    <InfoField label="Created Date" value={fmt2(detail.createdDate)} />
                </Box>
            </Paper>

            {/* Line items */}
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Line Items</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                            {['#', 'Item', 'Returned Qty', 'Rate', 'GST %', 'GST Amt', 'Total', 'Warehouse', 'Remarks'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.77rem', py: 1 }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {detail.items?.map((l) => (
                            <TableRow key={l.id}>
                                <TableCell>{l.lineNumber}</TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{l.itemCode} — {l.itemName}</TableCell>
                                <TableCell>{l.returnedQty}</TableCell>
                                <TableCell>{curr2(l.rate)}</TableCell>
                                <TableCell>{l.gstRate}%</TableCell>
                                <TableCell>{curr2(l.gstAmount)}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{curr2(l.totalAmount)}</TableCell>
                                <TableCell>{l.warehouseFrom || '—'}</TableCell>
                                <TableCell sx={{ color: '#64748b', fontSize: '0.75rem' }}>{l.remarks || '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Totals */}
            <Box display="flex" justifyContent="flex-end">
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 260 }}>
                    <TotalRow label="Subtotal"    value={curr2(detail.subtotal)} />
                    <TotalRow label="Total GST"   value={curr2(detail.totalGstAmount)} />
                    <Divider sx={{ my: 1 }} />
                    <TotalRow label="Total Amount" value={curr2(detail.totalAmount)} bold />
                </Paper>
            </Box>
        </Box>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Create-mode body
// ─────────────────────────────────────────────────────────────────────────────
const CreateBody = ({
    vendor, setVendor, vendorOpts, onVendorSearch,
    grn, setGrn, grnOpts, onGrnSearch,
    po, setPo, poOpts, onPoSearch,
    dnDate, setDnDate, reason, setReason, remarks, setRemarks,
    lines, setLine, addLine, removeLine, lineTotal,
    subtotal, totalGst, totalAmount,
}) => {

    const [itemOpts, setItemOpts] = useState({});  // keyed by _key

    const searchItems = useCallback(async (key, q) => {
        try {
            const opts = await inventoryItemSearch(q);
            setItemOpts(prev => ({ ...prev, [key]: opts || [] }));
        } catch {}
    }, []);

    return (
        <Box>
            {/* Header fields */}
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Return Details</Typography>
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }} gap={2}>
                    {/* Vendor */}
                    <Autocomplete
                        options={vendorOpts} value={vendor}
                        getOptionLabel={(o) => o.companyName || ''}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onInputChange={(_, q) => onVendorSearch(q)}
                        onChange={(_, v) => { setVendor(v); setGrn(null); setPo(null); }}
                        renderInput={(params) => (
                            <TextField {...params} label="Vendor *" size="small" />
                        )}
                    />

                    {/* Date */}
                    <TextField
                        label="Return Date" type="date" size="small"
                        value={dnDate} onChange={(e) => setDnDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />

                    {/* Return Reason */}
                    <FormControl size="small">
                        <InputLabel>Return Reason</InputLabel>
                        <Select value={reason} label="Return Reason" onChange={(e) => setReason(e.target.value)}>
                            {RETURN_REASONS.map(r => (
                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* GRN (optional) */}
                    <Autocomplete
                        options={grnOpts} value={grn}
                        getOptionLabel={(o) => o.grnNumber || ''}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onOpen={() => onGrnSearch('')}
                        onInputChange={(_, q) => onGrnSearch(q)}
                        onChange={(_, v) => setGrn(v)}
                        disabled={!vendor}
                        renderInput={(params) => (
                            <TextField {...params} label="GRN (optional)" size="small"
                                helperText={!vendor ? 'Select vendor first' : ''} />
                        )}
                    />

                    {/* PO (optional) */}
                    <Autocomplete
                        options={poOpts} value={po}
                        getOptionLabel={(o) => o.purchaseOrderNumber || ''}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onOpen={() => onPoSearch()}
                        onChange={(_, v) => setPo(v)}
                        renderInput={(params) => (
                            <TextField {...params} label="Purchase Order (optional)" size="small" />
                        )}
                    />

                    {/* Remarks */}
                    <TextField
                        label="Remarks" size="small" value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        multiline rows={1}
                    />
                </Box>
            </Paper>

            {/* Line Items */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="subtitle2" fontWeight={700}>Line Items</Typography>
                <Button size="small" startIcon={<Add />} onClick={addLine}
                    sx={{ textTransform: 'none', color: T.primary, fontWeight: 600 }}>
                    Add Line
                </Button>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'visible', mb: 3 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                            {['#', 'Item *', 'Qty *', 'Rate *', 'GST %', 'Amount', 'Warehouse', 'Remarks', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.77rem', py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => {
                            const tot = lineTotal(line);
                            return (
                                <TableRow key={line._key}>
                                    <TableCell sx={{ color: T.textSec, width: 30 }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <Autocomplete
                                            options={itemOpts[line._key] || []}
                                            value={line.inventoryItem}
                                            getOptionLabel={(o) => `${o.itemCode} — ${o.name || o.itemName || ''}`}
                                            isOptionEqualToValue={(a, b) => a.inventoryItemId === b.inventoryItemId}
                                            onInputChange={(_, q) => searchItems(line._key, q)}
                                            onChange={(_, v) => setLine(line._key, 'inventoryItem', v)}
                                            size="small"
                                            renderInput={(params) => <TextField {...params} placeholder="Search item" size="small" />}
                                            sx={{ minWidth: 180 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ width: 90 }}>
                                        <TextField size="small" type="number" value={line.returnedQty}
                                            onChange={(e) => setLine(line._key, 'returnedQty', e.target.value)}
                                            inputProps={{ min: 0, step: 'any' }} sx={{ width: 80 }} />
                                    </TableCell>
                                    <TableCell sx={{ width: 110 }}>
                                        <TextField size="small" type="number" value={line.rate}
                                            onChange={(e) => setLine(line._key, 'rate', e.target.value)}
                                            inputProps={{ min: 0, step: 'any' }} sx={{ width: 100 }} />
                                    </TableCell>
                                    <TableCell sx={{ width: 80 }}>
                                        <TextField size="small" type="number" value={line.gstRate}
                                            onChange={(e) => setLine(line._key, 'gstRate', e.target.value)}
                                            inputProps={{ min: 0, max: 100, step: 'any' }} sx={{ width: 70 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                        {tot.total > 0 ? `₹${tot.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <TextField size="small" value={line.warehouseFrom}
                                            onChange={(e) => setLine(line._key, 'warehouseFrom', e.target.value)}
                                            placeholder="e.g. Main" sx={{ width: 110 }} />
                                    </TableCell>
                                    <TableCell sx={{ width: 130 }}>
                                        <TextField size="small" value={line.remarks}
                                            onChange={(e) => setLine(line._key, 'remarks', e.target.value)}
                                            placeholder="Remarks" sx={{ width: 120 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Remove line">
                                            <span>
                                                <IconButton size="small" disabled={lines.length === 1}
                                                    onClick={() => removeLine(line._key)}
                                                    sx={{ color: T.error }}>
                                                    <Delete fontSize="inherit" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>

            {/* Totals */}
            <Box display="flex" justifyContent="flex-end">
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 260 }}>
                    <TotalRow label="Subtotal"    value={`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    <TotalRow label="Total GST"   value={`₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    <Divider sx={{ my: 1 }} />
                    <TotalRow label="Total Amount" value={`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} bold />
                </Paper>
            </Box>
        </Box>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
const InfoField = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="#64748b" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={500} mt={0.3}>{value || '—'}</Typography>
    </Box>
);

const TotalRow = ({ label, value, bold }) => (
    <Box display="flex" justifyContent="space-between" py={0.4}>
        <Typography variant="body2" color={bold ? '#0f172a' : '#64748b'} fontWeight={bold ? 700 : 400}>{label}</Typography>
        <Typography variant="body2" fontWeight={bold ? 700 : 500}>{value}</Typography>
    </Box>
);

export default DebitNoteForm;
