import { Dialog, DialogContent, DialogTitle, TextField, MenuItem, DialogActions, Button } from '@mui/material'
import React from 'react'
import apiService from '../../services/apiService';

export default function AddItemQtyForm({
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    selectedItem,
    setSelectedItem

}) {
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const requestData = {
            inventoryItemId: selectedItem.inventoryItemId,
            ...formData
        };

        try {
            const res = await apiService.post("/inventory/add-instances", requestData)

            console.log(res)
            handleCloseDialog()
        } catch (e) {
            console.log(e)
        }



    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedItem(null);
    };

    return (
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="xs">
            <DialogTitle>Add Quantity</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    select
                    label="Source Type"
                    name="procurementDecision"
                    value={formData.procurementDecision}
                    onChange={handleFormChange}
                    fullWidth
                >
                    <MenuItem value="PURCHASE_ORDER">Purchased</MenuItem>
                    <MenuItem value="WORK_ORDER">Manufactured</MenuItem>
                </TextField>
                <TextField
                    margin="dense"
                    label="Reference Number"
                    name="referenceId"
                    value={formData.referenceId}
                    onChange={handleFormChange}
                    fullWidth
                />
                <TextField
                    margin="dense"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    fullWidth
                />

                 <TextField
                    margin="dense"
                    label="Unit Cost"
                    name="costPerUnit"
                    type="number"
                    value={formData.costPerUnit}
                    onChange={handleFormChange}
                    fullWidth
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Add</Button>
            </DialogActions>
        </Dialog>
    )
}
