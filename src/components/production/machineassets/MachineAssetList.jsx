import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    InputAdornment,
    Tooltip,
    Typography,
    Snackbar,
} from "@mui/material";
import { Search, Add, Edit, Delete, Visibility } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { PRODUCTION_MANAGE_ROLES } from "../../../auth/roles";
import {
    deleteMachineDetails,
    filterMachineDetails,
} from "../../../services/machineAssetsService";
import AddProductionLogDialog from "./AddProductionLogDialog";
import { MACHINE_STATUS_COLOR_MAP, MACHINE_STATUS_OPTIONS } from "./constants";
import LogMachineEventDialog from "./LogMachineEventDialog";
import {
    getWorkCenterDisplayValue,
    resolveMachineErrorMessage,
} from "./machineAssetsHelpers";

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';
const ROW_HOVER = '#e3f2fd';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: 0.3,
    py: 1.25,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
};

const statusChipSx = {
    ACTIVE: { bg: '#e8f5e9', color: '#2e7d32' },
    IDLE: { bg: '#fff3e0', color: '#e65100' },
    MAINTENANCE: { bg: '#e3f2fd', color: '#1565c0' },
    BREAKDOWN: { bg: '#ffebee', color: '#c62828' },
    DECOMMISSIONED: { bg: '#fafafa', color: '#757575' },
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
};

export default function MachineAssetList({ onSuccess, onError }) {
    const navigate = useNavigate();
    const { hasAnyRole } = useAuth();
    const canManage = hasAnyRole(PRODUCTION_MANAGE_ROLES);

    const [machines, setMachines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [sortBy, setSortBy] = useState("machineName");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);

    const [eventDialogMachine, setEventDialogMachine] = useState(null);
    const [productionLogMachine, setProductionLogMachine] = useState(null);
    const [deleteDialogMachine, setDeleteDialogMachine] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const loadMachines = useCallback(async () => {
        const filters = [];
        const normalizedSearch = debouncedSearchText.trim();
        if (normalizedSearch) {
            filters.push({ field: "search", operator: "contains", value: normalizedSearch });
        }

        try {
            setIsLoading(true);
            setErrorMessage("");
            const response = await filterMachineDetails({ page, size, sortBy, sortDir, filters });
            const rows = Array.isArray(response?.content) ? response.content : [];
            setMachines(rows);
            setTotalElements(response?.totalElements ?? rows.length);
            setPage(response?.number ?? page);
            setSize(response?.size ?? size);
        } catch (error) {
            const message = resolveMachineErrorMessage(error, "Failed to load machines.");
            setErrorMessage(message);
            if (onError) onError(message);
            setMachines([]);
            setTotalElements(0);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchText, onError, page, size, sortBy, sortDir]);

    useEffect(() => { loadMachines(); }, [loadMachines]);

    useEffect(() => {
        const timeoutId = setTimeout(() => setDebouncedSearchText(searchText), 400);
        return () => clearTimeout(timeoutId);
    }, [searchText]);

    useEffect(() => { setPage(0); }, [debouncedSearchText, sortBy, sortDir]);

    const handleDeleteMachine = async () => {
        if (!deleteDialogMachine?.id) { if (onError) onError("Machine id is missing."); return; }
        try {
            setIsDeleting(true);
            await deleteMachineDetails(deleteDialogMachine.id);
            if (onSuccess) onSuccess("Machine deleted successfully.");
            setDeleteDialogMachine(null);
            await loadMachines();
        } catch (error) {
            if (onError) onError(resolveMachineErrorMessage(error, "Failed to delete machine."));
        } finally {
            setIsDeleting(false);
        }
    };

    const renderStatusChip = (status) => {
        const style = statusChipSx[status] || { bg: '#fafafa', color: '#757575' };
        return (
            <Chip label={status || '-'} size="small" sx={{
                backgroundColor: style.bg, color: style.color,
                fontWeight: 500, fontSize: '0.7rem', height: 24,
            }} />
        );
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>

                {/* Page Header */}
                <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                            Machine Assets
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Manage production machines and equipment
                        </Typography>
                    </Box>
                    {canManage && (
                        <Button variant="contained" startIcon={<Add />}
                            onClick={() => navigate("/production/machine-assets/add")}
                            sx={{
                                borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5,
                                boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                                bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                                alignSelf: { xs: 'stretch', sm: 'center' },
                            }}>
                            Add Machine
                        </Button>
                    )}
                </Box>

                {/* Search */}
                <Box mb={2}>
                    <TextField
                        size="small"
                        placeholder="Search by name, code, work center..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        sx={{
                            width: { xs: '100%', sm: 300 },
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.875rem' },
                        }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#9ca3af' }} /></InputAdornment>,
                        }}
                    />
                </Box>

                {/* Loading */}
                {isLoading && (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="40vh" gap={2}>
                        <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading machines...</Typography>
                    </Box>
                )}

                {/* Error */}
                {!isLoading && errorMessage && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" sx={{ borderRadius: 1.5 }}>{errorMessage}</Alert>
                        <Button size="small" variant="outlined" onClick={loadMachines} sx={{ mt: 1, textTransform: 'none' }}>Retry</Button>
                    </Box>
                )}

                {/* Table */}
                {!isLoading && !errorMessage && (
                    <TableContainer component={Paper} variant="outlined"
                        sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR, maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ ...headerCellSx, width: 50 }}>#</TableCell>
                                    <TableCell sx={headerCellSx}>Machine Code</TableCell>
                                    <TableCell sx={headerCellSx}>Machine Name</TableCell>
                                    <TableCell sx={headerCellSx}>Status</TableCell>
                                    <TableCell sx={headerCellSx}>Work Center</TableCell>
                                    <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Cost/Hour</TableCell>
                                    <TableCell sx={{ ...headerCellSx, width: 130, textAlign: 'center' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {machines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <Typography variant="body2" color="text.secondary">No machines found</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {machines.map((machine, index) => (
                                    <TableRow key={machine.id}
                                        sx={{
                                            bgcolor: index % 2 === 0 ? '#fafbfc' : '#fff',
                                            transition: 'background 0.15s',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: ROW_HOVER },
                                            '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                        }}
                                        onClick={() => navigate(`/production/machine-assets/${machine.id}`)}
                                    >
                                        <TableCell sx={{ color: '#6b7280', fontWeight: 500 }}>{index + 1 + page * size}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#1565c0' }}>{machine.machineCode || '-'}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{machine.machineName || '-'}</TableCell>
                                        <TableCell>{renderStatusChip(machine.machineStatus)}</TableCell>
                                        <TableCell>{machine?.workCenter?.workCenterName || getWorkCenterDisplayValue(machine.workCenter) || '-'}</TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(machine.costPerHour)}</TableCell>
                                        <TableCell sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title="View Details">
                                                <IconButton size="small" onClick={() => navigate(`/production/machine-assets/${machine.id}`)}
                                                    sx={{ color: '#1565c0' }}>
                                                    <Visibility sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            {canManage && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" onClick={() => navigate(`/production/machine-assets/edit/${machine.id}`)}
                                                            sx={{ color: '#1565c0' }}>
                                                            <Edit sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" onClick={() => setDeleteDialogMachine(machine)}
                                                            sx={{ color: '#d32f2f' }}>
                                                            <Delete sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Pagination */}
                {!isLoading && !errorMessage && totalElements > 0 && (
                    <TablePagination
                        component="div"
                        count={totalElements}
                        page={page}
                        onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={size}
                        onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                        rowsPerPageOptions={[10, 25, 50]}
                        sx={{
                            borderTop: `1px solid ${BORDER_COLOR}`,
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
                        }}
                    />
                )}
            </Paper>

            {/* Event Dialog */}
            <LogMachineEventDialog
                open={Boolean(eventDialogMachine)}
                machine={eventDialogMachine}
                onClose={() => setEventDialogMachine(null)}
                onSuccess={async (message) => { if (onSuccess) onSuccess(message); await loadMachines(); }}
                onError={onError}
            />

            {/* Production Log Dialog */}
            <AddProductionLogDialog
                open={Boolean(productionLogMachine)}
                machine={productionLogMachine}
                onClose={() => setProductionLogMachine(null)}
                onSuccess={async (message) => { if (onSuccess) onSuccess(message); await loadMachines(); }}
                onError={onError}
            />

            {/* Delete Confirmation */}
            <Dialog open={Boolean(deleteDialogMachine)}
                onClose={() => { if (!isDeleting) setDeleteDialogMachine(null); }}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete Machine</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Delete machine "{deleteDialogMachine?.machineName || ''}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogMachine(null)} disabled={isDeleting}
                        sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteMachine} disabled={isDeleting}
                        sx={{ textTransform: 'none' }}>{isDeleting ? "Deleting..." : "Delete"}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
