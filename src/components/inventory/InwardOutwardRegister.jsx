import React, { useState, useCallback, useEffect } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Divider,
    FormControl, InputLabel, MenuItem, Paper, Select,
    Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TextField,
    ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
    ArrowDownward, ArrowUpward, Download, Search as SearchIcon,
    SwapHoriz, SwapVert,
} from '@mui/icons-material';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getRegister } from '../../services/grnService';

/* ─── design tokens ──────────────────────────────────────────────────────────── */
const T = {
    primary:  '#2563eb',
    success:  '#059669',
    error:    '#dc2626',
    warning:  '#d97706',
    bg:       '#f8fafc',
    border:   '#e2e8f0',
    text:     '#0f172a',
    textSec:  '#64748b',
};

/* ─── transaction metadata (mirrors StockLedgerDrawer TX_META) ───────────────── */
const TX_META = {
    GRN:             { label: 'GRN Receipt',     dir: 'in'      },
    PRODUCE:         { label: 'WO Produced',      dir: 'in'      },
    RETURN:          { label: 'Stock Return',      dir: 'in'      },
    CONSUME:         { label: 'WO Consumed',       dir: 'out'     },
    RESERVE:         { label: 'Reserved',          dir: 'out'     },
    ISSUE:           { label: 'Shop Floor Issue',  dir: 'neutral' },
    ADJUSTMENT:      { label: 'Adjustment',        dir: 'signed'  },
    OPENING_STOCK:   { label: 'Opening Stock',     dir: 'in'      },
    SALES_DISPATCH:  { label: 'Sales Dispatch',    dir: 'out'     },
    JWO_ISSUE:       { label: 'JWO Issued',        dir: 'neutral' },
    JWO_RECEIPT:     { label: 'JWO Received',      dir: 'in'      },
    PURCHASE_RETURN: { label: 'Purchase Return',   dir: 'out'     },
    SALES_RETURN:    { label: 'Sales Return',      dir: 'in'      },
};

const txLabel = (type) => TX_META[type]?.label ?? type;

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
    bgcolor: T.bg,
    color: T.textSec,
    fontWeight: 700,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    py: 1.5,
    borderBottom: `2px solid ${T.border}`,
};

/* ─── component ─────────────────────────────────────────────────────────────── */
const InwardOutwardRegister = ({ refreshKey }) => {
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];

    const [fromDate,   setFromDate]   = useState(firstOfMonth);
    const [toDate,     setToDate]     = useState(today);
    const [typeFilter, setTypeFilter] = useState(''); // '' = All, 'INWARD', 'OUTWARD'

    const [rows,     setRows]     = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(0);     // 0-based for TablePagination
    const [pageSize, setPageSize] = useState(50);
    const [fetching, setFetching] = useState(false);
    const [error,    setError]    = useState('');
    const [searched, setSearched] = useState(false);

    /* ── totals (derived from current page — reset on new search) ── */
    const totalInward  = rows.filter(r => resolveDir(r) === 'in').reduce((s, r) => s + Math.abs(Number(r.quantity)), 0);
    const totalOutward = rows.filter(r => resolveDir(r) === 'out').reduce((s, r) => s + Math.abs(Number(r.quantity)), 0);
    const totalValue   = rows.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);

    /* ── fetch ── */
    const fetchPage = useCallback(async (
        pageNum  = 0,
        from     = fromDate,
        to       = toDate,
        type     = typeFilter,
        size     = pageSize,
    ) => {
        if (!from || !to) { setError('Both From and To dates are required.'); return; }
        if (from > to)    { setError('"From" date cannot be after "To" date.'); return; }

        setFetching(true);
        setError('');
        try {
            const params = { from, to, page: pageNum, size };
            if (type) params.type = type;

            const data = await getRegister(params);
            setRows(data?.content ?? []);
            setTotal(data?.totalElements ?? 0);
            setSearched(true);
        } catch (e) {
            setError('Failed to load register. Please try again.');
            console.error(e);
        } finally {
            setFetching(false);
        }
    }, [fromDate, toDate, typeFilter, pageSize]);

    /* ── auto-load on mount AND whenever refreshKey changes (e.g. after stock movements) ── */
    useEffect(() => {
        fetchPage(0, firstOfMonth, today, '', 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const handleSearch = () => {
        setPage(0);
        fetchPage(0);
    };

    const handlePageChange = (_, newPage) => {
        setPage(newPage);
        fetchPage(newPage);
    };

    const handleRowsPerPageChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setPage(0);
        fetchPage(0, fromDate, toDate, typeFilter, newSize);
    };

    /* ── Excel export (current page) ── */
    const exportExcel = () => {
        if (!rows.length) return;
        const sheetRows = rows.map((r) => {
            const dir = resolveDir(r);
            const qty = Math.abs(Number(r.quantity));
            const item = r.inventoryItem;
            return {
                Date:             r.movementDate ? format(new Date(r.movementDate), 'dd-MM-yyyy') : '',
                'Item Code':      item?.itemCode ?? '',
                'Item Name':      item?.name     ?? '',
                UOM:              item?.uom       ?? '',
                'Transaction':    txLabel(r.transactionType),
                'Ref Type':       r.referenceType  ?? '',
                'Reference No':   r.referenceDocNo ?? '',
                Warehouse:        r.warehouse       ?? '',
                Inward:           dir === 'in'  ? qty : '',
                Outward:          dir === 'out' ? qty : '',
                'Rate (₹)':       r.rate   ?? '',
                'Value (₹)':      r.amount ?? '',
                'Closing Bal':    r.closingBalance ?? '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inward Outward Register');
        const label = typeFilter ? typeFilter.charAt(0) + typeFilter.slice(1).toLowerCase() : 'All';
        XLSX.writeFile(wb, `InwardOutward_${label}_${fromDate}_to_${toDate}.xlsx`);
    };


    /* ── render ── */
    return (
        <Box>
            {/* ── filter bar ── */}
            <Paper
                elevation={0}
                sx={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 2,
                    p: 2,
                    mb: 2,
                    bgcolor: '#fff',
                }}
            >
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    flexWrap="wrap"
                >
                    {/* date range */}
                    <TextField
                        label="From"
                        type="date"
                        size="small"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                        label="To"
                        type="date"
                        size="small"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* inward / outward toggle */}
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={typeFilter}
                        onChange={(_, v) => setTypeFilter(v ?? '')}
                        sx={{
                            '& .MuiToggleButton-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                px: 2,
                                borderRadius: '8px !important',
                                border: `1px solid ${T.border} !important`,
                                color: T.textSec,
                                '&.Mui-selected': {
                                    fontWeight: 700,
                                },
                            },
                        }}
                    >
                        <ToggleButton value="">All</ToggleButton>
                        <ToggleButton
                            value="INWARD"
                            sx={{ '&.Mui-selected': { bgcolor: '#dcfce7 !important', color: '#15803d !important' } }}
                        >
                            <ArrowUpward sx={{ fontSize: 14, mr: 0.5 }} /> Inward
                        </ToggleButton>
                        <ToggleButton
                            value="OUTWARD"
                            sx={{ '&.Mui-selected': { bgcolor: '#fee2e2 !important', color: '#b91c1c !important' } }}
                        >
                            <ArrowDownward sx={{ fontSize: 14, mr: 0.5 }} /> Outward
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={fetching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                        onClick={handleSearch}
                        disabled={fetching}
                        sx={{
                            textTransform: 'none', fontWeight: 800,
                            borderRadius: 2.5, px: 3,
                            bgcolor: T.primary,
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        {fetching ? 'Loading…' : 'Refresh'}
                    </Button>

                    {rows.length > 0 && (
                        <Tooltip title="Export current page to Excel">
                            <Button
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={exportExcel}
                                sx={{
                                    textTransform: 'none', fontWeight: 600,
                                    borderRadius: 2, borderColor: T.border, color: T.textSec,
                                    '&:hover': { borderColor: '#94a3b8' },
                                }}
                            >
                                Export Excel
                            </Button>
                        </Tooltip>
                    )}
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
            </Paper>

            {/* ── summary cards ── */}
            {searched && rows.length > 0 && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
                    {[
                        { label: 'Total Inward (page)', value: num(totalInward),  color: '#15803d', bg: '#dcfce7', icon: <ArrowUpward sx={{ fontSize: 16 }} /> },
                        { label: 'Total Outward (page)', value: num(totalOutward), color: '#b91c1c', bg: '#fee2e2', icon: <ArrowDownward sx={{ fontSize: 16 }} /> },
                        { label: 'Total Value (page)',   value: money(totalValue), color: T.primary,  bg: '#eff6ff', icon: <SwapVert sx={{ fontSize: 16 }} /> },
                        { label: 'Total Records',        value: total.toLocaleString('en-IN'), color: T.textSec, bg: T.bg },
                    ].map(({ label, value, color, bg, icon }) => (
                        <Paper
                            key={label}
                            elevation={0}
                            sx={{
                                flex: 1, px: 2.5, py: 1.75,
                                border: `1px solid ${T.border}`,
                                borderRadius: 2,
                                bgcolor: bg,
                            }}
                        >
                            <Typography variant="caption" color={T.textSec} fontWeight={700}
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {icon}{label}
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color={color} mt={0.25}>
                                {value}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            )}

            {/* ── table ── */}
            {fetching && rows.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                    <CircularProgress />
                </Box>
            ) : searched && rows.length === 0 ? (
                <Paper elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: 2, p: 6, textAlign: 'center' }}>
                    <SwapVert sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                    <Typography color="text.secondary" fontWeight={600}>No transactions found for the selected criteria.</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Try widening the date range or changing the filter.
                    </Typography>
                </Paper>
            ) : !searched ? (
                <Paper elevation={0} sx={{ border: `1px solid ${T.border}`, borderRadius: 2, p: 8, textAlign: 'center' }}>
                    <SwapVert sx={{ fontSize: 64, color: '#e2e8f0', mb: 1.5 }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={600}>Loading register…</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Shows all inward and outward stock movements — GRN receipts, WO consumption, sales dispatches and more.
                    </Typography>
                </Paper>
            ) : (
                <>
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{ border: `1px solid ${T.border}`, borderRadius: 2 }}
                    >
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={HEADER_SX}>Date</TableCell>
                                    <TableCell sx={HEADER_SX}>Item</TableCell>
                                    <TableCell sx={HEADER_SX}>Transaction</TableCell>
                                    <TableCell sx={HEADER_SX}>Reference</TableCell>
                                    <TableCell sx={HEADER_SX}>Warehouse</TableCell>
                                    <TableCell align="right" sx={{ ...HEADER_SX, color: '#15803d' }}>Inward</TableCell>
                                    <TableCell align="right" sx={{ ...HEADER_SX, color: '#b91c1c' }}>Outward</TableCell>
                                    <TableCell align="right" sx={HEADER_SX}>Rate</TableCell>
                                    <TableCell align="right" sx={HEADER_SX}>Value</TableCell>
                                    <TableCell align="right" sx={HEADER_SX}>Closing Bal</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {rows.map((r, idx) => {
                                    const dir    = resolveDir(r);
                                    const colors = chipColors(r.transactionType);
                                    const qty    = Math.abs(Number(r.quantity));
                                    const item   = r.inventoryItem;

                                    return (
                                        <TableRow
                                            key={r.id ?? idx}
                                            hover
                                            sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}
                                        >
                                            {/* Date */}
                                            <TableCell sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {r.movementDate ? format(new Date(r.movementDate), 'dd MMM yyyy') : '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Item */}
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Typography variant="body2" fontWeight={700} color={T.text}>
                                                    {item?.itemCode ?? '—'}
                                                </Typography>
                                                <Typography variant="caption" color={T.textSec}>
                                                    {item?.name ?? ''}
                                                </Typography>
                                            </TableCell>

                                            {/* Transaction type chip */}
                                            <TableCell>
                                                <Chip
                                                    label={txLabel(r.transactionType)}
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

                                            {/* Reference */}
                                            <TableCell sx={{ minWidth: 140 }}>
                                                <Typography variant="caption" color={T.textSec}>
                                                    {r.referenceType ?? ''}
                                                </Typography>
                                                {r.referenceDocNo && (
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {r.referenceDocNo}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Warehouse */}
                                            <TableCell>
                                                <Typography variant="body2" color={T.textSec}>
                                                    {r.warehouse || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Inward */}
                                            <TableCell align="right">
                                                {dir === 'in' ? (
                                                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                        <ArrowUpward sx={{ fontSize: 13, color: '#15803d' }} />
                                                        <Typography variant="body2" fontWeight={700} color="#15803d">
                                                            {num(qty)}
                                                        </Typography>
                                                    </Box>
                                                ) : dir === 'neutral' ? (
                                                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                        <SwapHoriz sx={{ fontSize: 13, color: '#0369a1' }} />
                                                        <Typography variant="caption" color="#0369a1" fontWeight={600}>
                                                            transfer
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" color="#94a3b8">—</Typography>
                                                )}
                                            </TableCell>

                                            {/* Outward */}
                                            <TableCell align="right">
                                                {dir === 'out' ? (
                                                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                        <ArrowDownward sx={{ fontSize: 13, color: '#b91c1c' }} />
                                                        <Typography variant="body2" fontWeight={700} color="#b91c1c">
                                                            {num(qty)}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" color="#94a3b8">—</Typography>
                                                )}
                                            </TableCell>

                                            {/* Rate */}
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {r.rate ? money(r.rate) : '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Value */}
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    {r.amount ? money(r.amount) : '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Closing Balance */}
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={700} color={T.primary}>
                                                    {num(r.closingBalance)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* ── pagination — always visible when data is loaded ── */}
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={handlePageChange}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        rowsPerPageOptions={[25, 50, 100]}
                        sx={{
                            borderTop: `1px solid ${T.border}`,
                            '& .MuiTablePagination-toolbar': { minHeight: 48 },
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontSize: '0.8rem', color: T.textSec,
                            },
                        }}
                    />
                </>
            )}
        </Box>
    );
};

export default InwardOutwardRegister;
