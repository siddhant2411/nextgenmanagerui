import apiService from "./apiService";
import { resolveApiErrorMessage } from "./apiService";

const runWithErrorMessage = async (request, fallback) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(resolveApiErrorMessage(error, fallback));
    }
};

export const getMachineDetailsList = async () => {
    return runWithErrorMessage(
        () => apiService.get("/machine-details"),
        "Failed to load machine list."
    );
};

export const getMachineDetailsById = async (machineId) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () => apiService.get(`/machine-details/${machineId}`),
        "Failed to load machine details."
    );
};

export const createMachineDetails = async (payload) => {
    return runWithErrorMessage(
        () => apiService.post("/machine-details", payload),
        "Failed to create machine."
    );
};

export const updateMachineDetails = async (machineId, payload) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () => apiService.put(`/machine-details/${machineId}`, payload),
        "Failed to update machine."
    );
};

export const changeMachineStatus = async (machineId, payload) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () => apiService.patch(`/machine-details/${machineId}/status`, payload),
        "Failed to change machine status."
    );
};

export const deleteMachineDetails = async (machineId) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () => apiService.delete(`/machine-details/${machineId}`),
        "Failed to delete machine."
    );
};

export const createMachineEvent = async (payload) => {
    return runWithErrorMessage(
        () => apiService.post("/machine-events", payload),
        "Failed to create machine event."
    );
};

export const createMachineProductionLog = async (payload) => {
    return runWithErrorMessage(
        () => apiService.post("/machine-production-logs", payload),
        "Failed to create production log."
    );
};

export const getMachineProductionLogs = async (
    machineId,
    { page = 0, size = 20, sortDir = "desc" } = {}
) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () =>
            apiService.get(`/machines/${machineId}/production-logs`, {
                page,
                size,
                sortDir,
            }),
        "Failed to load production logs."
    );
};

export const getMachineStatusHistory = async (
    machineId,
    { page = 0, size = 20, sortDir = "desc" } = {}
) => {
    if (!machineId) {
        throw new Error("Machine id is required");
    }
    return runWithErrorMessage(
        () =>
            apiService.get(`/machines/${machineId}/status-history`, {
                page,
                size,
                sortDir,
            }),
        "Failed to load status history."
    );
};

export const filterMachineDetails = async (payload) => {
    return runWithErrorMessage(
        () => apiService.post("/machine-details/filter", payload),
        "Failed to filter machines."
    );
};

export const getMachines = getMachineDetailsList;
export const getMachineById = getMachineDetailsById;
export const createMachine = createMachineDetails;
export const updateMachine = updateMachineDetails;
export const deleteMachine = deleteMachineDetails;
export const createOrUpdateProductionLog = createMachineProductionLog;
export const getProductionLogs = getMachineProductionLogs;
export const getStatusHistory = getMachineStatusHistory;

export const searchWorkCenters = async ({
    page = 0,
    size = 10,
    sortBy = "centerName",
    sortDir = "asc",
    search = "",
} = {}) => {
    return runWithErrorMessage(
        () =>
            apiService.get("/manufacturing/work-center/search", {
                page,
                size,
                sortBy,
                sortDir,
                search: search || undefined,
            }),
        "Failed to fetch work centers."
    );
};
