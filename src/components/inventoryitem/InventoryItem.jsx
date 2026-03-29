import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import InventoryItemList from './InventoryItemList';
import AddInventoryItem from './AddInventoryItem';
import apiService from '../../services/apiService';
import { Alert, Box, Snackbar } from '@mui/material';
import RoleProtectedRoute from '../../auth/RoleProtectedRoute';
import { ACTION_KEYS, INVENTORY_ITEM_APPROVAL_ROLES, INVENTORY_MANAGE_ROLES } from '../../auth/roles';
import { useAuth } from '../../auth/AuthContext';
import './style/InventoryItem.css'
const InventoryItem = () => {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { canAction } = useAuth();
  const canWriteInventoryItems = canAction(ACTION_KEYS.INVENTORY_ITEM_WRITE);
  const isAdminRole = canAction(INVENTORY_ITEM_APPROVAL_ROLES);

  const handleAddNewItemClick = () => {
    if (!canWriteInventoryItems) {
      return;
    }
    navigate(`/inventory-item/add/`)
  };

  const deleteInventoryItem = async (id) => {
    if (!canWriteInventoryItems) {
      return;
    }
    try {
      await apiService.delete(`/inventory_item/${id}`);
    } catch (err) {
      // handled
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
                canWriteInventoryItems={canWriteInventoryItems}
                isAdminRole={isAdminRole}
              />
            </>
          }
        />
        <Route
          path="/add"
          element={
            <RoleProtectedRoute
              allowedRoles={INVENTORY_MANAGE_ROLES}
              deniedMessage="You are not authorized to create inventory items."
            >
              <AddInventoryItem />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <RoleProtectedRoute
              allowedRoles={INVENTORY_MANAGE_ROLES}
              deniedMessage="You are not authorized to update inventory items."
            >
              <AddInventoryItem />
            </RoleProtectedRoute>
          }
        />
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
