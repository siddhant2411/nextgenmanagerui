import React from 'react';
import {
    Box, Paper, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography, Table, MenuItem, Select, FormControl, InputLabel,
    Pagination, Button
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';
const ROW_HOVER = '#e3f2fd';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: 0.3,
    py: 1.25,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
};

const filterCellSx = {
    py: 0.75,
    bgcolor: '#fafbfc',
    borderBottom: `1px solid ${BORDER_COLOR}`,
};

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

    const columns = Object.keys(columnMapping);
    const itemTypeOptions = ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_GOOD", "SUB_CONTRACTED", "CONSUMABLE"];
    const uomOptions = ['NOS', 'KG', 'GRAM', 'TON', 'METER', 'CENTIMETER', 'INCH', 'LITER', 'SET'];

    return (
        <Box sx={{ width: '100%', p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: 2,
                    border: `1px solid ${BORDER_COLOR}`,
                }}
            >
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexDirection={{ xs: 'column', sm: 'row' }} gap={1}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            Inventory Products
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            View and filter inventory product records
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        startIcon={<AddCircleOutlineIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            px: 2.5,
                            bgcolor: '#1565c0',
                            boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                            '&:hover': { bgcolor: '#0d47a1' },
                        }}
                    >
                        Add Product
                    </Button>
                </Box>

                {/* Table */}
                <TableContainer sx={{ borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}`, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                    <Table sx={{ minWidth: 750 }} size="small" stickyHeader>
                        {/* Column Headers */}
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell key={column} align="center" sx={headerCellSx} onClick={() => handleSort(column)}>
                                        {columnMapping[column]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        {/* Filter Row */}
                        <TableHead>
                            <TableRow>
                                {columns.map((key) => (
                                    <TableCell key={key} align="center" sx={filterCellSx}>
                                        {['itemCode', 'name', 'hsnCode'].includes(key) && (
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                placeholder={`Filter...`}
                                                value={filters[key]}
                                                onChange={(e) => onFilterChange(key, e.target.value)}
                                                sx={{
                                                    width: '100%',
                                                    '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.8rem' },
                                                    '& .MuiOutlinedInput-input': { py: 0.5 },
                                                }}
                                            />
                                        )}
                                        {key === 'itemType' && (
                                            <FormControl fullWidth variant="outlined" size="small">
                                                <Select
                                                    value={filters.itemType}
                                                    onChange={(e) => onFilterChange('itemType', e.target.value)}
                                                    displayEmpty
                                                    sx={{ borderRadius: 1, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                                                >
                                                    <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All</MenuItem>
                                                    {itemTypeOptions.map((type) => (
                                                        <MenuItem key={type} value={type} sx={{ fontSize: '0.8rem' }}>{type.replace(/_/g, ' ')}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                        {key === 'uom' && (
                                            <FormControl fullWidth variant="outlined" size="small">
                                                <Select
                                                    value={filters.uom}
                                                    onChange={(e) => onFilterChange('uom', e.target.value)}
                                                    displayEmpty
                                                    sx={{ borderRadius: 1, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                                                >
                                                    <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All</MenuItem>
                                                    {uomOptions.map((type) => (
                                                        <MenuItem key={type} value={type} sx={{ fontSize: '0.8rem' }}>{type}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        {/* Body */}
                        <TableBody>
                            {inventoryList.length > 0 ? (
                                inventoryList.map((inventory, rowIndex) => (
                                    <TableRow
                                        key={inventory.inventoryItemId}
                                        sx={{
                                            bgcolor: rowIndex % 2 === 0 ? '#fafbfc' : '#fff',
                                            transition: 'background 0.15s',
                                            '&:hover': { bgcolor: ROW_HOVER },
                                            '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                        }}
                                    >
                                        {columns.map((key) => (
                                            <TableCell key={key} align="center">
                                                {key === 'itemCode' ? (
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>
                                                        {inventory[key] ?? '-'}
                                                    </Typography>
                                                ) : typeof inventory[key] === 'number'
                                                    ? inventory[key].toFixed(2)
                                                    : inventory[key] ?? '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                                        <Typography variant="body2" color="text.secondary">No inventory items found.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={handlePageChange}
                        color="primary"
                        size="small"
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default InventoryList;
