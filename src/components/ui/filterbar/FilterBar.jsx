import React, { useState } from "react";
import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Stack,
} from "@mui/material";
import axios from "axios";
import apiService from "../../../services/apiService";

export default function FilterBar({
    allColumns,
    fetchUrl,
    onFilterApplied,
    pageSize,
    filters,
    setFilters,
    page,
    handleApplyFilters,
    sortKey,
    sortDir
}) {
    const [selectedField, setSelectedField] = useState("");
    const [operator, setOperator] = useState("");
    const [value, setValue] = useState("");


    const selectedColumn = allColumns.find((col) => col.field === selectedField);
    const fieldType = selectedColumn?.type?.toLowerCase();
    const isNumberField = fieldType === "number";
    const isEnum = fieldType === "enum";
    const isDateField = fieldType === "date";
    const numberOperators = ["=", "<", ">", "<=", ">="];
    const stringOperators = ["contains", "=", "!="];
    const operatorOptions = isNumberField || isDateField ? numberOperators : stringOperators;

    const handleAddFilter = () => {
        if (!selectedField || !operator || !value) return;

        // Compute new filters array first
        const newFilters = [
            ...filters,
            { field: selectedField, operator, value },
        ];

       
        // Update state
        setFilters(newFilters);

        // Clear inputs
        setSelectedField("");
        setOperator("");
        setValue("");

        // Apply immediately using latest array
        handleApplyFilters(newFilters, 0, sortKey, sortDir)
    };

    const handleRemoveFilter = (index) => {
        const newFilters = filters.filter((_, i) => i !== index);
        setFilters(newFilters);
        handleApplyFilters(newFilters, 0, sortKey, sortDir)
    };
    const handleClearAll = () => { setFilters([]); handleApplyFilters([], 0, sortKey, sortDir) };



    return (
        <Box sx={{ mb: 2, p: 2, borderRadius: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                Filters
            </Typography>
            
            {/* Filter Builder Row */}
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", md: "center" }}
                flexWrap="wrap"
                sx={{ mb: 2, width: "100%", minWidth: 0 }}
            >
                <FormControl
                    size="small"
                    sx={{ minWidth: { xs: "100%", sm: 180 }, width: { xs: "100%", sm: 180 } }}
                >
                    <InputLabel sx={{ fontSize: 13 }}>Field</InputLabel>
                    <Select
                        value={selectedField}
                        onChange={(e) => setSelectedField(e.target.value)}
                        label="Field"
                        sx={{ fontSize: 13, height: 36, width: "100%" }}
                    >
                        {allColumns.map((col) => (
                            <MenuItem key={col.field} value={col.field}>
                                {col.headerName}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl
                    size="small"
                    sx={{ minWidth: { xs: "100%", sm: 160 }, width: { xs: "100%", sm: 160 } }}
                >
                    <InputLabel sx={{ fontSize: 13, height: 36 }}>Operator</InputLabel>
                    <Select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        label="Operator"
                        disabled={!selectedField}
                        sx={{ fontSize: 13, height: 36, width: "100%" }}
                    >
                        {operatorOptions.map((op) => (
                            <MenuItem key={op} value={op}>
                                {op}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {isEnum ? (
                    <Select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        size="small"
                        sx={{ width: { xs: "100%", sm: 180 } }}
                    >
                        {selectedColumn?.options?.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </Select>
                ) : (
                    <TextField
                        size="small"
                        label="Value"
                        variant="outlined"
                        type={isDateField ? "date" : "text"}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        sx={{
                            width: { xs: "100%", sm: 180 }, fontSize: 13
                        }}
                        InputLabelProps={isDateField ? { shrink: true } : undefined}
                        slotProps={{
                            input: {
                                sx: {
                                    height: 36,
                                    textAlign: "center",
                                    fontSize: "13px",

                                },
                            },
                            inputLabel: {
                                sx: {
                                    textAlign: "center",
                                    fontSize: "13px",
                                }
                            }
                        }}


                    />
                )}
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddFilter}
                    disabled={!selectedField || !operator || !value}
                    sx={{ borderRadius: 2, height: 36, minWidth: { xs: "100%", sm: 120 } }}
                >
                    Add Filter
                </Button>

                <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClearAll}
                    disabled={filters.length === 0}
                    sx={{ borderRadius: 2, minWidth: { xs: "100%", sm: 110 } }}
                >
                    Clear All
                </Button>
            </Stack>

            {/* Active Filters */}
            {filters.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                    {filters.map((f, idx) => (

                        <Chip
                            key={idx}
                            label={`${f.field} ${f.operator} ${f.value}`}
                            onDelete={() => handleRemoveFilter(idx)}
                            color="primary"
                            variant="outlined"
                            sx={{ borderRadius: "16px" }}
                        />
                    ))}
                </Stack>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={2}>
                {/* <Button
                    variant="contained"
                    color="success"
                    onClick={handleApplyFilters}
                    disabled={filters.length === 0}
                    sx={{ borderRadius: 2 }}
                >
                    Apply Filters
                </Button> */}

            </Stack>
        </Box>
    );
}
