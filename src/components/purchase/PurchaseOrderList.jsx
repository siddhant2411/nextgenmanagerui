import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, TablePagination, Chip, Stack,
    TextField, MenuItem, IconButton, Tooltip, CircularProgress, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
} from '@mui/material';
import {
    Add, FileDownload, Refresh, Search, BarChart, Warning, Receipt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listPurchaseOrders, downloadPOPdf } from '../../services/purchaseOrderService';
import { useViewState } from '../../commonTools/useViewState';
import {
    T, STATUS, TABLE, chipSx, heroButtonSx, heroCtaSx, panelSx,
    fmtAmount, fmtDate, fmtNum, humanize,
} from '../../theme/moduleTokens';
import ModuleHero from '../ui/moduleshell/ModuleHero';
import ModuleBody from '../ui/moduleshell/ModuleBody';
import { StatTile, StatStrip } from '../ui/moduleshell/StatTile';

/* ============================================================================
   Purchase order register.

   This was a grid of cards, four to a row. A card per order reads well at ten
   orders and stops working entirely at two hundred: you cannot scan a column of
   amounts that never line up, cannot compare two vendors without holding one in
   your head, and cannot sort at all. Every other register in the product is a
   table, so this one is too — same masthead, same slate ground, same header
   treatment as the enquiry register.
   ========================================================================= */

/** Lifecycle. Mapped onto the shared severity palette rather than a local set of blues. */
const STATUS_STYLE = {
    DRAFT:              { color: T.ink2,          bg: T.ruleSoft },
    SENT:               { color: T.accent,        bg: T.accentDim },
    PARTIALLY_RECEIVED: { color: STATUS.warningInk, bg: STATUS.warningBg },
    RECEIVED:           { color: STATUS.good,     bg: STATUS.goodBg },
    COMPLETED:          { color: STATUS.good,     bg: STATUS.goodBg },
    CANCELLED:          { color: STATUS.critical, bg: STATUS.criticalBg },
};

/** Approval is a separate axis from lifecycle — an order can be SENT and still be REJECTED. */
const APPROVAL_STYLE = {
    DRAFT:            { color: T.ink2,           bg: T.ruleSoft },
    PENDING_APPROVAL: { color: STATUS.serious,   bg: STATUS.seriousBg },
    APPROVED:         { color: STATUS.good,      bg: STATUS.goodBg },
    REJECTED:         { color: STATUS.critical,  bg: STATUS.criticalBg },
};

const STATUSES  = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
const APPROVALS = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

/* Route namespace for preserved filters/page — see commonTools/useViewState.
   Clearing "/purchase" from the nav also clears the sections beneath it. */
const VIEW_STATE_NS = '/purchase';

/** Sortable column head. Only entity columns are offered — vendor is a join and would 500. */
const SortTh = ({ column, label, sortBy, sortDir, onSort, align = 'left', width }) => (
    <TableCell align={align} sortDirection={sortBy === column ? sortDir : false} sx={{ ...TABLE.head, width }}>
        <TableSortLabel
            active={sortBy === column}
            direction={sortBy === column ? sortDir : 'asc'}
            onClick={() => onSort(column)}
            sx={{
                '&.Mui-active': { color: T.ink },
                '& .MuiTableSortLabel-icon': { fontSize: 16 },
            }}
        >
            {label}
        </TableSortLabel>
    </TableCell>
);

/** Keeps a remembered page size valid against the current options rather than discarding it. */
const pageSizeOptions = (current) =>
    [...new Set([25, 50, 100, current])].sort((a, b) => a - b);

const Th = ({ label, align = 'left', width }) => (
    <TableCell align={align} sx={{ ...TABLE.head, width }}>{label}</TableCell>
);

export default function PurchaseOrderList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useViewState(VIEW_STATE_NS, 'page', 0);
    const [pageSize, setPageSize] = useViewState(VIEW_STATE_NS, 'pageSize', 25);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useViewState(VIEW_STATE_NS, 'status', '');
    const [filterApproval, setFilterApproval] = useViewState(VIEW_STATE_NS, 'approval', '');
    const [searchTerm, setSearchTerm] = useViewState(VIEW_STATE_NS, 'search', '');
    const [sortBy, setSortBy] = useViewState(VIEW_STATE_NS, 'sortBy', 'createdDate');
    const [sortDir, setSortDir] = useViewState(VIEW_STATE_NS, 'sortDir', 'desc');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: pageSize,
                sort: `${sortBy},${sortDir}`,
                ...(filterStatus ? { status: filterStatus } : {}),
                ...(filterApproval ? { approvalStatus: filterApproval } : {}),
                ...(searchTerm ? { query: searchTerm } : {}),
            };
            const data = await listPurchaseOrders(params);
            setRows(data.content ?? []);
            setTotal(data.totalElements ?? 0);
        } catch {
            // errors handled by interceptor
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortDir, filterStatus, filterApproval, searchTerm]);

    useEffect(() => { load(); }, [load]);

    const handleSort = (column) => {
        const nextDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(nextDir);
        setPage(0);
    };

    const resetFilters = () => {
        setFilterStatus('');
        setFilterApproval('');
        setSearchTerm('');
        setPage(0);
    };

    /* These three count the rows on screen, not the book. The list endpoint is paginated and
       returns no aggregates, so the honest thing is to say which they are rather than let a
       page-local 4 read as "4 orders await approval in the company". */
    const onPage = {
        pending:  rows.filter(r => r.approvalStatus === 'PENDING_APPROVAL').length,
        approved: rows.filter(r => r.approvalStatus === 'APPROVED').length,
        overdue:  rows.filter(r => r.daysOverdue > 0).length,
    };
    const pageHint = loading ? 'loading' : `of ${fmtNum(rows.length)} on this page`;

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Purchase Orders"
                subtitle="Raise, approve and track orders to vendors through to receipt."
                actions={
                    <>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={heroButtonSx}>
                            Refresh
                        </Button>
                        <Button variant="outlined" startIcon={<Warning />} onClick={() => navigate('overdue')} sx={heroButtonSx}>
                            Overdue
                        </Button>
                        <Button variant="outlined" startIcon={<BarChart />} onClick={() => navigate('analytics')} sx={heroButtonSx}>
                            Analytics
                        </Button>
                        <Button variant="contained" disableElevation startIcon={<Add />} onClick={() => navigate('new')} sx={heroCtaSx}>
                            New Purchase Order
                        </Button>
                    </>
                }
            />

            <ModuleBody>
                <StatStrip>
                    <StatTile label="Total orders" value={fmtNum(total)} hint="matching the current filter" loading={loading} />
                    <StatTile
                        label="Awaiting approval" value={fmtNum(onPage.pending)} hint={pageHint}
                        severity={onPage.pending > 0 ? STATUS.serious : STATUS.good} loading={loading}
                    />
                    <StatTile label="Approved" value={fmtNum(onPage.approved)} hint={pageHint} loading={loading} />
                    <StatTile
                        label="Past due" value={fmtNum(onPage.overdue)} hint={pageHint}
                        severity={onPage.overdue > 0 ? STATUS.critical : STATUS.good} loading={loading}
                    />
                </StatStrip>

                <Paper elevation={0} sx={panelSx}>
                    {/* ── filters ── */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}
                        sx={{ mb: 3 }}
                    >
                        <TextField
                            size="small" placeholder="Search by PO number or vendor..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                            sx={{ flex: '1 1 280px' }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ color: T.ink3 }} /></InputAdornment>,
                                sx: { borderRadius: 2.5, bgcolor: T.ground, fontSize: '0.875rem' },
                            }}
                        />
                        <TextField
                            select size="small" label="Status" value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                            sx={{ minWidth: 180 }} InputProps={{ sx: { borderRadius: 2.5, fontSize: '0.875rem' } }}
                        >
                            <MenuItem value="">All statuses</MenuItem>
                            {STATUSES.map(s => <MenuItem key={s} value={s}>{humanize(s)}</MenuItem>)}
                        </TextField>
                        <TextField
                            select size="small" label="Approval" value={filterApproval}
                            onChange={e => { setFilterApproval(e.target.value); setPage(0); }}
                            sx={{ minWidth: 180 }} InputProps={{ sx: { borderRadius: 2.5, fontSize: '0.875rem' } }}
                        >
                            <MenuItem value="">All approvals</MenuItem>
                            {APPROVALS.map(s => <MenuItem key={s} value={s}>{humanize(s)}</MenuItem>)}
                        </TextField>
                        <Button
                            variant="text" onClick={resetFilters}
                            disabled={!filterStatus && !filterApproval && !searchTerm}
                            sx={{ textTransform: 'none', fontWeight: 700, color: T.ink2, borderRadius: 2.5, whiteSpace: 'nowrap' }}
                        >
                            Reset
                        </Button>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 900, color: T.ink, fontSize: '1.05rem' }}>
                            Purchase Order Registry
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.ink2, fontWeight: 700 }}>
                            {loading ? 'Loading...' : `${fmtNum(total)} order${total === 1 ? '' : 's'}`}
                        </Typography>
                    </Stack>

                    {/* ── table ── */}
                    <TableContainer component={Box} sx={{ ...TABLE.container, overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1080 }}>
                            <TableHead>
                                <TableRow>
                                    <SortTh column="purchaseOrderNumber" label="PO Number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <Th label="Vendor" />
                                    <SortTh column="orderDate" label="Ordered" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh column="expectedDeliveryDate" label="Expected" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <Th label="Items" align="right" width={72} />
                                    <SortTh column="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" />
                                    <SortTh column="approvalStatus" label="Approval" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" />
                                    <SortTh column="grandTotal" label="Total" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                                    <Th label="Actions" align="center" width={104} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10, borderBottom: 0 }}>
                                            <CircularProgress size={40} thickness={4} sx={{ color: T.accent }} />
                                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.ink2 }}>
                                                Fetching purchase orders...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10, borderBottom: 0 }}>
                                            <Typography sx={{ fontWeight: 800, color: T.ink, mb: 0.5 }}>No purchase orders found</Typography>
                                            <Typography sx={{ color: T.ink2, fontSize: '0.875rem' }}>
                                                Try adjusting the filters, or raise a new order.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map(row => {
                                    const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.DRAFT;
                                    const as = APPROVAL_STYLE[row.approvalStatus] ?? APPROVAL_STYLE.DRAFT;
                                    const late = row.daysOverdue > 0;

                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            onClick={() => navigate(`${row.id}`)}
                                            sx={{
                                                ...TABLE.row,
                                                // A late order is the one fact worth seeing without reading the row.
                                                ...(late && { borderLeft: `3px solid ${STATUS.critical}` }),
                                            }}
                                        >
                                            <TableCell sx={TABLE.cell}>
                                                <Typography sx={{ fontWeight: 800, color: T.accent, fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                                                    {row.purchaseOrderNumber}
                                                </Typography>
                                                {row.reference && (
                                                    <Typography sx={{ color: T.ink3, fontSize: '0.72rem', mt: 0.2 }}>
                                                        {row.reference}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.cell, maxWidth: 260 }}>
                                                <Typography sx={{
                                                    fontWeight: 600, color: T.ink, fontSize: '0.8125rem',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {row.vendorName ?? '\u2014'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>{fmtDate(row.orderDate)}</TableCell>

                                            <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>
                                                <Typography sx={{
                                                    fontSize: '0.8125rem',
                                                    color: late ? STATUS.critical : '#334155',
                                                    fontWeight: late ? 700 : 500,
                                                }}>
                                                    {fmtDate(row.expectedDeliveryDate)}
                                                </Typography>
                                                {late && (
                                                    <Typography sx={{ fontSize: '0.7rem', color: STATUS.critical, fontWeight: 700 }}>
                                                        {row.daysOverdue}d late
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            <TableCell sx={TABLE.num}>{fmtNum(row.itemCount)}</TableCell>

                                            <TableCell align="center">
                                                <Chip label={humanize(row.status)} size="small" sx={chipSx(ss.color, ss.bg)} />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip label={humanize(row.approvalStatus)} size="small" sx={chipSx(as.color, as.bg)} />
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.num, fontWeight: 700 }}>{fmtAmount(row.grandTotal)}</TableCell>

                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title="Vendor invoices">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`${row.id}/invoices`); }}
                                                        sx={{ color: T.ink3, '&:hover': { color: T.accent, bgcolor: T.accentDim } }}
                                                    >
                                                        <Receipt sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Download PDF">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); downloadPOPdf(row.id); }}
                                                        sx={{ color: T.ink3, '&:hover': { color: T.accent, bgcolor: T.accentDim } }}
                                                    >
                                                        <FileDownload sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={pageSizeOptions(pageSize)}
                        sx={{ mt: 1, '& .MuiTablePagination-toolbar': { px: 0 }, color: T.ink2 }}
                    />
                </Paper>
            </ModuleBody>
        </Box>
    );
}
