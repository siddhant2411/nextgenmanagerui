import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

// ── List / Read ───────────────────────────────────────────────────────────────

export const listPurchaseOrders = (params = {}) =>
    apiService.get('/purchase-orders', params);

export const getPurchaseOrder = (id) =>
    apiService.get(`/purchase-orders/${id}`);

export const getNextPONumber = () =>
    apiService.get('/purchase-orders/next-number');

export const getPendingReceiptPOs = () =>
    apiService.get('/purchase-orders/pending-receipt');

export const getOverduePOs = () =>
    apiService.get('/purchase-orders/overdue');

export const getPurchaseAnalytics = () =>
    apiService.get('/purchase-orders/analytics');

// ── Create / Update / Delete ─────────────────────────────────────────────────

export const createPurchaseOrder = (payload) =>
    apiService.post('/purchase-orders', payload);

export const updatePurchaseOrder = (id, payload) =>
    apiService.put(`/purchase-orders/${id}`, payload);

export const deletePurchaseOrder = (id) =>
    apiService.delete(`/purchase-orders/${id}`);

// ── State transitions ─────────────────────────────────────────────────────────

export const submitPurchaseOrder = (id) =>
    apiService.post(`/purchase-orders/${id}/submit`);

export const approvePurchaseOrder = (id) =>
    apiService.post(`/purchase-orders/${id}/approve`);

export const rejectPurchaseOrder = (id, reason) =>
    apiService.post(`/purchase-orders/${id}/reject`, { reason });

export const sendPurchaseOrder = (id) =>
    apiService.post(`/purchase-orders/${id}/send`);

export const cancelPurchaseOrder = (id, reason) =>
    apiService.post(`/purchase-orders/${id}/cancel`, { reason });

export const recalculatePurchaseOrder = (id) =>
    apiService.post(`/purchase-orders/${id}/recalculate`);

export const completePurchaseOrder = (id) =>
    apiService.post(`/purchase-orders/${id}/complete`);

// ── PDF ───────────────────────────────────────────────────────────────────────

export const downloadPOPdf = (id) =>
    apiService.download(`/purchase-orders/${id}/pdf`, {}, `PO-${id}.pdf`);

// ── Email tracking ────────────────────────────────────────────────────────────

export const markEmailSent = (id, toEmail) =>
    apiService.post(`/purchase-orders/${id}/mark-email-sent`, { toEmail: toEmail ?? null });

const purchaseOrderService = {
    listPurchaseOrders,
    getPurchaseOrder,
    getNextPONumber,
    getPendingReceiptPOs,
    getOverduePOs,
    getPurchaseAnalytics,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    submitPurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    sendPurchaseOrder,
    cancelPurchaseOrder,
    recalculatePurchaseOrder,
    downloadPOPdf,
    markEmailSent,
};

export default purchaseOrderService;
