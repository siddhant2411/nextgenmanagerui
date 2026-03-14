import apiService from "./apiService";
import { resolveApiErrorMessage } from "./apiService";

const runWithErrorMessage = async (request, fallback) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(resolveApiErrorMessage(error, fallback));
    }
};

export const getLaborRoles = async ({
    page = 0,
    size = 10,
    sortBy = "id",
    sortDir = "asc",
    search = "",
} = {}) => {
    return runWithErrorMessage(
        () =>
            apiService.get("/production/labor-role", {
                page,
                size,
                sortBy,
                sortDir,
                search: search || undefined,
            }),
        "Failed to fetch labor roles."
    );
};

export const getLaborRoleById = async (id) => {
    if (!id) throw new Error("Labor role ID is required");
    return runWithErrorMessage(
        () => apiService.get(`/production/labor-role/${id}`),
        "Failed to fetch labor role."
    );
};

export const createLaborRole = async (payload) => {
    return runWithErrorMessage(
        () => apiService.post("/production/labor-role", payload),
        "Failed to create labor role."
    );
};

export const updateLaborRole = async (id, payload) => {
    if (!id) throw new Error("Labor role ID is required");
    return runWithErrorMessage(
        () => apiService.put(`/production/labor-role/${id}`, payload),
        "Failed to update labor role."
    );
};

export const deleteLaborRole = async (id) => {
    if (!id) throw new Error("Labor role ID is required");
    return runWithErrorMessage(
        () => apiService.delete(`/production/labor-role/${id}`),
        "Failed to delete labor role."
    );
};
