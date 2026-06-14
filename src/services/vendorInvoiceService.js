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

export const getInvoiceAttachments = (invoiceId) =>
    apiService.get(`/vendor-invoices/${invoiceId}/attachments`);

export const uploadInvoiceAttachment = (invoiceId, file) =>
    apiService.upload(`/vendor-invoices/${invoiceId}/attachments`, file);

export const deleteInvoiceAttachment = (invoiceId, fileId) =>
    apiService.delete(`/vendor-invoices/${invoiceId}/attachments/${fileId}`);

export const downloadInvoiceAttachment = (invoiceId, fileId, filename) =>
    apiService.download(`/vendor-invoices/${invoiceId}/attachments/${fileId}/download`, {}, filename);

const vendorInvoiceService = {
    getVendorInvoicesByPO,
    getVendorInvoice,
    createVendorInvoice,
    postVendorInvoice,
    cancelVendorInvoice,
    getInvoiceAttachments,
    uploadInvoiceAttachment,
    deleteInvoiceAttachment,
    downloadInvoiceAttachment,
};

export default vendorInvoiceService;
