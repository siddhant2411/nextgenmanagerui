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

const EXPORT_CONFIGS = {
    catalog:          { path: '/inventory_item/export/catalog',          filename: 'Product_Catalog.xlsx' },
    bulk:             { path: '/inventory_item/export/bulk',             filename: 'Bulk_Item_Master.xlsx' },
    pdf:              { path: '/inventory_item/export/pdf',              filename: 'Product_Master_Data_Sheet.pdf' },
    'vendor-prices':  { path: '/inventory_item/export/vendor-prices',   filename: 'Vendor_Price_Comparison.xlsx' },
    'gst-import':     { path: '/inventory_item/export/gst-import',      filename: 'GST_EWay_Tally_Import.xlsx' },
    'low-stock-indent': { path: '/inventory_item/export/low-stock-indent', filename: 'Low_Stock_Purchase_Indent.xlsx' },
    'job-work-items': { path: '/inventory_item/export/job-work-items',  filename: 'Job_Work_Items.xlsx' },
};

export const getAttachmentBlob = (fileId) => apiService.fetchBlob(`/inventory_item/download/${fileId}`);

export const exportInventoryItems = (type, ids = []) => {
    const { path, filename } = EXPORT_CONFIGS[type];
    const params = ids.length ? { ids: ids.join(',') } : {};
    return apiService.download(path, params, filename);
};

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
    getAttachmentBlob,
};

export default inventoryService;
