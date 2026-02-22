import axios from "axios";
import { API_BASE_URL } from "../config/env";
import {
    clearAuthSession,
    getAccessToken,
    getRefreshToken,
    loadAuthSession,
    saveTokenPayload,
} from "./authStorage";
import { emitForbiddenEvent } from "../auth/authEvents";

let unauthorizedHandler = null;
let sessionRefreshedHandler = null;
let refreshPromise = null;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

export const setSessionRefreshedHandler = (handler) => {
    sessionRefreshedHandler = handler;
};

export const resolveApiErrorMessage = (
    error,
    fallback = "Unable to process this request right now."
) => {
    const payload = error?.response?.data;
    const messageCandidate =
        payload?.message ||
        payload?.error ||
        (typeof payload === "string" ? payload : "");
    if (typeof messageCandidate === "string" && messageCandidate.trim()) {
        return messageCandidate;
    }
    return fallback;
};

const createClient = () =>
    axios.create({
        baseURL: API_BASE_URL,
        timeout: 15000,
    });

export const apiClient = createClient();
export const apiClientFile = createClient();
const refreshClient = createClient();

const isAuthLoginRequest = (requestUrl = "") => requestUrl.includes("/auth/login");
const isAuthRefreshRequest = (requestUrl = "") => requestUrl.includes("/auth/refresh");
const shouldSkipAuthHeader = (requestUrl = "") =>
    isAuthLoginRequest(requestUrl) || isAuthRefreshRequest(requestUrl);

const handleUnauthorized = (message = "Session expired. Please sign in again.") => {
    clearAuthSession();
    if (typeof unauthorizedHandler === "function") {
        unauthorizedHandler(message);
    } else if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign(`/login?sessionExpired=1&message=${encodeURIComponent(message)}`);
    }
};

const refreshAuthSession = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        const missingTokenError = new Error("Refresh token is missing");
        missingTokenError.code = "MISSING_REFRESH_TOKEN";
        throw missingTokenError;
    }

    const response = await refreshClient.post("/auth/refresh", { refreshToken });
    const payload = response?.data;
    if (!payload?.accessToken || !payload?.refreshToken) {
        throw new Error("Refresh response did not include token pair");
    }
    const nextSession = saveTokenPayload(payload, loadAuthSession());
    if (nextSession && typeof sessionRefreshedHandler === "function") {
        sessionRefreshedHandler(nextSession);
    }
    return nextSession;
};

const getRefreshPromise = () => {
    if (!refreshPromise) {
        refreshPromise = refreshAuthSession().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

const attachInterceptors = (client) => {
    client.interceptors.request.use((config) => {
        const token = getAccessToken();
        const requestUrl = config?.url || "";

        if (token && !shouldSkipAuthHeader(requestUrl)) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const status = error?.response?.status;
            const originalRequest = error?.config || {};
            const requestUrl = originalRequest?.url || "";
            const isLoginRequest = isAuthLoginRequest(requestUrl);
            const isRefreshRequest = isAuthRefreshRequest(requestUrl);
            const hasRetriedAfterRefresh = Boolean(originalRequest._retryAfterRefresh);

            if (status === 401 && !isLoginRequest && !isRefreshRequest && !hasRetriedAfterRefresh) {
                originalRequest._retryAfterRefresh = true;
                try {
                    const refreshedSession = await getRefreshPromise();
                    const nextAccessToken = refreshedSession?.accessToken;
                    if (!nextAccessToken) {
                        throw new Error("Missing access token after refresh");
                    }
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
                    return client(originalRequest);
                } catch (refreshError) {
                    const refreshStatus = refreshError?.response?.status;
                    const isRefreshRejected = refreshStatus === 400 || refreshStatus === 401;
                    const message = resolveApiErrorMessage(
                        refreshError,
                        "Session expired. Please sign in again."
                    );
                    if (isRefreshRejected || refreshError?.code === "MISSING_REFRESH_TOKEN") {
                        handleUnauthorized(message);
                    } else {
                        handleUnauthorized("Session expired. Please sign in again.");
                    }
                    return Promise.reject(refreshError);
                }
            }

            if (status === 401 && !isLoginRequest && !isRefreshRequest) {
                const message = resolveApiErrorMessage(
                    error,
                    "Session expired. Please sign in again."
                );
                handleUnauthorized(message);
            } else if (status === 403 && !isLoginRequest && !isRefreshRequest) {
                const message = resolveApiErrorMessage(
                    error,
                    "Not authorized to perform this action."
                );
                emitForbiddenEvent(message);
            }
            return Promise.reject(error);
        }
    );
};

attachInterceptors(apiClient);
attachInterceptors(apiClientFile);

const apiService = {
    get: async (endpoint, params = {}) => {
        const response = await apiClient.get(endpoint, { params });
        return response.data;
    },

    download: async (endpoint, params, fileName = "downloaded_file") => {
        const response = await apiClient.get(endpoint, {
            params,
            responseType: "blob",
        });

        const contentDisposition = response.headers["content-disposition"];
        let filename = fileName;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+?)"/);
            if (match?.[1]) {
                filename = match[1];
            }
        }
        filename = filename.replace(/^\d+_/, "");

        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    },

    upload: async (url, file, config = {}) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiClientFile.post(url, formData, {
            headers: {
                Accept: "application/json",
            },
            ...config,
        });
    },

    post: async (endpoint, data) => {
        const response = await apiClient.post(endpoint, data);
        return response.data;
    },

    put: async (endpoint, data, config = {}) => {

        const response = await apiClient.put(endpoint, data, config);
        return response.data;

    },

    patch: async (endpoint, data = null, config = {}) => {
        const response = await apiClient.patch(endpoint, data, config);
        return response.data;
    },

    delete: async (endpoint, config = {}) => {
        try {
            const response = await apiClient.delete(endpoint, config);
            return response.data;
        } catch (error) {
            const message = resolveApiErrorMessage(
                error,
                "Unable to process this request right now."
            );
            throw new Error(message);
        }
    },
};

export const postFile = async (endpoint, inventoryItem, attachments = []) => {
    const formData = new FormData();
    formData.append(
        "inventoryItem",
        new Blob([JSON.stringify(inventoryItem)], { type: "application/json" })
    );
    attachments.forEach((file) => {
        formData.append("attachments", file.file);
    });

    const response = await apiClientFile.post(endpoint, formData, {
        headers: {
            Accept: "application/json",
        },
    });
    return response.data;
};

export const putWithFile = async (endpoint, inventoryItem, attachments = []) => {
    const formData = new FormData();
    formData.append(
        "inventoryItem",
        new Blob([JSON.stringify(inventoryItem)], { type: "application/json" })
    );
    attachments.forEach((file) => {
        formData.append("attachments", file.file);
    });

    const response = await apiClientFile.put(endpoint, formData, {
        headers: {
            Accept: "application/json",
        },
    });
    return response.data;
};

export default apiService;
