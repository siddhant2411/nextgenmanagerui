import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, CircularProgress, Divider, MenuItem,
    Paper, Select, Snackbar, Alert, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import {
    BarChart as ValuationIcon,
    FileDownload as ExportIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { getStockValuation } from '../../services/inventoryService';
import { useAuth }       from '../../auth/AuthContext';
import { ACTION_KEYS }  from '../../auth/roles';

const T = {
    primary: '#2563eb', success: '#059669', error: '#dc2626',
    warning: '#d97706', bg: '#f8fafc', border: '#e2e8f0',
    text: '#0f172a', textSec: '#64748b',
};

const HEADER_SX = {
    fontSize: '0.65rem', letterSpacing: '0.05em',
    textTransform: 'uppercase', fontWeight: 700,
    color: T.textSec, bgcolor: T.bg,
};

const ITEM_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'RAW_MATERIAL',   label: 'Raw Material' },
    { value: 'FINISHED_GOODS', label: 'Finished Goods' },
    { value: 'SEMI_FINISHED',  label: 'Semi-Finished' },
    { value: 'CONSUMABLE',     label: 'Consumable' },
];

const TYPE_COLORS = {
    RAW_MATERIAL:   '#0284c7',
    FINISHED_GOODS: '#059669',
    SEMI_FINISHED:  '#d97706',
    CONSUMABLE:     '#7c3aed',
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const StockValuationReport = () => {
    const { canAction } = useAuth();
    const canViewValuation = canAction(ACTION_KEYS.INVENTORY_VALUATION_READ);

    const [itemType,  setItemType]  = useState('');
    const [rows,      setRows]      = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [snack,     setSnack]     = useState({ open: false, msg: '', sev: 'success' });

    const load = async (type = itemType) => {
        setLoading(true);
        try {
            const params = {};
            if (type) params.itemType = type;
            const res = await getStockValuation(params);
            setRows(res ?? []);
        } catch {
            setSnack({ open: true, msg: 'Failed to load valuation data', sev: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Auto-load all items on first render
    useEffect(() => { load(); }, []);

    const handleTypeChange = (e) => {
        setItemType(e.target.value);
        load(e.target.value);
    };

    // ── Group rows by itemType ──────────────────────────────────────────────
    const grouped = rows.reduce((acc, row) => {
        const key = row.itemType || 'OTHER';
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {});

    const grandTotal  = rows.reduce((s, r) => s + (r.totalValue ?? 0), 0);
    const totalItems  = rows.length;
    const inStockItems = rows.filter(r => r.closingQty > 0).length;

    // ── Excel export ──────────────────────────────────────────────────────
    const exportExcel = () => {
        const data = [
            ['Item Code', 'Item Name', 'Type', 'UOM', 'HSN', 'Closing Qty', 'Avg Rate (₹)', 'Total Value (₹)'],
            ...rows.map(r => [
                r.itemCode, r.itemName, r.itemType, r.uom, r.hsnCode ?? '',
                r.closingQty, r.avgRate, r.totalValue,
            ]),
            [],
            ['', '', '', '', '', '', 'Grand Total', grandTotal],
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Valuation');
        XLSX.writeFile(wb, `Stock_Valuation_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <Box>
            {/* ── Controls ── */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" mb={2.5} flexWrap="wrap">
                <Select
                    size="small"
                    value={itemType}
                    onChange={handleTypeChange}
                    displayEmpty
                    sx={{ minWidth: 180, bgcolor: '#fff', borderRadius: 1.5 }}
                >
                    {ITEM_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                </Select>

                <Button variant="outlined" size="small" startIcon={<RefreshIcon />}
                    onClick={() => load()}
                    sx={{ textTransform: 'none', borderRadius: 2 }}>
                    Refresh
                </Button>

                <Box flex={1} />

                {canViewValuation && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ExportIcon />}
                        onClick={exportExcel}
                        disabled={!rows.length}
                        sx={{ textTransform: 'none', borderRadius: 2, borderColor: T.success, color: T.success,
                              '&:hover': { bgcolor: '#f0fdf4', borderColor: T.success } }}
                    >
                        Export Excel
                    </Button>
                )}
            </Stack>

            {/* ── Summary cards ── */}
            {rows.length > 0 && (
                <Stack direction="row" spacing={2} mb={2.5} flexWrap="wrap">
                    {[
                        { label: 'Total Items',      value: totalItems,                        color: T.primary,  show: true },
                        { label: 'Items In Stock',   value: inStockItems,                      color: T.success,  show: true },
                        { label: 'Grand Total Value',value: `₹ ${fmt(grandTotal)}`,            color: '#0f172a',  show: canViewValuation },
                    ].filter(c => c.show).map(c => (
                        <Paper key={c.label} variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 160 }}>
                            <Typography variant="caption" color={T.textSec} display="block">{c.label}</Typography>
                            <Typography variant="h6" fontWeight={800} color={c.color}>{c.value}</Typography>
                        </Paper>
                    ))}
                </Stack>
            )}

            {/* ── Loading ── */}
            {loading && (
                <Box textAlign="center" py={6}><CircularProgress /></Box>
            )}

            {/* ── Empty state ── */}
            {!loading && rows.length === 0 && (
                <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
                    <Typography color={T.textSec}>No items found for the selected filter.</Typography>
                </Paper>
            )}

            {/* ── Grouped table ── */}
            {!loading && rows.length > 0 && Object.entries(grouped).map(([type, typeRows]) => {
                const subtotal = typeRows.reduce((s, r) => s + (r.totalValue ?? 0), 0);
                const typeLabel = ITEM_TYPES.find(t => t.value === type)?.label ?? type;
                return (
                    <Box key={type} mb={3}>
                        {/* Group header */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    label={typeLabel}
                                    size="small"
                                    sx={{
                                        bgcolor: TYPE_COLORS[type] ?? T.primary,
                                        color: '#fff', fontWeight: 700, fontSize: '0.7rem',
                                    }}
                                />
                                <Typography variant="caption" color={T.textSec}>
                                    {typeRows.length} item{typeRows.length !== 1 ? 's' : ''}
                                </Typography>
                            </Stack>
                            {canViewValuation && (
                                <Typography variant="body2" fontWeight={700} color={TYPE_COLORS[type] ?? T.text}>
                                    Subtotal: ₹ {fmt(subtotal)}
                                </Typography>
                            )}
                        </Stack>

                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {[
                                            { h: 'Item Code',      right: false, finance: false },
                                            { h: 'Item Name',      right: false, finance: false },
                                            { h: 'UOM',            right: false, finance: false },
                                            { h: 'HSN',            right: false, finance: false },
                                            { h: 'Closing Qty',    right: true,  finance: false },
                                            { h: 'Avg Rate (₹)',   right: true,  finance: true  },
                                            { h: 'Total Value (₹)',right: true,  finance: true  },
                                        ].filter(c => !c.finance || canViewValuation).map(({ h, right }) => (
                                            <TableCell key={h} sx={HEADER_SX} align={right ? 'right' : 'left'}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {typeRows.map(row => (
                                        <TableRow key={row.inventoryItemId} hover sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.itemCode}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', maxWidth: 220,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.itemName}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: T.textSec }}>{row.uom}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: T.textSec }}>{row.hsnCode ?? '—'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                {fmt(row.closingQty)}
                                            </TableCell>
                                            {canViewValuation && (
                                                <TableCell align="right" sx={{ color: T.textSec }}>
                                                    {row.avgRate > 0 ? fmt(row.avgRate) : '—'}
                                                </TableCell>
                                            )}
                                            {canViewValuation && (
                                                <TableCell align="right" sx={{ fontWeight: 700, color: row.totalValue > 0 ? T.text : T.textSec }}>
                                                    {row.totalValue > 0 ? `₹ ${fmt(row.totalValue)}` : '—'}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {/* Subtotal row */}
                                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                        <TableCell
                                            colSpan={canViewValuation ? 5 : 7}
                                            sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                                        >
                                            {typeLabel} Subtotal
                                        </TableCell>
                                        {canViewValuation && <TableCell />}
                                        {canViewValuation && (
                                            <TableCell align="right" sx={{ fontWeight: 800, color: TYPE_COLORS[type] ?? T.primary }}>
                                                ₹ {fmt(subtotal)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                );
            })}

            {/* ── Grand total footer (finance roles only) ── */}
            {!loading && rows.length > 0 && canViewValuation && (
                <>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="flex-end" pr={2} py={1.5}>
                        <Typography fontWeight={900} fontSize="1rem">
                            Grand Total:&nbsp;&nbsp;₹ {fmt(grandTotal)}
                        </Typography>
                    </Stack>
                </>
            )}

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default StockValuationReport;
