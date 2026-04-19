import apiService, { postFile, putWithFile, resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

export const getInventorySummary = () => apiService.get('/inventory/summary');

export const searchInventoryItems = (params = {}) =>
    apiService.get('/inventory_item/search', params);

export const getAllInventoryItems = (params = {}) =>
    apiService.get('/inventory_item/all', params);

export const getInventoryItem = (id) =>
    apiService.get(`/inventory_item/${id}`);

export const filterInventoryItems = (payload) =>
    apiService.post('/inventory_item/filter', payload);

export const deleteInventoryItem = (id) =>
    apiService.delete(`/inventory_item/${id}`);

export const createInventoryItemWithFiles = (payload, attachments = []) =>
    postFile('/inventory_item/add', payload, attachments);

export const updateInventoryItemWithFiles = (id, payload, attachments = []) =>
    putWithFile(`/inventory_item/${id}`, payload, attachments);

export const receiveStock = (payload) =>
    apiService.post('/inventory/add-instances', payload);

export const getGroupedInventoryRequests = (params = {}) =>
    apiService.get('/inventory/requests/grouped', params);

export const approveInventoryRequest = ({ requestId, approvedBy, approvalRemarks }) =>
    apiService.put(
        `/inventory/requests/approve?requestId=${requestId}` +
        `&approvedBy=${encodeURIComponent(approvedBy)}` +
        `&approvalRemarks=${encodeURIComponent(approvalRemarks)}`,
        {}
    );

export const rejectInventoryRequest = ({ requestId, approvedBy, approvalRemarks }) =>
    apiService.put(
        `/inventory/requests/reject?requestId=${requestId}` +
        `&approvedBy=${encodeURIComponent(approvedBy)}` +
        `&approvalRemarks=${encodeURIComponent(approvalRemarks)}`,
        {}
    );

export const createInventoryRequest = (params) =>
    apiService.post(`/inventory/requests?${params.toString()}`);

export const getProcurementOrders = (params = {}) =>
    apiService.get('/inventory/inventory-procurement-orders', params);

export const markProcurementOrderReceived = (id, completedBy) =>
    apiService.put(`/inventory/inventory-procurement-orders/${id}/complete`, null, {
        params: { completedBy },
    });

export const getPresentInventory = (params = {}) =>
    apiService.get('/inventory/present', params);

export const getGroupedInventory = (params = {}) =>
    apiService.get('/inventory/grouped', params);

export const updateInventory = (id, payload) =>
    apiService.put(`/inventory/${id}`, payload);

export const addInventory = (payload) =>
    apiService.post(`/inventory/add?qty=${payload.quantity}`, payload);

// ── Work Order Material Requests ──────────────────────────────────────────────
export const getPendingMaterialRequests = (params = {}) =>
    apiService.get('/material-requests/pending', params);

export const getMaterialRequestsForWorkOrder = (workOrderId) =>
    apiService.get(`/material-requests/work-order/${workOrderId}`);

export const approveMaterialRequest = (requestId) =>
    apiService.post(`/material-requests/${requestId}/approve`, {});

export const partialApproveMaterialRequest = (requestId, approvedQuantity) =>
    apiService.post(`/material-requests/${requestId}/partial-approve`, { approvedQuantity });

export const rejectMaterialRequest = (requestId, reason) =>
    apiService.post(`/material-requests/${requestId}/reject`, { reason });

const inventoryService = {
    getInventorySummary,
    searchInventoryItems,
    getAllInventoryItems,
    getInventoryItem,
    filterInventoryItems,
    deleteInventoryItem,
    createInventoryItemWithFiles,
    updateInventoryItemWithFiles,
    receiveStock,
    getGroupedInventoryRequests,
    approveInventoryRequest,
    rejectInventoryRequest,
    createInventoryRequest,
    getProcurementOrders,
    markProcurementOrderReceived,
    getPresentInventory,
    getGroupedInventory,
    updateInventory,
    addInventory,
};

export default inventoryService;
