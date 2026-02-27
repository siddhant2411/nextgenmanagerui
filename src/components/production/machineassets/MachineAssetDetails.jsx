import React, { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { PRODUCTION_MANAGE_ROLES } from "../../../auth/roles";
import {
    deleteMachineDetails,
    getMachineDetailsById,
} from "../../../services/machineAssetsService";
import AddProductionLogDialog from "./AddProductionLogDialog";
import { MACHINE_STATUS_COLOR_MAP } from "./constants";
import LogMachineEventDialog from "./LogMachineEventDialog";
import ProductionLogsTable from "./ProductionLogsTable";
import StatusHistoryTable from "./StatusHistoryTable";
import {
    formatDateTime,
    getWorkCenterDisplayValue,
    resolveMachineErrorMessage,
} from "./machineAssetsHelpers";

const SummaryCard = ({ title, value, accent = "#1976d2" }) => (
    <Paper
        variant="outlined"
        sx={{
            p: 1.5,
            borderRadius: 2,
            position: "relative",
            overflow: "hidden",
            minHeight: 90,
        }}
    >
        <Box
            sx={{
                position: "absolute",
                top: -18,
                right: -18,
                width: 58,
                height: 58,
                borderRadius: "50%",
                backgroundColor: accent,
                opacity: 0.12,
            }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {title}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
            {value || "-"}
        </Typography>
    </Paper>
);

const StatusChip = ({ status }) => (
    <Chip
        size="small"
        label={status || "-"}
        color={MACHINE_STATUS_COLOR_MAP[status] || "default"}
        sx={{ fontWeight: 700 }}
    />
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
        if (!machineId) {
            return;
        }

        try {
            setMachineLoading(true);
            setMachineError("");
            const response = await getMachineDetailsById(machineId);
            setMachine(response);
        } catch (error) {
            const message = resolveMachineErrorMessage(error, "Failed to load machine details.");
            setMachineError(message);
            onError(message);
        } finally {
            setMachineLoading(false);
        }
    };

    useEffect(() => {
        loadMachine();
    }, [machineId]);

    const handleDelete = async () => {
        if (!machine?.id) {
            onError("Machine id is missing.");
            return;
        }

        try {
            setIsDeleting(true);
            await deleteMachineDetails(machine.id);
            onSuccess("Machine deleted successfully.");
            navigate("/production/machine-assets");
        } catch (error) {
            onError(resolveMachineErrorMessage(error, "Failed to delete machine."));
        } finally {
            setIsDeleting(false);
        }
    };

    if (machineLoading) {
        return (
            <Stack sx={{ minHeight: 240, placeItems: "center", display: "grid" }}>
                <CircularProgress />
            </Stack>
        );
    }

    if (machineError) {
        return (
            <Stack spacing={1.5}>
                <Alert severity="error">{machineError}</Alert>
                <Button size="small" variant="outlined" onClick={loadMachine} sx={{ width: "fit-content" }}>
                    Retry
                </Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <Card elevation={0} sx={{ border: "1px solid #e5e9f2", borderRadius: 2 }}>
                <CardContent>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", md: "center" }}
                        spacing={1.5}
                    >
                        <Box>
                            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                                {machine?.machineName || "Machine Details"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Code: {machine?.machineCode || "-"}
                            </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                            <Button variant="outlined" onClick={() => navigate("/production/machine-assets")}>
                                Back
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(`/production/machine-assets/edit/${machine?.id}`)}
                                disabled={!canManage}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => setEventDialogOpen(true)}
                                disabled={!canManage}
                            >
                                Log Event
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => setProductionLogDialogOpen(true)}
                                disabled={!canManage}
                            >
                                Add Production Log
                            </Button>
                            <Button
                                color="error"
                                variant="outlined"
                                onClick={() => setDeleteDialogOpen(true)}
                                disabled={!canManage}
                            >
                                Delete
                            </Button>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                            gap: 1.5,
                        }}
                    >
                        <SummaryCard title="Latest Status" value={<StatusChip status={machine?.machineStatus} />} accent="#22c55e" />
                        <SummaryCard
                            title="Work Center"
                            value={getWorkCenterDisplayValue(machine?.workCenter) || "-"}
                            accent="#0284c7"
                        />
                        <SummaryCard title="Cost Per Hour" value={machine?.costPerHour ?? "-"} accent="#7c3aed" />
                        <SummaryCard
                            title="Last Updated"
                            value={formatDateTime(machine?.lastUpdate)}
                            accent="#f97316"
                        />
                    </Box>

                    {machine?.description ? (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Description
                            </Typography>
                            <Typography variant="body2">{machine.description}</Typography>
                        </Paper>
                    ) : null}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid #e5e9f2", borderRadius: 2 }}>
                <CardContent>
                    <ProductionLogsTable
                        machineId={machineId}
                        refreshKey={productionLogsRefreshKey}
                        onError={onError}
                    />
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid #e5e9f2", borderRadius: 2 }}>
                <CardContent>
                    <StatusHistoryTable
                        machineId={machineId}
                        refreshKey={statusHistoryRefreshKey}
                        onError={onError}
                    />
                </CardContent>
            </Card>

            <LogMachineEventDialog
                open={eventDialogOpen}
                machine={machine}
                onClose={() => setEventDialogOpen(false)}
                onSuccess={async (message) => {
                    onSuccess(message);
                    await loadMachine();
                    setStatusHistoryRefreshKey((prev) => prev + 1);
                }}
                onError={onError}
            />

            <AddProductionLogDialog
                open={productionLogDialogOpen}
                machine={machine}
                onClose={() => setProductionLogDialogOpen(false)}
                onSuccess={(message) => {
                    onSuccess(message);
                    setProductionLogsRefreshKey((prev) => prev + 1);
                }}
                onError={onError}
            />

            <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Machine</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Delete this machine? Backend performs soft delete for audit.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
