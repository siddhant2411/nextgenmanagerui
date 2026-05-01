import apiService, { apiClientFile, resolveApiErrorMessage } from "./apiService";
export { resolveApiErrorMessage };

export const getWorkOrderList = async (params) => {
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

export const shortCloseWorkOrder = async (id, remarks = '') => {
    if (!id) {
        throw new Error('Work order id is required');
    }
    const params = remarks ? `?remarks=${encodeURIComponent(remarks)}` : '';
    return apiService.patch(`/production/work-order/${id}/short-close${params}`);
}

// ── Rejection & Yield ──

export const getYieldMetrics = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${workOrderId}/yield`);
}

export const getWorkOrderRejections = async (workOrderId, status) => {
    if (!workOrderId) throw new Error('Work order id is required');
    const params = status ? `?status=${status}` : '';
    return apiService.get(`/production/work-order/${workOrderId}/rejections${params}`);
}

export const disposeRejection = async (rejectionEntryId, payload) => {
    if (!rejectionEntryId) throw new Error('Rejection entry id is required');
    return apiService.post(`/production/rejections/${rejectionEntryId}/dispose`, payload);
}

export const getReasonCodes = async (category) => {
    const params = category ? `?category=${category}` : '';
    return apiService.get(`/production/rejections/reason-codes${params}`);
}

// ── QC Testing ──

export const getWorkOrderTests = async (id) => {
    if (!id) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${id}/tests`);
}

export const recordTestResult = async (id, testResultId, data) => {
    if (!id) throw new Error('Work order id is required');
    if (!testResultId) throw new Error('Test result id is required');
    return apiService.put(`/production/work-order/${id}/tests/${testResultId}`, data);
}

export const getTestReport = async (id) => {
    if (!id) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${id}/test-report`);
}

// ── Production Scheduling ──

export const scheduleWorkOrder = async (id) => {
    if (!id) throw new Error('Work order id is required');
    return apiService.post(`/production/work-order/${id}/schedule`);
}

export const rescheduleWorkOrder = async (id, startDate) => {
    if (!id) throw new Error('Work order id is required');
    if (!startDate) throw new Error('Start date is required');
    return apiService.post(`/production/work-order/${id}/reschedule?startDate=${startDate}`);
}

// ── Machine Schedule ──

export const getMachineSchedule = async (machineId, from, to) => {
    if (!machineId) throw new Error('Machine id is required');
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiService.get(`/production/work-order/machine/${machineId}/schedule`, { params });
};

export const getMachineScheduleToday = async (machineId) => {
    if (!machineId) throw new Error('Machine id is required');
    return apiService.get(`/production/work-order/machine/${machineId}/schedule/today`);
};

export const scheduleAllWorkOrders = async () => {
    return apiService.post('/production/work-order/schedule-all');
};

// ── Plant Manager Schedule Views ──

export const getProductionScheduleCombined = async (from, to) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiService.get('/production/work-order/schedule/combined', { params });
};

export const getProductionScheduleWorkCenter = async (workCenterId, from, to) => {
    if (!workCenterId) throw new Error('Work center id is required');
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiService.get(`/production/work-order/schedule/work-center/${workCenterId}`, { params });
};

export const getProductionScheduleMachine = async (machineId, from, to) => {
    if (!machineId) throw new Error('Machine id is required');
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiService.get(`/production/work-order/schedule/machine/${machineId}`, { params });
};

// ── Material Re-order ──

export const reorderMaterial = async (workOrderId, materialId, data) => {
    if (!workOrderId) throw new Error('Work order id is required');
    if (!materialId) throw new Error('Material id is required');
    return apiService.post(`/production/work-order/${workOrderId}/materials/${materialId}/reorder`, data);
}

export const getMaterialReorders = async (workOrderId, materialId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    if (!materialId) throw new Error('Material id is required');
    return apiService.get(`/production/work-order/${workOrderId}/materials/${materialId}/reorders`);
}

// ── Cost of Production ──

export const getCostReport = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${workOrderId}/cost-report`);
};

// ── Labour Time Tracking ──

export const logLabour = async (operationId, data) => {
    if (!operationId) throw new Error('Operation id is required');
    return apiService.post(`/production/work-order/operation/${operationId}/labour`, data);
};

export const getLabourForOperation = async (operationId) => {
    if (!operationId) throw new Error('Operation id is required');
    return apiService.get(`/production/work-order/operation/${operationId}/labour`);
};

export const getLabourForWorkOrder = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${workOrderId}/labour`);
};

export const updateLabourEntry = async (entryId, data) => {
    if (!entryId) throw new Error('Entry id is required');
    return apiService.put(`/production/work-order/labour/${entryId}`, data);
};

export const deleteLabourEntry = async (entryId) => {
    if (!entryId) throw new Error('Entry id is required');
    return apiService.delete(`/production/work-order/labour/${entryId}`);
};

// ── QA Entries ──

export const getQaEntriesForOperation = async (operationId) => {
    if (!operationId) throw new Error('Operation id is required');
    return apiService.get(`/production/work-order/operation/${operationId}/qa`);
};

export const getQaEntriesForWorkOrder = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${workOrderId}/qa`);
};

export const submitQaBatch = async (operationId, data) => {
    if (!operationId) throw new Error('Operation id is required');
    return apiService.post(`/production/work-order/operation/${operationId}/qa/batch`, data);
};

// ── Attachments ──

export const getWorkOrderAttachments = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.get(`/production/work-order/${workOrderId}/attachments`);
};

export const uploadWorkOrderAttachments = async (workOrderId, files = []) => {
    if (!workOrderId) throw new Error('Work order id is required');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file || f));
    const response = await apiClientFile.post(`/production/work-order/${workOrderId}/attachments`, formData, {
        headers: { Accept: 'application/json' },
    });
    return response.data;
};

export const deleteWorkOrderAttachment = async (workOrderId, attachmentId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    if (!attachmentId) throw new Error('Attachment id is required');
    return apiService.delete(`/production/work-order/${workOrderId}/attachments/${attachmentId}`);
};

export const downloadWorkOrderJobSheet = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.download(
        `/production/work-order/${workOrderId}/export/job-sheet`,
        {},
        'Work_Order_Job_Sheet.pdf'
    );
};

export const downloadOperationInstructionCards = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.download(
        `/production/work-order/${workOrderId}/export/operation-instruction-cards`,
        {},
        `Operation_Cards_WO_${workOrderId}.pdf`
    );
};

export const downloadMaterialPickList = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.download(
        `/production/work-order/${workOrderId}/export/material-pick-list`,
        {},
        `Material_Pick_List_WO_${workOrderId}.pdf`
    );
};

export const downloadMoveTickets = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.download(
        `/production/work-order/${workOrderId}/export/move-tickets`,
        {},
        `Move_Tickets_WO_${workOrderId}.pdf`
    );
};

export const downloadQcTestReport = async (workOrderId) => {
    if (!workOrderId) throw new Error('Work order id is required');
    return apiService.download(
        `/production/work-order/${workOrderId}/export/qc-test-report`,
        {},
        `QC_Test_Report_WO_${workOrderId}.pdf`
    );
};
