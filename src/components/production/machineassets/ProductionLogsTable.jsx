import React, { useEffect, useState } from "react";
import {
    Alert,
    Box,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Stack,
} from "@mui/material";
import { getMachineProductionLogs } from "../../../services/machineAssetsService";
import { normalizePageResponse, resolveMachineErrorMessage } from "./machineAssetsHelpers";

export default function ProductionLogsTable({ machineId, refreshKey = 0, onError }) {
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [state, setState] = useState({
        loading: true,
        error: "",
        pageData: normalizePageResponse([]),
    });

    useEffect(() => {
        if (!machineId) {
            return;
        }

        const loadLogs = async () => {
            try {
                setState((prev) => ({ ...prev, loading: true, error: "" }));
                const response = await getMachineProductionLogs(machineId, {
                    page,
                    size: rowsPerPage,
                    sortDir,
                });
                setState({
                    loading: false,
                    error: "",
                    pageData: normalizePageResponse(response),
                });
            } catch (error) {
                const message = resolveMachineErrorMessage(error, "Failed to load production logs.");
                setState((prev) => ({ ...prev, loading: false, error: message }));
                if (onError) {
                    onError(message);
                }
            }
        };

        loadLogs();
    }, [machineId, onError, page, refreshKey, rowsPerPage, sortDir]);

    const logs = state.pageData.content || [];

    return (
        <>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={1}
                sx={{ mb: 1 }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Production Logs
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    value={sortDir}
                    exclusive
                    onChange={(_, value) => {
                        if (!value) {
                            return;
                        }
                        setPage(0);
                        setSortDir(value);
                    }}
                >
                    <ToggleButton value="desc">Newest</ToggleButton>
                    <ToggleButton value="asc">Oldest</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {state.loading ? (
                <Box sx={{ minHeight: 140, display: "grid", placeItems: "center" }}>
                    <CircularProgress size={26} />
                </Box>
            ) : state.error ? (
                <Alert severity="error">{state.error}</Alert>
            ) : logs.length === 0 ? (
                <Typography color="text.secondary">No production logs found.</Typography>
            ) : (
                <>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Production Date</TableCell>
                                    <TableCell>Shift</TableCell>
                                    <TableCell align="right">Planned</TableCell>
                                    <TableCell align="right">Actual</TableCell>
                                    <TableCell align="right">Rejected</TableCell>
                                    <TableCell align="right">Runtime (m)</TableCell>
                                    <TableCell align="right">Downtime (m)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((row, index) => (
                                    <TableRow key={row.id || `${row.productionDate}-${index}`}>
                                        <TableCell>{row.productionDate || "-"}</TableCell>
                                        <TableCell>{row.shiftId || "-"}</TableCell>
                                        <TableCell align="right">{row.plannedQuantity ?? "-"}</TableCell>
                                        <TableCell align="right">{row.actualQuantity ?? "-"}</TableCell>
                                        <TableCell align="right">{row.rejectedQuantity ?? "-"}</TableCell>
                                        <TableCell align="right">{row.runtimeMinutes ?? "-"}</TableCell>
                                        <TableCell align="right">{row.downtimeMinutes ?? "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        page={page}
                        onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 20, 50]}
                        count={state.pageData.totalElements}
                    />
                </>
            )}
        </>
    );
}
