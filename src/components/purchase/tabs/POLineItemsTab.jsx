import React, { useState, useEffect } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Button, Autocomplete, TextField, Tooltip, Typography,
    Stack, Divider, InputAdornment, Chip,
} from '@mui/material';
import { Add, Delete, Inventory, ShoppingCart, NoteAlt } from '@mui/icons-material';
import apiService from '../../../services/apiService';
import { T } from '../../../theme/moduleTokens';


const BLANK_LINE = {
    itemId: null, description: '', hsnCode: '', uom: '',
    quantityOrdered: 1, unitPrice: 0, discountPct: 0, gstRatePct: 0,
    requiredByDate: '', remarks: '',
};

const cellStyle = { fontSize: '0.8rem', py: 1.5, px: 1, borderBottom: `1px solid ${T.rule}` };
const headerCellStyle = { 
    ...cellStyle, 
    fontWeight: 700, 
    color: T.accent, 
    whiteSpace: 'nowrap', 
    background: T.accentDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: '0.65rem'
};

const num2 = (n) => n != null ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
const calcLine = (line) => {
    const base = (line.quantityOrdered || 0) * (line.unitPrice || 0);
    const disc = base * (line.discountPct || 0) / 100;
    return parseFloat((base - disc).toFixed(2));
};

export default function POLineItemsTab({ formik, readOnly }) {
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        setLoadingItems(true);
        apiService.get('/inventory_item/all', { size: 500 })
            .then(r => setItems(r?.content ?? r ?? []))
            .catch(() => {})
            .finally(() => setLoadingItems(false));
    }, []);

    const lines = formik.values.items ?? [];
    const setLines = (next) => formik.setFieldValue('items', next);
    const addLine = () => setLines([...lines, { ...BLANK_LINE, lineNumber: lines.length + 1 }]);
    const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

    const updateLine = (i, field, val) => {
        const next = lines.map((l, idx) => idx !== i ? l : { ...l, [field]: val });
        setLines(next);
    };

    const handleItemSelect = (i, invItem) => {
        if (!invItem) { updateLine(i, 'itemId', null); return; }
        const next = lines.map((l, idx) => idx !== i ? l : {
            ...l,
            itemId: invItem.inventoryItemId ?? invItem.id,
            description: invItem.name ?? '',
            hsnCode: invItem.hsnCode ?? '',
            uom: invItem.uom ?? '',
            gstRatePct: invItem.productFinanceSettings?.gstRate ?? l.gstRatePct,
        });
        setLines(next);
    };

    const totals = lines.reduce((acc, l) => {
        const taxable = calcLine(l);
        const gst = l.gstRatePct || 0;
        const igst = taxable * gst / 100;
        return {
            taxable: acc.taxable + taxable,
            igst: acc.igst + igst,
            total: acc.total + taxable + igst,
        };
    }, { taxable: 0, igst: 0, total: 0 });

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <ShoppingCart sx={{ fontSize: 20, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Line Items ({lines.length})
                    </Typography>
                </Stack>
                {!readOnly && (
                    <Button size="small" startIcon={<Add />} variant="contained" disableElevation
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.8rem', background: T.accent, fontWeight: 700, px: 2, '&:hover': { background: T.accentHover } }}
                        onClick={addLine}>
                        Add New Item
                    </Button>
                )}
            </Stack>

            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${T.rule}` }}>
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellStyle} style={{ width: 40 }}>#</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 250 }}>Item Description</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 100 }}>HSN/SAC</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 60 }}>UOM</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 90 }} align="right">Qty</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 110 }} align="right">Unit Price</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 70 }} align="right">Disc%</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 80 }} align="right">GST%</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 120 }} align="right">Amount (₹)</TableCell>
                                <TableCell sx={headerCellStyle} style={{ width: 130 }}>Required By</TableCell>
                                {!readOnly && <TableCell sx={headerCellStyle} style={{ width: 50 }} align="center">Action</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={readOnly ? 10 : 11} align="center"
                                        sx={{ py: 6, color: '#94a3b8', fontSize: '0.9rem' }}>
                                        <Box sx={{ opacity: 0.5, mb: 1 }}><ShoppingCart sx={{ fontSize: 32 }} /></Box>
                                        {readOnly ? 'No items in this purchase order.' : 'Start adding items to your purchase order.'}
                                    </TableCell>
                                </TableRow>
                            )}
                            {lines.map((line, i) => {
                                const selectedItem = items.find(it => (it.inventoryItemId ?? it.id) === line.itemId) ?? null;
                                const taxable = calcLine(line);
                                return (
                                    <TableRow key={i} sx={{ '&:hover': { background: '#f8fafc' } }}>
                                        <TableCell sx={cellStyle}>{i + 1}</TableCell>
                                        <TableCell sx={{ ...cellStyle, p: 0.5 }}>
                                            {readOnly
                                                ? <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{line.description}</Typography>
                                                : <Autocomplete
                                                    size="small"
                                                    options={items}
                                                    loading={loadingItems}
                                                    getOptionLabel={it => `${it.itemCode ?? ''} - ${it.name}`}
                                                    value={selectedItem}
                                                    onChange={(_, v) => handleItemSelect(i, v)}
                                                    renderInput={params => (
                                                        <TextField {...params} placeholder="Search product..."
                                                            variant="standard" 
                                                            InputProps={{ ...params.InputProps, disableUnderline: true, style: { fontSize: '0.8rem' } }} />
                                                    )}
                                                    sx={{ minWidth: 200 }}
                                                />}
                                        </TableCell>
                                        <TableCell sx={cellStyle}>
                                            {readOnly ? line.hsnCode : (
                                                <TextField size="small" variant="standard" inputProps={{ style: { fontSize: '0.8rem' } }}
                                                    value={line.hsnCode ?? ''} onChange={e => updateLine(i, 'hsnCode', e.target.value)} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={cellStyle}>
                                            <Chip label={line.uom ?? '—'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }} />
                                        </TableCell>
                                        <TableCell sx={cellStyle} align="right">
                                            {readOnly ? num2(line.quantityOrdered) : (
                                                <TextField size="small" variant="standard" type="number"
                                                    inputProps={{ min: 0, style: { fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 } }}
                                                    value={line.quantityOrdered}
                                                    onChange={e => updateLine(i, 'quantityOrdered', parseFloat(e.target.value) || 0)} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={cellStyle} align="right">
                                            {readOnly ? num2(line.unitPrice) : (
                                                <TextField size="small" variant="standard" type="number"
                                                    inputProps={{ min: 0, step: '0.01', style: { fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 } }}
                                                    value={line.unitPrice}
                                                    onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={cellStyle} align="right">
                                            {readOnly ? `${line.discountPct}%` : (
                                                <TextField size="small" variant="standard" type="number"
                                                    inputProps={{ min: 0, max: 100, step: '0.01', style: { fontSize: '0.8rem', textAlign: 'right' } }}
                                                    value={line.discountPct}
                                                    onChange={e => updateLine(i, 'discountPct', parseFloat(e.target.value) || 0)} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={cellStyle} align="right">
                                            {readOnly ? `${line.gstRatePct}%` : (
                                                <TextField size="small" variant="standard" type="number"
                                                    inputProps={{ min: 0, step: '0.01', style: { fontSize: '0.8rem', textAlign: 'right' } }}
                                                    value={line.gstRatePct}
                                                    onChange={e => updateLine(i, 'gstRatePct', parseFloat(e.target.value) || 0)} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, fontWeight: 800, color: '#0f172a' }} align="right">
                                            ₹{num2(taxable)}
                                        </TableCell>
                                        <TableCell sx={cellStyle}>
                                            {readOnly ? (line.requiredByDate ?? '—') : (
                                                <TextField size="small" variant="standard" type="date"
                                                    inputProps={{ style: { fontSize: '0.8rem' } }}
                                                    value={line.requiredByDate ?? ''}
                                                    onChange={e => updateLine(i, 'requiredByDate', e.target.value)} />
                                            )}
                                        </TableCell>
                                        {!readOnly && (
                                            <TableCell sx={cellStyle} align="center">
                                                <Tooltip title="Remove item">
                                                    <IconButton size="small" color="error" onClick={() => removeLine(i)} sx={{ '&:hover': { bgcolor: '#fef2f2' } }}>
                                                        <Delete sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {lines.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 3, borderTop: `1px solid ${T.rule}`, bgcolor: '#fcfcfd' }}>
                        <Stack spacing={1} sx={{ minWidth: 200 }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>Item Taxable Value</Typography>
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{num2(totals.taxable)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>Estimated Tax</Typography>
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{num2(totals.igst)}</Typography>
                            </Stack>
                            <Divider sx={{ my: 1 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Subtotal</Typography>
                                <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: T.accent }}>₹{num2(totals.total)}</Typography>
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Paper>

            <Typography sx={{ mt: 2, fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <NoteAlt sx={{ fontSize: 14 }} /> Note: Detailed tax split (CGST/SGST/IGST) will be computed based on Place of Supply upon saving.
            </Typography>
        </Box>
    );
}
