import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

export const getPurchaseOrders = (params = {}) =>
    apiService.get('/purchase-orders', params);

export const getPurchaseOrder = (id) =>
    apiService.get(`/purchase-orders/${id}`);

export const createGRN = (payload) =>
    apiService.post('/grn', payload);

export const getGRN = (id) =>
    apiService.get(`/grn/${id}`);

export const searchGRNs = (params = {}) =>
    apiService.get('/grn', params);

export const getGRNsByPO = (poId) =>
    apiService.get(`/grn/by-po/${poId}`);

export const getStockHistory = (itemId, params = {}) =>
    apiService.get(`/grn/stock-history/${itemId}`, params);

export const getStockValue = (warehouse) =>
    apiService.get('/grn/stock-value', warehouse ? { warehouse } : {});

const grnService = {
    createGRN,
    getGRN,
    searchGRNs,
    getGRNsByPO,
    getStockHistory,
    getStockValue,
};

export default grnService;
