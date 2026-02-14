import apiService from "./apiService";

export const getWorkOrderList = async (params) => {
    console.log('Fetching work order list with params:', params);
    return apiService.post('/production/work-order/get-list', params);
}

export const getWorkOrder = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.get(`/production/work-order/${id}`);
}

export const getWorkOrderHistory = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.get(`/production/work-order/${id}/history`);
}

export const getWorkOrderSummary = async () => {
    return apiService.get('/production/work-order/summary');
}
export const createWorkOrder = async (data) => {
    return apiService.post('/production/work-order', data);
}

export const updateWorkOrder = async (id, data) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.put(`/production/work-order/${id}`, data);
}

export const releaseWorkOrder = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.patch(`/production/work-order/${id}/release`);
}

export const startOperation = async (operationId) => {
    if (!operationId) {
        throw new Error('Operation id is required');
    }
    return apiService.patch(`/production/work-order/operation/${operationId}/start`);
}

export const completeOperationPartial = async (operationId, payload) => {
    if (!operationId) {
        throw new Error('Operation id is required');
    }
    if (!payload) {
        throw new Error('Completion payload is required');
    }
    return apiService.patch(`/production/work-order/operation/${operationId}/complete-partial`, payload);
}

export const completeOperation = async (operationId, completedQty) => {
    if (completedQty === null || completedQty === undefined) {
        throw new Error('Completed quantity is required');
    }
    return completeOperationPartial(operationId, {
        completedQuantity: completedQty,
        scrappedQuantity: 0,
        remarks: '',
    });
}

export const issueWorkOrderMaterials = async (workOrderId, materials = []) => {
    if (!workOrderId) {
        throw new Error('Work order id is required');
    }
    if (!Array.isArray(materials) || materials.length === 0) {
        throw new Error('At least one material is required');
    }
    return apiService.patch('/production/work-order/material/issue',
        {
            workOrderId,
            materials
        }
    );
}

export const completeWorkOrder = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.patch(`/production/work-order/${id}/complete`);
}

export const closeWorkOrder = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.patch(`/production/work-order/${id}/close`);
}

export const cancelWorkOrder = async (id) => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    return apiService.patch(`/production/work-order/${id}/cancel`);
}
