import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, InputAdornment, MenuItem, Paper, Select, Snackbar, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField,
    ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
    Add, Cancel, CheckCircle, Clear, FilterAltOff, OpenInNew, Search, Splitscreen,
} from '@mui/icons-material';
import {
    approveInventoryRequest,
    approveMaterialRequest,
    getMaterialRequestRegister,
    partialApproveMaterialRequest,
    rejectInventoryRequest,
    rejectMaterialRequest,
} from '../../services/inventoryService';
import { resolveApiErrorMessage } from '../../services/apiService';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';
import { useViewState, useViewStateResetSignal } from '../../commonTools/useViewState';
import CreateInventoryRequestForm from './CreateInventoryRequestForm';
import {
    chipSx, headerCellSx, INK, INK_SOFT, MUTED, primaryButtonSx, surfaceSx, T,
} from './warehouse/listStyles';

/*
 * The stores' material request register: the working queue and the history behind it, in one
 * table. Used whole on the Material Requests page and on its own inside the Inventory module's
 * Transactions tab.
 *
 * A request used to leave the screen the moment it was approved or rejected. Here it stays, under
 * its status, so "what did we issue against that work order" and "why was that turned down" can
 * be answered from the same place the decision was made.
 */

export const STATUS_VIEWS = [
    { value: 'OPEN', label: 'Waiting' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ALL', label: 'All' },
];

const SOURCE_VIEWS = [
    { value: 'STORES', label: 'All stores requests' },
    { value: 'WORK_ORDER', label: 'Work orders' },
    { value: 'MANUAL', label: 'Raised by hand' },
    { value: 'REORDER', label: 'Reorder' },
    { value: 'SALES_ORDER', label: 'Sales order reservations' },
];

const SOURCE_LABEL = {
    WORK_ORDER: 'Work order',
    SALES_ORDER: 'Sales order',
    MANUAL: 'By hand',
    REORDER: 'Reorder',
};

const STATUS_META = {
    PENDING: { label: 'Waiting', color: T.warning, bg: '#fffbeb' },
    PARTIAL: { label: 'Partly issued', color: T.violet, bg: '#f5f3ff' },
    APPROVED: { label: 'Approved', color: T.success, bg: '#ecfdf5' },
    REJECTED: { label: 'Rejected', color: T.error, bg: '#fef2f2' },
};

const REJECTION_REASONS = [
    'Out of Stock',
    'Quality Hold',
    'Incorrect Item',
    'Purchase Order Pending',
    'Item Damaged',
    'Other',
];

const DEFAULTS = { status: 'OPEN', source: 'STORES', search: '', from: '', to: '' };

const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 3 }));

const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "today", "1 day", "12 days" — how long a request has been waiting. */
export const waitingFor = (value) => {
    if (!value) return null;
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
    if (Number.isNaN(days) || days < 0) return null;
    if (days === 0) return 'today';
    return days === 1 ? '1 day' : `${days} days`;
};

const sourcePath = (row) => {
    if (!row.sourceId) return null;
    if (row.source === 'WORK_ORDER') return `/production/work-order/edit/${row.sourceId}`;
    if (row.source === 'SALES_ORDER') return `/sales/sales-order/edit/${row.sourceId}`;
    return null;
};

const isNegativeStockPrompt = (e) =>
    e?.response?.status === 409 && e?.response?.data?.requiresConfirmation;

/**
 * @param namespace  view-state bucket, so the page and the tab remember their filters apart
 * @param command    `{ nonce, patch }` from a parent: applies `patch` to the filters when `nonce` changes
 * @param onChanged  called after a request is approved, rejected or raised
 * @param refreshKey bump to refetch
 */
export default function MaterialRequestRegister({ namespace, command, onChanged, refreshKey }) {
    const navigate = useNavigate();
    const { canAction, user } = useAuth();
    const canDecide = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);

    const [status, setStatus] = useViewState(namespace, 'status', DEFAULTS.status);
    const [source, setSource] = useViewState(namespace, 'source', DEFAULTS.source);
    const [search, setSearch] = useViewState(namespace, 'search', DEFAULTS.search);
    const [from, setFrom] = useViewState(namespace, 'from', DEFAULTS.from);
    const [to, setTo] = useViewState(namespace, 'to', DEFAULTS.to);
    const [page, setPage] = useViewState(namespace, 'page', 0);
    const [rowsPerPage, setRowsPerPage] = useViewState(namespace, 'pageSize', 20);
    const resetSignal = useViewStateResetSignal(namespace);

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [acting, setActing] = useState(false);

    const [partialDialog, setPartialDialog] = useState({ open: false, row: null, qty: '' });
    const [rejectDialog, setRejectDialog] = useState({ open: false, row: null, reason: '', customReason: '' });
    // qty === null confirms a full approval; a number confirms a partial one.
    const [negativeConfirm, setNegativeConfirm] = useState({ open: false, message: '', row: null, qty: null });

    const [createOpen, setCreateOpen] = useState(false);
    const [createItem, setCreateItem] = useState(null);

    // The search box is typed into freely; the request follows a moment later.
    const [typed, setTyped] = useState(search);
    useEffect(() => { setTyped(search); }, [search]);
    useEffect(() => {
        if (typed === search) return undefined;
        const timer = setTimeout(() => { setSearch(typed); setPage(0); }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typed]);

    // A parent (the stat cards, the alert rail) can point the register at a view.
    const appliedCommand = useRef(command?.nonce);
    useEffect(() => {
        if (!command || command.nonce === appliedCommand.current) return;
        appliedCommand.current = command.nonce;
        const patch = command.patch || {};
        if (patch.status !== undefined) setStatus(patch.status);
        if (patch.source !== undefined) setSource(patch.source);
        if (patch.search !== undefined) setSearch(patch.search);
        if (patch.from !== undefined) setFrom(patch.from);
        if (patch.to !== undefined) setTo(patch.to);
        setPage(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getMaterialRequestRegister({
                status,
                source,
                q: search || undefined,
                from: from || undefined,
                to: to || undefined,
                page,
                size: rowsPerPage,
            });
            setRows(res?.content || []);
            setTotal(res?.totalElements || 0);
        } catch (e) {
            setRows([]);
            setTotal(0);
            setError(resolveApiErrorMessage(e, 'Could not load material requests.'));
        } finally {
            setLoading(false);
        }
    }, [status, source, search, from, to, page, rowsPerPage]);

    useEffect(() => { load(); }, [load, refreshKey, resetSignal]);

    const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const afterChange = () => {
        load();
        if (onChanged) onChanged();
    };

    const filtered = status !== DEFAULTS.status || source !== DEFAULTS.source || !!search || !!from || !!to;
    const clearFilters = () => {
        setStatus(DEFAULTS.status);
        setSource(DEFAULTS.source);
        setSearch('');
        setTyped('');
        setFrom('');
        setTo('');
        setPage(0);
    };

    // ── Decisions ─────────────────────────────────────────────────────────────────────────
    // A work order's request is approved through the material-request API, which reserves the
    // stock and moves the work order on. One raised by hand goes through the older stock-booking
    // call, which has no partial approval.
    const isWorkOrderRequest = (row) => row.source === 'WORK_ORDER';
    const decidedBy = user?.username || 'System';

    const approve = async (row, force = false) => {
        setActing(true);
        try {
            if (isWorkOrderRequest(row)) {
                await approveMaterialRequest(row.id, force);
            } else {
                await approveInventoryRequest({
                    requestId: row.id, approvedBy: decidedBy, approvalRemarks: `Approved by ${decidedBy}`,
                });
            }
            notify(`${row.itemCode}: approved`);
            afterChange();
        } catch (e) {
            if (isNegativeStockPrompt(e)) {
                setNegativeConfirm({ open: true, message: e.response.data.message, row, qty: null });
                return;
            }
            notify(resolveApiErrorMessage(e, 'Approval failed.'), 'error');
        } finally {
            setActing(false);
        }
    };

    const approvePartial = async (row, qty, force = false) => {
        setActing(true);
        try {
            await partialApproveMaterialRequest(row.id, qty, force);
            setPartialDialog({ open: false, row: null, qty: '' });
            notify(`${row.itemCode}: ${num(qty)} issued, the rest still waiting`);
            afterChange();
        } catch (e) {
            if (isNegativeStockPrompt(e)) {
                setPartialDialog({ open: false, row: null, qty: '' });
                setNegativeConfirm({ open: true, message: e.response.data.message, row, qty });
                return;
            }
            notify(resolveApiErrorMessage(e, 'Partial approval failed.'), 'error');
        } finally {
            setActing(false);
        }
    };

    const confirmNegative = () => {
        const { row, qty } = negativeConfirm;
        setNegativeConfirm({ open: false, message: '', row: null, qty: null });
        if (!row) return;
        if (qty == null) approve(row, true);
        else approvePartial(row, qty, true);
    };

    const reject = async () => {
        const { row } = rejectDialog;
        const reason = rejectDialog.reason === 'Other' ? rejectDialog.customReason.trim() : rejectDialog.reason;
        if (!row || !reason) return;
        setActing(true);
        try {
            if (isWorkOrderRequest(row)) {
                await rejectMaterialRequest(row.id, reason);
            } else {
                await rejectInventoryRequest({ requestId: row.id, approvedBy: decidedBy, approvalRemarks: reason });
            }
            setRejectDialog({ open: false, row: null, reason: '', customReason: '' });
            notify(`${row.itemCode}: rejected`, 'info');
            afterChange();
        } catch (e) {
            notify(resolveApiErrorMessage(e, 'Rejection failed.'), 'error');
        } finally {
            setActing(false);
        }
    };

    // The form closes itself on success; refetch whenever it closes.
    const createWasOpen = useRef(false);
    useEffect(() => {
        if (createWasOpen.current && !createOpen) afterChange();
        createWasOpen.current = createOpen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createOpen]);

    const reservations = source === 'SALES_ORDER';
    const emptyText = filtered
        ? 'Nothing matches these filters.'
        : 'Nothing is waiting on the stores.';

    return (
        <Paper elevation={0} sx={surfaceSx}>
            {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
            <Box sx={{ p: 2.5, borderBottom: `1px solid ${T.border}` }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }} mb={2}>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={status}
                        onChange={(_, v) => { if (v) { setStatus(v); setPage(0); } }}
                        sx={{
                            '& .MuiToggleButton-root': {
                                textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', px: 2,
                                color: MUTED, borderColor: T.border,
                            },
                            '& .Mui-selected': { color: `${T.primary} !important`, bgcolor: '#eff6ff !important' },
                        }}
                    >
                        {STATUS_VIEWS.map((v) => (
                            <ToggleButton key={v.value} value={v.value}>{v.label}</ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    <Stack direction="row" spacing={1} alignItems="center">
                        {filtered && (
                            <Button size="small" startIcon={<FilterAltOff />} onClick={clearFilters}
                                sx={{ textTransform: 'none', fontWeight: 600, color: MUTED }}>
                                Clear filters
                            </Button>
                        )}
                        <Tooltip title={canDecide ? '' : 'You do not have permission to raise requests'}>
                            <span>
                                <Button variant="contained" disableElevation size="small" startIcon={<Add />}
                                    disabled={!canDecide} onClick={() => setCreateOpen(true)}
                                    sx={{ ...primaryButtonSx, boxShadow: 'none', px: 2 }}>
                                    New Request
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                    <TextField
                        size="small"
                        placeholder="Item code, item name or reference"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        sx={{ flex: 1, minWidth: 220 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><Search sx={{ fontSize: 18, color: MUTED }} /></InputAdornment>
                            ),
                            endAdornment: typed ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" aria-label="Clear search"
                                        onClick={() => { setTyped(''); setSearch(''); setPage(0); }}>
                                        <Clear sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    <TextField select size="small" label="Raised by" value={source}
                        onChange={(e) => { setSource(e.target.value); setPage(0); }} sx={{ minWidth: 210 }}>
                        {SOURCE_VIEWS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="date" label="Raised from" value={from}
                        onChange={(e) => { setFrom(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                    <TextField size="small" type="date" label="Raised to" value={to}
                        onChange={(e) => { setTo(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                </Stack>
            </Box>

            {reservations && (
                <Alert severity="info" sx={{ borderRadius: 0, borderBottom: `1px solid ${T.border}` }}>
                    These are sales orders&apos; own stock reservations, made when the order was approved. They are
                    settled when the order is picked and shipped, so there is nothing to approve here. &ldquo;Still
                    short&rdquo; is what the order is waiting on from production or purchase.
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => setError(null)}>{error}</Alert>
            )}

            {/* ── Register ──────────────────────────────────────────────────────────── */}
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellSx, py: 1.5 }}>Request</TableCell>
                            <TableCell sx={headerCellSx}>Item</TableCell>
                            <TableCell sx={headerCellSx} align="right">{reservations ? 'Ordered' : 'Requested'}</TableCell>
                            <TableCell sx={headerCellSx} align="right">{reservations ? 'Still short' : 'Free stock'}</TableCell>
                            <TableCell sx={headerCellSx} align="center">Status</TableCell>
                            <TableCell sx={headerCellSx}>Raised</TableCell>
                            <TableCell sx={headerCellSx}>{reservations ? 'Note' : 'Decision'}</TableCell>
                            <TableCell sx={headerCellSx} align="center">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 9 }}><CircularProgress size={26} /></TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 9 }}>
                                    <Typography variant="body2" sx={{ color: MUTED, fontWeight: 600 }}>{emptyText}</Typography>
                                    {filtered && (
                                        <Button size="small" onClick={clearFilters} sx={{ mt: 1, textTransform: 'none' }}>
                                            Clear filters
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : rows.map((row) => {
                            const meta = STATUS_META[row.status] || { label: row.status || '—', color: MUTED, bg: T.bg };
                            const open = row.status === 'PENDING' || row.status === 'PARTIAL';
                            const path = sourcePath(row);
                            const age = open ? waitingFor(row.requestedDate) : null;
                            const partlyIssued = Number(row.issuedQty) > 0 && Number(row.remainingQty) > 0;
                            return (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: path ? T.primary : INK }}>
                                                {row.sourceNumber || SOURCE_LABEL[row.source] || 'Request'}
                                            </Typography>
                                            {path && (
                                                <Tooltip title={`Open ${SOURCE_LABEL[row.source]?.toLowerCase() || 'source'}`}>
                                                    <IconButton size="small" onClick={() => navigate(path)}
                                                        aria-label={`Open ${row.sourceNumber || 'source document'}`}
                                                        sx={{ p: 0.25 }}>
                                                        <OpenInNew sx={{ fontSize: 14, color: T.primary }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        <Typography variant="caption" sx={{ color: MUTED, display: 'block' }}>
                                            {[SOURCE_LABEL[row.source], row.warehouseCode && `for ${row.warehouseCode}`]
                                                .filter(Boolean).join(' · ') || row.referenceNumber}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: INK }}>{row.itemCode || '—'}</Typography>
                                        <Typography variant="caption" sx={{ color: MUTED }}>{row.itemName}</Typography>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                            {num(row.requestedQty)} <Typography component="span" variant="caption" sx={{ color: MUTED }}>{row.uom}</Typography>
                                        </Typography>
                                        {partlyIssued && (
                                            <Typography variant="caption" sx={{ color: T.violet, fontWeight: 600 }}>
                                                {num(row.issuedQty)} {reservations ? 'reserved' : 'issued'}
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell align="right">
                                        {reservations ? (
                                            <Typography variant="body2"
                                                sx={{ fontWeight: 700, color: Number(row.remainingQty) > 0 ? T.error : T.success }}>
                                                {Number(row.remainingQty) > 0 ? num(row.remainingQty) : 'Fully reserved'}
                                            </Typography>
                                        ) : open ? (
                                            <>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: row.stockShort ? T.error : INK_SOFT }}>
                                                    {num(row.availableQty)}
                                                </Typography>
                                                {row.stockShort && (
                                                    <Typography variant="caption" sx={{ color: T.error, fontWeight: 600 }}>
                                                        short by {num(Number(row.remainingQty) - Number(row.availableQty))}
                                                    </Typography>
                                                )}
                                            </>
                                        ) : (
                                            <Typography variant="caption" sx={{ color: MUTED }}>—</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Chip size="small" label={meta.label} sx={chipSx(meta)} />
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2" sx={{ color: INK_SOFT }}>{fmtDate(row.requestedDate)}</Typography>
                                        <Typography variant="caption" sx={{ color: MUTED }}>
                                            {[row.requestedBy, age && (age === 'today' ? 'raised today' : `waiting ${age}`)]
                                                .filter(Boolean).join(' · ')}
                                        </Typography>
                                    </TableCell>

                                    <TableCell sx={{ maxWidth: 220 }}>
                                        {row.decidedBy || row.decidedDate ? (
                                            <>
                                                <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                    {[row.decidedBy, row.decidedDate && fmtDate(row.decidedDate)].filter(Boolean).join(' · ')}
                                                </Typography>
                                                {row.rejectionReason && (
                                                    <Tooltip title={row.rejectionReason} arrow>
                                                        <Typography variant="caption" noWrap
                                                            sx={{ color: T.error, display: 'block', cursor: 'help' }}>
                                                            {row.rejectionReason}
                                                        </Typography>
                                                    </Tooltip>
                                                )}
                                            </>
                                        ) : (
                                            <Tooltip title={row.remarks || ''} arrow>
                                                <Typography variant="caption" noWrap sx={{ color: MUTED, display: 'block' }}>
                                                    {row.remarks || '—'}
                                                </Typography>
                                            </Tooltip>
                                        )}
                                    </TableCell>

                                    <TableCell align="center">
                                        {row.actionable ? (
                                            <Stack direction="row" spacing={0.25} justifyContent="center">
                                                <Tooltip title="Approve in full">
                                                    <span>
                                                        <IconButton size="small" color="success" disabled={!canDecide || acting}
                                                            aria-label={`Approve ${row.itemCode}`} onClick={() => approve(row)}>
                                                            <CheckCircle fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                {isWorkOrderRequest(row) && (
                                                    <Tooltip title="Issue part of it">
                                                        <span>
                                                            <IconButton size="small" color="warning" disabled={!canDecide || acting}
                                                                aria-label={`Partly approve ${row.itemCode}`}
                                                                onClick={() => setPartialDialog({ open: true, row, qty: '' })}>
                                                                <Splitscreen fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Reject">
                                                    <span>
                                                        <IconButton size="small" color="error" disabled={!canDecide || acting}
                                                            aria-label={`Reject ${row.itemCode}`}
                                                            onClick={() => setRejectDialog({ open: true, row, reason: '', customReason: '' })}>
                                                            <Cancel fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        ) : path ? (
                                            <Button size="small" onClick={() => navigate(path)}
                                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                                                Open
                                            </Button>
                                        ) : (
                                            <Typography variant="caption" sx={{ color: MUTED }}>—</Typography>
                                        )}
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
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                sx={{ borderTop: `1px solid ${T.border}` }}
            />

            {/* ── Issue part ────────────────────────────────────────────────────────── */}
            <Dialog open={partialDialog.open} onClose={() => setPartialDialog({ open: false, row: null, qty: '' })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Issue part of the request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: MUTED }}>
                        <strong>{partialDialog.row?.itemCode}</strong> — {num(partialDialog.row?.remainingQty)} {partialDialog.row?.uom} still
                        owed, {num(partialDialog.row?.availableQty)} free in stock.
                    </Typography>
                    <TextField
                        autoFocus fullWidth size="small" type="number" label="Quantity to issue now"
                        value={partialDialog.qty}
                        onChange={(e) => setPartialDialog((prev) => ({ ...prev, qty: e.target.value }))}
                        inputProps={{ min: 0.001, max: partialDialog.row?.remainingQty, step: '0.001' }}
                        helperText="The rest stays waiting."
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPartialDialog({ open: false, row: null, qty: '' })} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" color="warning" disableElevation
                        disabled={acting || !(parseFloat(partialDialog.qty) > 0)}
                        onClick={() => approvePartial(partialDialog.row, parseFloat(partialDialog.qty))}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        {acting ? 'Issuing…' : 'Issue this much'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Negative stock ────────────────────────────────────────────────────── */}
            <Dialog open={negativeConfirm.open}
                onClose={() => setNegativeConfirm({ open: false, message: '', row: null, qty: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#b45309' }}>Negative stock warning</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: INK_SOFT }}>
                        {negativeConfirm.message || 'Approving this request will take available stock below zero.'}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setNegativeConfirm({ open: false, message: '', row: null, qty: null })}
                        sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" color="warning" disableElevation disabled={acting} onClick={confirmNegative}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Approve anyway
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Reject ────────────────────────────────────────────────────────────── */}
            <Dialog open={rejectDialog.open}
                onClose={() => setRejectDialog({ open: false, row: null, reason: '', customReason: '' })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Reject request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: MUTED }}>
                        <strong>{rejectDialog.row?.itemCode}</strong> for {rejectDialog.row?.sourceNumber || 'this request'}.
                        The reason is kept with the request and shown in its history.
                    </Typography>
                    <Select fullWidth size="small" displayEmpty value={rejectDialog.reason} sx={{ mb: 2 }}
                        onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value, customReason: '' }))}>
                        <MenuItem value="" disabled>Select a reason</MenuItem>
                        {REJECTION_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                    {rejectDialog.reason === 'Other' && (
                        <TextField fullWidth size="small" multiline rows={2} label="Describe the reason"
                            value={rejectDialog.customReason}
                            onChange={(e) => setRejectDialog((prev) => ({ ...prev, customReason: e.target.value }))} />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRejectDialog({ open: false, row: null, reason: '', customReason: '' })}
                        sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" color="error" disableElevation onClick={reject}
                        disabled={acting || !rejectDialog.reason || (rejectDialog.reason === 'Other' && !rejectDialog.customReason.trim())}
                        sx={{ textTransform: 'none', fontWeight: 700 }}>
                        {acting ? 'Rejecting…' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            <CreateInventoryRequestForm openDialog={createOpen} setOpenDialog={setCreateOpen}
                selectedItem={createItem} setSelectedItem={setCreateItem} canManageInventory={canDecide} />

            <Snackbar open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="filled"
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}
