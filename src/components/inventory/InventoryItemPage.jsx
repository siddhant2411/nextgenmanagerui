import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TextField,
    InputAdornment,
    TablePagination,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Tooltip
} from '@mui/material';
import { Search, Add, Edit, Inventory2, AddBox, Remove } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import AddItemQtyForm from './AddItemQtyForm';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const InventoryItemPage = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({
        procurementDecision: '',
        referenceId: null,
        quantity: 0,
        costPerUnit: 0

    });

    const navigate = useNavigate();
    const { canAction } = useAuth();
    const canManageInventory = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);
    const debounceTimeout = useRef(null);

    useEffect(() => {
        fetchItems();
    }, [page, rowsPerPage]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const params = {
                page: page,
                size: rowsPerPage,
                sortBy: "availableQuantity",
                sortDir: "dsc",
                query: search
            };
            const res = await apiService.get('inventory_item/search', params)
            setItems(res.content);
            setTotalItems(res.totalElements);
        } catch (err) {
            console.error('Failed to fetch inventory items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (event) => {
        const query = event.target.value;
        setSearch(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setPage(0);
            fetchItems();
        }, 500);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // const handleConsume = (id) => {
        

    // };

    const handleOpenAddQuantity = (item) => {
        if (!canManageInventory) {
            return;
        }
        setSelectedItem(item);
        setFormData({ procurementDecision: '', referenceId: '', quantity: '' });
        setOpenDialog(true);
    };





    const itemTypeMapping = {
        FINISHED_GOOD: 'Finished Good',
        RAW_MATERIAL: 'Raw Material',
        ASSEMBLY: 'Assembly',
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <TextField
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search inventory items"
                    size="small"
                    variant="outlined"
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: '40%' }}
                />

                <Button
                    variant="contained"
                    startIcon={<Inventory2 />}
                    onClick={() => navigate('/inventory-item/transactions')}
                >
                    View Transactions
                </Button>
            </Box>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Item Code</b></TableCell>
                                <TableCell><b>Name</b></TableCell>
                                <TableCell align="center"><b>Type</b></TableCell>
                                <TableCell align="center"><b>UOM</b></TableCell>
                                <TableCell align="center"><b>Purchased / Manufactured</b></TableCell>
                                <TableCell align="center"><b>Min Qty</b></TableCell>
                                <TableCell align="right"><b>Available Qty</b></TableCell>
                                <TableCell align="center"><b>Lead Time (Days)</b></TableCell>
                                <TableCell align="center"><b>Actions</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.inventoryItemId} hover sx={{ backgroundColor: (item.availableQuantity < item.minStock) ? '#fff3cd' : 'inherit' }}>
                                    <TableCell>{item.itemCode}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell align="center">{itemTypeMapping[item.itemType]}</TableCell>
                                    <TableCell align="center">{item.uom}</TableCell>
                                    <TableCell align="center">{item.purchased ? 'Yes' : 'No'} / {item.manufactured ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="center">{item.minStock || 0}</TableCell>
                                    <TableCell align="right">{item.productInventorySettings?.availableQuantity.toFixed(1)}</TableCell>
                                    <TableCell align="center"><b>{item.leadTime || 'N/A'}</b></TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Add Quantity">
                                            <IconButton
                                                onClick={() => handleOpenAddQuantity(item)}
                                                size="small"
                                                disabled={!canManageInventory}
                                            >
                                                <AddBox fontSize="small" sx={{ color: 'green' }}/>
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">No items found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={totalItems}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                />
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
