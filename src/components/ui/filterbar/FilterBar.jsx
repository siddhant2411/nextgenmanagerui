import React, { useState } from "react";
import {
    Box, Button, Chip, FormControl, InputLabel, MenuItem,
    Select, TextField, Typography, Stack,
} from "@mui/material";
import { FilterList, Close } from "@mui/icons-material";

const compactSx = {
    fontSize: 13,
    height: 36,
    width: "100%",
    '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
};

export default function FilterBar({
    allColumns, fetchUrl, onFilterApplied, pageSize,
    filters, setFilters, page, handleApplyFilters, sortKey, sortDir
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
        const newFilters = [...filters, { field: selectedField, operator, value }];
        setFilters(newFilters);
        setSelectedField("");
        setOperator("");
        setValue("");
        handleApplyFilters(newFilters, 0, sortKey, sortDir);
    };

    const handleRemoveFilter = (index) => {
        const newFilters = filters.filter((_, i) => i !== index);
        setFilters(newFilters);
        handleApplyFilters(newFilters, 0, sortKey, sortDir);
    };

    const handleClearAll = () => {
        setFilters([]);
        handleApplyFilters([], 0, sortKey, sortDir);
    };

    const getColumnLabel = (field) => {
        const col = allColumns.find(c => c.field === field);
        return col?.headerName || field;
    };

    return (
        <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            {/* Filter Builder Row */}
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", md: "center" }}
                flexWrap="wrap"
                sx={{ width: "100%", minWidth: 0 }}
            >
                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 }, width: { xs: "100%", sm: 160 } }}>
                    <InputLabel sx={{ fontSize: 13 }}>Field</InputLabel>
                    <Select
                        value={selectedField}
                        onChange={(e) => setSelectedField(e.target.value)}
                        label="Field"
                        sx={{ ...compactSx }}
                    >
                        {allColumns.map((col) => (
                            <MenuItem key={col.field} value={col.field} sx={{ fontSize: 13 }}>
                                {col.headerName}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 130 }, width: { xs: "100%", sm: 130 } }}>
                    <InputLabel sx={{ fontSize: 13 }}>Operator</InputLabel>
                    <Select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        label="Operator"
                        disabled={!selectedField}
                        sx={{ ...compactSx }}
                    >
                        {operatorOptions.map((op) => (
                            <MenuItem key={op} value={op} sx={{ fontSize: 13 }}>{op}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {isEnum ? (
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 }, width: { xs: "100%", sm: 160 } }}>
                        <InputLabel sx={{ fontSize: 13 }}>Value</InputLabel>
                        <Select
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            label="Value"
                            sx={{ ...compactSx }}
                        >
                            {selectedColumn?.options?.map((opt) => (
                                <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>{opt.replace(/_/g, ' ')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <TextField
                        size="small"
                        label="Value"
                        variant="outlined"
                        type={isDateField ? "date" : "text"}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        InputLabelProps={isDateField ? { shrink: true } : undefined}
                        sx={{
                            width: { xs: "100%", sm: 160 },
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 36 },
                            '& .MuiInputBase-input': { fontSize: 13 },
                            '& .MuiInputLabel-root': { fontSize: 13 },
                        }}
                    />
                )}

                <Button
                    variant="contained"
                    onClick={handleAddFilter}
                    disabled={!selectedField || !operator || !value}
                    startIcon={<FilterList sx={{ fontSize: 16 }} />}
                    sx={{
                        height: 36,
                        minWidth: { xs: "100%", sm: 110 },
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 1.5,
                        fontSize: '0.8125rem',
                        bgcolor: '#1565c0',
                        '&:hover': { bgcolor: '#0d47a1' },
                    }}
                >
                    Add
                </Button>

                {filters.length > 0 && (
                    <Button
                        variant="text"
                        onClick={handleClearAll}
                        startIcon={<Close sx={{ fontSize: 14 }} />}
                        sx={{
                            height: 36,
                            minWidth: { xs: "100%", sm: 90 },
                            textTransform: 'none',
                            fontSize: '0.8125rem',
                            color: '#d32f2f',
                            '&:hover': { bgcolor: '#ffebee' },
                        }}
                    >
                        Clear
                    </Button>
                )}
            </Stack>

            {/* Active Filters */}
            {filters.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    {filters.map((f, idx) => (
                        <Chip
                            key={idx}
                            label={
                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                    <strong>{getColumnLabel(f.field)}</strong> {f.operator} <em>{f.value}</em>
                                </Typography>
                            }
                            onDelete={() => handleRemoveFilter(idx)}
                            size="small"
                            sx={{
                                borderRadius: 1,
                                bgcolor: '#e3f2fd',
                                color: '#1565c0',
                                borderColor: '#90caf9',
                                '& .MuiChip-deleteIcon': { color: '#1565c0', fontSize: 16, '&:hover': { color: '#0d47a1' } },
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
