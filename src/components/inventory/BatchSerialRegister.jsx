import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Alert, Box, Chip, CircularProgress, Collapse, IconButton, InputAdornment,
    Paper, Stack, Table, TableBody, TableCell, TableHead, TablePagination,
    TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    ExpandLess, ExpandMore, QrCode, Search, Tag,
} from '@mui/icons-material';
import { getPresentInventory } from '../../services/inventoryService';
import { getBatchesForItem, getSerialsForBatch, getSerialsForItem } from '../../services/batchSerialService';

const BORDER = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const batchStatusColor = (s) => {
    switch (s) {
        case 'ACTIVE':   return 'success';
        case 'EXPIRED':  return 'error';
        case 'DEPLETED': return 'default';
        default:         return 'default';
    }
};

const serialStatusColor = (s) => {
    switch (s) {
        case 'AVAILABLE': return 'success';
        case 'CONSUMED':  return 'default';
        case 'RESERVED':  return 'warning';
        default:          return 'default';
    }
};

// ── Serial rows for a batch ───────────────────────────────────────────────────
function BatchSerialRows({ batchId }) {
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSerialsForBatch(batchId)
            .then(data => setSerials(data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [batchId]);

    if (loading) return (
        <TableRow>
            <TableCell colSpan={5} sx={{ py: 2, textAlign: 'center' }}>
                <CircularProgress size={16} />
            </TableCell>
        </TableRow>
    );

    if (!serials.length) return (
        <TableRow>
            <TableCell colSpan={5} sx={{ py: 1, pl: 6, fontSize: '0.75rem', color: '#94a3b8' }}>
                No serial numbers in this batch.
            </TableCell>
        </TableRow>
    );

    return serials.map(s => (
        <TableRow key={s.id} sx={{ bgcolor: '#f0f9ff' }}>
            <TableCell sx={{ pl: 8, fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>
                {s.serialNumber}
            </TableCell>
            <TableCell>
                <Chip label={s.status} size="small" color={serialStatusColor(s.status)}
                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
            </TableCell>
            <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(s.receivedDate)}</TableCell>
            <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{s.sourceDocNo || '—'}</TableCell>
            <TableCell sx={{ fontSize: '0.78rem', color: s.consumedByDocNo ? '#dc2626' : '#94a3b8' }}>
                {s.consumedByDocNo || '—'}
            </TableCell>
        </TableRow>
    ));
}

// ── Batch table for an item ───────────────────────────────────────────────────
function BatchTable({ itemId }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const SIZE = 10;

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const resp = await getBatchesForItem(itemId, { page: p, size: SIZE });
            setBatches(resp.content || []);
            setTotal(resp.totalElements || 0);
            setPage(p);
        } catch {
            setBatches([]);
        } finally {
            setLoading(false);
        }
    }, [itemId]);

    useEffect(() => { load(0); }, [load]);

    if (loading && !batches.length) return (
        <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={20} /></Box>
    );

    if (!batches.length) return (
        <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', py: 1 }}>No batch records found.</Typography>
    );

    return (
        <Box>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: '#e0f2fe' }}>
                        <TableCell sx={{ width: 32 }} />
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Batch #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Supplier Lot</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Mfg. Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Expiry</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }} align="right">Orig. Qty</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }} align="right">Remaining</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Source GRN</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#0369a1' }}>Warehouse</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {batches.map(b => {
                        const isExpanded = expandedBatch === b.id;
                        const isExpiring = b.expiryDate && new Date(b.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        return (
                            <React.Fragment key={b.id}>
                                <TableRow hover sx={{ cursor: 'pointer' }}
                                    onClick={() => setExpandedBatch(isExpanded ? null : b.id)}>
                                    <TableCell sx={{ py: 0.5 }}>
                                        <IconButton size="small">
                                            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>
                                        {b.batchNumber}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{b.supplierBatchNo || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(b.manufacturingDate)}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: isExpiring ? '#dc2626' : undefined, fontWeight: isExpiring ? 700 : 400 }}>
                                        {fmt(b.expiryDate)}
                                        {isExpiring && <Chip label="Expiring" size="small" color="error" sx={{ ml: 0.5, height: 14, fontSize: '0.55rem' }} />}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{b.originalQty}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 700, color: b.remainingQty === 0 ? '#94a3b8' : '#16a34a' }}>
                                        {b.remainingQty}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={b.status} size="small" color={batchStatusColor(b.status)}
                                            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0369a1' }}>
                                        {b.sourceDocNo || '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{b.warehouse || '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                                        <Collapse in={isExpanded} unmountOnExit>
                                            <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: '#f0f9ff', borderBottom: `1px solid ${BORDER}` }}>
                                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Serial Numbers in this batch
                                                </Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            {['Serial #', 'Status', 'Received', 'Source GRN', 'Consumed By'].map(h => (
                                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#475569', py: 0.5 }}>{h}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        <BatchSerialRows batchId={b.id} />
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
            {total > SIZE && (
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={SIZE}
                    onPageChange={(_, p) => load(p)}
                    rowsPerPageOptions={[SIZE]}
                />
            )}
        </Box>
    );
}

// ── Serial-only table for items not batch-tracked ─────────────────────────────
function SerialOnlyTable({ itemId }) {
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const SIZE = 10;

    const load = useCallback(async (p = 0, q = search, s = statusFilter) => {
        setLoading(true);
        try {
            const resp = await getSerialsForItem(itemId, {
                page: p, size: SIZE,
                search: q || undefined,
                status: s || undefined,
            });
            setSerials(resp.content || []);
            setTotal(resp.totalElements || 0);
            setPage(p);
        } catch {
            setSerials([]);
        } finally {
            setLoading(false);
        }
    }, [itemId, search, statusFilter]);

    useEffect(() => { load(0); }, [load]);

    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField size="small" placeholder="Search serial #…" value={search}
                    onChange={e => { setSearch(e.target.value); load(0, e.target.value, statusFilter); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                    sx={{ width: 200 }} />
                <TextField select size="small" value={statusFilter} label="Status" sx={{ width: 130 }}
                    onChange={e => { setStatusFilter(e.target.value); load(0, search, e.target.value); }}
                    SelectProps={{ native: true }}>
                    <option value="">All</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="CONSUMED">Consumed</option>
                    <option value="RESERVED">Reserved</option>
                </TextField>
            </Stack>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: '#eff6ff' }}>
                        {['Serial #', 'Status', 'Received', 'Source GRN', 'Warehouse', 'Consumed By'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#1d4ed8' }}>{h}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 2 }}><CircularProgress size={18} /></TableCell></TableRow>
                    ) : !serials.length ? (
                        <TableRow><TableCell colSpan={6} sx={{ py: 1, color: '#94a3b8', fontSize: '0.78rem' }}>No serial numbers found.</TableCell></TableRow>
                    ) : serials.map(s => (
                        <TableRow key={s.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#1d4ed8' }}>{s.serialNumber}</TableCell>
                            <TableCell>
                                <Chip label={s.status} size="small" color={serialStatusColor(s.status)}
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(s.receivedDate)}</TableCell>
                            <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0369a1' }}>{s.sourceDocNo || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{s.warehouse || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.78rem', color: s.consumedByDocNo ? '#dc2626' : '#94a3b8' }}>{s.consumedByDocNo || '—'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {total > SIZE && (
                <TablePagination component="div" count={total} page={page} rowsPerPage={SIZE}
                    onPageChange={(_, p) => load(p)} rowsPerPageOptions={[SIZE]} />
            )}
        </Box>
    );
}

// ── Expanded item row ─────────────────────────────────────────────────────────
function ItemTrackingRow({ item }) {
    const [expanded, setExpanded] = useState(false);

    // Infer tracking type from whether batches/serials exist
    // We show BatchTable by default; it will show "no records" if not batch-tracked
    const isBatchTracked = item.batchTracked;
    const isSerialTracked = item.serialTracked;
    const isTracked = isBatchTracked || isSerialTracked;

    return (
        <>
            <TableRow
                hover
                sx={{ cursor: isTracked ? 'pointer' : 'default', opacity: isTracked ? 1 : 0.5 }}
                onClick={() => isTracked && setExpanded(v => !v)}
            >
                <TableCell sx={{ width: 40, py: 1 }}>
                    {isTracked && (
                        <IconButton size="small">
                            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.itemCode}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{item.name}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem' }}>{item.uom}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>
                    {item.totalQuantity ?? '—'}
                </TableCell>
                <TableCell>
                    <Stack direction="row" spacing={0.5}>
                        {isBatchTracked && (
                            <Chip icon={<Tag sx={{ fontSize: '0.7rem !important' }} />}
                                label="Batch" size="small" color="warning"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                        )}
                        {isSerialTracked && (
                            <Chip icon={<QrCode sx={{ fontSize: '0.7rem !important' }} />}
                                label="Serial" size="small" color="info"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                        )}
                        {!isTracked && (
                            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>Not tracked</Typography>
                        )}
                    </Stack>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <Collapse in={expanded} unmountOnExit>
                        <Box sx={{ pl: 5, pr: 2, py: 2, bgcolor: BG_SOFT, borderBottom: `1px solid ${BORDER}` }}>
                            {isBatchTracked && (
                                <>
                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Batch Register — {item.itemCode}
                                    </Typography>
                                    <BatchTable itemId={item.inventoryItemId} />
                                </>
                            )}
                            {isSerialTracked && !isBatchTracked && (
                                <>
                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Serial Register — {item.itemCode}
                                    </Typography>
                                    <SerialOnlyTable itemId={item.inventoryItemId} />
                                </>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function BatchSerialRegister({ refreshKey }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const debounceRef = useRef();
    const SIZE = 20;

    const load = useCallback(async (p = 0, q = search) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await getPresentInventory({ page: p, size: SIZE, itemCode: q, itemName: q });
            setItems(resp.content || []);
            setTotal(resp.totalElements || 0);
            setPage(p);
        } catch {
            setError('Failed to load inventory items.');
        } finally {
            setLoading(false);
        }
    }, [search, refreshKey]);

    useEffect(() => { load(0); }, [load]);

    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => load(0, val), 400);
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Batch & Serial Register
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Track every batch and serial number across all received stock
                    </Typography>
                </Box>
                <TextField size="small" placeholder="Search item code or name…" value={search}
                    onChange={e => handleSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                    sx={{ width: 260 }} />
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: BG_SOFT }}>
                            <TableCell sx={{ width: 40 }} />
                            {['Item Code', 'Item Name', 'UOM', 'Stock Qty', 'Tracking'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', py: 1 }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : !items.length ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                                    <Typography variant="body2">No items found.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : items.map(item => (
                            <ItemTrackingRow key={item.inventoryItemId} item={item} />
                        ))}
                    </TableBody>
                </Table>
                {total > SIZE && (
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={SIZE}
                        onPageChange={(_, p) => load(p)}
                        rowsPerPageOptions={[SIZE]}
                    />
                )}
            </Paper>
        </Box>
    );
}
