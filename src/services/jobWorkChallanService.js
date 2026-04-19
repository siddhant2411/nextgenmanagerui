import apiService from "./apiService";
import { searchInventoryItems } from "./inventoryService";

export const getJobWorkChallans = async (params = {}) => {
    return apiService.get('/job-work-challans', params);
};

export const getOverdueChallans = async () => {
    return apiService.get('/job-work-challans/overdue');
};

export const getJobWorkChallan = async (id) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.get(`/job-work-challans/${id}`);
};

export const createJobWorkChallan = async (data) => {
    return apiService.post('/job-work-challans', data);
};

export const updateJobWorkChallan = async (id, data) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.put(`/job-work-challans/${id}`, data);
};

export const dispatchChallan = async (id) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.post(`/job-work-challans/${id}/dispatch`);
};

export const receiveChallan = async (id, data) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.post(`/job-work-challans/${id}/receive`, data);
};

export const cancelChallan = async (id) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.post(`/job-work-challans/${id}/cancel`);
};

export const deleteJobWorkChallan = async (id) => {
    if (!id) throw new Error('Challan id is required');
    return apiService.delete(`/job-work-challans/${id}`);
};

export const getVendorDropdown = async () => {
    return apiService.get('/contact/dropdown', { type: 'VENDOR' });
};

export const searchWorkOrdersForChallan = async (search = '') => {
    return apiService.post('/production/work-order/get-list', {
        page: 0,
        size: 20,
        sortBy: 'createdDate',
        sortDir: 'desc',
        filters: search ? [{ field: 'search', operator: 'contains', value: search }] : [],
    });
};

export const getWorkOrderForChallan = async (id) => {
    if (!id) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${id}`);
};

export const searchInventoryItemsForChallan = async (search = '') => {
    return searchInventoryItems({ page: 0, size: 20, query: search });
};
