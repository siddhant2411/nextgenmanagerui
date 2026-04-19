import React, { useCallback, useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    Input,
    Autocomplete,
    TextField,
    Button,
    Box,
} from "@mui/material";
import { getAllInventoryItems } from "../../services/inventoryService";

const InventoryForm = ({ onClose, onSave, initialData }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState(
        initialData || {
            itemCode: '',
            hsnCode: '',
            name: '',
            quantity: '',
            costPerUnit: '',
            sellPricePerUnit: '',
        }
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchInventoryItems = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: 0,
                size: 5,
                sortBy: "name",
                sortDir: "asc",
                search,
            };

            const data = await getAllInventoryItems(params);
            setItems(data.content);
        } catch (err) {
            setError("Failed to fetch inventory items");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearchChange = (event, value) => {
        setSearchQuery(value);
        fetchInventoryItems(value);
    };

    const handleChange = (key) => (event) => {
        setFormData({ ...formData, [key]: event.target.value });
    };

    const handleSubmit = () => {
        if (onSave) {
            const payload = {
                inventoryItem: {
                    inventoryItemId: selectedItem?.inventoryItemId || null,  // Include inventoryItemId
                },
                costPerUnit: formData.costPerUnit,
                sellPricePerUnit: formData.sellPricePerUnit,
                quantity:formData.quantity
            };
            onSave(payload); // Send the payload with the required structure
        }
    };

    useEffect(() => {
        fetchInventoryItems();
    }, [fetchInventoryItems]);

    return (
        <Card sx={{ maxWidth: 'md', mx: 'auto' }}>
            <CardHeader title={<Typography variant="h6">Inventory Item</Typography>} />
            <CardContent>
                <Autocomplete
                    value={selectedItem}
                    onChange={(event, newValue) => {
                        setSelectedItem(newValue);
                        setFormData({
                            ...formData,
                            itemCode: newValue?.itemCode || '',
                            hsnCode: newValue?.hsnCode || '',
                            name: newValue?.name || ''
                        });
                    }}
                    inputValue={searchQuery}
                    onInputChange={handleSearchChange}
                    options={items}
                    getOptionLabel={(option) =>
                        `${option.itemCode}`
                    }
                    isOptionEqualToValue={(option, value) => option?.itemCode === value?.itemCode}
                    loading={loading}
                    noOptionsText={loading ? 'Loading...' : 'No items found'}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search and select an item"
                            variant="outlined"
                            fullWidth
                            error={!!error}
                            helperText={error}
                        />
                    )}
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    value={formData.itemCode}
                    onChange={handleChange('itemCode')}
                    placeholder="Item Code"
                    disabled
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    value={formData.hsnCode}
                    onChange={handleChange('hsnCode')}
                    placeholder="HSN Code"
                    disabled
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="Item Name"
                    disabled
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange('quantity')}
                    placeholder="Quantity"
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    type="number"
                    value={formData.costPerUnit}
                    onChange={handleChange('costPerUnit')}
                    placeholder="Cost Per Unit"
                    sx={{ mb: 2 }}
                />

                <Input
                    fullWidth
                    type="number"
                    value={formData.sellPricePerUnit}
                    onChange={handleChange('sellPricePerUnit')}
                    placeholder="Sell Price Per Unit"
                    sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        Submit
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default InventoryForm;
