import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Link,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { AddCircleOutline, ReceiptLongOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { listVouchers } from "../../../services/accounting/accountingVoucherService";
import { useViewState } from "../../../commonTools/useViewState";
import { Kbd, VOUCHER_TYPE_META, fmtDate, rowSx, sourceDoc, todayStr, useRowKeys } from "../common/accountingUi";
import { StatusChip, TypeChip, voucherPath } from "./VoucherDetailPage";

/* Route namespace for preserved filters — see commonTools/useViewState. */
const VIEW_STATE_NS = "/accounting/vouchers";

// ─── Constants ────────────────────────────────────────────────────────────────

// Every voucher type, not only the manual ones: opening, sales, purchase and the rest were unfilterable.
const MANUAL_TYPES = ["", ...Object.keys(VOUCHER_TYPE_META)];
const ALL_STATUSES = ["", "POSTED", "PENDING_APPROVAL", "DRAFT", "REVERSED"];

const firstOfMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const VoucherRegister = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [from, setFrom] = useViewState(VIEW_STATE_NS, "from", firstOfMonthStr);
    const [to, setTo] = useViewState(VIEW_STATE_NS, "to", todayStr);
    const [typeFilter, setTypeFilter] = useViewState(VIEW_STATE_NS, "type", "");
    const [statusFilter, setStatusFilter] = useViewState(VIEW_STATE_NS, "status", "");
    // `page` stays local: `load` resets it to 0 on every fetch by design, so there
    // would be nothing to restore.
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useViewState(VIEW_STATE_NS, "pageSize", 25);

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
    const openVoucher = useCallback((id) => navigate(voucherPath(id), { state: { ledgerRange: { from, to } } }), [navigate, from, to]);
    const openRow = useCallback((i) => paged[i] && openVoucher(paged[i].id), [paged, openVoucher]);
    const { active, rowRef } = useRowKeys(paged.length, openRow);

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
                    <Stack alignItems="flex-end" spacing={0.5}>
                        <Button variant="contained" disableElevation
                            startIcon={<AddCircleOutline sx={{ fontSize: 16 }} />}
                            onClick={() => navigate("/accounting/vouchers/new")}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                            New Voucher
                        </Button>
                        <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                            <Kbd>↑</Kbd><Kbd>↓</Kbd> to move · <Kbd>Enter</Kbd> to open
                        </Typography>
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 2.5, borderColor: "#f1f5f9" }} />

                {/* Filters */}
                <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }} flexWrap="wrap">
                    <TextField label="From" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField label="To"   type="date" size="small" value={to}   onChange={(e) => setTo(e.target.value)}   InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField select label="Type" size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ width: 140 }}>
                        {MANUAL_TYPES.map((t) => <MenuItem key={t} value={t}>{t ? VOUCHER_TYPE_META[t].label : "All Types"}</MenuItem>)}
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
                            ) : paged.map((v, i) => (
                                <TableRow key={v.id} ref={rowRef(i)} onClick={() => openVoucher(v.id)}
                                    sx={{ ...rowSx(i === active), "& td": { borderBottom: "1px solid #f1f5f9", py: 1.25, px: "14px" } }}
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
                                        {v.sourceDocType && (() => {
                                            const src = sourceDoc(v.sourceDocType, v.sourceDocId);
                                            return src.path ? (
                                                <Link component="button" underline="hover"
                                                    onClick={(e) => { e.stopPropagation(); navigate(src.path); }}
                                                    sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "#2563eb" }}>
                                                    {src.label}
                                                </Link>
                                            ) : (
                                                <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{src.label}</Typography>
                                            );
                                        })()}
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

        </Box>
    );
};

export default VoucherRegister;
