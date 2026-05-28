import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Chip, CircularProgress, InputAdornment, Paper,
    Snackbar, Alert, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography, Tooltip,
} from '@mui/material';
import {
    CheckCircleOutline as OkIcon,
    ErrorOutline as ErrIcon,
    SaveAlt as SubmitIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { searchInventoryItems } from '../../services/inventoryService';
import { submitStockCount }     from '../../services/inventoryService';
import { useAuth }              from '../../auth/AuthContext';

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

/** Returns chip colour based on variance sign */
const varianceChip = (delta) => {
    if (Math.abs(delta) < 0.0001) return { label: '0', color: 'default' };
    if (delta > 0) return { label: `+${delta.toFixed(2)}`, color: 'success' };
    return { label: delta.toFixed(2), color: 'error' };
};

const StockCountPage = () => {
    const { user } = useAuth();
    const [items,     setItems]     = useState([]);
    const [physQty,   setPhysQty]   = useState({});   // itemId → string
    const [search,    setSearch]    = useState('');
    const [loading,   setLoading]   = useState(false);
    const [submitting,setSubmitting]= useState(false);
    const [result,    setResult]    = useState(null);   // last submit response
    const [snack,     setSnack]     = useState({ open: false, msg: '', sev: 'success' });

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            // /search returns full InventoryItem entity (with productInventorySettings)
            // query='' matches all items; non-empty query filters by name/code/HSN
            const res = await searchInventoryItems({ query: search.trim(), page: 0, size: 500 });
            // apiService unwraps axios response.data, so res is the Page object directly
            const list = res?.content ?? [];
            setItems(Array.isArray(list) ? list : []);
        } catch {
            setSnack({ open: true, msg: 'Failed to load items', sev: 'error' });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { loadItems(); }, []);   // load on mount; user can refresh

    const handlePhysChange = (id, val) => {
        setPhysQty(prev => ({ ...prev, [id]: val }));
    };

    const systemQty = (item) =>
        item?.productInventorySettings?.availableQuantity ?? 0;

    const variance = (item) => {
        const phys = parseFloat(physQty[item.inventoryItemId] ?? '');
        if (isNaN(phys)) return null;
        return phys - systemQty(item);
    };

    const handleSubmit = async () => {
        const lines = items
            .filter(item => physQty[item.inventoryItemId] !== undefined &&
                            physQty[item.inventoryItemId] !== '')
            .map(item => ({
                inventoryItemId: item.inventoryItemId,
                physicalQty:     parseFloat(physQty[item.inventoryItemId]),
                remarks:         '',
            }))
            .filter(l => !isNaN(l.physicalQty));

        if (!lines.length) {
            setSnack({ open: true, msg: 'Enter at least one physical quantity', sev: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitStockCount({
                lines,
                countedBy: user?.username ?? user?.name ?? 'system',
                remarks:   'Physical stock count via UI',
            });
            // apiService unwraps response.data, so res is the body directly
            setResult(res);
            setPhysQty({});
            setSnack({
                open: true,
                msg:  `Count ${res.countId} saved — ${res.adjusted} item(s) adjusted`,
                sev:  'success',
            });
        } catch (e) {
            setSnack({ open: true, msg: e?.response?.data?.message ?? 'Submit failed', sev: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const entriesWithQty = Object.values(physQty).filter(v => v !== '').length;

    return (
        <Box>
            {/* ── Toolbar ── */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" mb={2.5} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder="Search item code / name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadItems()}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: T.textSec }} /></InputAdornment> }}
                    sx={{ width: 260, bgcolor: '#fff', borderRadius: 1 }}
                />
                <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={loadItems}
                    sx={{ textTransform: 'none', borderRadius: 2 }}>
                    Reload Items
                </Button>

                <Box flex={1} />

                <Tooltip title={!entriesWithQty ? 'Enter at least one physical qty' : ''}>
                    <span>
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SubmitIcon />}
                            onClick={handleSubmit}
                            disabled={submitting || !entriesWithQty}
                            sx={{
                                textTransform: 'none', fontWeight: 800, borderRadius: 2.5,
                                bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            Submit Count {entriesWithQty ? `(${entriesWithQty})` : ''}
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

            {/* ── Last count summary ── */}
            {result && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, borderColor: T.success }}>
                    <Stack direction="row" spacing={3} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={700} color={T.success}>
                            ✓ Count {result.countId} saved on {result.countDate}
                        </Typography>
                        <Typography variant="body2" color={T.textSec}>
                            {result.totalLines} lines  ·  <b>{result.adjusted}</b> adjusted  ·  {result.noChange} no-change
                            {result.errors > 0 && <span style={{ color: T.error }}> · {result.errors} errors</span>}
                        </Typography>
                    </Stack>
                </Paper>
            )}

            {/* ── Table ── */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {['Item Code', 'Item Name', 'UOM', 'System Qty', 'Physical Qty', 'Variance'].map(h => (
                                <TableCell key={h} sx={HEADER_SX}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={32} />
                                </TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5, color: T.textSec }}>
                                    No items found. Try refreshing or changing your search.
                                </TableCell>
                            </TableRow>
                        ) : items.map(item => {
                            const sysQ = systemQty(item);
                            const diff = variance(item);
                            const chip = diff !== null ? varianceChip(diff) : null;
                            return (
                                <TableRow key={item.inventoryItemId} hover
                                    sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                        {item.itemCode}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.name}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', color: T.textSec }}>
                                        {item.uom}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                        {sysQ.toFixed(2)}
                                    </TableCell>
                                    <TableCell sx={{ width: 130 }}>
                                        <TextField
                                            size="small"
                                            type="number"
                                            inputProps={{ min: 0, step: 'any', style: { textAlign: 'right', fontSize: '0.85rem' } }}
                                            value={physQty[item.inventoryItemId] ?? ''}
                                            onChange={e => handlePhysChange(item.inventoryItemId, e.target.value)}
                                            placeholder={sysQ.toFixed(2)}
                                            sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {chip ? (
                                            <Chip
                                                size="small"
                                                label={chip.label}
                                                color={chip.color}
                                                icon={chip.color === 'error' ? <ErrIcon /> : chip.color === 'success' ? <OkIcon /> : undefined}
                                                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                            />
                                        ) : (
                                            <Typography variant="caption" color={T.textSec}>—</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default StockCountPage;
