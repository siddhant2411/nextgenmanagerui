import React, { useEffect, useState } from "react";
import {
    Alert,
    Box,
    CircularProgress,
    Paper,
    Stack,
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
} from "@mui/material";
import { getMachineStatusHistory } from "../../../services/machineAssetsService";
import {
    formatDateTime,
    normalizePageResponse,
    resolveMachineErrorMessage,
} from "./machineAssetsHelpers";

export default function StatusHistoryTable({ machineId, refreshKey = 0, onError }) {
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

        const loadHistory = async () => {
            try {
                setState((prev) => ({ ...prev, loading: true, error: "" }));
                const response = await getMachineStatusHistory(machineId, {
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
                const message = resolveMachineErrorMessage(error, "Failed to load status history.");
                setState((prev) => ({ ...prev, loading: false, error: message }));
                if (onError) {
                    onError(message);
                }
            }
        };

        loadHistory();
    }, [machineId, onError, page, refreshKey, rowsPerPage, sortDir]);

    const history = state.pageData.content || [];

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
                    Status History
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
            ) : history.length === 0 ? (
                <Typography color="text.secondary">No status history records found.</Typography>
            ) : (
                <>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Start Time</TableCell>
                                    <TableCell>End Time</TableCell>
                                    <TableCell>Old Status</TableCell>
                                    <TableCell>New Status</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Changed By</TableCell>
                                    <TableCell>Source</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((row, index) => (
                                    <TableRow key={row.id || `${row.startedAt}-${index}`}>
                                        <TableCell>
                                            {formatDateTime(
                                                row.startedAt
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDateTime(row.endedAt || null)}</TableCell>
                                        <TableCell>{row.oldStatus || "-"}</TableCell>
                                        <TableCell>{row.newStatus || "-"}</TableCell>
                                        <TableCell>{row.reason || "-"}</TableCell>
                                        <TableCell>
                                            {row.changedBy || row.changedByName || row.username || "-"}
                                        </TableCell>
                                        <TableCell>{row.source || "-"}</TableCell>
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
