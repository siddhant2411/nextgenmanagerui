import React from "react";
import {
    Box, IconButton, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";

const HEADER_BG = "#0f2744";

const headerCellSx = {
    background: HEADER_BG,
    color: "#e8edf3",
    fontWeight: 600,
    fontSize: "0.75rem",
    letterSpacing: 0.3,
    py: 1,
    whiteSpace: "nowrap",
};

const compactFieldSx = {
    "& .MuiInputBase-input": { fontSize: 12, py: 0.5 },
    "& .MuiOutlinedInput-root": { borderRadius: 1 },
};

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * "Additional Costs" section for a BOM. Items land here automatically when a CONSUMABLE-type
 * item is picked in the shared component search above. Each line is an existing master item +
 * a flat per-BOM price (required). No quantity, no item creation.
 */
const BomCostLinesTable = ({ formik }) => {
    const costLines = formik.values.costLines || [];

    const updateAmount = (index, value) => {
        const updated = costLines.map((line, i) => (i === index ? { ...line, amount: value } : line));
        formik.setFieldValue("costLines", updated);
    };

    const removeLine = (index) => {
        formik.setFieldValue("costLines", costLines.filter((_line, i) => i !== index));
    };

    const total = costLines.reduce((sum, line) => sum + toNumber(line.amount), 0);

    return (
        <Box sx={{ mt: 3 }}>
            <Typography
                variant="subtitle2"
                fontWeight={600}
                color="#0f2744"
                sx={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: 0.8, mb: 1 }}
            >
                Additional Costs
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Consumable (flat-cost) items added from the component search above. Enter a price for
                each — there is no quantity. Create the items in the Product Master.
            </Typography>

            {costLines.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No additional costs. Search a CONSUMABLE item above to add one.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellSx}>#</TableCell>
                                <TableCell sx={headerCellSx}>Item Code</TableCell>
                                <TableCell sx={headerCellSx}>Item</TableCell>
                                <TableCell align="right" sx={headerCellSx}>Price (₹) *</TableCell>
                                <TableCell align="center" sx={headerCellSx}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {costLines.map((line, index) => {
                                // A consumable may legitimately cost ₹0 (e.g. supplied free / negligible).
                                // Only a blank or negative price is invalid.
                                const invalidPrice =
                                    line.amount === "" || line.amount == null || toNumber(line.amount) < 0;
                                return (
                                    <TableRow key={line.id ?? line.inventoryItemId ?? `cl-${index}`} hover>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{index + 1}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{line.itemCode || "—"}</TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>{line.itemName || "—"}</TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                required
                                                error={invalidPrice}
                                                value={line.amount ?? ""}
                                                onChange={(e) => updateAmount(index, e.target.value)}
                                                inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                                                sx={{ ...compactFieldSx, width: 120 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Remove">
                                                <IconButton size="small" onClick={() => removeLine(index)}>
                                                    <DeleteOutline fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                                    Total Additional Cost
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#c62828" }}>
                                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default BomCostLinesTable;
