import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Chip, CircularProgress, Collapse, Divider, Drawer,
    IconButton, InputAdornment, Paper, Stack, Table, TableBody,
    TableCell, TableHead, TablePagination, TableRow, TextField,
    Typography,
} from '@mui/material';
import {
    Close, ExpandLess, ExpandMore, QrCode2, Tag,
} from '@mui/icons-material';
import { getBatchesForItem, getSerialsForBatch, getSerialsForItem } from '../../services/batchSerialService';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

const batchStatusColor  = (s) => ({ ACTIVE: 'success', EXPIRED: 'error',   DEPLETED: 'default' }[s] ?? 'default');
const serialStatusColor = (s) => ({ AVAILABLE: 'success', CONSUMED: 'default', RESERVED: 'warning' }[s] ?? 'default');

const BORDER  = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const HEADER_SX = { fontWeight: 700, fontSize: '0.68rem', color: '#475569', py: 1 };

/* ─── serial rows inside a batch (expand) ─────────────────────────────────── */
function BatchSerialRows({ batchId }) {
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSerialsForBatch(batchId)
            .then(d  => setSerials(d || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [batchId]);

    if (loading) return (
        <TableRow>
            <TableCell colSpan={5} sx={{ py: 2, textAlign: 'center' }}><CircularProgress size={16} /></TableCell>
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
            <TableCell sx={{ pl: 8, fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>{s.serialNumber}</TableCell>
            <TableCell><Chip label={s.status} size="small" color={serialStatusColor(s.status)} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} /></TableCell>
            <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(s.receivedDate)}</TableCell>
            <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{s.sourceDocNo || '—'}</TableCell>
            <TableCell sx={{ fontSize: '0.78rem', color: s.consumedByDocNo ? '#dc2626' : '#94a3b8' }}>{s.consumedByDocNo || '—'}</TableCell>
        </TableRow>
    ));
}

/* ─── batch table ─────────────────────────────────────────────────────────── */
function BatchTable({ itemId }) {
    const SIZE = 10;
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [page,  setPage]  = useState(0);
    const [total, setTotal] = useState(0);

    const load = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const res = await getBatchesForItem(itemId, { page: p, size: SIZE });
            setBatches(res.content || []);
            setTotal(res.totalElements || 0);
            setPage(p);
        } catch { setBatches([]); }
        finally { setLoading(false); }
    }, [itemId]);

    useEffect(() => { load(0); }, [load]);

    if (loading && !batches.length) return <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} /></Box>;
    if (!batches.length) return <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', py: 2 }}>No batch records found.</Typography>;

    return (
        <Box>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: '#e0f2fe' }}>
                        <TableCell sx={{ width: 32 }} />
                        {['Batch #', 'Supplier Lot', 'Mfg Date', 'Expiry', 'Orig Qty', 'Remaining', 'Status', 'Source GRN', 'Warehouse'].map(h => (
                            <TableCell key={h} sx={{ ...HEADER_SX, color: '#0369a1' }}>{h}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {batches.map(b => {
                        const isExpanded = expandedBatch === b.id;
                        const isExpiring = b.expiryDate && new Date(b.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        return (
                            <React.Fragment key={b.id}>
                                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedBatch(isExpanded ? null : b.id)}>
                                    <TableCell sx={{ py: 0.5 }}>
                                        <IconButton size="small">{isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>{b.batchNumber}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{b.supplierBatchNo || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(b.manufacturingDate)}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: isExpiring ? '#dc2626' : undefined, fontWeight: isExpiring ? 700 : 400 }}>
                                        {fmt(b.expiryDate)}
                                        {isExpiring && <Chip label="Expiring" size="small" color="error" sx={{ ml: 0.5, height: 14, fontSize: '0.55rem' }} />}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{b.originalQty}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 700, color: b.remainingQty === 0 ? '#94a3b8' : '#16a34a' }}>{b.remainingQty}</TableCell>
                                    <TableCell><Chip label={b.status} size="small" color={batchStatusColor(b.status)} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} /></TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0369a1' }}>{b.sourceDocNo || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{b.warehouse || '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                                        <Collapse in={isExpanded} unmountOnExit>
                                            <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: '#f0f9ff', borderBottom: `1px solid ${BORDER}` }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Serial Numbers in this batch
                                                </Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            {['Serial #', 'Status', 'Received', 'Source GRN', 'Consumed By'].map(h => (
                                                                <TableCell key={h} sx={{ ...HEADER_SX }}>{h}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody><BatchSerialRows batchId={b.id} /></TableBody>
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
                <TablePagination component="div" count={total} page={page} rowsPerPage={SIZE}
                    onPageChange={(_, p) => load(p)} rowsPerPageOptions={[SIZE]} />
            )}
        </Box>
    );
}

/* ─── serial-only table (non-batch-tracked items) ─────────────────────────── */
function SerialOnlyTable({ itemId }) {
    const SIZE = 10;
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page,  setPage]  = useState(0);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async (p = 0, q = search, s = statusFilter) => {
        setLoading(true);
        try {
            const res = await getSerialsForItem(itemId, { page: p, size: SIZE, search: q || undefined, status: s || undefined });
            setSerials(res.content || []);
            setTotal(res.totalElements || 0);
            setPage(p);
        } catch { setSerials([]); }
        finally { setLoading(false); }
    }, [itemId, search, statusFilter]);

    useEffect(() => { load(0); }, [load]);

    return (
        <Box>
            <Stack direction="row" spacing={1} mb={1}>
                <TextField size="small" placeholder="Search serial #…" value={search}
                    onChange={e => { setSearch(e.target.value); load(0, e.target.value, statusFilter); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><QrCode2 sx={{ fontSize: 16 }} /></InputAdornment> }}
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
                            <TableCell key={h} sx={{ ...HEADER_SX, color: '#1d4ed8' }}>{h}</TableCell>
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
                            <TableCell><Chip label={s.status} size="small" color={serialStatusColor(s.status)} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} /></TableCell>
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

/* ─── drawer ──────────────────────────────────────────────────────────────── */
const BatchSerialDrawer = ({ open, onClose, item }) => {
    if (!item) return null;

    const settings      = item?.productInventorySettings ?? {};
    const isBatch       = item.batchTracked  ?? settings.batchTracked  ?? false;
    const isSerial      = item.serialTracked ?? settings.serialTracked ?? false;
    const trackingLabel = isBatch ? 'Batch Tracked' : isSerial ? 'Serial Tracked' : 'Not Tracked';
    const trackingColor = isBatch ? 'warning' : isSerial ? 'info' : 'default';

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', md: '85vw', lg: '75vw' }, maxWidth: 1200 } }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* ── header ── */}
                <Box sx={{
                    px: 3, py: 2.5,
                    borderBottom: `1px solid ${BORDER}`,
                    bgcolor: '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 1, bgcolor: '#fef3c7', borderRadius: 2, display: 'flex' }}>
                            {isBatch
                                ? <Tag sx={{ color: '#d97706', fontSize: 22 }} />
                                : <QrCode2 sx={{ color: '#2563eb', fontSize: 22 }} />}
                        </Box>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    {item.itemCode}
                                </Typography>
                                <Chip label={trackingLabel} size="small" color={trackingColor}
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{item.name}</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose}><Close /></IconButton>
                </Box>

                {/* ── content ── */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
                    {!isBatch && !isSerial ? (
                        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
                            <Typography color="text.secondary" fontWeight={600}>
                                This item is not batch or serial tracked.
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Enable batch or serial tracking in the item settings to use this feature.
                            </Typography>
                        </Paper>
                    ) : isBatch ? (
                        <>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Batch Register — {item.itemCode}
                            </Typography>
                            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                <BatchTable itemId={item.inventoryItemId} />
                            </Paper>
                        </>
                    ) : (
                        <>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Serial Register — {item.itemCode}
                            </Typography>
                            <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                                <SerialOnlyTable itemId={item.inventoryItemId} />
                            </Paper>
                        </>
                    )}
                </Box>

            </Box>
        </Drawer>
    );
};

export default BatchSerialDrawer;
