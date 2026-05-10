import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, Grid, TablePagination, Chip,
    TextField, MenuItem, IconButton, Tooltip, CircularProgress, Stack,
    Card, CardContent, InputAdornment, Divider,
} from '@mui/material';
import {
    Add, Refresh, Visibility, Search, Event, Person,
    LocalAtm, ChevronRight, Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listPurchaseRequisitions } from '../../../services/purchaseRequisitionService';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';
const PRIMARY_LIGHT = '#f0f7ff';
const HEADER_TEXT = '#075985';

const STATUS_STYLE = {
    DRAFT:     { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
    CLOSED:    { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
    CANCELLED: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

const APPROVAL_STYLE = {
    DRAFT:            { bg: '#f4f6f8', color: '#5a6474' },
    PENDING_APPROVAL: { bg: '#fff7ed', color: '#c2410c' },
    APPROVED:         { bg: '#eef6f0', color: '#2a6640' },
    REJECTED:         { bg: '#fef2f2', color: '#991b1b' },
};

const PRIORITY_STYLE = {
    LOW:    { bg: '#f1f5f9', color: '#475569' },
    NORMAL: { bg: '#eff6ff', color: '#2563eb' },
    HIGH:   { bg: '#fff7ed', color: '#c2410c' },
    URGENT: { bg: '#fef2f2', color: '#dc2626' },
};

const StatCard = ({ title, value, accent, icon: Icon }) => (
    <Paper elevation={0} sx={{
        p: 2, border: `1px solid ${BORDER}`, borderRadius: 2.5,
        flex: 1, minWidth: 160, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderLeft: accent ? `4px solid ${accent}` : `4px solid ${PRIMARY}`,
    }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
                <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                    {value}
                </Typography>
            </Box>
            {Icon && (
                <Box sx={{ p: 1, borderRadius: 2, background: PRIMARY_LIGHT, color: PRIMARY }}>
                    <Icon sx={{ fontSize: 20 }} />
                </Box>
            )}
        </Stack>
    </Paper>
);

const PRCard = ({ row, onClick }) => {
    const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.DRAFT;
    const as = APPROVAL_STYLE[row.approvalStatus] ?? APPROVAL_STYLE.DRAFT;
    const ps = PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.NORMAL;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const fmtAmount = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

    return (
        <Card elevation={0} sx={{
            border: `1px solid ${BORDER}`, borderRadius: 2.5,
            transition: 'all 0.2s ease-in-out', cursor: 'pointer', height: '100%',
            '&:hover': { borderColor: PRIMARY, boxShadow: '0 8px 24px rgba(21, 101, 192, 0.08)' }
        }} onClick={onClick}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: HEADER_TEXT, mb: 0.2 }}>
                            {row.prNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Event sx={{ fontSize: 14 }} /> {fmtDate(row.requestDate)}
                        </Typography>
                    </Box>
                    <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                        <Chip label={row.approvalStatus?.replace(/_/g, ' ')} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1, height: 20,
                                background: as.bg, color: as.color }} />
                        <Chip label={row.priority} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1, height: 20,
                                background: ps.bg, color: ps.color }} />
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                <Stack spacing={1.2}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Person sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.requestedBy ?? '—'}{row.department ? ` · ${row.department}` : ''}
                        </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                        <Box>
                            <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                                Estimated
                            </Typography>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                {fmtAmount(row.totalEstimatedAmount)}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`${row.itemCount ?? 0} items`} size="small" variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }} />
                            <Chip label={row.status} size="small"
                                sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1, height: 20,
                                    background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }} />
                            <ChevronRight sx={{ color: '#cbd5e1' }} />
                        </Stack>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function PurchaseRequisitionList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(12);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterApproval, setFilterApproval] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page, size: pageSize, sort: 'createdDate,desc',
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
    }, [page, pageSize, filterStatus, filterApproval]);

    useEffect(() => { load(); }, [load]);

    const filteredRows = !searchTerm ? rows : rows.filter(r =>
        (r.prNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.requestedBy ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total,
        pending: rows.filter(r => r.approvalStatus === 'PENDING_APPROVAL').length,
        approved: rows.filter(r => r.approvalStatus === 'APPROVED').length,
        draft: rows.filter(r => r.approvalStatus === 'DRAFT').length,
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em', mb: 0.5 }}>
                        Purchase Requisitions
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.95rem' }}>
                        Capture purchase needs before raising vendor POs
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={load} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" disableElevation startIcon={<Add />}
                        sx={{ background: PRIMARY, borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 700,
                            '&:hover': { background: '#0d47a1' } }}
                        onClick={() => navigate('new')}>
                        New Requisition
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={2.5} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total" value={total} icon={Assignment} accent={PRIMARY} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Pending" value={stats.pending} accent="#e65100" icon={Visibility} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Approved" value={stats.approved} accent="#2e7d32" icon={LocalAtm} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Drafts" value={stats.draft} accent="#475569" />
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" placeholder="Search by PR# or Requester..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={6} md={2.5}>
                        <TextField select fullWidth size="small" label="Status" value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
                            <MenuItem value="">All</MenuItem>
                            {['DRAFT','CLOSED','CANCELLED'].map(s =>
                                <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2.5}>
                        <TextField select fullWidth size="small" label="Approval" value={filterApproval}
                            onChange={e => { setFilterApproval(e.target.value); setPage(0); }}>
                            <MenuItem value="">All</MenuItem>
                            {['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED'].map(s =>
                                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button fullWidth variant="outlined" sx={{ height: 40, textTransform: 'none', fontWeight: 600, borderColor: BORDER, color: '#475569' }}
                            onClick={() => { setFilterStatus(''); setFilterApproval(''); setSearchTerm(''); setPage(0); }}>
                            Reset Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                    <CircularProgress sx={{ color: PRIMARY }} />
                </Box>
            ) : filteredRows.length === 0 ? (
                <Paper elevation={0} sx={{ py: 12, border: `1px dashed ${BORDER}`, borderRadius: 3, bgcolor: 'white', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 700, mb: 1 }}>No requisitions yet</Typography>
                    <Typography sx={{ color: '#64748b' }}>Create one to get started</Typography>
                </Paper>
            ) : (
                <>
                    <Grid container spacing={3}>
                        {filteredRows.map(row => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={row.id}>
                                <PRCard row={row} onClick={() => navigate(`${row.id}`)} />
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                        <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden' }}>
                            <TablePagination
                                component="div"
                                count={total}
                                page={page}
                                onPageChange={(_, p) => setPage(p)}
                                rowsPerPage={pageSize}
                                onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value)); setPage(0); }}
                                rowsPerPageOptions={[12, 24, 48]}
                            />
                        </Paper>
                    </Box>
                </>
            )}
        </Box>
    );
}
