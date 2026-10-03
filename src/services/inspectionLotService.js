import apiService, { resolveApiErrorMessage } from "./apiService";

export { resolveApiErrorMessage };

// ── Inspection lots (phase H) ─────────────────────────────────────────────────
// Only what the packing desk needs so far. A lot is raised, then judged or waived — separate calls
// because they are separate events, often by different people.

export const listInspectionLots = ({ source, status } = {}) => {
    const params = {};
    if (source) params.source = source;
    if (status) params.status = status;
    return apiService.get("/inspection-lot", params);
};

/** A PACKAGE lot: this item, in this box, offered for inspection before the slip closes. */
export const raisePackageInspection = ({ packageBoxId, inventoryItemId, quantityOffered, remarks }) =>
    apiService.post("/inspection-lot", {
        source: "PACKAGE",
        packageBoxId,
        inventoryItemId,
        quantityOffered,
        remarks,
    });

export const judgeInspectionLot = (id, { quantityAccepted, quantityRejected, inspectedBy, remarks }) =>
    apiService.post(`/inspection-lot/${id}/judge`, {
        quantityAccepted,
        quantityRejected,
        inspectedBy,
        remarks,
    });

/** Releases goods that failed. Admin-only on the server, and needs a stated reason. */
export const waiveInspectionLot = (id, { waivedBy, reason }) =>
    apiService.post(`/inspection-lot/${id}/waive`, { waivedBy, reason });

/** Only an unjudged lot can be cancelled — a verdict is a record. */
export const cancelInspectionLot = (id) =>
    apiService.post(`/inspection-lot/${id}/cancel`);

// ── Display helpers ───────────────────────────────────────────────────────────

export const LOT_STATUS_META = {
    PENDING: { label: "QC pending", color: "#a16207", bg: "#fef9c3" },
    PASSED:  { label: "QC passed",  color: "#15803d", bg: "#dcfce7" },
    FAILED:  { label: "QC failed",  color: "#b91c1c", bg: "#fee2e2" },
    WAIVED:  { label: "QC waived",  color: "#7c3aed", bg: "#f5f3ff" },
};

export const lotStatusMeta = (status) => LOT_STATUS_META[status] || LOT_STATUS_META.PENDING;

/** Mirrors PackagingGateService: failed or unjudged blocks; passed, waived or no lot at all does not. */
export const lotBlocksClosing = (lot) => lot?.status === "PENDING" || lot?.status === "FAILED";
