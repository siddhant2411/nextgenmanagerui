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

/**
 * Returns the closing balance of an item on the day BEFORE asOf.
 * Use this to show the "Opening Balance as on [date]" line in the stock ledger.
 * @param {number} itemId
 * @param {string} asOf  ISO date string, e.g. "2025-04-01"
 * @returns {Promise<number>}
 */
export const getOpeningBalance = (itemId, asOf) =>
    apiService.get(`/grn/stock-balance/${itemId}`, { asOf });

/**
 * Inward / Outward register — date-range, cross-item, paginated.
 * type = "INWARD" | "OUTWARD" | undefined (all)
 */
export const getRegister = (params = {}) =>
    apiService.get('/grn/register', params);

const grnService = {
    createGRN,
    getGRN,
    searchGRNs,
    getGRNsByPO,
    getStockHistory,
    getStockValue,
};

export default grnService;
