import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    IconButton,
    FormControl,
    InputLabel,
    Menu,
    MenuItem,
    Paper,
    Select,
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
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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

const statusFilterOptions = ["ALL", ...MACHINE_STATUS_OPTIONS];
const sortFields = [
    { label: "Machine Name", value: "machineName" },
    { label: "Status", value: "machineStatus" },
    { label: "Work Center", value: "workCenterName" },
    { label: "Cost/Hour", value: "costPerHour" },
];

const StatusChip = ({ status }) => (
    <Chip
        size="small"
        label={status || "-"}
        color={MACHINE_STATUS_COLOR_MAP[status] || "default"}
        sx={{ fontWeight: 600, minWidth: 140 }}
    />
);

export default function MachineAssetList({ onSuccess, onError }) {
    const navigate = useNavigate();
    const { hasAnyRole } = useAuth();
    const canManage = hasAnyRole(PRODUCTION_MANAGE_ROLES);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const [machines, setMachines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [workCenterFilter, setWorkCenterFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("machineName");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);

    const [eventDialogMachine, setEventDialogMachine] = useState(null);
    const [productionLogMachine, setProductionLogMachine] = useState(null);
    const [deleteDialogMachine, setDeleteDialogMachine] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
    const [actionMenuMachine, setActionMenuMachine] = useState(null);

    const loadMachines = useCallback(async () => {
        const filters = [];
        const normalizedSearch = debouncedSearchText.trim();
        if (normalizedSearch) {
            filters.push({
                field: "search",
                operator: "contains",
                value: normalizedSearch,
            });
        }
        if (statusFilter !== "ALL") {
            filters.push({
                field: "machineStatus",
                operator: "=",
                value: statusFilter,
            });
        }
        if (workCenterFilter !== "ALL") {
            filters.push({
                field: "workCenterName",
                operator: "contains",
                value: workCenterFilter,
            });
        }

        try {
            setIsLoading(true);
            setErrorMessage("");
            const response = await filterMachineDetails({
                page,
                size,
                sortBy,
                sortDir,
                filters,
            });
            const rows = Array.isArray(response?.content) ? response.content : [];
            setMachines(rows);
            setTotalElements(response?.totalElements ?? rows.length);
            setPage(response?.number ?? page);
            setSize(response?.size ?? size);
        } catch (error) {
            const message = resolveMachineErrorMessage(error, "Failed to load machines.");
            setErrorMessage(message);
            onError(message);
            setMachines([]);
            setTotalElements(0);
        } finally {
            setIsLoading(false);
        }
    }, [
        debouncedSearchText,
        onError,
        page,
        size,
        sortBy,
        sortDir,
        statusFilter,
        workCenterFilter,
    ]);

    useEffect(() => {
        loadMachines();
    }, [loadMachines]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [searchText]);

    useEffect(() => {
        setPage(0);
    }, [debouncedSearchText, statusFilter, workCenterFilter, sortBy, sortDir]);

    const workCenterOptions = useMemo(() => {
        const uniqueWorkCenters = Array.from(
            new Set(
                machines
                    .map((machine) => getWorkCenterDisplayValue(machine?.workCenter))
                    .filter((workCenter) => workCenter.trim())
            )
        );
        return ["ALL", ...uniqueWorkCenters.sort((a, b) => a.localeCompare(b))];
    }, [machines]);

    const handleDeleteMachine = async () => {
        if (!deleteDialogMachine?.id) {
            onError("Machine id is missing.");
            return;
        }
        try {
            setIsDeleting(true);
            await deleteMachineDetails(deleteDialogMachine.id);
            onSuccess("Machine deleted successfully.");
            setDeleteDialogMachine(null);
            await loadMachines();
        } catch (error) {
            onError(resolveMachineErrorMessage(error, "Failed to delete machine."));
        } finally {
            setIsDeleting(false);
        }
    };

    const openActionMenu = (event, machine) => {
        setActionMenuAnchorEl(event.currentTarget);
        setActionMenuMachine(machine);
    };

    const closeActionMenu = () => {
        setActionMenuAnchorEl(null);
        setActionMenuMachine(null);
    };

    const actionButtons = (machine) => (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={() => navigate(`/production/machine-assets/${machine.id}`)}>
                Details
            </Button>
            <Button
                size="small"
                onClick={() => navigate(`/production/machine-assets/edit/${machine.id}`)}
                disabled={!canManage}
            >
                Edit
            </Button>
            <Button size="small" onClick={() => setEventDialogMachine(machine)} disabled={!canManage}>
                Log Event
            </Button>
            <Button size="small" onClick={() => setProductionLogMachine(machine)} disabled={!canManage}>
                Add Production Log
            </Button>
            <Button
                color="error"
                size="small"
                onClick={() => setDeleteDialogMachine(machine)}
                disabled={!canManage}
            >
                Delete
            </Button>
        </Stack>
    );

    return (
        <Card elevation={0} sx={{ border: "1px solid #e5e9f2", borderRadius: 2 }}>
            <CardContent>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                >
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                        Machine Assets
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => navigate("/production/machine-assets/add")}
                        disabled={!canManage}
                    >
                        Create Machine
                    </Button>
                </Stack>

                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", md: "center" }}
                    sx={{ mb: 2 }}
                >
                    <TextField
                        size="small"
                        label="Search"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="Name, code, work center..."
                        fullWidth
                    />
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearchText("");
                            setPage(0);
                        }}
                    >
                        Clear Search
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={(event) => setStatusFilter(event.target.value)}
                        >
                            {statusFilterOptions.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Work Center</InputLabel>
                        <Select
                            value={workCenterFilter}
                            label="Work Center"
                            onChange={(event) => setWorkCenterFilter(event.target.value)}
                        >
                            {workCenterOptions.map((workCenter) => (
                                <MenuItem key={workCenter} value={workCenter}>
                                    {workCenter}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortBy}
                            label="Sort By"
                            onChange={(event) => setSortBy(event.target.value)}
                        >
                            {sortFields.map((field) => (
                                <MenuItem key={field.value} value={field.value}>
                                    {field.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Order</InputLabel>
                        <Select
                            value={sortDir}
                            label="Order"
                            onChange={(event) => setSortDir(event.target.value)}
                        >
                            <MenuItem value="asc">Asc</MenuItem>
                            <MenuItem value="desc">Desc</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearchText("");
                            setDebouncedSearchText("");
                            setStatusFilter("ALL");
                            setWorkCenterFilter("ALL");
                            setSortBy("machineName");
                            setSortDir("asc");
                            setPage(0);
                        }}
                    >
                        Clear Filters
                    </Button>
                </Stack>

                {isLoading ? (
                    <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : errorMessage ? (
                    <Stack spacing={1.5} alignItems="flex-start">
                        <Alert severity="error">{errorMessage}</Alert>
                        <Button size="small" variant="outlined" onClick={loadMachines}>
                            Retry
                        </Button>
                    </Stack>
                ) : machines.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                        <Typography color="text.secondary">No machines found</Typography>
                    </Paper>
                ) : isMobile ? (
                    <Stack spacing={1.5}>
                        {machines.map((machine) => (
                            <Paper key={machine.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography fontWeight={700}>{machine.machineName || "-"}</Typography>
                                        <StatusChip status={machine.machineStatus} />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        Code: {machine.machineCode || "-"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Work Center: {machine?.workCenter?.workCenterName || getWorkCenterDisplayValue(machine.workCenter) || "-"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Cost/Hour: {machine.costPerHour ?? "-"}
                                    </Typography>
                                    {actionButtons(machine)}
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Machine Code</TableCell>
                                    <TableCell>Machine Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Work Center</TableCell>
                                    <TableCell align="right">Cost/Hour</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {machines.map((machine) => (
                                    <TableRow key={machine.id} hover>
                                        <TableCell>{machine.machineCode || "-"}</TableCell>
                                        <TableCell>{machine.machineName || "-"}</TableCell>
                                        <TableCell>
                                            <StatusChip status={machine.machineStatus} />
                                        </TableCell>
                                        <TableCell>
                                            {machine?.workCenter?.workCenterName || getWorkCenterDisplayValue(machine.workCenter) || "-"}
                                        </TableCell>
                                        <TableCell align="right">{machine.costPerHour ?? "-"}</TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                onClick={(event) => openActionMenu(event, machine)}
                                                aria-label="Open actions"
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {!isLoading && !errorMessage && totalElements > 0 ? (
                    <TablePagination
                        component="div"
                        count={totalElements}
                        page={page}
                        onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={size}
                        onRowsPerPageChange={(event) => {
                            setSize(Number(event.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                ) : null}
            </CardContent>

            <LogMachineEventDialog
                open={Boolean(eventDialogMachine)}
                machine={eventDialogMachine}
                onClose={() => setEventDialogMachine(null)}
                onSuccess={async (message) => {
                    onSuccess(message);
                    await loadMachines();
                }}
                onError={onError}
            />

            <AddProductionLogDialog
                open={Boolean(productionLogMachine)}
                machine={productionLogMachine}
                onClose={() => setProductionLogMachine(null)}
                onSuccess={async (message) => {
                    onSuccess(message);
                    await loadMachines();
                }}
                onError={onError}
            />

            <Dialog
                open={Boolean(deleteDialogMachine)}
                onClose={() => {
                    if (!isDeleting) {
                        setDeleteDialogMachine(null);
                    }
                }}
            >
                <DialogTitle>Delete Machine</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Delete machine "{deleteDialogMachine?.machineName || ""}"? Backend keeps a soft-delete
                        audit trail.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogMachine(null)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button color="error" variant="contained" onClick={handleDeleteMachine} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={actionMenuAnchorEl}
                open={Boolean(actionMenuAnchorEl)}
                onClose={closeActionMenu}
            >
                <MenuItem
                    onClick={() => {
                        if (actionMenuMachine?.id) {
                            navigate(`/production/machine-assets/${actionMenuMachine.id}`);
                        }
                        closeActionMenu();
                    }}
                >
                    Details
                </MenuItem>
                <MenuItem
                    disabled={!canManage}
                    onClick={() => {
                        if (actionMenuMachine?.id) {
                            navigate(`/production/machine-assets/edit/${actionMenuMachine.id}`);
                        }
                        closeActionMenu();
                    }}
                >
                    Edit
                </MenuItem>
                <MenuItem
                    disabled={!canManage}
                    onClick={() => {
                        setEventDialogMachine(actionMenuMachine);
                        closeActionMenu();
                    }}
                >
                    Log Event
                </MenuItem>
                <MenuItem
                    disabled={!canManage}
                    onClick={() => {
                        setProductionLogMachine(actionMenuMachine);
                        closeActionMenu();
                    }}
                >
                    Add Production Log
                </MenuItem>
                <MenuItem
                    disabled={!canManage}
                    onClick={() => {
                        setDeleteDialogMachine(actionMenuMachine);
                        closeActionMenu();
                    }}
                    sx={{ color: "error.main" }}
                >
                    Delete
                </MenuItem>
            </Menu>
        </Card>
    );
}
