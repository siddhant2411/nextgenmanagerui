import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PurchaseOrderList from './PurchaseOrderList';
import AddUpdatePurchaseOrder from './AddUpdatePurchaseOrder';
import PurchaseRequisitionList from './requisition/PurchaseRequisitionList';
import AddUpdatePurchaseRequisition from './requisition/AddUpdatePurchaseRequisition';
import PurchaseAnalytics from './PurchaseAnalytics';
import OverduePOList from './OverduePOList';
import VendorInvoiceList from './VendorInvoiceList';
import AddVendorInvoice from './AddVendorInvoice';

export default function Purchase() {
    return (
        <Routes>
            <Route index element={<PurchaseOrderList />} />
            <Route path="analytics" element={<PurchaseAnalytics />} />
            <Route path="overdue" element={<OverduePOList />} />
            <Route path="new" element={<AddUpdatePurchaseOrder />} />
            <Route path="requisitions" element={<PurchaseRequisitionList />} />
            <Route path="requisitions/new" element={<AddUpdatePurchaseRequisition />} />
            <Route path="requisitions/:id" element={<AddUpdatePurchaseRequisition />} />
            <Route path=":id/invoices" element={<VendorInvoiceList />} />
            <Route path=":id/invoices/new" element={<AddVendorInvoice />} />
            <Route path=":id" element={<AddUpdatePurchaseOrder />} />
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    );
}
