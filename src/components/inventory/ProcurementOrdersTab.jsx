import React, { useEffect, useState, useRef } from "react";
import {
    Box,
    TextField,
    Button,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    CircularProgress,
    Snackbar,
    Alert
} from "@mui/material";
import { Search } from "@mui/icons-material";
import InputAdornment from "@mui/material/InputAdornment";
import apiService from "../../services/apiService";

const ProcurementOrdersTabContent = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [itemCodeFilter, setItemCodeFilter] = useState("");
    const [createdByFilter, setCreatedByFilter] = useState("");

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const debounceTimeout = useRef(null);

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
    };
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: rowsPerPage,
                status: statusFilter || undefined,
                createdBy: createdByFilter || undefined,
                // you can add itemCode mapping to id if backend supports it
                itemCode: itemCodeFilter || undefined
            };
            const res = await apiService.get("/inventory/inventory-procurement-orders", params);
            setOrders(res.content || []);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            console.error("Failed to load procurement orders:", err);
            showSnackbar("Failed to load procurement orders", "error");
        } finally {
            setLoading(false);
        }
    };

    // Debounced fetch on filter change
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setPage(0);
            fetchOrders();
        }, 500);

        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, itemCodeFilter, createdByFilter]);

    // Fetch on page/rowsPerPage change
    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage]);

    const handleComplete = async (id) => {
        try {
            const completedBy = "managerUser"; // replace with logged in user
            await apiService.put(`/inventory/inventory-procurement-orders/${id}/complete`, null, {
                params: { completedBy }
            });
            showSnackbar("Procurement order marked as completed!", "success");
            fetchOrders();
        } catch (err) {
            console.error("Failed to complete order:", err);
            showSnackbar("Failed to complete order", "error");
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: "#fff", borderRadius: 2 }}>
            {/* Filters */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                flexWrap="wrap"
                gap={2}
            >
                <TextField
                    select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="small"
                    sx={{ width: "160px" }}
                >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="CREATED">Created</MenuItem>
                    <MenuItem value="IN_PROGRESS">IN Progress</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="CANCELED">Canceled</MenuItem>
                </TextField>

                <TextField
                    label="Item Code"
                    value={itemCodeFilter}
                    onChange={(e) => setItemCodeFilter(e.target.value)}
                    size="small"
                    sx={{ width: "160px" }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <Search fontSize="small" />
                            </InputAdornment>
                        )
                    }}
                />

                <TextField
                    label="Created By"
                    value={createdByFilter}
                    onChange={(e) => setCreatedByFilter(e.target.value)}
                    size="small"
                    sx={{ width: "160px" }}
                />

                <Button
                    variant="contained"
                    onClick={() => {
                        setPage(0);
                        fetchOrders();
                    }}
                >
                    Apply Filters
                </Button>
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Table */}
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><b>ID</b></TableCell>
                                    <TableCell><b>Item Code</b></TableCell>
                                    <TableCell><b>Item Name</b></TableCell>
                                    <TableCell><b>Status</b></TableCell>
                                    <TableCell><b>Decision</b></TableCell>
                                    <TableCell><b>Total Instances</b></TableCell>
                                    <TableCell><b>Request ID</b></TableCell>
                                    <TableCell><b>Created By</b></TableCell>
                                    <TableCell><b>Creation Date</b></TableCell>
                                    <TableCell align="center"><b>Action</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id} hover>
                                        <TableCell>{order.id}</TableCell>
                                        <TableCell>{order.itemCode}</TableCell>
                                        <TableCell>{order.itemName}</TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell>{order.decision}</TableCell>
                                        <TableCell>{order.totalInstances}</TableCell>
                                        <TableCell>{order.requestId}</TableCell>
                                        <TableCell>{order.createdBy}</TableCell>
                                        <TableCell>
                                            {order.creationDate ? new Date(order.creationDate).toLocaleDateString() : ""}
                                        </TableCell>
                                        <TableCell align="center">
                                            {order.status === "IN_PROGRESS" || order.status ==="CREATED" && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleComplete(order.id)}
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={totalElements}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </>
            )}
        </Box>
    );
};

export default ProcurementOrdersTabContent;
