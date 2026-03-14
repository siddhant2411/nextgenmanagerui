import apiService from "./apiService";

export const getRouting = async (id) => {
    if (!id) throw new Error('Routing id is required');
    return apiService.get(`/production/routings/${id}`);
};

export const createRouting = async (data) => {
    return apiService.post('/production/routings', data);
};

export const updateRouting = async (id, data) => {
    if (!id) throw new Error('Routing id is required');
    return apiService.put(`/production/routings/${id}`, data);
};
