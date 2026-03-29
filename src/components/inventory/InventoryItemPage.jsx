import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Button, IconButton, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, TextField,
    InputAdornment, TablePagination, Tooltip, Chip, CircularProgress
} from '@mui/material';
import { Search, Inventory2, AddBox } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import AddItemQtyForm from './AddItemQtyForm';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';
const ROW_HOVER = '#e3f2fd';

const itemTypeMapping = {
    FINISHED_GOOD: { label: 'Finished Good', color: '#e8f5e9', textColor: '#2e7d32' },
    RAW_MATERIAL: { label: 'Raw Material', color: '#fff3e0', textColor: '#e65100' },
    SEMI_FINISHED: { label: 'Semi-Finished', color: '#e3f2fd', textColor: '#1565c0' },
    SUB_CONTRACTED: { label: 'Sub-Contracted', color: '#f3e5f5', textColor: '#6a1b9a' },
    CONSUMABLE: { label: 'Consumable', color: '#e0f2f1', textColor: '#00796b' },
};

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: 0.3,
    py: 1.25,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
};

const InventoryItemPage = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({ procurementDecision: '', referenceId: null, quantity: 0, costPerUnit: 0 });

    const navigate = useNavigate();
    const { canAction } = useAuth();
    const canManageInventory = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);
    const debounceTimeout = useRef(null);

    useEffect(() => { fetchItems(); }, [page, rowsPerPage]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const params = { page, size: rowsPerPage, sortBy: "availableQuantity", sortDir: "dsc", query: search };
            const res = await apiService.get('inventory_item/search', params);
            setItems(res.content);
            setTotalItems(res.totalElements);
        } catch (err) {
            // handled
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (event) => {
        const query = event.target.value;
        setSearch(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => { setPage(0); fetchItems(); }, 500);
    };

    const handleOpenAddQuantity = (item) => {
        if (!canManageInventory) return;
        setSelectedItem(item);
        setFormData({ procurementDecision: '', referenceId: '', quantity: '' });
        setOpenDialog(true);
    };

    const renderTypeChip = (type) => {
        const info = itemTypeMapping[type];
        if (!info) return type || '-';
        return (
            <Chip
                label={info.label}
                size="small"
                sx={{ backgroundColor: info.color, color: info.textColor, fontWeight: 500, fontSize: '0.7rem', height: 24 }}
            />
        );
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: 2,
                    border: `1px solid ${BORDER_COLOR}`,
                }}
            >
                {/* Header */}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={1.5}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            Inventory Management
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Monitor stock levels and manage inventory quantities
                        </Typography>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                        <TextField
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Search items..."
                            size="small"
                            variant="outlined"
                            InputProps={{
                                endAdornment: <InputAdornment position="end"><Search sx={{ color: '#9ca3af', fontSize: 20 }} /></InputAdornment>,
                            }}
                            sx={{
                                width: { xs: '100%', sm: 260 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    fontSize: '0.875rem',
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<Inventory2 />}
                            onClick={() => navigate('/inventory-item/transactions')}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                bgcolor: '#1565c0',
                                boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                                '&:hover': { bgcolor: '#0d47a1' },
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Transactions
                        </Button>
                    </Box>
                </Box>

                {/* Loading */}
                {loading && (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="30vh" gap={2}>
                        <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                        <Typography variant="body2" color="text.secondary">Loading inventory...</Typography>
                    </Box>
                )}

                {/* Table */}
                {!loading && (
                    <>
                        <TableContainer sx={{ borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}`, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={headerCellSx}>Item Code</TableCell>
                                        <TableCell sx={headerCellSx}>Name</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Type</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>UOM</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Source</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Min Qty</TableCell>
                                        <TableCell align="right" sx={headerCellSx}>Available Qty</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Lead Time</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Std. Cost</TableCell>
                                        <TableCell align="center" sx={headerCellSx}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((item, index) => {
                                        const isLowStock = item.availableQuantity < item.minStock;
                                        return (
                                            <TableRow
                                                key={item.inventoryItemId}
                                                sx={{
                                                    bgcolor: isLowStock ? '#fff8e1' : index % 2 === 0 ? '#fafbfc' : '#fff',
                                                    transition: 'background 0.15s',
                                                    '&:hover': { bgcolor: ROW_HOVER },
                                                    '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>{item.itemCode}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>{item.name}</Typography>
                                                </TableCell>
                                                <TableCell align="center">{renderTypeChip(item.itemType)}</TableCell>
                                                <TableCell align="center">{item.uom}</TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                        {item.purchased ? 'P' : '-'} / {item.manufactured ? 'M' : '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">{item.minStock || 0}</TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        sx={{ color: isLowStock ? '#e65100' : '#2e7d32' }}
                                                    >
                                                        {item.productInventorySettings?.availableQuantity?.toFixed(1) ?? '0.0'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" fontWeight={500}>{item.leadTime || '-'}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" fontWeight={500}>{item.standardCost || '-'}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Add Quantity">
                                                        <span>
                                                            <IconButton
                                                                onClick={() => handleOpenAddQuantity(item)}
                                                                size="small"
                                                                disabled={!canManageInventory}
                                                                sx={{ color: '#2e7d32', '&:hover': { bgcolor: '#e8f5e9' } }}
                                                            >
                                                                <AddBox fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">No inventory items found.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={totalItems}
                            page={page}
                            onPageChange={(e, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            sx={{
                                borderTop: `1px solid ${BORDER_COLOR}`,
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
                            }}
                        />
                    </>
                )}
            </Paper>

            <AddItemQtyForm
                openDialog={openDialog}
                setOpenDialog={setOpenDialog}
                formData={formData}
                setFormData={setFormData}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                canManageInventory={canManageInventory}
            />
        </Box>
    );
};

export default InventoryItemPage;
