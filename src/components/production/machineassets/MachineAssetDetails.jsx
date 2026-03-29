import React, { useEffect, useState } from "react";
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
    Grid,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { ArrowBack, Edit, Delete, EventNote, PostAdd } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { PRODUCTION_MANAGE_ROLES } from "../../../auth/roles";
import {
    deleteMachineDetails,
    getMachineDetailsById,
} from "../../../services/machineAssetsService";
import AddProductionLogDialog from "./AddProductionLogDialog";
import LogMachineEventDialog from "./LogMachineEventDialog";
import ProductionLogsTable from "./ProductionLogsTable";
import StatusHistoryTable from "./StatusHistoryTable";
import {
    formatDateTime,
    getWorkCenterDisplayValue,
    resolveMachineErrorMessage,
} from "./machineAssetsHelpers";

const BORDER_COLOR = '#e5e7eb';

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

const InfoItem = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value || '-'}</Typography>
    </Box>
);

export default function MachineAssetDetails({ onSuccess, onError }) {
    const { machineId } = useParams();
    const navigate = useNavigate();
    const { hasAnyRole } = useAuth();
    const canManage = hasAnyRole(PRODUCTION_MANAGE_ROLES);

    const [machine, setMachine] = useState(null);
    const [machineLoading, setMachineLoading] = useState(true);
    const [machineError, setMachineError] = useState("");

    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [productionLogDialogOpen, setProductionLogDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [productionLogsRefreshKey, setProductionLogsRefreshKey] = useState(0);
    const [statusHistoryRefreshKey, setStatusHistoryRefreshKey] = useState(0);

    const loadMachine = async () => {
        if (!machineId) return;
        try {
            setMachineLoading(true);
            setMachineError("");
            const response = await getMachineDetailsById(machineId);
            setMachine(response);
        } catch (error) {
            const message = resolveMachineErrorMessage(error, "Failed to load machine details.");
            setMachineError(message);
            if (onError) onError(message);
        } finally {
            setMachineLoading(false);
        }
    };

    useEffect(() => { loadMachine(); }, [machineId]);

    const handleDelete = async () => {
        if (!machine?.id) { if (onError) onError("Machine id is missing."); return; }
        try {
            setIsDeleting(true);
            await deleteMachineDetails(machine.id);
            if (onSuccess) onSuccess("Machine deleted successfully.");
            navigate("/production/machine-assets");
        } catch (error) {
            if (onError) onError(resolveMachineErrorMessage(error, "Failed to delete machine."));
        } finally {
            setIsDeleting(false);
        }
    };

    if (machineLoading) return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
            <CircularProgress size={32} sx={{ color: '#1565c0' }} />
            <Typography variant="body2" color="text.secondary">Loading machine details...</Typography>
        </Box>
    );

    if (machineError) return (
        <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{machineError}</Alert>
            <Button size="small" variant="outlined" onClick={loadMachine} sx={{ textTransform: 'none' }}>Retry</Button>
        </Box>
    );

    const statusStyle = statusChipSx[machine?.machineStatus] || { bg: '#fafafa', color: '#757575' };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, mb: 2 }}>

                {/* Page Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center"
                    flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconButton onClick={() => navigate('/production/machine-assets')} size="small" sx={{ color: '#1565c0' }}>
                            <ArrowBack fontSize="small" />
                        </IconButton>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                                    {machine?.machineName || 'Machine Details'}
                                </Typography>
                                <Chip label={machine?.machineStatus || '-'} size="small" sx={{
                                    backgroundColor: statusStyle.bg, color: statusStyle.color,
                                    fontWeight: 500, fontSize: '0.7rem', height: 22,
                                }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                Code: {machine?.machineCode || '-'}
                            </Typography>
                        </Box>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {canManage && (
                            <>
                                <Button size="small" variant="outlined" startIcon={<Edit />}
                                    onClick={() => navigate(`/production/machine-assets/edit/${machine?.id}`)}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}>
                                    Edit
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<EventNote />}
                                    onClick={() => setEventDialogOpen(true)}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: '#1565c0', color: '#1565c0' }}>
                                    Log Event
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<PostAdd />}
                                    onClick={() => setProductionLogDialogOpen(true)}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: '#388e3c', color: '#388e3c' }}>
                                    Add Log
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Delete />}
                                    onClick={() => setDeleteDialogOpen(true)}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: '#d32f2f', color: '#d32f2f' }}>
                                    Delete
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>

                {/* Summary Cards */}
                <Grid container spacing={2} mb={2}>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                            <InfoItem label="Work Center" value={getWorkCenterDisplayValue(machine?.workCenter)} />
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                            <InfoItem label="Cost Per Hour" value={formatCurrency(machine?.costPerHour)} />
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                            <InfoItem label="Last Updated" value={formatDateTime(machine?.lastUpdate)} />
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                            <InfoItem label="Status" value={
                                <Chip label={machine?.machineStatus || '-'} size="small" sx={{
                                    backgroundColor: statusStyle.bg, color: statusStyle.color,
                                    fontWeight: 500, fontSize: '0.65rem', height: 20, mt: 0.5,
                                }} />
                            } />
                        </Paper>
                    </Grid>
                </Grid>

                {/* Description */}
                {machine?.description && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderColor: BORDER_COLOR }}>
                        <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                            sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>
                            Description
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{machine.description}</Typography>
                    </Paper>
                )}
            </Paper>

            {/* Production Logs */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}`, mb: 2 }}>
                <ProductionLogsTable machineId={machineId} refreshKey={productionLogsRefreshKey} onError={onError} />
            </Paper>

            {/* Status History */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>
                <StatusHistoryTable machineId={machineId} refreshKey={statusHistoryRefreshKey} onError={onError} />
            </Paper>

            {/* Dialogs */}
            <LogMachineEventDialog
                open={eventDialogOpen} machine={machine}
                onClose={() => setEventDialogOpen(false)}
                onSuccess={async (message) => {
                    if (onSuccess) onSuccess(message);
                    await loadMachine();
                    setStatusHistoryRefreshKey((prev) => prev + 1);
                }}
                onError={onError}
            />

            <AddProductionLogDialog
                open={productionLogDialogOpen} machine={machine}
                onClose={() => setProductionLogDialogOpen(false)}
                onSuccess={(message) => {
                    if (onSuccess) onSuccess(message);
                    setProductionLogsRefreshKey((prev) => prev + 1);
                }}
                onError={onError}
            />

            <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Delete Machine</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Delete "{machine?.machineName}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}
                        sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={isDeleting}
                        sx={{ textTransform: 'none' }}>{isDeleting ? "Deleting..." : "Delete"}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
