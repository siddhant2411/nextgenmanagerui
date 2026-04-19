import React, { useEffect, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { Close, Inventory2 } from '@mui/icons-material';
import {
    receiveStock,
    resolveApiErrorMessage,
    searchInventoryItems
} from '../../services/inventoryService';

const sourceOptions = [
    { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
    { value: 'WORK_ORDER_RETURN', label: 'Return from Work Order' },
    { value: 'OPENING_STOCK', label: 'Opening Stock' },
    { value: 'MANUAL_ENTRY', label: 'Manual Entry' },
];

const emptyForm = {
    sourceType: 'PURCHASE_ORDER',
    referenceNo: '',
    quantity: '',
    costPerUnit: '',
    batchNumber: '',
    expiryDate: '',
    serialNumbers: '',
    notes: '',
};

const getSettings = (item) => item?.productInventorySettings || {};
const getAvailableQty = (item) => item?.availableQuantity ?? getSettings(item)?.availableQuantity ?? 0;
const getMinStock = (item) => item?.minStock ?? getSettings(item)?.minStock ?? 0;
const getItemLabel = (item) => `${item?.itemCode || ''} ${item?.name || item?.itemName || ''}`.trim();

export default function AddItemQtyForm({
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    selectedItem,
    setSelectedItem,
    canManageInventory = false,
    onReceived,
}) {
    const [itemList, setItemList] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const values = { ...emptyForm, ...(formData || {}) };
    const settings = getSettings(selectedItem);
    const batchTracked = Boolean(settings.batchTracked || selectedItem?.batchTracked);
    const serialTracked = Boolean(settings.serialTracked || selectedItem?.serialTracked);
    const availableQty = Number(getAvailableQty(selectedItem) || 0);
    const minStock = Number(getMinStock(selectedItem) || 0);

    useEffect(() => {
        if (selectedItem) {
            setInputValue(getItemLabel(selectedItem));
        }
    }, [selectedItem]);

    useEffect(() => {
        if (!openDialog) {
            setItemList([]);
            return undefined;
        }

        const timeout = setTimeout(async () => {
            setLoadingItems(true);
            try {
                const result = await searchInventoryItems({
                    page: 0,
                    size: 10,
                    sortBy: 'itemCode',
                    sortDir: 'asc',
                    query: inputValue.trim(),
                });
                setItemList(result?.content || []);
            } catch (err) {
                setItemList([]);
            } finally {
                setLoadingItems(false);
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [inputValue, openDialog]);

    const updateForm = (name, value) => {
        setFormData((prev) => ({ ...emptyForm, ...(prev || {}), [name]: value }));
    };

    const handleClose = () => {
        setOpenDialog(false);
        setSelectedItem(null);
        setInputValue('');
        setFormData(emptyForm);
    };

    const handleSubmit = async () => {
        if (!canManageInventory || !selectedItem?.inventoryItemId || !values.quantity) {
            return;
        }

        const quantity = Number(values.quantity);
        const payload = {
            inventoryItemId: selectedItem.inventoryItemId,
            itemId: selectedItem.inventoryItemId,
            sourceType: values.sourceType,
            procurementDecision: values.sourceType,
            referenceNo: values.referenceNo,
            referenceId: values.referenceNo,
            quantity,
            costPerUnit: values.costPerUnit === '' ? null : Number(values.costPerUnit),
            batchNumber: batchTracked ? values.batchNumber : undefined,
            expiryDate: batchTracked ? values.expiryDate : undefined,
            serialNumbers: serialTracked
                ? values.serialNumbers.split(',').map((serial) => serial.trim()).filter(Boolean)
                : undefined,
            notes: values.notes,
        };

        setSubmitting(true);
        try {
            const response = await receiveStock(payload);
            const newBalance = response?.newBalance ?? response?.availableQuantity ?? availableQty + quantity;
            const uom = selectedItem.uom || '';
            setSnackbar({
                open: true,
                message: `${quantity} ${uom} of ${selectedItem.itemCode || selectedItem.name || selectedItem.itemName} received. New balance: ${newBalance} ${uom}.`,
                severity: 'success',
            });
            handleClose();
            onReceived?.();
        } catch (err) {
            setSnackbar({
                open: true,
                message: resolveApiErrorMessage(err, 'Failed to receive stock. Please try again.'),
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={openDialog}
                onClose={handleClose}
                PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}
            >
                <Box sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e5e7eb' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Receive Stock</Typography>
                            <Typography variant="body2" color="text.secondary">Add stock into the live inventory balance</Typography>
                        </Box>
                        <IconButton onClick={handleClose} size="small">
                            <Close />
                        </IconButton>
                    </Stack>
                </Box>

                <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
                    <Stack spacing={2.25}>
                        <Autocomplete
                            options={itemList}
                            value={selectedItem}
                            onChange={(e, newValue) => setSelectedItem(newValue)}
                            inputValue={inputValue}
                            onInputChange={(e, newInputValue) => setInputValue(newInputValue)}
                            loading={loadingItems}
                            openOnFocus
                            getOptionLabel={getItemLabel}
                            isOptionEqualToValue={(option, value) => option.inventoryItemId === value?.inventoryItemId}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Item"
                                    placeholder="Search item code or name"
                                    required
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingItems ? <CircularProgress color="inherit" size={18} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />

                        {selectedItem && (
                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Inventory2 fontSize="small" color="primary" />
                                    <Typography variant="body2" fontWeight={700}>{selectedItem.itemCode}</Typography>
                                    <Typography variant="body2" color="text.secondary">{selectedItem.name || selectedItem.itemName}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    Available: {availableQty} {selectedItem.uom || ''} | Min: {minStock} {selectedItem.uom || ''}
                                </Typography>
                            </Box>
                        )}

                        <Divider textAlign="left">Receipt Details</Divider>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                                select
                                label="Source"
                                value={values.sourceType}
                                onChange={(e) => updateForm('sourceType', e.target.value)}
                                fullWidth
                            >
                                {sourceOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Reference No"
                                value={values.referenceNo}
                                onChange={(e) => updateForm('referenceNo', e.target.value)}
                                fullWidth
                            />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                                label="Quantity"
                                type="number"
                                value={values.quantity}
                                onChange={(e) => updateForm('quantity', e.target.value)}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Cost per Unit"
                                type="number"
                                value={values.costPerUnit}
                                onChange={(e) => updateForm('costPerUnit', e.target.value)}
                                fullWidth
                            />
                        </Stack>

                        {(batchTracked || serialTracked) && <Divider textAlign="left">Tracking</Divider>}

                        {batchTracked && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Batch Number"
                                    value={values.batchNumber}
                                    onChange={(e) => updateForm('batchNumber', e.target.value)}
                                    fullWidth
                                />
                                <TextField
                                    label="Expiry Date"
                                    type="date"
                                    value={values.expiryDate}
                                    onChange={(e) => updateForm('expiryDate', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Stack>
                        )}

                        {serialTracked && (
                            <TextField
                                label="Serial Numbers"
                                value={values.serialNumbers}
                                onChange={(e) => updateForm('serialNumbers', e.target.value)}
                                helperText="Enter comma-separated serial numbers"
                                multiline
                                minRows={3}
                                fullWidth
                            />
                        )}

                        <TextField
                            label="Notes"
                            value={values.notes}
                            onChange={(e) => updateForm('notes', e.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                        />
                    </Stack>
                </Box>

                <Box sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb' }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={!canManageInventory || !selectedItem?.inventoryItemId || !values.quantity || submitting}
                        >
                            {submitting ? 'Receiving...' : 'Receive Stock'}
                        </Button>
                    </Stack>
                </Box>
            </Drawer>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
