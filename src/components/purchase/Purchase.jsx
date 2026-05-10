import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PurchaseOrderList from './PurchaseOrderList';
import AddUpdatePurchaseOrder from './AddUpdatePurchaseOrder';
import PurchaseRequisitionList from './requisition/PurchaseRequisitionList';
import AddUpdatePurchaseRequisition from './requisition/AddUpdatePurchaseRequisition';

export default function Purchase() {
    return (
        <Routes>
            <Route index element={<PurchaseOrderList />} />
            <Route path="new" element={<AddUpdatePurchaseOrder />} />
            <Route path="requisitions" element={<PurchaseRequisitionList />} />
            <Route path="requisitions/new" element={<AddUpdatePurchaseRequisition />} />
            <Route path="requisitions/:id" element={<AddUpdatePurchaseRequisition />} />
            <Route path=":id" element={<AddUpdatePurchaseOrder />} />
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    );
}
