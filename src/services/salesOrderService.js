import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

// ── List / Read ───────────────────────────────────────────────────────────────

export const listSalesOrders = (params = {}) =>
    apiService.get('/sales-orders', params);

export const getSalesOrder = (id) =>
    apiService.get(`/sales-orders/${id}`);

export const getNextSONumber = () =>
    apiService.get('/sales-orders/next-number');

export const getPendingDispatch = () =>
    apiService.get('/sales-orders/pending-dispatch');

export const getOverdueSOs = () =>
    apiService.get('/sales-orders/overdue');

export const getSalesAnalytics = () =>
    apiService.get('/sales-orders/analytics');

export const getSalesOrderProfitability = (id) =>
    apiService.get(`/sales-orders/${id}/profitability`);

// ── Create / Update / Delete ─────────────────────────────────────────────────

export const createSalesOrder = (payload) =>
    apiService.post('/sales-orders', payload);

export const updateSalesOrder = (id, payload) =>
    apiService.put(`/sales-orders/${id}`, payload);

export const deleteSalesOrder = (id) =>
    apiService.delete(`/sales-orders/${id}`);

// ── State transitions ─────────────────────────────────────────────────────────

export const submitSalesOrder = (id) =>
    apiService.post(`/sales-orders/${id}/submit`);

export const approveSalesOrder = (id) =>
    apiService.post(`/sales-orders/${id}/approve`);

export const rejectSalesOrder = (id, reason) =>
    apiService.post(`/sales-orders/${id}/reject`, { reason });

export const sendSalesOrder = (id, toEmail) =>
    apiService.post(`/sales-orders/${id}/send`, null, { params: { toEmail } });

export const cancelSalesOrder = (id, reason) =>
    apiService.post(`/sales-orders/${id}/cancel`, { reason });

export const completeSalesOrder = (id) =>
    apiService.post(`/sales-orders/${id}/complete`);

export const recalculateSalesOrder = (id) =>
    apiService.post(`/sales-orders/${id}/recalculate`);

// ── PDF / Documents ───────────────────────────────────────────────────────────

export const downloadSOPdf = (id, orderNumber) =>
    apiService.download(`/sales-orders/${id}/pdf`, {}, `Invoice-${orderNumber || id}.pdf`);

export const downloadOrderAcknowledgement = (id, orderNumber) =>
    apiService.download(`/sales-orders/${id}/pdf/order-acknowledgement`, {}, `OA-${orderNumber || id}.pdf`);

export const downloadProformaInvoice = (id, orderNumber) =>
    apiService.download(`/sales-orders/${id}/pdf/proforma-invoice`, {}, `PF-${orderNumber || id}.pdf`);

// ── Advance Payments ──────────────────────────────────────────────────────────

export const getPaymentsForOrder = (orderId) =>
    apiService.get(`/sales-orders/${orderId}/payments`);

export const recordPayment = (orderId, payload) =>
    apiService.post(`/sales-orders/${orderId}/payments`, payload);

export const deletePayment = (orderId, paymentId) =>
    apiService.delete(`/sales-orders/${orderId}/payments/${paymentId}`);

// ── Delivery Notes ─────────────────────────────────────────────────────────────

export const listDeliveryNotes = (params = {}) =>
    apiService.get('/delivery-notes', params);

export const getDeliveryNote = (id) =>
    apiService.get(`/delivery-notes/${id}`);

export const createDeliveryNote = (payload) =>
    apiService.post('/delivery-notes', payload);

export const deleteDeliveryNote = (id) =>
    apiService.delete(`/delivery-notes/${id}`);

export const downloadDeliveryNotePdf = (id, dnNo) =>
    apiService.download(`/delivery-notes/${id}/pdf`, {}, `Challan-${dnNo || id}.pdf`);


// ── Tax Invoices ───────────────────────────────────────────────────────────────

export const listTaxInvoices = (params = {}) =>
    apiService.get('/tax-invoices', params);

export const getTaxInvoice = (id) =>
    apiService.get(`/tax-invoices/${id}`);

export const getTaxInvoicesBySalesOrder = (soId) =>
    apiService.get(`/tax-invoices/by-sales-order/${soId}`);

export const getNextInvoiceNumber = () =>
    apiService.get('/tax-invoices/next-number');

export const createTaxInvoice = (payload) =>
    apiService.post('/tax-invoices', payload);

export const markInvoiceSent = (id) =>
    apiService.post(`/tax-invoices/${id}/send`);

export const markInvoicePaid = (id, amount) =>
    apiService.post(`/tax-invoices/${id}/pay`, null, { params: amount != null ? { amount } : {} });

export const cancelTaxInvoice = (id) =>
    apiService.post(`/tax-invoices/${id}/cancel`);

export const downloadTaxInvoicePdf = (id, invoiceNumber) =>
    apiService.download(`/tax-invoices/${id}/pdf`, {}, `Invoice-${invoiceNumber || id}.pdf`);


const salesOrderService = {
    listSalesOrders,
    getSalesOrder,
    getNextSONumber,
    getPendingDispatch,
    getOverdueSOs,
    getSalesAnalytics,
    getSalesOrderProfitability,
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
    submitSalesOrder,
    approveSalesOrder,
    rejectSalesOrder,
    sendSalesOrder,
    cancelSalesOrder,
    completeSalesOrder,
    recalculateSalesOrder,
    downloadSOPdf,
    downloadOrderAcknowledgement,
    downloadProformaInvoice,
    getPaymentsForOrder,
    recordPayment,
    deletePayment,
    listDeliveryNotes,
    getDeliveryNote,
    createDeliveryNote,
    deleteDeliveryNote,
    downloadDeliveryNotePdf,
    listTaxInvoices,
    getTaxInvoice,
    getTaxInvoicesBySalesOrder,
    getNextInvoiceNumber,
    createTaxInvoice,
    markInvoiceSent,
    markInvoicePaid,
    cancelTaxInvoice,
    downloadTaxInvoicePdf,
};

export default salesOrderService;
