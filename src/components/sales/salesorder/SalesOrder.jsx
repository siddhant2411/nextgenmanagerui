import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AddUpdateSalesOrder from './AddUpdateSalesOrder';
import SalesOrderHub from './SalesOrderHub';
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute';
import { SALES_MANAGE_ROLES } from '../../../auth/roles';
import DeliveryNoteHub from '../deliverynote/DeliveryNoteHub';
import AddUpdateDeliveryNote from '../deliverynote/AddUpdateDeliveryNote';
import InvoiceHub from '../invoice/InvoiceHub';
import AddUpdateInvoice from '../invoice/AddUpdateInvoice';

export default function SalesOrder() {
  return (
    <Routes>
      {/* Sales Order List + Analytics */}
      <Route path="/" element={<SalesOrderHub />} />

      {/* Create */}
      <Route
        path="/add"
        element={
          <RoleProtectedRoute allowedRoles={SALES_MANAGE_ROLES} deniedMessage="You are not authorized to create sales orders.">
            <AddUpdateSalesOrder />
          </RoleProtectedRoute>
        }
      />

      {/* Edit / View */}
      <Route
        path="/edit/:orderId"
        element={
          <RoleProtectedRoute allowedRoles={SALES_MANAGE_ROLES} deniedMessage="You are not authorized to edit sales orders.">
            <AddUpdateSalesOrder />
          </RoleProtectedRoute>
        }
      />

      {/* Delivery Notes list */}
      <Route path="/delivery-notes" element={<DeliveryNoteHub />} />

      {/* Create Delivery Note (soId passed as query param: ?soId=123) */}
      <Route
        path="/delivery-notes/add"
        element={
          <RoleProtectedRoute allowedRoles={SALES_MANAGE_ROLES} deniedMessage="You are not authorized to create delivery notes.">
            <AddUpdateDeliveryNote />
          </RoleProtectedRoute>
        }
      />

      {/* View existing Delivery Note */}
      <Route path="/delivery-notes/view/:dnId" element={<AddUpdateDeliveryNote />} />

      {/* Tax Invoices list */}
      <Route path="/invoices" element={<InvoiceHub />} />

      {/* Create Invoice (soId passed as query param: ?soId=123) */}
      <Route
        path="/invoices/add"
        element={
          <RoleProtectedRoute allowedRoles={SALES_MANAGE_ROLES} deniedMessage="You are not authorized to create invoices.">
            <AddUpdateInvoice />
          </RoleProtectedRoute>
        }
      />

      {/* View existing Invoice */}
      <Route path="/invoices/view/:invoiceId" element={<AddUpdateInvoice />} />
    </Routes>
  );
}
