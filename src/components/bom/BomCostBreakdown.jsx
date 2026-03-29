import React from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Tooltip,
    IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const formatCurrency = (value) => {
    if (value == null) return "—";
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const SummaryCard = ({ label, value, color }) => (
    <Card sx={{ flex: 1, minWidth: 180 }}>
        <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color, mt: 0.5 }}>
                {formatCurrency(value)}
            </Typography>
        </CardContent>
    </Card>
);

const COST_FORMULA_TEXT = `CALCULATED: (Machine Rate × Time + Labor Rate × Operators × Time) × (1 + Overhead%)
FIXED_RATE: Fixed Cost Per Unit
SUB_CONTRACTED: Sub-contract Rate Per Unit`;

export default function BomCostBreakdown({ data, loading }) {
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return (
            <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No cost breakdown data available.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxHeight: "calc(100vh - 320px)", overflow: "auto" }}>
            {/* Summary Cards */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <SummaryCard label="Material Cost" value={data.totalMaterialCost} color="#2e7d32" />
                <SummaryCard label="Operation Cost" value={data.totalOperationCost} color="#1565c0" />
                <SummaryCard label="Total Cost" value={data.totalCost} color="#c62828" />
            </Box>

            {/* Cost Formula Info */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Cost Formula
                </Typography>
                <Tooltip title={<pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{COST_FORMULA_TEXT}</pre>} arrow>
                    <IconButton size="small" sx={{ ml: 0.5 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Material Cost Table */}
            {data.materialCosts?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: 0.8, mb: 1 }}>
                        Material Costs
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>#</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Item Code</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Item Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>UOM</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Qty</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Scrap %</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Eff. Qty</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Unit Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Total</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Operation</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.materialCosts.map((row, idx) => (
                                    <TableRow key={row.positionId || idx} hover>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{idx + 1}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{row.itemCode}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{row.itemName}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{row.uom}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{row.quantity}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{row.scrapPercentage}%</TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{row.effectiveQuantity}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{formatCurrency(row.unitCost)}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{formatCurrency(row.totalCost)}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{row.routingOperationName || "WO Level"}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                                    <TableCell colSpan={8} align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                        Total Material Cost
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#2e7d32" }}>
                                        {formatCurrency(data.totalMaterialCost)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* Operation Cost Table */}
            {data.operationCosts?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: 0.8, mb: 1 }}>
                        Operation Costs
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Seq</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Operation</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Cost Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Work Center</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Machine</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Labor Role</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Operators</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Setup</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Run</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Machine Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Labor Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Overhead</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.operationCosts.map((row) => {
                                    const isCalculated = row.costType === "CALCULATED";
                                    return (
                                        <TableRow key={row.operationId} hover>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{row.sequenceNumber}</TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{row.operationName}</TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{(row.costType || "").replace(/_/g, " ")}</TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{isCalculated ? (row.workCenterName || "—") : "—"}</TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{isCalculated ? (row.machineName || "—") : "—"}</TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>{isCalculated ? (row.laborRoleName || "—") : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? row.numberOfOperators : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? row.setupTime : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? row.runTime : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? formatCurrency(row.machineCost) : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? formatCurrency(row.laborCost) : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>{isCalculated ? formatCurrency(row.overheadCost) : "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{formatCurrency(row.totalCost)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                                    <TableCell colSpan={12} align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                        Total Operation Cost
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1565c0" }}>
                                        {formatCurrency(data.totalOperationCost)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}
        </Box>
    );
}
