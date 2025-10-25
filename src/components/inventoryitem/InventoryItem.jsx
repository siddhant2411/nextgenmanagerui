import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import InventoryItemList from './InventoryItemList';
import AddInventoryItem from './AddInventoryItem';
import apiService from '../../services/apiService';
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material';
import './style/InventoryItem.css'
const InventoryItem = () => {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();


  const handleAddNewItemClick = () => {
    navigate(`/inventory-item/add/`)
  };

  const deleteInventoryItem = async (id) => {
    try {
      await apiService.delete(`/inventory_item/${id}`);
    } catch (err) {
      console.error(err);
    }
  };


  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setError(null)
    setOpen(false);

  };

  useEffect(() => {
    if (error !== null) {
      setOpen(true)
    }
  }, [error])

  return (
    <Box sx={{ p: 3 }}>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <InventoryItemList
                onDeleteItem={deleteInventoryItem}
                loading={loading}
                setLoading={setLoading}
                error={error}
                setError={setError}
                handleAddNewItemClick={handleAddNewItemClick}
              />
            </>
          }
        />
        <Route path="/add" element={<AddInventoryItem />} />
        <Route path="/edit/:id" element={<AddInventoryItem />} />
      </Routes>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity="error"
          sx={{ width: "100%" }}
          variant="filled"
        >
          {error}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default InventoryItem;