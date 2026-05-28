import React, { useState, useEffect } from 'react';
import {
    Box, Button, Chip, CircularProgress, Drawer, Divider,
    IconButton, Snackbar, Alert, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Typography,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    ShoppingCart as PRIcon,
    Warning as WarnIcon,
} from '@mui/icons-material';
import { searchInventoryItems }         from '../../services/inventoryService';
import { createPurchaseRequisition }   from '../../services/purchaseRequisitionService';
import { useAuth }                     from '../../auth/AuthContext';

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

/**
 * LowStockList — right-side Drawer showing items below their reorder level.
 * Each row has a "Create PR" button that fires POST /api/purchase-requisitions.
 *
 * Props:
 *   open    {boolean}
 *   onClose {() => void}
 */
const LowStockList = ({ open, onClose }) => {
    const { user } = useAuth();
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating,setCreating]= useState({});   // itemId → bool
    const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success', prNumber: null });

    // ── Load low-stock items whenever drawer opens ─────────────────────────
    useEffect(() => {
        if (!open) return;
        (async () => {
            setLoading(true);
            try {
                // /search with query='' returns all items with full entity (productInventorySettings included)
                const res = await searchInventoryItems({ query: '', page: 0, size: 500 });
                const list = res?.content ?? [];
                const lowStock = (Array.isArray(list) ? list : []).filter(item => {
                    const settings = item?.productInventorySettings;
                    if (!settings) return false;
                    return settings.availableQuantity < settings.reorderLevel && settings.reorderLevel > 0;
                });
                setItems(lowStock);
            } catch {
                setSnack({ open: true, msg: 'Failed to load low-stock items', sev: 'error' });
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    const shortage    = (item) => Math.max((item.productInventorySettings?.reorderLevel ?? 0) - (item.productInventorySettings?.availableQuantity ?? 0), 0);
    const suggestedQty = (item) => Math.max((item.productInventorySettings?.maxStock ?? 0) - (item.productInventorySettings?.availableQuantity ?? 0), shortage(item));

    const handleCreatePR = async (item) => {
        setCreating(prev => ({ ...prev, [item.inventoryItemId]: true }));
        try {
            const qty = suggestedQty(item) || shortage(item) || 1;
            const res = await createPurchaseRequisition({
                requestDate:    new Date().toISOString(),
                requiredByDate: null,
                requestedBy:    user?.username ?? user?.name ?? 'system',
                department:     null,
                priority:       'MEDIUM',
                source:         'MANUAL',
                items: [{
                    itemId:          item.inventoryItemId,
                    lineNumber:      1,
                    description:     item.name,
                    quantity:        qty,
                    notes:           `Auto from low-stock alert — current: ${item.productInventorySettings?.availableQuantity ?? 0}, reorder: ${item.productInventorySettings?.reorderLevel ?? 0}`,
                }],
                notes: 'Auto-generated from Low Stock alert',
            });
            const prNo = res?.data?.prNumber ?? res?.data?.requisitionNumber ?? 'PR created';
            setSnack({ open: true, msg: `PR ${prNo} created for ${item.itemCode}`, sev: 'success', prNumber: prNo });
        } catch (e) {
            setSnack({ open: true, msg: e?.response?.data?.message ?? 'Failed to create PR', sev: 'error' });
        } finally {
            setCreating(prev => ({ ...prev, [item.inventoryItemId]: false }));
        }
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{ sx: { width: { xs: '100%', sm: 700 }, bgcolor: T.bg } }}
            >
                {/* ── Header ── */}
                <Box
                    sx={{
                        bgcolor: '#0f172a',
                        backgroundImage: 'radial-gradient(ellipse at 60% 50%, #1e3a5f 0%, #0f172a 70%)',
                        px: 3, py: 2.5,
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <WarnIcon sx={{ color: '#fbbf24', fontSize: 22 }} />
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#fff" lineHeight={1.2}>
                                    Low Stock Alerts
                                </Typography>
                                <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                    Items below reorder level — create PR to replenish
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Box>

                {/* ── Summary chip ── */}
                {!loading && items.length > 0 && (
                    <Box px={3} py={1.5}>
                        <Chip
                            label={`${items.length} item${items.length !== 1 ? 's' : ''} below reorder level`}
                            size="small"
                            icon={<WarnIcon />}
                            sx={{ bgcolor: '#fef3c7', color: T.warning, fontWeight: 700, borderColor: '#fde68a', border: '1px solid' }}
                        />
                    </Box>
                )}

                <Divider />

                {/* ── Content ── */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {loading ? (
                        <Box textAlign="center" py={8}><CircularProgress /></Box>
                    ) : items.length === 0 ? (
                        <Box textAlign="center" py={8}>
                            <Typography color={T.success} fontWeight={700} mb={0.5}>✓ All items above reorder level</Typography>
                            <Typography variant="body2" color={T.textSec}>No replenishment needed right now.</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Box}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Item', 'Current Stock', 'Reorder Level', 'Shortage', 'Suggested Qty', ''].map(h => (
                                            <TableCell key={h} sx={HEADER_SX}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map(item => {
                                        const s = item.productInventorySettings ?? {};
                                        const short = shortage(item);
                                        const sugQty = suggestedQty(item);
                                        return (
                                            <TableRow key={item.inventoryItemId} hover
                                                sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700}>{item.itemCode}</Typography>
                                                    <Typography variant="caption" color={T.textSec}
                                                        sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                                                        {item.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color={T.error}>
                                                        {(s.availableQuantity ?? 0).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="caption" color={T.textSec}>{item.uom}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                                    {(s.reorderLevel ?? 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={short.toFixed(2)}
                                                        sx={{ bgcolor: '#fee2e2', color: T.error, fontWeight: 700, fontSize: '0.75rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {sugQty.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="Create Purchase Requisition">
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={creating[item.inventoryItemId]
                                                                ? <CircularProgress size={12} />
                                                                : <PRIcon sx={{ fontSize: 14 }} />}
                                                            onClick={() => handleCreatePR(item)}
                                                            disabled={!!creating[item.inventoryItemId]}
                                                            sx={{
                                                                textTransform: 'none', fontWeight: 700,
                                                                fontSize: '0.72rem', borderRadius: 2,
                                                                borderColor: T.primary, color: T.primary,
                                                                '&:hover': { bgcolor: '#eff6ff' },
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            Create PR
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Drawer>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </>
    );
};

export default LowStockList;
