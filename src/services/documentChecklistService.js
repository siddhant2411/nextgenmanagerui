import apiService, { apiClientFile } from './apiService';
import { API_BASE_URL } from '../config/env';

const base = (entityType, entityId) =>
    `/document-checklist/${entityType}/${entityId}`;

export const getChecklist = (entityType, entityId) =>
    apiService.get(base(entityType, entityId));

export const getMissingEssential = (entityType, entityId) =>
    apiService.get(`${base(entityType, entityId)}/missing-essential`);

export const updateChecklistStatus = (entityType, entityId, itemId, status, notes) =>
    apiService.patch(`${base(entityType, entityId)}/${itemId}/status`, { status, notes });

export const uploadChecklistFile = async (entityType, entityId, itemId, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClientFile.post(
        `${API_BASE_URL}${base(entityType, entityId)}/${itemId}/upload`,
        form,
        { headers: { Accept: 'application/json' } }
    );
    return res.data;
};

export const removeChecklistFile = (entityType, entityId, itemId) =>
    apiService.delete(`${base(entityType, entityId)}/${itemId}/file`);

export const addCustomDocument = (entityType, entityId, customLabel) =>
    apiService.post(`${base(entityType, entityId)}/custom`, { customLabel });

export const deleteCustomDocument = (entityType, entityId, itemId) =>
    apiService.delete(`${base(entityType, entityId)}/${itemId}`);
