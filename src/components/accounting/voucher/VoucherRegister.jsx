import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    IconButton,
    MenuItem,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AddCircleOutline,
    CloseOutlined,
    ReplayOutlined,
    ReceiptLongOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getVoucher, listVouchers, reverseVoucher } from "../../../services/accounting/accountingVoucherService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META = {
    JOURNAL:      { label: "Journal",     color: "#2563eb", bg: "#eff6ff" },
    RECEIPT:      { label: "Receipt",     color: "#16a34a", bg: "#f0fdf4" },
    PAYMENT:      { label: "Payment",     color: "#d97706", bg: "#fffbeb" },
    CONTRA:       { label: "Contra",      color: "#7c3aed", bg: "#f5f3ff" },
    OPENING:      { label: "Opening",     color: "#64748b", bg: "#f8fafc" },
    SALES:        { label: "Sales",       color: "#0891b2", bg: "#f0f9ff" },
    PURCHASE:     { label: "Purchase",    color: "#4f46e5", bg: "#eef2ff" },
    CREDIT_NOTE:  { label: "Credit Note", color: "#be185d", bg: "#fdf2f8" },
    DEBIT_NOTE:   { label: "Debit Note",  color: "#b45309", bg: "#fffbeb" },
    CLOSING:      { label: "Closing",     color: "#475569", bg: "#f8fafc" },
    DEPRECIATION: { label: "Depreciation",color: "#64748b", bg: "#f8fafc" },
    PAYROLL:      { label: "Payroll",     color: "#0f766e", bg: "#f0fdfa" },
};

const STATUS_META = {
    DRAFT:            { label: "Draft",            color: "#2563eb", bg: "#eff6ff" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "#d97706", bg: "#fffbeb" },
    POSTED:           { label: "Posted",           color: "#16a34a", bg: "#f0fdf4" },
    REVERSED:         { label: "Reversed",         color: "#94a3b8", bg: "#f8fafc" },
};

const MANUAL_TYPES = ["", "JOURNAL", "RECEIPT", "PAYMENT", "CONTRA"];
const ALL_STATUSES = ["", "POSTED", "PENDING_APPROVAL", "DRAFT", "REVERSED"];

const fmtDate = (d) => !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtCurrency = (n) => n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const todayStr = () => new Date().toISOString().split("T")[0];
const firstOfMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

// ─── TypeChip / StatusChip ────────────────────────────────────────────────────

const TypeChip = ({ type }) => {
    const m = TYPE_META[type] || { label: type, color: "#64748b", bg: "#f8fafc" };
    return (
        <Chip label={m.label} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: m.bg, color: m.color, border: `1px solid ${m.color}30` }} />
    );
};

const StatusChip = ({ status }) => {
    const m = STATUS_META[status] || { label: status, color: "#64748b", bg: "#f8fafc" };
    return (
        <Chip label={m.label} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: m.bg, color: m.color, border: `1px solid ${m.color}30` }} />
    );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const DetailDrawer = ({ voucherId, onClose, onReversed }) => {
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reverseDialog, setReverseDialog] = useState(false);
    const [reverseReason, setReverseReason] = useState("");
    const [reversing, setReversing] = useState(false);
    const [reverseError, setReverseError] = useState("");

    useEffect(() => {
        if (!voucherId) return;
        setVoucher(null);
        setLoading(true);
        getVoucher(voucherId)
            .then(setVoucher)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [voucherId]);

    const handleReverse = async () => {
        if (!reverseReason.trim()) { setReverseError("Reason is required."); return; }
        setReversing(true);
        setReverseError("");
        try {
            await reverseVoucher(voucherId, reverseReason);
            setReverseDialog(false);
            onReversed();
        } catch (e) {
            setReverseError(e?.response?.data?.message || e?.message || "Reversal failed.");
        } finally {
            setReversing(false);
        }
    };

    const headerCellSx = {
        bgcolor: "#f8fafc", color: "#64748b", fontWeight: 700,
        fontSize: "0.65625rem", letterSpacing: "0.05em", textTransform: "uppercase",
        py: "8px", px: "12px", borderBottom: "1px solid #e2e8f0",
    };

    return (
        <>
            <Drawer anchor="right" open={Boolean(voucherId)} onClose={onClose}
                PaperProps={{ sx: { width: { xs: "100vw", sm: 520 }, p: 0 } }}
            >
                {/* Drawer header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, borderBottom: "1px solid #f1f5f9", bgcolor: "#f8fafc" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a" }}>
                        Voucher Detail
                    </Typography>
                    <IconButton size="small" onClick={onClose} sx={{ color: "#64748b" }}>
                        <CloseOutlined sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                {loading ? (
                    <Box sx={{ p: 3 }}>
                        {[...Array(6)].map((_, i) => <Skeleton key={i} height={28} sx={{ mb: 1 }} />)}
                    </Box>
                ) : voucher ? (
                    <Box sx={{ overflow: "auto", flex: 1 }}>
                        {/* Meta info */}
                        <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid #f1f5f9" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                                <Box>
                                    <Typography sx={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                                        {voucher.voucherNumber}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.8125rem", color: "#64748b", mt: 0.25 }}>
                                        {fmtDate(voucher.date)} · by {voucher.createdBy}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.75}>
                                    <TypeChip type={voucher.voucherType} />
                                    <StatusChip status={voucher.status} />
                                </Stack>
                            </Stack>
                            {voucher.narration && (
                                <Typography sx={{ fontSize: "0.8125rem", color: "#374151", fontStyle: "italic", bgcolor: "#f8fafc", px: 1.5, py: 1, borderRadius: 1.5, border: "1px solid #f1f5f9" }}>
                                    "{voucher.narration}"
                                </Typography>
                            )}
                            {voucher.reversalOfId && (
                                <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5, py: 0.25, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                                    This is a reversal of voucher #{voucher.reversalOfId}
                                </Alert>
                            )}
                            {voucher.reversedByVoucherId && (
                                <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1.5, py: 0.25, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                                    Reversed by voucher #{voucher.reversedByVoucherId}
                                </Alert>
                            )}
                        </Box>

                        {/* Lines table */}
                        <Box sx={{ px: 3, py: 2.5 }}>
                            <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#94a3b8", mb: 1.5 }}>
                                Voucher Lines
                            </Typography>
                            <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Account</TableCell>
                                            <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>Debit</TableCell>
                                            <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>Credit</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {voucher.lines?.map((l) => (
                                            <TableRow key={l.id} sx={{ "& td": { borderBottom: "1px solid #f1f5f9", py: 1, px: "12px" } }}>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "#0f172a" }}>{l.ledgerAccountName}</Typography>
                                                    <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8", fontFamily: "monospace" }}>{l.ledgerAccountCode}</Typography>
                                                    {l.narration && <Typography sx={{ fontSize: "0.6875rem", color: "#64748b", fontStyle: "italic" }}>{l.narration}</Typography>}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "right", fontSize: "0.8125rem", fontWeight: 500, color: l.drAmount > 0 ? "#0f172a" : "#cbd5e1" }}>
                                                    {l.drAmount > 0 ? fmtCurrency(l.drAmount) : "—"}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "right", fontSize: "0.8125rem", fontWeight: 500, color: l.crAmount > 0 ? "#0f172a" : "#cbd5e1" }}>
                                                    {l.crAmount > 0 ? fmtCurrency(l.crAmount) : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Totals row */}
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", py: 1, px: "12px", borderTop: "2px solid #e2e8f0" }}>
                                                Total
                                            </TableCell>
                                            <TableCell sx={{ textAlign: "right", fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", py: 1, px: "12px", borderTop: "2px solid #e2e8f0" }}>
                                                {fmtCurrency(voucher.totalDr)}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: "right", fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", py: 1, px: "12px", borderTop: "2px solid #e2e8f0" }}>
                                                {fmtCurrency(voucher.totalCr)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        {/* Reverse action */}
                        {voucher.status === "POSTED" && (
                            <Box sx={{ px: 3, pb: 3 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ReplayOutlined sx={{ fontSize: 15 }} />}
                                    onClick={() => { setReverseReason(""); setReverseError(""); setReverseDialog(true); }}
                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: "#fca5a5", color: "#ef4444", "&:hover": { bgcolor: "#fef2f2", borderColor: "#ef4444" } }}
                                >
                                    Reverse Voucher
                                </Button>
                            </Box>
                        )}
                    </Box>
                ) : null}
            </Drawer>

            {/* Reverse confirm dialog */}
            <Dialog open={reverseDialog} onClose={() => setReverseDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>Reverse Voucher</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: "0.8125rem", color: "#475569", mb: 2 }}>
                        This will create a counter-entry reversing all lines. The original voucher will be marked REVERSED. This action cannot be undone.
                    </Typography>
                    <TextField
                        label="Reason for reversal" size="small" fullWidth required multiline rows={2}
                        value={reverseReason}
                        onChange={(e) => { setReverseReason(e.target.value); setReverseError(""); }}
                        error={!!reverseError} helperText={reverseError}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setReverseDialog(false)} size="small" sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>Cancel</Button>
                    <Button onClick={handleReverse} variant="contained" disableElevation size="small" disabled={reversing}
                        startIcon={reversing ? <CircularProgress size={13} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
                    >
                        Confirm Reversal
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const VoucherRegister = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [from, setFrom] = useState(firstOfMonthStr);
    const [to, setTo] = useState(todayStr);
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [detailId, setDetailId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { from, to };
            if (typeFilter)  params.type   = typeFilter;
            if (statusFilter) params.status = statusFilter;
            const data = await listVouchers(params);
            setRows(data || []);
            setPage(0);
        } catch {
            setError("Failed to load vouchers. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [from, to, typeFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const headerCellSx = {
        bgcolor: "#f8fafc", color: "#64748b", fontWeight: 700,
        fontSize: "0.65625rem", letterSpacing: "0.05em", textTransform: "uppercase",
        py: "10px", px: "14px", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0",
    };

    const paged = useMemo(() =>
        rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [rows, page, rowsPerPage]
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            Voucher Register
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            All posted and pending vouchers in the General Ledger
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {[
                            { label: "Journal",  path: "/accounting/vouchers/journal",  color: "#2563eb" },
                            { label: "Receipt",  path: "/accounting/vouchers/receipt",  color: "#10b981" },
                            { label: "Payment",  path: "/accounting/vouchers/payment",  color: "#d97706" },
                            { label: "Contra",   path: "/accounting/vouchers/contra",   color: "#7c3aed" },
                        ].map(({ label, path, color }) => (
                            <Button key={label} size="small" variant="outlined" disableElevation
                                startIcon={<AddCircleOutline sx={{ fontSize: 15 }} />}
                                onClick={() => navigate(path)}
                                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.8125rem", borderRadius: 2, borderColor: "#e2e8f0", color: "#374151", "&:hover": { borderColor: color, color } }}
                            >
                                {label}
                            </Button>
                        ))}
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 2.5, borderColor: "#f1f5f9" }} />

                {/* Filters */}
                <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }} flexWrap="wrap">
                    <TextField label="From" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField label="To"   type="date" size="small" value={to}   onChange={(e) => setTo(e.target.value)}   InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField select label="Type" size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ width: 140 }}>
                        {MANUAL_TYPES.map((t) => <MenuItem key={t} value={t}>{t || "All Types"}</MenuItem>)}
                    </TextField>
                    <TextField select label="Status" size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
                        {ALL_STATUSES.map((s) => <MenuItem key={s} value={s}>{s || "All Statuses"}</MenuItem>)}
                    </TextField>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

                {/* Table */}
                <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellSx}>Voucher #</TableCell>
                                <TableCell sx={headerCellSx}>Type</TableCell>
                                <TableCell sx={headerCellSx}>Date</TableCell>
                                <TableCell sx={headerCellSx}>Narration</TableCell>
                                <TableCell sx={headerCellSx} align="center">Status</TableCell>
                                <TableCell sx={headerCellSx}>Created By</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} sx={{ py: 6 }} align="center">
                                    <CircularProgress size={24} sx={{ color: "#10b981" }} />
                                </TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                    <ReceiptLongOutlined sx={{ fontSize: 36, color: "#e2e8f0", mb: 1, display: "block", mx: "auto" }} />
                                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>No vouchers found for the selected filters.</Typography>
                                </TableCell></TableRow>
                            ) : paged.map((v) => (
                                <TableRow key={v.id} hover onClick={() => setDetailId(v.id)}
                                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f8fafc" }, "& td": { borderBottom: "1px solid #f1f5f9", py: 1.25, px: "14px" } }}
                                >
                                    <TableCell>
                                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>
                                            {v.voucherNumber || `#${v.id}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell><TypeChip type={v.voucherType} /></TableCell>
                                    <TableCell sx={{ fontSize: "0.8125rem", color: "#374151" }}>{fmtDate(v.date)}</TableCell>
                                    <TableCell sx={{ maxWidth: 280 }}>
                                        <Typography sx={{ fontSize: "0.8125rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                                            {v.narration || "—"}
                                        </Typography>
                                        {v.sourceDocType && (
                                            <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{v.sourceDocType} #{v.sourceDocId}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center"><StatusChip status={v.status} /></TableCell>
                                    <TableCell sx={{ fontSize: "0.8125rem", color: "#64748b" }}>{v.createdBy || "—"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div" count={rows.length} page={page} rowsPerPage={rowsPerPage}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    sx={{ borderTop: "1px solid #f1f5f9", "& .MuiTablePagination-toolbar": { fontSize: "0.8125rem" } }}
                />
            </Paper>

            <DetailDrawer
                voucherId={detailId}
                onClose={() => setDetailId(null)}
                onReversed={() => { setDetailId(null); load(); }}
            />
        </Box>
    );
};

export default VoucherRegister;
