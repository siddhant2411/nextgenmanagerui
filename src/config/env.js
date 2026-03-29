const normalizeBaseUrl = (rawUrl = "") => rawUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizeBaseUrl(
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_BASE_URL ||
    ""
);

