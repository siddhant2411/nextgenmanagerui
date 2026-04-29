import { Dialog, DialogContent, DialogTitle, TextField, MenuItem, DialogActions, Button, Autocomplete, CircularProgress } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { inventoryItemSearch } from '../../services/commonAPI';
import { useAuth } from '../../auth/AuthContext';
import { createInventoryRequest } from '../../services/inventoryService';

export default function CreateInventoryRequestForm({
    openDialog,
    setOpenDialog,
    selectedItem,
    setSelectedItem,
    canManageInventory = false,
}) {
    const [formData, setFormData] = React.useState({
        itemID: null,
        quantity: '',
        source: 'MANUAL',
        sourceId: '',
        requestedBy: '',
        requestRemarks: ''
    });
    const { user } = useAuth();

    const [itemList, setItemList] = useState([]);
    const [loading, setLoading] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedItem(null);
        setFormData({
            quantity: '',
            source: 'MANUAL',
            sourceId: '',
            requestedBy: user?.username || '',
            requestRemarks: ''
        });
    };



    const handleSubmit = async () => {
        if (!canManageInventory || !selectedItem?.inventoryItemId) {
            return;
        }
        try {
            const params = new URLSearchParams();
            params.append('itemId', selectedItem.inventoryItemId);
            params.append('quantity', formData.quantity);
            params.append('source', formData.source);
            if (formData.sourceId) params.append('sourceId', formData.sourceId);
            params.append('requestedBy', formData.requestedBy || user?.username || '');
            params.append('requestRemarks', formData.requestRemarks);

            await createInventoryRequest(params);
            handleCloseDialog();
        } catch (err) {
            // handled
        }
    };

    const handleItemListFetch = async (query) => {
        setLoading(true);
        try {
            const result = await inventoryItemSearch(query);
            setItemList(result);
        } catch (err) {
            // handled
        }
        setLoading(false);
    };

    useEffect(() => {
        if (inputValue.trim() === '') {
            setItemList([]);
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            handleItemListFetch(inputValue);
        }, 400); // 400ms debounce
        return () => clearTimeout(delayDebounceFn);
    }, [inputValue]);
    return (
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="xs">
            <DialogTitle>Create Inventory Request</DialogTitle>
            <DialogContent>
                <Autocomplete
                    options={itemList}
                    value={selectedItem}
                    onChange={(e, newValue) => setSelectedItem(newValue)}
                    getOptionLabel={(option) => option.name || ''} // still needed for filtering
                    isOptionEqualToValue={(option, value) => option.inventoryItemId === value?.inventoryItemId}
                    inputValue={inputValue}
                    onInputChange={(e, newInputValue) => setInputValue(newInputValue)}
                    loading={loading}
                    renderOption={(props, option) => (
                        <li {...props} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600 }}>{option.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{option.itemCode}</span>
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Select Item"
                            placeholder="Search item"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />

                <TextField
                    margin="dense"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    fullWidth
                    required
                />

                <TextField
                    margin="dense"
                    select
                    label="Source"
                    name="source"
                    value={formData.source}
                    onChange={handleFormChange}
                    fullWidth
                >
                    <MenuItem value="MANUAL">Manual</MenuItem>
                    <MenuItem value="WORK_ORDER">Work Order</MenuItem>
                    <MenuItem value="SALES_ORDER">Sales Order</MenuItem>
                    <MenuItem value="PURCHASE_ORDER">Purchase Order</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    label="Source ID (optional)"
                    name="sourceId"
                    type="number"
                    value={formData.sourceId}
                    onChange={handleFormChange}
                    fullWidth
                />
                <TextField
                    margin="dense"
                    label="Requested By"
                    name="requestedBy"
                    value={formData.requestedBy}
                    onChange={handleFormChange}
                    fullWidth
                    required
                />
                <TextField
                    margin="dense"
                    label="Request Remarks"
                    name="requestRemarks"
                    value={formData.requestRemarks}
                    onChange={handleFormChange}
                    fullWidth
                    multiline
                    rows={2}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!canManageInventory}
                >
                    Create Request
                </Button>
            </DialogActions>
        </Dialog>
    );
}
