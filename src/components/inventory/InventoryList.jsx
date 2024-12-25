import React from 'react';
import {
    Box,
    Paper,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Table, MenuItem, Select, FormControl, InputLabel,
    Pagination
} from '@mui/material';
import {Button} from "react-bootstrap";

const InventoryList = ({
                           inventoryList, setSortBy, setSortDir, filters, handleSort, onFilterChange,
                           handleAdd, currentPage, totalPages, handlePageChange
                       }) => {
    const columnMapping = {
        itemCode: 'Item Code',
        name: 'Item Name',
        hsnCode: 'HSN Code',
        itemType: 'Item Type',
        uom: 'Unit of Measure',
        totalQuantity: 'Total Quantity',
        averageCost: 'Average Cost/Unit',
    };

    const columns = Object.keys(columnMapping); // Extract column keys dynamically

    const handleFilterChange = (key, value) => {
        onFilterChange(key, value);
    };

    const itemTypeOptions = ["RAW_MATERIAL", "ASSEMBLY", "FINISHED_GOOD"];
    const uomOptions = ['NOS', 'KG', 'METER', 'INCH'];

    return (
        <Box sx={{ width: '100%', mt: 3 }}>
            <Typography variant="h4" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                Inventory Products
            </Typography>
            <Button variant="primary" color="primary" onClick={handleAdd} sx={{ mb: 2 }} style={{"float": "right","marginBottom":"2rem"}}>
                Add Product
            </Button>
            <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 3 }}>
                <TableContainer>
                    <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
                        <TableHead>
                            <TableRow>
                                {columns.map((column, index) => (
                                    <TableCell
                                        key={index}
                                        align="center"
                                        sx={{
                                            fontWeight: 'bold',
                                            backgroundColor: '#f5f5f5',
                                            color: '#333',
                                            fontSize: '1rem',
                                            borderBottom: '2px solid #ccc',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSort(column)}
                                    >
                                        {columnMapping[column]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        {/* Filter Row */}
                        <TableHead>
                            <TableRow>
                                {columns.map((key, index) => (
                                    <TableCell key={index} align="center">
                                        {['itemCode', 'name', 'hsnCode'].includes(key) &&
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                placeholder={`Filter by ${columnMapping[key]}`}
                                                value={filters[key]}
                                                onChange={(e) => handleFilterChange(key, e.target.value)}
                                                sx={{ width: '100%' }}
                                            />
                                        }
                                        {('itemType' === key) &&
                                            <FormControl fullWidth variant="outlined" size="small">
                                                <InputLabel id="item-type-label">Item Type</InputLabel>
                                                <Select
                                                    labelId="item-type-label"
                                                    value={filters.itemType}
                                                    onChange={(e) => onFilterChange('itemType', e.target.value)}
                                                    sx={{ width: '100%' }}
                                                    size='small'
                                                >
                                                    <MenuItem value="">All</MenuItem>
                                                    {itemTypeOptions.map((type) => (
                                                        <MenuItem key={type} value={type}>
                                                            {type}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        }
                                        {('uom' === key) &&
                                            <FormControl fullWidth variant="outlined" size="small">
                                                <InputLabel id="uom-label">UOM</InputLabel>
                                                <Select
                                                    labelId="uom-label"
                                                    value={filters.uom}
                                                    onChange={(e) => onFilterChange('uom', e.target.value)}
                                                    sx={{ width: '100%' }}
                                                    size='small'
                                                >
                                                    <MenuItem value="">All</MenuItem>
                                                    {uomOptions.map((type) => (
                                                        <MenuItem key={type} value={type}>
                                                            {type}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        }
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {inventoryList.length > 0 ? (
                                inventoryList.map((inventory, rowIndex) => (
                                    <TableRow
                                        key={inventory.inventoryItemId}
                                        sx={{
                                            backgroundColor: rowIndex % 2 === 0 ? '#fafafa' : '#fff',
                                            '&:hover': {
                                                backgroundColor: '#f1f1f1',
                                            },
                                        }}
                                    >
                                        {columns.map((key, index) => (
                                            <TableCell
                                                key={index}
                                                align="center"
                                                sx={{
                                                    fontSize: '0.9rem',
                                                    color: '#555',
                                                    borderBottom: '1px solid #eee',
                                                }}
                                            >
                                                {typeof inventory[key] === 'number'
                                                    ? inventory[key].toFixed(2)
                                                    : inventory[key] ?? 'N/A'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center" sx={{ padding: '16px' }}>
                                        <Typography variant="body1" sx={{ color: '#888' }}>
                                            No Inventory Items Found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Pagination */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default InventoryList;
