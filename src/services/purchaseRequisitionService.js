import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

// ── List / Read ───────────────────────────────────────────────────────────────

export const listPurchaseRequisitions = (params = {}) =>
    apiService.get('/purchase-requisitions', params);

export const getPurchaseRequisition = (id) =>
    apiService.get(`/purchase-requisitions/${id}`);

export const getNextPRNumber = () =>
    apiService.get('/purchase-requisitions/next-number');

// ── Create / Update / Delete ─────────────────────────────────────────────────

export const createPurchaseRequisition = (payload) =>
    apiService.post('/purchase-requisitions', payload);

export const updatePurchaseRequisition = (id, payload) =>
    apiService.put(`/purchase-requisitions/${id}`, payload);

export const deletePurchaseRequisition = (id) =>
    apiService.delete(`/purchase-requisitions/${id}`);

// ── State transitions ─────────────────────────────────────────────────────────

export const submitPurchaseRequisition = (id) =>
    apiService.post(`/purchase-requisitions/${id}/submit`);

export const approvePurchaseRequisition = (id) =>
    apiService.post(`/purchase-requisitions/${id}/approve`);

export const rejectPurchaseRequisition = (id, reason) =>
    apiService.post(`/purchase-requisitions/${id}/reject`, { reason });

export const cancelPurchaseRequisition = (id, reason) =>
    apiService.post(`/purchase-requisitions/${id}/cancel`, { reason });

// ── Conversion ────────────────────────────────────────────────────────────────

export const convertRequisitionToPo = (id, payload) =>
    apiService.post(`/purchase-requisitions/${id}/convert-to-po`, payload);

export const generateRequisitionFromWorkOrder = (workOrderId) =>
    apiService.post(`/purchase-requisitions/from-work-order/${workOrderId}`);

const purchaseRequisitionService = {
    listPurchaseRequisitions,
    getPurchaseRequisition,
    getNextPRNumber,
    createPurchaseRequisition,
    updatePurchaseRequisition,
    deletePurchaseRequisition,
    submitPurchaseRequisition,
    approvePurchaseRequisition,
    rejectPurchaseRequisition,
    cancelPurchaseRequisition,
    convertRequisitionToPo,
    generateRequisitionFromWorkOrder,
};

export default purchaseRequisitionService;
