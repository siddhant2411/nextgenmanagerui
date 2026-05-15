import apiService from './apiService';

export const getBatchesForItem = (itemId, params = {}) =>
    apiService.get('/batch-serial/batches', { itemId, ...params });

export const getSerialsForItem = (itemId, params = {}) =>
    apiService.get('/batch-serial/serials', { itemId, ...params });

export const getSerialsForBatch = (batchId) =>
    apiService.get('/batch-serial/serials/by-batch', { batchId });

export const getBatchesByDocument = (docNo) =>
    apiService.get('/batch-serial/batches/by-document', { docNo });

export const getSerialsByDocument = (docNo) =>
    apiService.get('/batch-serial/serials/by-document', { docNo });
