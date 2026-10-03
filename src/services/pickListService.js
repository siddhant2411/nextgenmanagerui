import apiService, { resolveApiErrorMessage } from "./apiService";

export { resolveApiErrorMessage };

// ── Pick lists ────────────────────────────────────────────────────────────────

/** Both filters are optional; passing neither lists everything. */
export const listPickLists = ({ status, salesOrderId } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (salesOrderId) params.salesOrderId = salesOrderId;
    return apiService.get("/pick-list", params);
};

export const getPickList = (id) =>
    apiService.get(`/pick-list/${id}`);

/** Builds a pick for whatever on the order is not already covered by another live pick. */
export const createPickList = ({ salesOrderId, warehouseCode, remarks }) =>
    apiService.post("/pick-list", { salesOrderId, warehouseCode, remarks });

export const releasePickList = (id) =>
    apiService.post(`/pick-list/${id}/release`);

/**
 * Records what was found. Omitting a line picks it in full for untracked items; batch- and
 * serial-tracked lines must name the instances that left the shelf.
 */
export const confirmPickList = (id, { pickedBy, remarks, lines } = {}) =>
    apiService.post(`/pick-list/${id}/confirm`, { pickedBy, remarks, lines });

export const cancelPickList = (id) =>
    apiService.post(`/pick-list/${id}/cancel`);

// ── Display helpers ───────────────────────────────────────────────────────────

export const PICK_STATUSES = ["DRAFT", "RELEASED", "PICKED", "DISPATCHED", "CANCELLED"];

export const PICK_STATUS_META = {
    DRAFT:      { label: "Draft",      color: "#475569", bg: "#f1f5f9" },
    RELEASED:   { label: "Released",   color: "#a16207", bg: "#fef9c3" },
    PICKED:     { label: "Picked",     color: "#15803d", bg: "#dcfce7" },
    DISPATCHED: { label: "Dispatched", color: "#1d4ed8", bg: "#dbeafe" },
    CANCELLED:  { label: "Cancelled",  color: "#b91c1c", bg: "#fee2e2" },
};

export const pickStatusMeta = (status) =>
    PICK_STATUS_META[status] || PICK_STATUS_META.DRAFT;

/** A line is short when less was found than the order asked for. */
export const isShortPick = (line) =>
    Number(line?.quantityPicked ?? 0) > 0 &&
    Number(line.quantityPicked) < Number(line.quantityToPick ?? 0);
