import apiService, { resolveApiErrorMessage } from "./apiService";

export { resolveApiErrorMessage };

// ── Transfers ─────────────────────────────────────────────────────────────────

/** Both filters are optional; the backend honours one at a time, status winning. */
export const listStockTransfers = ({ status, warehouseId } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (warehouseId) params.warehouseId = warehouseId;
    return apiService.get("/stock-transfer", params);
};

export const getStockTransfer = (id) =>
    apiService.get(`/stock-transfer/${id}`);

/** Creates the transfer in DRAFT. Nothing moves until it is dispatched. */
export const createStockTransfer = ({ fromWarehouseCode, toWarehouseCode, remarks, lines }) =>
    apiService.post("/stock-transfer", { fromWarehouseCode, toWarehouseCode, remarks, lines });

/** Takes the stock out of the source and puts it in transit. Rejected if any line is short. */
export const dispatchStockTransfer = (id) =>
    apiService.post(`/stock-transfer/${id}/dispatch`);

/**
 * Lands the transfer. Sending no lines receives everything in full; naming a line with a smaller
 * quantity records a short receipt, and the shortfall stays in transit at the source.
 */
export const receiveStockTransfer = (id, { lines, remarks } = {}) =>
    apiService.post(`/stock-transfer/${id}/receive`, { lines, remarks });

export const cancelStockTransfer = (id) =>
    apiService.post(`/stock-transfer/${id}/cancel`);

// ── Display helpers ───────────────────────────────────────────────────────────

export const TRANSFER_STATUSES = ["DRAFT", "DISPATCHED", "RECEIVED", "CANCELLED"];

export const TRANSFER_STATUS_META = {
    DRAFT:      { label: "Draft",      color: "#475569", bg: "#f1f5f9" },
    DISPATCHED: { label: "In Transit", color: "#a16207", bg: "#fef9c3" },
    RECEIVED:   { label: "Received",   color: "#15803d", bg: "#dcfce7" },
    CANCELLED:  { label: "Cancelled",  color: "#b91c1c", bg: "#fee2e2" },
};

export const transferStatusMeta = (status) =>
    TRANSFER_STATUS_META[status] || TRANSFER_STATUS_META.DRAFT;

/**
 * A line is short when less arrived than was dispatched. Only meaningful once received —
 * before that every line reads as zero received, which is in transit, not short.
 */
export const isShortReceipt = (transfer, line) =>
    transfer?.status === "RECEIVED" &&
    Number(line?.receivedQuantity ?? 0) < Number(line?.quantity ?? 0);

/** Units that left the source and never arrived — still counted as in transit there. */
export const strandedQuantity = (transfer) => {
    if (transfer?.status !== "RECEIVED") return 0;
    return (transfer.lines || []).reduce(
        (a, l) => a + Math.max(0, Number(l.quantity ?? 0) - Number(l.receivedQuantity ?? 0)),
        0
    );
};
