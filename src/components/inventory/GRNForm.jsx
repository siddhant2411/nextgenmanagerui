import React, { useState, useEffect, useRef } from 'react';
import {
    Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton, InputAdornment,
    Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
    Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { createGRN, getPurchaseOrder, resolveApiErrorMessage } from '../../services/grnService';
import { getPendingReceiptPOs } from '../../services/purchaseOrderService';
import { searchInventoryItems } from '../../services/inventoryService';
import { useAuth } from '../../auth/AuthContext';
import { format } from 'date-fns';
import WarehouseSelect from '../common/WarehouseSelect';
import { listWarehouses } from '../../services/warehouseService';
import { serverFiltered, renderItemOption, itemLabel } from '../common/itemPicker';

const emptyLine = () => ({
    inventoryItemId: null,
    itemCode: '',
    itemName: '',
    uom: '',
    orderedQty: 0,
    receivedQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    rate: 0,
    amount: 0,
    batchNo: '',
    manufacturingDate: '',
    expiryDate: '',
    manualSerialNumbers: [],
    rejectionReason: '',
});

// A line for an item picked from the search, or handed in by the screen that opened the form.
const lineForItem = (item) => ({
    ...emptyLine(),
    inventoryItemId: item.inventoryItemId,
    itemCode: item.itemCode || '',
    itemName: item.name || '',
    uom: item.uom || '',
    rate: item.standardCost || 0,
});

/*
 * `initialItem` starts a new GRN with that item already on the first line (the "Receive" button
 * on a stock row). Without a purchase order the lines are picked from the item search.
 */
const GRNForm = ({ open, onClose, existingGRN, onSuccess, initialItem = null }) => {
    const { user } = useAuth();
    const isView = !!existingGRN;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [poList, setPoList] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poLoading, setPoLoading] = useState(false);
    const [form, setForm] = useState({
        grnDate: format(new Date(), 'yyyy-MM-dd'),
        warehouse: '',
        remarks: '',
    });
    const [lines, setLines] = useState([emptyLine()]);
    const [itemOptions, setItemOptions] = useState([]);
    const itemSearchTimeout = useRef(null);

    useEffect(() => {
        if (!open) return;
        if (isView && existingGRN) {
            setForm({
                grnDate: existingGRN.grnDate || '',
                warehouse: existingGRN.warehouse || '',
                remarks: existingGRN.remarks || '',
            });
            setLines(existingGRN.items || []);
            setSelectedPO(existingGRN.purchaseOrderId
                ? { id: existingGRN.purchaseOrderId, purchaseOrderNumber: existingGRN.purchaseOrderNumber }
                : null);
        } else {
            setForm({ grnDate: format(new Date(), 'yyyy-MM-dd'), warehouse: '', remarks: '' });
            setLines([initialItem ? lineForItem(initialItem) : emptyLine()]);
            setSelectedPO(null);
            setError('');
        }
        setItemOptions([]);
        fetchPOs();
    }, [open, existingGRN, initialItem]);

    const fetchPOs = async () => {
        setPoLoading(true);
        try {
            // Only orders still awaiting goods: a draft or fully received order is not receivable.
            const data = await getPendingReceiptPOs();
            setPoList(Array.isArray(data) ? data : []);
        } catch {
            // non-critical
        } finally {
            setPoLoading(false);
        }
    };

    const handleItemSearch = (query) => {
        clearTimeout(itemSearchTimeout.current);
        if (!query || query.length < 2) return;
        itemSearchTimeout.current = setTimeout(async () => {
            try {
                const resp = await searchInventoryItems({ query, page: 0, size: 20 });
                setItemOptions(resp?.content || []);
            } catch {
                // non-critical
            }
        }, 400);
    };

    const pickItem = (idx, item) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? (item ? lineForItem(item) : emptyLine()) : l)));
    };

    const handlePOChange = async (po) => {
        setSelectedPO(po);
        if (!po) { setLines([emptyLine()]); return; }
        try {
            const detail = await getPurchaseOrder(po.id);
            // Receive into the plant the order said to deliver to. It can still be changed below --
            // the gate knows where the goods actually arrived -- and left blank the server applies
            // the same plant.
            if (detail?.shipToWarehouseId) {
                listWarehouses(true)
                    .then((plants) => {
                        const plant = (Array.isArray(plants) ? plants : []).find((w) => w.id === detail.shipToWarehouseId);
                        if (plant) setForm((f) => ({ ...f, warehouse: plant.code }));
                    })
                    .catch(() => { /* non-critical: the server defaults to the same plant */ });
            }
            if (detail?.items?.length) {
                // Default to what is still outstanding, so a second receipt does not repeat the first.
                const due = (poi) => Math.max(0, (poi.quantityOrdered || 0) - (poi.quantityReceived || 0));
                setLines(detail.items.map((poi) => ({
                    inventoryItemId: poi.itemId ?? poi.item?.inventoryItemId ?? null,
                    itemCode: poi.itemCode || poi.item?.itemCode || '',
                    itemName: poi.itemName || poi.item?.name || '',
                    uom: poi.uom || poi.item?.uom || '',
                    orderedQty: poi.quantityOrdered || 0,
                    receivedQty: due(poi),
                    acceptedQty: due(poi),
                    rejectedQty: 0,
                    rate: poi.unitPrice || 0,
                    amount: due(poi) * (poi.unitPrice || 0),
                    batchNo: '',
                    manufacturingDate: '',
                    expiryDate: '',
                    manualSerialNumbers: [],
                    rejectionReason: '',
                })));
            }
        } catch (err) {
            console.error('Failed to load PO details', err);
        }
    };

    const updateLine = (idx, field, value) => {
        setLines((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            const line = updated[idx];
            if (field === 'acceptedQty' || field === 'rate') {
                updated[idx].amount = (parseFloat(line.acceptedQty) || 0) * (parseFloat(line.rate) || 0);
            }
            if (field === 'acceptedQty' || field === 'receivedQty') {
                const recv = parseFloat(field === 'receivedQty' ? value : line.receivedQty) || 0;
                const acc = parseFloat(field === 'acceptedQty' ? value : line.acceptedQty) || 0;
                updated[idx].rejectedQty = Math.max(0, recv - acc);
            }
            return updated;
        });
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

    const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

    const handleSubmit = async () => {
        if (lines.every((l) => !l.inventoryItemId)) {
            setError('At least one line item with an item selected is required.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await createGRN({
                purchaseOrderId: selectedPO?.id || null,
                vendorId: null,
                grnDate: form.grnDate,
                warehouse: form.warehouse,
                remarks: form.remarks,
                createdBy: user?.username || 'system',
                items: lines.filter((l) => l.inventoryItemId).map((l) => ({
                    inventoryItemId: l.inventoryItemId,
                    orderedQty: parseFloat(l.orderedQty) || 0,
                    receivedQty: parseFloat(l.receivedQty) || 0,
                    acceptedQty: parseFloat(l.acceptedQty) || 0,
                    rejectedQty: parseFloat(l.rejectedQty) || 0,
                    rate: parseFloat(l.rate) || 0,
                    amount: parseFloat(l.amount) || 0,
                    supplierBatchNo: l.batchNo || null,
                    manufacturingDate: l.manufacturingDate || null,
                    expiryDate: l.expiryDate || null,
                    manualSerialNumbers: l.manualSerialNumbers?.length ? l.manualSerialNumbers : null,
                    rejectionReason: l.rejectionReason || null,
                })),
            });
            onSuccess?.();
        } catch (err) {
            setError(resolveApiErrorMessage(err, 'Failed to create GRN.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight={700} variant="h6">
                    {isView ? `GRN — ${existingGRN?.grnNumber}` : 'New Goods Receipt Note'}
                </Typography>
                <IconButton size="small" onClick={onClose}><Close /></IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Header fields */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
                    <Autocomplete
                        sx={{ flex: 2 }}
                        options={poList}
                        loading={poLoading}
                        getOptionLabel={(o) => `${o.purchaseOrderNumber || ''}${o.vendorName ? ' — ' + o.vendorName : ''}`}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        value={selectedPO}
                        onChange={(_, v) => handlePOChange(v)}
                        disabled={isView}
                        renderInput={(params) => (
                            <TextField {...params} label="Purchase Order" size="small"
                                helperText={isView ? undefined : 'Leave empty only for goods that arrived without a purchase order'}
                                InputProps={{ ...params.InputProps, endAdornment: <>{poLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }} />
                        )}
                    />
                    <TextField
                        label="GRN Date"
                        type="date"
                        size="small"
                        value={form.grnDate}
                        onChange={(e) => setForm((f) => ({ ...f, grnDate: e.target.value }))}
                        disabled={isView}
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: 1 }}
                    />
                    <WarehouseSelect
                        label="Warehouse"
                        size="small"
                        value={form.warehouse}
                        onChange={(code) => setForm((f) => ({ ...f, warehouse: code }))}
                        disabled={isView}
                        sx={{ flex: 1 }}
                    />
                </Stack>

                <TextField
                    label="Remarks"
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    disabled={isView}
                    sx={{ mb: 3 }}
                />

                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Line Items</Typography>

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 900 }}>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Item Code</TableCell>
                                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Item Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>UOM</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Ordered</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Received</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Accepted</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Rejected</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Rate (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Amount (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Batch #</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Mfg Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Serials (CSV)</TableCell>
                                {!isView && <TableCell />}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        {(isView || selectedPO) ? line.itemCode : (
                                            <Autocomplete
                                                size="small"
                                                options={itemOptions}
                                                filterOptions={serverFiltered}
                                                renderOption={renderItemOption}
                                                getOptionLabel={itemLabel}
                                                isOptionEqualToValue={(o, v) => o.inventoryItemId === v.inventoryItemId}
                                                value={line.inventoryItemId ? { inventoryItemId: line.inventoryItemId, itemCode: line.itemCode, name: line.itemName } : null}
                                                onInputChange={(_, v, reason) => { if (reason === 'input') handleItemSearch(v); }}
                                                onChange={(_, v) => pickItem(idx, v)}
                                                renderInput={(params) => <TextField {...params} placeholder="Search code or name" />}
                                                sx={{ width: 240 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>{line.itemName || '-'}</TableCell>
                                    <TableCell>{line.uom || '-'}</TableCell>
                                    {['orderedQty', 'receivedQty', 'acceptedQty', 'rejectedQty', 'rate'].map((field) => (
                                        <TableCell key={field} align="right">
                                            {isView ? (parseFloat(line[field]) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={line[field]}
                                                    onChange={(e) => updateLine(idx, field, e.target.value)}
                                                    inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                                                    sx={{ width: 90 }}
                                                    disabled={field === 'rejectedQty'}
                                                />
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell align="right">
                                        {(parseFloat(line.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                        {isView ? (line.batchNo || '-') : (
                                            <TextField
                                                size="small"
                                                value={line.batchNo}
                                                onChange={(e) => updateLine(idx, 'batchNo', e.target.value)}
                                                placeholder="Batch"
                                                sx={{ width: 100 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isView ? (line.manufacturingDate || '-') : (
                                            <TextField
                                                size="small"
                                                type="date"
                                                value={line.manufacturingDate}
                                                onChange={(e) => updateLine(idx, 'manufacturingDate', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: 130 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isView ? (line.manualSerialNumbers?.join(', ') || '-') : (
                                            <TextField
                                                size="small"
                                                value={line.manualSerialNumbers?.join(', ') || ''}
                                                onChange={(e) => updateLine(idx, 'manualSerialNumbers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                placeholder="SN1, SN2..."
                                                sx={{ width: 150 }}
                                            />
                                        )}
                                    </TableCell>
                                    {!isView && (
                                        <TableCell>
                                            <IconButton size="small" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                                                <Close fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>

                {!isView && (
                    <Button size="small" onClick={addLine} sx={{ mt: 1, textTransform: 'none' }}>
                        + Add Line
                    </Button>
                )}

                <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Typography fontWeight={700}>
                        Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
                {!isView && (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Submit GRN'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default GRNForm;
