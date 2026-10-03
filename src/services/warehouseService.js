import apiService, { resolveApiErrorMessage } from "./apiService";

export { resolveApiErrorMessage };

// ── Warehouses ────────────────────────────────────────────────────────────────

export const listWarehouses = (activeOnly = false) =>
    apiService.get("/warehouse", { activeOnly });

export const getWarehouse = (id) =>
    apiService.get(`/warehouse/${id}`);

export const createWarehouse = (dto) =>
    apiService.post("/warehouse", dto);

export const updateWarehouse = (id, dto) =>
    apiService.put(`/warehouse/${id}`, dto);

export const deleteWarehouse = (id) =>
    apiService.delete(`/warehouse/${id}`);

// ── Stock held ────────────────────────────────────────────────────────────────

/** What a warehouse is holding, item by item. Items at zero have no row. */
export const getWarehouseStock = (warehouseId) =>
    apiService.get(`/warehouse/${warehouseId}/stock`);

// ── Storage locations ─────────────────────────────────────────────────────────

export const listLocations = (warehouseId, pickableOnly = false) =>
    apiService.get(`/warehouse/${warehouseId}/locations`, { pickableOnly });

export const createLocation = (warehouseId, dto) =>
    apiService.post(`/warehouse/${warehouseId}/locations`, dto);

export const updateLocation = (locationId, dto) =>
    apiService.put(`/warehouse/locations/${locationId}`, dto);

export const deleteLocation = (locationId) =>
    apiService.delete(`/warehouse/locations/${locationId}`);

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Mirrors the backend WarehouseType enum. The types drive routing rather than reporting —
 * QUARANTINE receives rejected goods, SCRAP receives write-offs — so they are worth showing
 * rather than hiding behind a generic label.
 */
export const WAREHOUSE_TYPES = [
    { value: "GENERAL",        label: "General" },
    { value: "RAW_MATERIAL",   label: "Raw Material" },
    { value: "WIP",            label: "Work in Progress" },
    { value: "FINISHED_GOODS", label: "Finished Goods" },
    { value: "QUARANTINE",     label: "Quarantine" },
    { value: "SCRAP",          label: "Scrap" },
];

export const WAREHOUSE_TYPE_META = {
    GENERAL:        { label: "General",           color: "#475569", bg: "#f1f5f9" },
    RAW_MATERIAL:   { label: "Raw Material",      color: "#0369a1", bg: "#e0f2fe" },
    WIP:            { label: "Work in Progress",  color: "#a16207", bg: "#fef9c3" },
    FINISHED_GOODS: { label: "Finished Goods",    color: "#15803d", bg: "#dcfce7" },
    QUARANTINE:     { label: "Quarantine",        color: "#b91c1c", bg: "#fee2e2" },
    SCRAP:          { label: "Scrap",             color: "#7c2d12", bg: "#ffedd5" },
};

export const warehouseTypeMeta = (type) =>
    WAREHOUSE_TYPE_META[type] || WAREHOUSE_TYPE_META.GENERAL;
