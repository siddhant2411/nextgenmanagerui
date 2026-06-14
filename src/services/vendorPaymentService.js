import apiService from './apiService';

export const getPaymentsForInvoice = (invoiceId) =>
    apiService.get(`/vendor-invoices/${invoiceId}/payments`);

export const getPaymentSummary = (invoiceId) =>
    apiService.get(`/vendor-invoices/${invoiceId}/payments/summary`);

export const recordVendorPayment = (invoiceId, payload) =>
    apiService.post(`/vendor-invoices/${invoiceId}/payments`, payload);

export const deleteVendorPayment = (invoiceId, paymentId) =>
    apiService.delete(`/vendor-invoices/${invoiceId}/payments/${paymentId}`);
