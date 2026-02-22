import { apiClient } from "./apiService";

/**
 * @typedef {Object} AuthLoginPayload
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} CreateUserPayload
 * @property {string} username
 * @property {string} password
 * @property {string|null} email
 * @property {string[]} roleNames
 */

/**
 * @typedef {Object} UpdateUserStatusPayload
 * @property {boolean} isActive
 * @property {boolean} isLocked
 */

/**
 * @typedef {Object} UpdateUserRolesPayload
 * @property {string[]} roleNames
 */

/**
 * @typedef {Object} UpdatePasswordPayload
 * @property {string} currentPassword
 * @property {string} newPassword
 */

/**
 * @typedef {Object} RolePayload
 * @property {string} name
 * @property {string} [description]
 */

/**
 * @typedef {Object} UserSummary
 * @property {number} id
 * @property {string} username
 * @property {string|null} email
 * @property {boolean} isActive
 * @property {boolean} isLocked
 * @property {string|null} lastLoginDate
 * @property {string} creationDate
 * @property {string[]} roles
 */

/**
 * @param {AuthLoginPayload} payload
 */
export const login = async ({ username, password }) => {
    const response = await apiClient.post("/auth/login", {
        username,
        password,
    });
    return response.data;
};

export const refresh = async (refreshToken) => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
};

export const logout = async (refreshToken) => {
    const response = await apiClient.post("/auth/logout", { refreshToken });
    return response.data;
};

export const getMe = async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
};

/**
 * @returns {Promise<UserSummary[]>}
 */
export const listUsers = async () => {
    const response = await apiClient.get("/auth/users");
    if (Array.isArray(response.data)) {
        return response.data;
    }
    if (Array.isArray(response.data?.users)) {
        return response.data.users;
    }
    return [];
};

/**
 * @param {CreateUserPayload} payload
 */
export const createUser = async (payload) => {
    const response = await apiClient.post("/auth/users", payload);
    return response.data;
};

/**
 * @param {number} id
 * @param {UpdateUserStatusPayload} payload
 */
export const updateUserStatus = async (id, payload) => {
    const response = await apiClient.patch(`/auth/users/${id}/status`, payload);
    return response.data;
};

/**
 * @param {number} id
 * @param {UpdateUserRolesPayload} payload
 */
export const updateUserRoles = async (id, payload) => {
    const response = await apiClient.put(`/auth/users/${id}/roles`, payload);
    return response.data;
};

/**
 * @param {number} id
 */
export const deleteUser = async (id) => {
    const response = await apiClient.delete(`/auth/users/${id}`);
    return response.data;
};

/**
 * @param {number} id
 */
export const resetUserPassword = async (id) => {
    const response = await apiClient.patch(`/auth/users/${id}/reset-password`, {});
    return response.data;
};

/**
 * @param {UpdatePasswordPayload} payload
 */
export const updateMyPassword = async (payload) => {
    const response = await apiClient.patch("/auth/me/password", payload);
    return response.data;
};

export const listRoles = async () => {
    const response = await apiClient.get("/auth/roles");
    if (Array.isArray(response.data)) {
        return response.data;
    }
    if (Array.isArray(response.data?.roles)) {
        return response.data.roles;
    }
    return [];
};

/**
 * @param {RolePayload} payload
 */
export const createRole = async (payload) => {
    const response = await apiClient.post("/auth/roles", payload);
    return response.data;
};

/**
 * @param {number|string} id
 * @param {RolePayload} payload
 */
export const updateRole = async (id, payload) => {
    const response = await apiClient.put(`/auth/roles/${id}`, payload);
    return response.data;
};

/**
 * @param {number|string} id
 */
export const deleteRole = async (id) => {
    const response = await apiClient.delete(`/auth/roles/${id}`);
    return response.data;
};
