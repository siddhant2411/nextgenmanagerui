import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    BuildOutlined,
    ShoppingCartOutlined,
    SnoozeOutlined,
    RefreshOutlined,
} from "@mui/icons-material";
import procurementPlanningService, {
    resolveApiErrorMessage,
} from "../../services/procurementPlanningService";

const RECOMMENDATION_STYLE = {
    MAKE: { label: "Make", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    BUY: { label: "Buy", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    SUBCONTRACT: { label: "Subcontract", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    INSUFFICIENT_DATA: { label: "No data", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const money = (v) =>
    v === null || v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const qty = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));

const PlanningDeskPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actingId, setActingId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await procurementPlanningService.getPlanningQueue();
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Unable to load the planning queue."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const notify = (message, severity = "success") =>
        setSnackbar({ open: true, message, severity });

    const runAction = async (row, action, label) => {
        setActingId(row.procurementOrderId);
        try {
            await action(row.procurementOrderId);
            notify(`${row.itemCode}: ${label}`);
            await load();
        } catch (e) {
            notify(resolveApiErrorMessage(e, `Could not ${label.toLowerCase()}.`), "error");
        } finally {
            setActingId(null);
        }
    };

    const handleMake = (row) =>
        runAction(row, procurementPlanningService.decideMake, "Work Order created");
    const handleBuy = (row) =>
        runAction(row, procurementPlanningService.decideBuy, "Purchase Requisition created");
    const handleDefer = (row) =>
        runAction(row, procurementPlanningService.deferNeed, "Need deferred");

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Procurement Planning Desk
                </Typography>
                <Button
                    startIcon={<RefreshOutlined />}
                    onClick={load}
                    size="small"
                    variant="outlined"
                >
                    Refresh
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Needs that could not be auto-routed. Each row shows the system's make-or-buy recommendation — decide to Make, Buy, or Defer.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : rows.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Nothing awaiting a decision
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Unambiguous needs are auto-routed to Work Orders / Purchase Requisitions.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
                                <TableCell>Item</TableCell>
                                <TableCell>Sales Order</TableCell>
                                <TableCell align="right">Shortfall</TableCell>
                                <TableCell>Recommendation</TableCell>
                                <TableCell align="right">Make / unit</TableCell>
                                <TableCell align="right">Buy / unit</TableCell>
                                <TableCell align="center">Decision</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => {
                                const rec = RECOMMENDATION_STYLE[row.recommendedDecision] || RECOMMENDATION_STYLE.INSUFFICIENT_DATA;
                                const busy = actingId === row.procurementOrderId;
                                const recommendMake = row.recommendedDecision === "MAKE";
                                const recommendBuy = row.recommendedDecision === "BUY" || row.recommendedDecision === "SUBCONTRACT";
                                return (
                                    <TableRow key={row.procurementOrderId} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {row.itemCode}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {row.itemName}
                                            </Typography>
                                            <Tooltip title={row.undecidedReason || ""} arrow>
                                                <Box sx={{ mt: 0.5, display: "flex", gap: 0.5 }}>
                                                    {row.manufactured && (
                                                        <Chip label="Manufactured" size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                                                    )}
                                                    {row.purchased && (
                                                        <Chip label="Purchased" size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                                                    )}
                                                </Box>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{row.salesOrderNumber || "—"}</TableCell>
                                        <TableCell align="right">{qty(row.shortfallQty)}</TableCell>
                                        <TableCell>
                                            <Tooltip title={row.recommendationReason || ""} arrow>
                                                <Chip
                                                    label={rec.label}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: rec.bg,
                                                        color: rec.color,
                                                        fontWeight: 700,
                                                        border: `1px solid ${rec.color}55`,
                                                    }}
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">{money(row.makeUnitCost)}</TableCell>
                                        <TableCell align="right">{money(row.buyUnitCost)}</TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Button
                                                    size="small"
                                                    variant={recommendMake ? "contained" : "outlined"}
                                                    color="success"
                                                    startIcon={<BuildOutlined />}
                                                    disabled={busy}
                                                    onClick={() => handleMake(row)}
                                                >
                                                    Make
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant={recommendBuy ? "contained" : "outlined"}
                                                    startIcon={<ShoppingCartOutlined />}
                                                    disabled={busy}
                                                    onClick={() => handleBuy(row)}
                                                >
                                                    Buy
                                                </Button>
                                                <Tooltip title="Defer (covered by stock / reorder)" arrow>
                                                    <span>
                                                        <Button
                                                            size="small"
                                                            variant="text"
                                                            color="inherit"
                                                            disabled={busy}
                                                            onClick={() => handleDefer(row)}
                                                            sx={{ minWidth: 0, px: 1 }}
                                                        >
                                                            <SnoozeOutlined fontSize="small" />
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PlanningDeskPage;
