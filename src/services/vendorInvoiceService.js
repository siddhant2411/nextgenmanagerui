import apiService from './apiService';

export const getVendorInvoicesByPO = (poId) =>
    apiService.get('/vendor-invoices', { poId });

export const getVendorInvoice = (id) =>
    apiService.get(`/vendor-invoices/${id}`);

export const createVendorInvoice = (payload) =>
    apiService.post('/vendor-invoices', payload);

export const postVendorInvoice = (id) =>
    apiService.put(`/vendor-invoices/${id}/post`);

export const cancelVendorInvoice = (id) =>
    apiService.put(`/vendor-invoices/${id}/cancel`);

const vendorInvoiceService = {
    getVendorInvoicesByPO,
    getVendorInvoice,
    createVendorInvoice,
    postVendorInvoice,
    cancelVendorInvoice,
};

export default vendorInvoiceService;
