import apiService from "./apiService";

export const getActiveTemplates = async (itemId) => {
    if (!itemId) throw new Error('Item ID is required');
    return apiService.get(`/manufacturing/test-template/item/${itemId}`);
};

export const getAllTemplates = async (itemId) => {
    if (!itemId) throw new Error('Item ID is required');
    return apiService.get(`/manufacturing/test-template/item/${itemId}/all`);
};

export const createTemplate = async (data) => {
    if (!data) throw new Error('Template data is required');
    return apiService.post('/manufacturing/test-template', data);
};

export const updateTemplate = async (id, data) => {
    if (!id) throw new Error('Template ID is required');
    return apiService.put(`/manufacturing/test-template/${id}`, data);
};

export const deleteTemplate = async (id) => {
    if (!id) throw new Error('Template ID is required');
    return apiService.delete(`/manufacturing/test-template/${id}`);
};
