import React, { useState, useCallback, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Drawer, IconButton, InputAdornment,
    Paper, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography, Chip, Autocomplete, Alert,
} from '@mui/material';
import {
    Close, Download, Search as SearchIcon, ReceiptLong,
    ArrowUpward, ArrowDownward, SwapHoriz,
} from '@mui/icons-material';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { searchInventoryItems } from '../../services/inventoryService';
import { getStockHistory, getOpeningBalance } from '../../services/grnService';

/* ─── transaction metadata ────────────────────────────────────────────────── */

/**
 * dir values:
 *   'in'      → positive quantity, show in Inward column
 *   'out'     → negative quantity (stored as negative in ledger), show abs in Outward column
 *   'neutral' → ISSUE (qty=0, physical transfer only, no balance change)
 *   'signed'  → ADJUSTMENT (can be + or -)
 */
const TX_META = {
    GRN:            { label: 'GRN Receipt',      dir: 'in'      },
    PRODUCE:        { label: 'WO Produced',      dir: 'in'      }, // WO finished goods + manual receive
    RETURN:         { label: 'Stock Return',      dir: 'in'      },
    CONSUME:        { label: 'WO Consumed',       dir: 'out'     },
    RESERVE:        { label: 'Reserved',          dir: 'out'     },
    ISSUE:          { label: 'Shop Floor Issue',  dir: 'neutral' },
    ADJUSTMENT:     { label: 'Adjustment',        dir: 'signed'  },
    OPENING_STOCK:  { label: 'Opening Stock',     dir: 'in'      },
    SALES_DISPATCH: { label: 'Sales Dispatch',    dir: 'out'     }, // Delivery Note dispatch
    JWO_ISSUE:      { label: 'JWO Issued',        dir: 'neutral' }, // Sprint 3
    JWO_RECEIPT:    { label: 'JWO Received',      dir: 'in'      }, // Sprint 3
    PURCHASE_RETURN:{ label: 'Purchase Return',   dir: 'out'     }, // Sprint 3
    SALES_RETURN:   { label: 'Sales Return',      dir: 'in'      }, // Sprint 4
};

const txLabel = (type) => TX_META[type]?.label ?? type;

/**
 * Resolve display direction from the SIGNED quantity stored in the ledger.
 * ISSUE entries always have qty=0 so they become 'neutral'.
 */
const resolveDir = (entry) => {
    const meta = TX_META[entry.transactionType];
    if (meta?.dir === 'neutral') return 'neutral';
    const qty = Number(entry.quantity ?? 0);
    if (qty > 0) return 'in';
    if (qty < 0) return 'out';
    return 'neutral';
};

const chipColors = (type) => {
    const dir = TX_META[type]?.dir;
    if (dir === 'in')      return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
    if (dir === 'out')     return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
    if (dir === 'neutral') return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
    return { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' }; // ADJUSTMENT / unknown
};

const num = (v, dec = 2) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const money = (v) => `₹${num(v)}`;

const HEADER_SX = {
    bgcolor: '#f8fafc',
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    py: 1.5,
    borderBottom: '2px solid #e5e7eb',
};

/* ─── component ───────────────────────────────────────────────────────────── */

const StockLedgerDrawer = ({ open, onClose, initialItem = null }) => {
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];

    const [selectedItem, setSelectedItem] = useState(null);
    const [itemOptions, setItemOptions]   = useState([]);
    const [itemLoading, setItemLoading]   = useState(false);

    const [fromDate, setFromDate] = useState(firstOfMonth);
    const [toDate,   setToDate]   = useState(today);

    const [entries,        setEntries]        = useState([]);
    const [openingBalance, setOpeningBalance] = useState(null); // null = not yet fetched
    const [fetching,       setFetching]       = useState(false);
    const [error,          setError]          = useState('');
    const [searched,       setSearched]       = useState(false);

    /* ── Auto-populate + fetch when opened with a pre-selected item ── */
    useEffect(() => {
        if (!open || !initialItem) return;
        setSelectedItem(initialItem);
        setItemOptions([initialItem]);
        setSearched(false);
        setEntries([]);
        setOpeningBalance(null);
        setError('');
        // Auto-fetch ledger for the item
        (async () => {
            setFetching(true);
            try {
                const itemId = initialItem.inventoryItemId;
                const [raw, opening] = await Promise.all([
                    getStockHistory(itemId, { from: firstOfMonth, to: today }),
                    getOpeningBalance(itemId, firstOfMonth),
                ]);
                setEntries([...(raw || [])].reverse());
                setOpeningBalance(typeof opening === 'number' ? opening : 0);
                setSearched(true);
            } catch {
                setError('Failed to load ledger. Please try again.');
            } finally {
                setFetching(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialItem]);

    /* ── item search ── */
    const searchItems = useCallback(async (query) => {
        if (!query || query.length < 2) return;
        setItemLoading(true);
        try {
            const res = await searchInventoryItems({ query, page: 0, size: 20 });
            setItemOptions(res?.content || []);
        } finally {
            setItemLoading(false);
        }
    }, []);

    /* ── fetch ledger + opening balance ── */
    const fetchLedger = async () => {
        if (!selectedItem) { setError('Select an item first.'); return; }
        if (!fromDate || !toDate) { setError('Both From and To dates are required.'); return; }

        setFetching(true);
        setError('');
        try {
            const itemId = selectedItem.inventoryItemId;

            const [raw, opening] = await Promise.all([
                getStockHistory(itemId, { from: fromDate, to: toDate }),
                getOpeningBalance(itemId, fromDate),
            ]);

            // backend returns newest-first; reverse for chronological (oldest-first) display
            setEntries([...(raw || [])].reverse());
            setOpeningBalance(typeof opening === 'number' ? opening : 0);
            setSearched(true);
        } catch (e) {
            setError('Failed to load ledger. Please try again.');
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    /* ── export to Excel ── */
    const exportExcel = () => {
        if (!entries.length) return;
        const rows = [];

        // Opening balance row
        if (openingBalance !== null) {
            rows.push({
                Date:           fromDate,
                Type:           'Opening Balance',
                'Ref Type':     '',
                'Reference No': '',
                Warehouse:      '',
                Inward:         '',
                Outward:        '',
                'Closing Bal':  openingBalance,
                'Rate (₹)':     '',
                'Value (₹)':    '',
            });
        }

        entries.forEach((e) => {
            const dir = resolveDir(e);
            const qty = Math.abs(Number(e.quantity));
            rows.push({
                Date:           format(new Date(e.movementDate), 'dd-MM-yyyy'),
                Type:           txLabel(e.transactionType),
                'Ref Type':     e.referenceType  || '',
                'Reference No': e.referenceDocNo || '',
                Warehouse:      e.warehouse      || '',
                Inward:         dir === 'in'  ? qty : '',
                Outward:        dir === 'out' ? qty : '',
                'Closing Bal':  e.closingBalance,
                'Rate (₹)':     e.rate   || '',
                'Value (₹)':    e.amount || '',
            });
        });

        // Closing balance row
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
            rows.push({
                Date:           toDate,
                Type:           'Closing Balance',
                'Ref Type':     '',
                'Reference No': '',
                Warehouse:      '',
                Inward:         '',
                Outward:        '',
                'Closing Bal':  lastEntry.closingBalance,
                'Rate (₹)':     '',
                'Value (₹)':    '',
            });
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Ledger');
        XLSX.writeFile(wb, `Stock_Ledger_${selectedItem.itemCode}_${fromDate}_to_${toDate}.xlsx`);
    };

    /* ── derived totals ── */
    const totalInward  = entries.filter(e => resolveDir(e) === 'in' ).reduce((s, e) => s + Math.abs(Number(e.quantity)), 0);
    const totalOutward = entries.filter(e => resolveDir(e) === 'out').reduce((s, e) => s + Math.abs(Number(e.quantity)), 0);
    const closingBal   = entries.length ? entries[entries.length - 1].closingBalance : null;

    const handleClose = () => {
        setSelectedItem(null);
        setItemOptions([]);
        setEntries([]);
        setOpeningBalance(null);
        setError('');
        setSearched(false);
        onClose();
    };

    /* ── render ── */
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={handleClose}
            PaperProps={{ sx: { width: { xs: '100%', md: '80vw', lg: '70vw' }, maxWidth: 1100 } }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* ── header ── */}
                <Box sx={{
                    px: 3, py: 2.5,
                    borderBottom: '1px solid #e5e7eb',
                    bgcolor: '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: 2, display: 'flex' }}>
                            <ReceiptLong sx={{ color: '#2563eb', fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#0f172a">Stock Ledger</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Item-wise transaction history with opening / closing balances
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleClose}><Close /></IconButton>
                </Box>

                {/* ── filter bar ── */}
                <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">

                        <Autocomplete
                            sx={{ minWidth: 300 }}
                            options={itemOptions}
                            getOptionLabel={(o) => `[${o.itemCode}] ${o.name}`}
                            loading={itemLoading}
                            value={selectedItem}
                            onInputChange={(_, val) => searchItems(val)}
                            onChange={(_, val) => {
                                setSelectedItem(val);
                                setSearched(false);
                                setEntries([]);
                                setOpeningBalance(null);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Search item…"
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <>
                                                {itemLoading ? <CircularProgress size={16} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                            )}
                            renderOption={(props, o) => (
                                <Box component="li" {...props}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{o.itemCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{o.name}</Typography>
                                    </Box>
                                </Box>
                            )}
                        />

                        <TextField
                            label="From"
                            type="date"
                            size="small"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                        />
                        <TextField
                            label="To"
                            type="date"
                            size="small"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                        />

                        <Button
                            variant="contained"
                            disableElevation
                            onClick={fetchLedger}
                            disabled={fetching || !selectedItem}
                            sx={{
                                textTransform: 'none', fontWeight: 800,
                                borderRadius: 2.5, px: 3,
                                bgcolor: '#2563eb',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {fetching ? <CircularProgress size={20} color="inherit" /> : 'View Ledger'}
                        </Button>

                        {entries.length > 0 && (
                            <Button
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={exportExcel}
                                sx={{
                                    textTransform: 'none', fontWeight: 600,
                                    borderRadius: 2, borderColor: '#e2e8f0', color: '#475569',
                                }}
                            >
                                Export Excel
                            </Button>
                        )}
                    </Stack>

                    {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
                </Box>

                {/* ── summary bar ── */}
                {searched && (
                    <Box sx={{ px: 3, py: 1.5, bgcolor: '#f0f9ff', borderBottom: '1px solid #e0f2fe' }}>
                        <Stack direction="row" spacing={4} flexWrap="wrap">
                            {openingBalance !== null && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Opening Balance
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#0369a1">
                                        {num(openingBalance)} {selectedItem?.uom}
                                    </Typography>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}
                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Total Inward
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#15803d">
                                    {num(totalInward)} {selectedItem?.uom}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}
                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Total Outward
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#b91c1c">
                                    {num(totalOutward)} {selectedItem?.uom}
                                </Typography>
                            </Box>
                            {closingBal !== null && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Closing Balance
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#2563eb">
                                        {num(closingBal)} {selectedItem?.uom}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                )}

                {/* ── table ── */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
                    {fetching ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                            <CircularProgress />
                        </Box>

                    ) : searched && entries.length === 0 ? (
                        <Box display="flex" flexDirection="column" alignItems="center"
                            justifyContent="center" height={200} gap={1}>
                            <ReceiptLong sx={{ fontSize: 48, color: '#cbd5e1' }} />
                            <Typography color="text.secondary">
                                No transactions found for the selected period.
                            </Typography>
                        </Box>

                    ) : entries.length > 0 ? (
                        <TableContainer component={Paper} elevation={0}
                            sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={HEADER_SX}>Date</TableCell>
                                        <TableCell sx={HEADER_SX}>Transaction Type</TableCell>
                                        <TableCell sx={HEADER_SX}>Reference</TableCell>
                                        <TableCell sx={HEADER_SX}>Warehouse</TableCell>
                                        <TableCell align="right" sx={{ ...HEADER_SX, color: '#15803d' }}>Inward</TableCell>
                                        <TableCell align="right" sx={{ ...HEADER_SX, color: '#b91c1c' }}>Outward</TableCell>
                                        <TableCell align="right" sx={HEADER_SX}>Closing Bal</TableCell>
                                        <TableCell align="right" sx={HEADER_SX}>Rate</TableCell>
                                        <TableCell align="right" sx={HEADER_SX}>Value</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {/* Opening Balance row */}
                                    {openingBalance !== null && (
                                        <TableRow sx={{ bgcolor: '#eff6ff' }}>
                                            <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={600} color="#0369a1">
                                                    {format(new Date(fromDate), 'dd MMM yyyy')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2" fontWeight={700} color="#0369a1"
                                                    sx={{ fontStyle: 'italic' }}>
                                                    Opening Balance as on {format(new Date(fromDate), 'dd MMM yyyy')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell />
                                            <TableCell />
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={800} color="#0369a1">
                                                    {num(openingBalance)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell />
                                            <TableCell />
                                        </TableRow>
                                    )}

                                    {/* Transaction rows */}
                                    {entries.map((e, idx) => {
                                        const dir    = resolveDir(e);
                                        const colors = chipColors(e.transactionType);
                                        const qty    = Math.abs(Number(e.quantity));

                                        return (
                                            <TableRow
                                                key={e.id ?? idx}
                                                hover
                                                sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}
                                            >
                                                <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {e.movementDate
                                                            ? format(new Date(e.movementDate), 'dd MMM yyyy')
                                                            : '—'}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Chip
                                                        label={txLabel(e.transactionType)}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: colors.bg,
                                                            color:   colors.color,
                                                            border:  `1px solid ${colors.border}`,
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            height: 22,
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {e.referenceType || ''}
                                                    </Typography>
                                                    {e.referenceDocNo && (
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {e.referenceDocNo}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {e.warehouse || '—'}
                                                    </Typography>
                                                </TableCell>

                                                {/* Inward */}
                                                <TableCell align="right">
                                                    {dir === 'in' ? (
                                                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                            <ArrowUpward sx={{ fontSize: 14, color: '#15803d' }} />
                                                            <Typography variant="body2" fontWeight={700} color="#15803d">
                                                                {num(qty)}
                                                            </Typography>
                                                        </Box>
                                                    ) : dir === 'neutral' ? (
                                                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                            <SwapHoriz sx={{ fontSize: 14, color: '#0369a1' }} />
                                                            <Typography variant="caption" color="#0369a1" fontWeight={600}>
                                                                transfer
                                                            </Typography>
                                                        </Box>
                                                    ) : '—'}
                                                </TableCell>

                                                {/* Outward */}
                                                <TableCell align="right">
                                                    {dir === 'out' ? (
                                                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                            <ArrowDownward sx={{ fontSize: 14, color: '#b91c1c' }} />
                                                            <Typography variant="body2" fontWeight={700} color="#b91c1c">
                                                                {num(qty)}
                                                            </Typography>
                                                        </Box>
                                                    ) : '—'}
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={700} color="#2563eb">
                                                        {num(e.closingBalance)}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {e.rate ? money(e.rate) : '—'}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {e.amount ? money(e.amount) : '—'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {/* Closing Balance row */}
                                    {closingBal !== null && (
                                        <TableRow sx={{ bgcolor: '#f0fdf4' }}>
                                            <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={600} color="#15803d">
                                                    {format(new Date(toDate), 'dd MMM yyyy')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2" fontWeight={700} color="#15803d"
                                                    sx={{ fontStyle: 'italic' }}>
                                                    Closing Balance as on {format(new Date(toDate), 'dd MMM yyyy')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell />
                                            <TableCell />
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={800} color="#15803d">
                                                    {num(closingBal)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell />
                                            <TableCell />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    ) : !searched ? (
                        <Box display="flex" flexDirection="column" alignItems="center"
                            justifyContent="center" height={300} gap={2}>
                            <ReceiptLong sx={{ fontSize: 64, color: '#e2e8f0' }} />
                            <Box textAlign="center">
                                <Typography variant="h6" color="text.secondary" fontWeight={600}>
                                    Select an item and date range
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Stock ledger shows every inward and outward movement with running balance
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}
                </Box>

            </Box>
        </Drawer>
    );
};

export default StockLedgerDrawer;
