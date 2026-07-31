import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, Grid, TablePagination, Chip,
    TextField, MenuItem, IconButton, Tooltip, CircularProgress, Stack,
    Card, CardContent, InputAdornment, Divider,
} from '@mui/material';
import {
    Add, FileDownload, Refresh, Visibility, Search,
    FilterList, Event, Storefront, LocalAtm, ChevronRight,
    BarChart, Warning, Receipt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listPurchaseOrders, downloadPOPdf } from '../../services/purchaseOrderService';
import { useViewState } from '../../commonTools/useViewState';

// ── Design tokens (Aligned with Inventory/BOM) ────────────────────────────────
const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0'; // Platform standard blue
const PRIMARY_LIGHT = '#f0f7ff'; // Platform header background
const HEADER_TEXT = '#075985'; // Platform header text

const STATUS_STYLE = {
    DRAFT:              { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
    SENT:               { bg: '#eaf0f9', color: '#1c4f87', border: '#bad0ec' },
    PARTIALLY_RECEIVED: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    RECEIVED:           { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    COMPLETED:          { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
    CANCELLED:          { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

const APPROVAL_STYLE = {
    DRAFT:            { bg: '#f4f6f8', color: '#5a6474' },
    PENDING_APPROVAL: { bg: '#fff7ed', color: '#c2410c' },
    APPROVED:         { bg: '#eef6f0', color: '#2a6640' },
    REJECTED:         { bg: '#fef2f2', color: '#991b1b' },
};

const StatCard = ({ title, value, accent, icon: Icon }) => (
    <Paper elevation={0} sx={{
        p: 2, border: `1px solid ${BORDER}`, borderRadius: 2.5,
        flex: 1, minWidth: 160, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderLeft: accent ? `4px solid ${accent}` : `4px solid ${PRIMARY}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
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

const POCard = ({ row, onClick, onDownload, onInvoices }) => {
    const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.DRAFT;
    const as = APPROVAL_STYLE[row.approvalStatus] ?? APPROVAL_STYLE.DRAFT;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const fmtAmount = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

    return (
        <Card elevation={0} sx={{
            border: `1px solid ${BORDER}`, borderRadius: 2.5,
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
            height: '100%',
            '&:hover': {
                borderColor: PRIMARY,
                boxShadow: '0 8px 24px rgba(21, 101, 192, 0.08)',
                '& .go-icon': { transform: 'translateX(4px)', color: PRIMARY }
            }
        }} onClick={onClick}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: HEADER_TEXT, mb: 0.2 }}>
                            {row.purchaseOrderNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Event sx={{ fontSize: 14 }} /> {fmtDate(row.orderDate)}
                        </Typography>
                    </Box>
                    <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                        <Chip label={row.status?.replace(/_/g, ' ')} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1, height: 20,
                                background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }} />
                        <Chip label={row.approvalStatus?.replace(/_/g, ' ')} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, borderRadius: 1, height: 20,
                                background: as.bg, color: as.color }} />
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                <Stack spacing={1.5}>
                    <Box>
                        <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                            Vendor
                        </Typography>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.vendorName ?? '—'}
                        </Typography>
                    </Box>

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                        <Box>
                            <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                                Total Amount
                            </Typography>
                            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                {fmtAmount(row.grandTotal)}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Vendor Invoices">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onInvoices(); }}
                                    sx={{ color: '#64748b', '&:hover': { color: '#7c3aed', background: '#f5f3ff' } }}>
                                    <Receipt sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload(); }}
                                    sx={{ color: '#64748b', '&:hover': { color: PRIMARY, background: PRIMARY_LIGHT } }}>
                                    <FileDownload sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <IconButton size="small" className="go-icon" sx={{ transition: 'all 0.2s', color: '#cbd5e1' }}>
                                <ChevronRight />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

/* Route namespace for preserved filters/page — see commonTools/useViewState.
   Clearing "/purchase" from the nav also clears the sections beneath it. */
const VIEW_STATE_NS = '/purchase';

export default function PurchaseOrderList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useViewState(VIEW_STATE_NS, 'page', 0);
    const [pageSize, setPageSize] = useViewState(VIEW_STATE_NS, 'pageSize', 12);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useViewState(VIEW_STATE_NS, 'status', '');
    const [filterApproval, setFilterApproval] = useViewState(VIEW_STATE_NS, 'approval', '');
    const [searchTerm, setSearchTerm] = useViewState(VIEW_STATE_NS, 'search', '');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: pageSize,
                sort: 'createdDate,desc',
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
    }, [page, pageSize, filterStatus, filterApproval, searchTerm]);

    useEffect(() => { load(); }, [load]);

    // Stats derived from rows on current page (rough)
    const stats = {
        total,
        pending: rows.filter(r => r.approvalStatus === 'PENDING_APPROVAL').length,
        approved: rows.filter(r => r.approvalStatus === 'APPROVED').length,
        draft: rows.filter(r => r.approvalStatus === 'DRAFT').length,
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header section */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f2744', letterSpacing: '-0.02em', mb: 0.5 }}>
                        Purchase Orders
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.95rem' }}>
                        Create and manage your procurement pipeline with vendors
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Tooltip title="Refresh data">
                        <IconButton onClick={load} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Overdue POs">
                        <IconButton onClick={() => navigate('overdue')}
                            sx={{ border: `1px solid #fca5a5`, borderRadius: 2, bgcolor: 'white', color: '#dc2626',
                                '&:hover': { bgcolor: '#fef2f2' } }}>
                            <Warning />
                        </IconButton>
                    </Tooltip>
                    <Button variant="outlined" startIcon={<BarChart />}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: BORDER, color: '#475569',
                            '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY, color: PRIMARY } }}
                        onClick={() => navigate('analytics')}>
                        Analytics
                    </Button>
                    <Button variant="contained" disableElevation startIcon={<Add />}
                        sx={{ background: PRIMARY, borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 700, fontSize: '0.9rem',
                            boxShadow: '0 4px 12px rgba(21, 101, 192, 0.2)', '&:hover': { background: '#0d47a1' } }}
                        onClick={() => navigate('new')}>
                        New Purchase Order
                    </Button>
                </Stack>
            </Stack>

            {/* Analytics overview */}
            <Grid container spacing={2.5} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Volume" value={total} icon={LocalAtm} accent={PRIMARY} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Pending Review" value={stats.pending} accent="#e65100" icon={Visibility} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Approved" value={stats.approved} accent="#2e7d32" icon={FilterList} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Drafts" value={stats.draft} accent="#475569" icon={Storefront} />
                </Grid>
            </Grid>

            {/* Filters and search */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'white' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" placeholder="Search by PO# or Vendor..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
                                sx: { borderRadius: 1.5, bgcolor: '#f8fafc' }
                            }} />
                    </Grid>
                    <Grid item xs={6} md={2.5}>
                        <TextField select fullWidth size="small" label="Status" value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                            InputProps={{ sx: { borderRadius: 1.5 } }}>
                            <MenuItem value="">All Statuses</MenuItem>
                            {['DRAFT','SENT','PARTIALLY_RECEIVED','RECEIVED','COMPLETED','CANCELLED'].map(s =>
                                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2.5}>
                        <TextField select fullWidth size="small" label="Approval" value={filterApproval}
                            onChange={e => { setFilterApproval(e.target.value); setPage(0); }}
                            InputProps={{ sx: { borderRadius: 1.5 } }}>
                            <MenuItem value="">All Approvals</MenuItem>
                            {['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED'].map(s =>
                                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button fullWidth variant="outlined" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 40, borderColor: BORDER, color: '#475569' }}
                            onClick={() => { setFilterStatus(''); setFilterApproval(''); setSearchTerm(''); setPage(0); }}>
                            Reset Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Content grid */}
            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
                    <CircularProgress thickness={5} size={48} sx={{ color: PRIMARY }} />
                    <Typography sx={{ color: '#64748b', fontWeight: 500 }}>Fetching purchase orders...</Typography>
                </Box>
            ) : rows.length === 0 ? (
                <Paper elevation={0} sx={{ py: 12, border: `1px dashed ${BORDER}`, borderRadius: 3, bgcolor: 'white', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 700, mb: 1 }}>No results found</Typography>
                    <Typography sx={{ color: '#64748b' }}>Try adjusting your filters or search term</Typography>
                </Paper>
            ) : (
                <>
                    <Grid container spacing={3}>
                        {rows.map(row => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={row.id}>
                                <POCard row={row} onClick={() => navigate(`${row.id}`)} onDownload={() => downloadPOPdf(row.id)} onInvoices={() => navigate(`${row.id}/invoices`)} />
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
