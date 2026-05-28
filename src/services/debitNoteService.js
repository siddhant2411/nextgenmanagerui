import apiService from './apiService';

export const getDebitNotes = (page = 0, size = 20) =>
    apiService.get('/debit-notes', { page, size });

export const getDebitNote = (id) =>
    apiService.get(`/debit-notes/${id}`);

export const getDebitNotesByVendor = (vendorId) =>
    apiService.get('/debit-notes/by-vendor', { vendorId });

export const getDebitNotesByGrn = (grnId) =>
    apiService.get('/debit-notes/by-grn', { grnId });

export const getDebitNotesByPo = (poId) =>
    apiService.get('/debit-notes/by-po', { poId });

export const getNextDebitNoteNumber = () =>
    apiService.get('/debit-notes/next-number');

export const createDebitNote = (payload) =>
    apiService.post('/debit-notes', payload);

export const confirmDebitNote = (id) =>
    apiService.put(`/debit-notes/${id}/confirm`);

export const cancelDebitNote = (id) =>
    apiService.put(`/debit-notes/${id}/cancel`);

const debitNoteService = {
    getDebitNotes,
    getDebitNote,
    getDebitNotesByVendor,
    getDebitNotesByGrn,
    getDebitNotesByPo,
    getNextDebitNoteNumber,
    createDebitNote,
    confirmDebitNote,
    cancelDebitNote,
};

export default debitNoteService;
