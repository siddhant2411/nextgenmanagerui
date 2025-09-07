import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AddUpdateSalesOrder from './AddUpdateSalesOrder';
import SalesOrderRegister from './SalesOrderRegister';
import apiService from '../../../services/apiService';

export default function SalesOrder() {

  const handleSave = async (data) => {

    console.log(data)
    try {
      if (data.id) {
        await apiService.put(`/sales-orders/${data.id}`, data); // Update
      } else {
        await apiService.post('/sales-orders', data); // Create
      }
      // navigate(-1);
    } catch (err) {
      console.error('Save failed', err);
    }
  };
  return (
    <Routes>
      {/* Main register (sales order list) */}
      <Route path="/" element={<SalesOrderRegister />} />
      {/* Add (Create New) route */}
      <Route path="/add" element={<AddUpdateSalesOrder mode="add" onSave={handleSave} />} />
      {/* Edit route; param is orderId */}
      <Route path="/edit/:orderId" element={<AddUpdateSalesOrder mode="edit" onSave={handleSave} />} />
    </Routes>
  );
}
