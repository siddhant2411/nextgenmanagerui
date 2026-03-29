import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AddUpdateSalesOrder from './AddUpdateSalesOrder';
import SalesOrderRegister from './SalesOrderRegister';
import apiService from '../../../services/apiService';
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute';
import { SALES_MANAGE_ROLES } from '../../../auth/roles';

export default function SalesOrder() {

  const handleSave = async (data) => {

    try {
      if (data.id) {
        await apiService.put(`/sales-orders/${data.id}`, data); // Update
      } else {
        await apiService.post('/sales-orders', data); // Create
      }
      // navigate(-1);
    } catch (err) {
      // handled
    }
  };
  return (
    <Routes>
      {/* Main register (sales order list) */}
      <Route path="/" element={<SalesOrderRegister />} />
      {/* Add (Create New) route */}
      <Route
        path="/add"
        element={
          <RoleProtectedRoute
            allowedRoles={SALES_MANAGE_ROLES}
            deniedMessage="You are not authorized to create sales orders."
          >
            <AddUpdateSalesOrder mode="add" onSave={handleSave} />
          </RoleProtectedRoute>
        }
      />
      {/* Edit route; param is orderId */}
      <Route
        path="/edit/:orderId"
        element={
          <RoleProtectedRoute
            allowedRoles={SALES_MANAGE_ROLES}
            deniedMessage="You are not authorized to edit sales orders."
          >
            <AddUpdateSalesOrder mode="edit" onSave={handleSave} />
          </RoleProtectedRoute>
        }
      />
    </Routes>
  );
}
