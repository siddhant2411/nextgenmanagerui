import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, TablePagination, Chip, Stack,
    TextField, MenuItem, CircularProgress, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
} from '@mui/material';
import { Add, Refresh, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listPurchaseRequisitions } from '../../../services/purchaseRequisitionService';
import { useViewState } from '../../../commonTools/useViewState';
import {
    T, STATUS, TABLE, chipSx, heroButtonSx, heroCtaSx, panelSx,
    fmtAmount, fmtDate, fmtNum, humanize,
} from '../../../theme/moduleTokens';
import ModuleHero from '../../ui/moduleshell/ModuleHero';
import ModuleBody from '../../ui/moduleshell/ModuleBody';
import { StatTile, StatStrip } from '../../ui/moduleshell/StatTile';

/* ============================================================================
   Purchase requisition register — the same table treatment as the PO register
   it feeds, so moving between the two is not a change of language.
   ========================================================================= */

const STATUS_STYLE = {
    DRAFT:     { color: T.ink2,          bg: T.ruleSoft },
    CLOSED:    { color: STATUS.good,     bg: STATUS.goodBg },
    CANCELLED: { color: STATUS.critical, bg: STATUS.criticalBg },
};

const APPROVAL_STYLE = {
    DRAFT:            { color: T.ink2,         bg: T.ruleSoft },
    PENDING_APPROVAL: { color: STATUS.serious, bg: STATUS.seriousBg },
    APPROVED:         { color: STATUS.good,    bg: STATUS.goodBg },
    REJECTED:         { color: STATUS.critical, bg: STATUS.criticalBg },
};

/** Priority is ordinal, so it gets an ordinal ramp rather than four unrelated hues. */
const PRIORITY_STYLE = {
    LOW:    { color: T.ink2,          bg: T.ruleSoft },
    NORMAL: { color: T.accent,        bg: T.accentDim },
    HIGH:   { color: STATUS.serious,  bg: STATUS.seriousBg },
    URGENT: { color: STATUS.critical, bg: STATUS.criticalBg },
};

const STATUSES  = ['DRAFT', 'CLOSED', 'CANCELLED'];
const APPROVALS = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

const VIEW_STATE_NS = '/purchase/requisitions';

const SortTh = ({ column, label, sortBy, sortDir, onSort, align = 'left', width }) => (
    <TableCell align={align} sortDirection={sortBy === column ? sortDir : false} sx={{ ...TABLE.head, width }}>
        <TableSortLabel
            active={sortBy === column}
            direction={sortBy === column ? sortDir : 'asc'}
            onClick={() => onSort(column)}
            sx={{ '&.Mui-active': { color: T.ink }, '& .MuiTableSortLabel-icon': { fontSize: 16 } }}
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

export default function PurchaseRequisitionList() {
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
                page, size: pageSize, sort: `${sortBy},${sortDir}`,
                ...(filterStatus ? { status: filterStatus } : {}),
                ...(filterApproval ? { approvalStatus: filterApproval } : {}),
            };
            const data = await listPurchaseRequisitions(params);
            setRows(data.content ?? []);
            setTotal(data.totalElements ?? 0);
        } catch {
            // handled by interceptor
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortDir, filterStatus, filterApproval]);

    useEffect(() => { load(); }, [load]);

    const handleSort = (column) => {
        const nextDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(nextDir);
        setPage(0);
    };

    /* The list endpoint takes status, approvalStatus and source — there is no text search on the
       server, so this box filters the rows already on screen and says so. Status and approval do
       go to the server, which is why they reset the page and this does not. */
    const term = searchTerm.trim().toLowerCase();
    const visibleRows = !term ? rows : rows.filter(r =>
        (r.prNumber ?? '').toLowerCase().includes(term) ||
        (r.requestedBy ?? '').toLowerCase().includes(term) ||
        (r.department ?? '').toLowerCase().includes(term)
    );

    const onPage = {
        pending: rows.filter(r => r.approvalStatus === 'PENDING_APPROVAL').length,
        urgent:  rows.filter(r => r.priority === 'URGENT' || r.priority === 'HIGH').length,
    };
    const pageHint = loading ? 'loading' : `of ${fmtNum(rows.length)} on this page`;

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Purchase Requisitions"
                subtitle="Capture what the floor needs, approve it, and turn it into vendor orders."
                onBack={() => navigate('/purchase')}
                backLabel="Back to purchase orders"
                actions={
                    <>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={heroButtonSx}>
                            Refresh
                        </Button>
                        <Button variant="contained" disableElevation startIcon={<Add />} onClick={() => navigate('new')} sx={heroCtaSx}>
                            New Requisition
                        </Button>
                    </>
                }
            />

            <ModuleBody>
                <StatStrip>
                    <StatTile label="Total requisitions" value={fmtNum(total)} hint="matching the current filter" loading={loading} />
                    <StatTile
                        label="Awaiting approval" value={fmtNum(onPage.pending)} hint={pageHint}
                        severity={onPage.pending > 0 ? STATUS.serious : STATUS.good} loading={loading}
                    />
                    <StatTile
                        label="High or urgent" value={fmtNum(onPage.urgent)} hint={pageHint}
                        severity={onPage.urgent > 0 ? STATUS.warning : STATUS.good} loading={loading}
                    />
                </StatStrip>

                <Paper elevation={0} sx={panelSx}>
                    <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
                        <TextField
                            size="small" placeholder="Filter this page by PR number, requester or department..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            sx={{ flex: '1 1 300px' }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ color: T.ink3 }} /></InputAdornment>,
                                sx: { borderRadius: 2.5, bgcolor: T.ground, fontSize: '0.875rem' },
                            }}
                        />
                        <TextField
                            select size="small" label="Status" value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                            sx={{ minWidth: 170 }} InputProps={{ sx: { borderRadius: 2.5, fontSize: '0.875rem' } }}
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
                            variant="text"
                            onClick={() => { setFilterStatus(''); setFilterApproval(''); setSearchTerm(''); setPage(0); }}
                            disabled={!filterStatus && !filterApproval && !searchTerm}
                            sx={{ textTransform: 'none', fontWeight: 700, color: T.ink2, borderRadius: 2.5, whiteSpace: 'nowrap' }}
                        >
                            Reset
                        </Button>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 900, color: T.ink, fontSize: '1.05rem' }}>
                            Requisition Registry
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.ink2, fontWeight: 700 }}>
                            {loading ? 'Loading...'
                                : term ? `${fmtNum(visibleRows.length)} of ${fmtNum(rows.length)} on this page`
                                : `${fmtNum(total)} requisition${total === 1 ? '' : 's'}`}
                        </Typography>
                    </Stack>

                    <TableContainer component={Box} sx={{ ...TABLE.container, overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 980 }}>
                            <TableHead>
                                <TableRow>
                                    <SortTh column="prNumber" label="PR Number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <Th label="Requested by" />
                                    <SortTh column="requestDate" label="Raised" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh column="requiredByDate" label="Required by" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh column="priority" label="Priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" />
                                    <Th label="Items" align="right" width={72} />
                                    <SortTh column="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" />
                                    <SortTh column="approvalStatus" label="Approval" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" />
                                    <SortTh column="totalEstimatedAmount" label="Estimated" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10, borderBottom: 0 }}>
                                            <CircularProgress size={40} thickness={4} sx={{ color: T.accent }} />
                                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.ink2 }}>
                                                Fetching requisitions...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : visibleRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10, borderBottom: 0 }}>
                                            <Typography sx={{ fontWeight: 800, color: T.ink, mb: 0.5 }}>
                                                {term ? 'Nothing on this page matches' : 'No requisitions yet'}
                                            </Typography>
                                            <Typography sx={{ color: T.ink2, fontSize: '0.875rem' }}>
                                                {term ? 'The filter only searches the rows currently loaded.' : 'Raise one to get started.'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : visibleRows.map(row => {
                                    const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.DRAFT;
                                    const as = APPROVAL_STYLE[row.approvalStatus] ?? APPROVAL_STYLE.DRAFT;
                                    const ps = PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.NORMAL;
                                    // Wanted by a date that has passed, and not yet closed out.
                                    const late = row.requiredByDate
                                        && new Date(row.requiredByDate) < new Date()
                                        && !['CLOSED', 'CANCELLED'].includes(row.status);

                                    return (
                                        <TableRow
                                            key={row.id} hover
                                            onClick={() => navigate(`${row.id}`)}
                                            sx={{ ...TABLE.row, ...(late && { borderLeft: `3px solid ${STATUS.critical}` }) }}
                                        >
                                            <TableCell sx={TABLE.cell}>
                                                <Typography sx={{ fontWeight: 800, color: T.accent, fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                                                    {row.prNumber}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.cell, maxWidth: 240 }}>
                                                <Typography sx={{
                                                    fontWeight: 600, color: T.ink, fontSize: '0.8125rem',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {row.requestedBy ?? '\u2014'}
                                                </Typography>
                                                {row.department && (
                                                    <Typography sx={{ color: T.ink3, fontSize: '0.72rem' }}>{row.department}</Typography>
                                                )}
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>{fmtDate(row.requestDate)}</TableCell>

                                            <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>
                                                <Typography sx={{
                                                    fontSize: '0.8125rem',
                                                    color: late ? STATUS.critical : '#334155',
                                                    fontWeight: late ? 700 : 500,
                                                }}>
                                                    {fmtDate(row.requiredByDate)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip label={humanize(row.priority)} size="small" sx={chipSx(ps.color, ps.bg)} />
                                            </TableCell>

                                            <TableCell sx={TABLE.num}>{fmtNum(row.itemCount)}</TableCell>

                                            <TableCell align="center">
                                                <Chip label={humanize(row.status)} size="small" sx={chipSx(ss.color, ss.bg)} />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip label={humanize(row.approvalStatus)} size="small" sx={chipSx(as.color, as.bg)} />
                                            </TableCell>

                                            <TableCell sx={{ ...TABLE.num, fontWeight: 700 }}>{fmtAmount(row.totalEstimatedAmount)}</TableCell>
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
