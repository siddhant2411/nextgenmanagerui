import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    InputAdornment,
    MenuItem,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
    Stack,
    Tooltip,
    IconButton,
    Fade
} from "@mui/material";
import { Search, LocalShipping, CheckCircleOutline, History as HistoryIcon, MoreVert } from "@mui/icons-material";
import {
    getProcurementOrders,
    markProcurementOrderReceived,
    resolveApiErrorMessage
} from "../../services/inventoryService";
import { useAuth } from "../../auth/AuthContext";
import { ACTION_KEYS } from "../../auth/roles";
import { format } from "date-fns";

const statusColor = (status) => {
    switch (status) {
        case "CREATED": return "info";
        case "IN_PROGRESS": return "warning";
        case "COMPLETED": return "success";
        case "CANCELED": return "error";
        default: return "default";
    }
};

const decisionText = (decision) => {
    switch (decision) {
        case "PURCHASE_ORDER": return "Purchase Order";
        case "WORK_ORDER": return "Work Order";
        default: return decision || "-";
    }
};

const headerCellSx = {
    bgcolor: '#f8fafc',
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    py: 1.5,
    borderBottom: '2px solid #e2e8f0',
};

const ProcurementOrdersTabContent = ({ refreshKey }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [statusFilter, setStatusFilter] = useState("");
    const [itemCodeFilter, setItemCodeFilter] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const debounceTimeout = useRef(null);
    const { canAction, user } = useAuth();
    const canManageProcurement = canAction(ACTION_KEYS.INVENTORY_PROCUREMENT_WRITE);

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: rowsPerPage,
                status: statusFilter || undefined,
                itemCode: itemCodeFilter || undefined
            };
            const res = await getProcurementOrders(params);
            setOrders(res.content || []);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            showSnackbar(resolveApiErrorMessage(err, "Failed to load procurement orders"), "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, rowsPerPage, statusFilter, itemCodeFilter, refreshKey]);

    const handleMarkReceived = async (id) => {
        if (!canManageProcurement) return;
        try {
            const completedBy = user?.username || "System";
            await markProcurementOrderReceived(id, completedBy);
            showSnackbar("Stock marked as received and added to inventory.", "success");
            fetchOrders();
        } catch (err) {
            showSnackbar(resolveApiErrorMessage(err, "Failed to complete procurement."), "error");
        }
    };

    return (
        <Fade in={true} timeout={400}>
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} gap={2} flexWrap="wrap">
                    <Box>
                        <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                            Procurement Tracking
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Track external purchases and internal work orders for material replenishment
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            placeholder="Find by Item Code..."
                            value={itemCodeFilter}
                            onChange={(e) => setItemCodeFilter(e.target.value)}
                            size="small"
                            sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                            InputProps={{
                                startAdornment: <Search sx={{ color: '#64748b', fontSize: 18, mr: 0.5 }} />,
                            }}
                        />
                        <TextField
                            select
                            label="Status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            size="small"
                            sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                        >
                            <MenuItem value="">All Orders</MenuItem>
                            <MenuItem value="CREATED">Created</MenuItem>
                            <MenuItem value="IN_PROGRESS">Active</MenuItem>
                            <MenuItem value="COMPLETED">Completed</MenuItem>
                            <MenuItem value="CANCELED">Canceled</MenuItem>
                        </TextField>
                    </Stack>
                </Box>

                <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 4, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Resource Details</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Strategy</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Quantity</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Status</TableCell>
                                    <TableCell sx={headerCellSx}>Created By</TableCell>
                                    <TableCell sx={headerCellSx}>Timeline</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 10 }}><CircularProgress size={30} /></TableCell></TableRow>
                                ) : orders.map((order) => (
                                    <TableRow key={order.id} hover sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5, display: 'flex' }}>
                                                    <LocalShipping sx={{ fontSize: 18, color: '#475569' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main">{order.itemCode}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{order.itemName}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={decisionText(order.decision)} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, borderColor: '#e2e8f0' }} 
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={800}>{order.totalInstances}</Typography>
                                            <Typography variant="caption" color="text.secondary">ORD: #{order.orderId || '-'}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={order.status} 
                                                color={statusColor(order.status)} 
                                                size="small" 
                                                sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>{order.createdBy || 'System'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {order.creationDate ? format(new Date(order.creationDate), 'dd MMM yy') : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {(order.status === "IN_PROGRESS" || order.status === "CREATED") ? (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<CheckCircleOutline />}
                                                    onClick={() => handleMarkReceived(order.id)}
                                                    disabled={!canManageProcurement}
                                                    sx={{ 
                                                        textTransform: "none", 
                                                        fontWeight: 700, 
                                                        fontSize: '0.75rem',
                                                        borderRadius: 1.5,
                                                        bgcolor: '#0f172a',
                                                        '&:hover': { bgcolor: '#1e293b' }
                                                    }}
                                                >
                                                    Mark Received
                                                </Button>
                                            ) : (
                                                <IconButton size="small"><MoreVert /></IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && orders.length === 0 && (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 10 }}>No procurement orders found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={totalElements}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { 
                            setRowsPerPage(parseInt(e.target.value, 10)); 
                            setPage(0); 
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Paper>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                >
                    <Alert severity={snackbar.severity} sx={{ borderRadius: 2, boxShadow: 3 }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Fade>
    );
};

export default ProcurementOrdersTabContent;
