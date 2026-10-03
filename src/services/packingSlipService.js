import apiService, { resolveApiErrorMessage } from "./apiService";

export { resolveApiErrorMessage };

// ── Packing slips ─────────────────────────────────────────────────────────────

/** Both filters are optional; passing neither lists everything. */
export const listPackingSlips = ({ status, salesOrderId } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (salesOrderId) params.salesOrderId = salesOrderId;
    return apiService.get("/packing-slip", params);
};

export const getPackingSlip = (id) =>
    apiService.get(`/packing-slip/${id}`);

/** Opens a slip against a PICKED pick list. One live slip per pick. */
export const createPackingSlip = ({ pickListId, remarks }) =>
    apiService.post("/packing-slip", { pickListId, remarks });

/**
 * Adds one box. Each line names a pick line and a quantity; batch- and serial-tracked lines must
 * also name the instances going into the box, and those must add up to the quantity.
 */
export const addPackageBox = (slipId, box) =>
    apiService.post(`/packing-slip/${slipId}/boxes`, box);

export const packPackingSlip = (id) =>
    apiService.post(`/packing-slip/${id}/pack`);

/** Refused while any box has a failed or unjudged package inspection. */
export const closePackingSlip = (id) =>
    apiService.post(`/packing-slip/${id}/close`);

export const cancelPackingSlip = (id) =>
    apiService.post(`/packing-slip/${id}/cancel`);

export const downloadPackingListPdf = (id, slipNumber) =>
    apiService.download(
        `/packing-slip/${id}/pdf`,
        {},
        `PackingList_${String(slipNumber || id).replace(/\//g, "_")}.pdf`
    );

// ── Display helpers ───────────────────────────────────────────────────────────

export const SLIP_STATUSES = ["DRAFT", "PACKED", "CLOSED", "CANCELLED"];

export const SLIP_STATUS_META = {
    DRAFT:     { label: "Draft",     color: "#475569", bg: "#f1f5f9" },
    PACKED:    { label: "Packed",    color: "#a16207", bg: "#fef9c3" },
    CLOSED:    { label: "Closed",    color: "#15803d", bg: "#dcfce7" },
    CANCELLED: { label: "Cancelled", color: "#b91c1c", bg: "#fee2e2" },
};

export const slipStatusMeta = (status) =>
    SLIP_STATUS_META[status] || SLIP_STATUS_META.DRAFT;

/** A slip that still holds a pick: anything but cancelled. Mirrors the backend's one-slip-per-pick rule. */
export const isLiveSlip = (slip) => slip?.status !== "CANCELLED";

/** Units already in a box, per pick line, across every box on the slip. */
export const packedByPickLine = (slip) => {
    const out = {};
    (slip?.boxes || []).forEach((b) =>
        (b.lines || []).forEach((l) => {
            if (l.pickListLineId == null) return;
            out[l.pickListLineId] = (out[l.pickListLineId] || 0) + Number(l.quantity || 0);
        })
    );
    return out;
};

/** Instance ids already in a box on this slip. */
export const packedInstanceIds = (slip) => {
    const out = new Set();
    (slip?.boxes || []).forEach((b) =>
        (b.lines || []).forEach((l) => (l.instanceIds || []).forEach((id) => out.add(id)))
    );
    return out;
};

export const boxUnits = (box) =>
    (box?.lines || []).reduce((a, l) => a + Number(l.quantity || 0), 0);

export const boxDimensions = (box) =>
    box?.lengthCm != null && box?.widthCm != null && box?.heightCm != null
        ? `${Number(box.lengthCm)} × ${Number(box.widthCm)} × ${Number(box.heightCm)} cm`
        : null;
