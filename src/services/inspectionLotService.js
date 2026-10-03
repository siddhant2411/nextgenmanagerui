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

// ── Every source, for the Quality Desk ────────────────────────────────────────

export const getInspectionLot = (id) => apiService.get(`/inspection-lot/${id}`);

/**
 * Raises a lot for any source. Which document id is needed follows from the source: a work order
 * for FINAL, an operation for IN_PROCESS, a goods receipt for INCOMING, a box for PACKAGE.
 */
export const raiseInspection = (request) => apiService.post("/inspection-lot", request);

/** Judging with the inspector's sheet: each check carries what was observed. */
export const judgeInspectionLotWithChecks = (id, { quantityAccepted, quantityRejected, inspectedBy, remarks, checks }) =>
    apiService.post(`/inspection-lot/${id}/judge`, {
        quantityAccepted,
        quantityRejected,
        inspectedBy,
        remarks,
        checks,
    });

export const LOT_SOURCES = ["INCOMING", "IN_PROCESS", "FINAL", "PACKAGE"];

export const LOT_SOURCE_META = {
    INCOMING:   { label: "Incoming",   hint: "Goods on a receipt",          color: "#1d4ed8", bg: "#dbeafe" },
    IN_PROCESS: { label: "In-process", hint: "A work order operation",      color: "#7c3aed", bg: "#f5f3ff" },
    FINAL:      { label: "Final",      hint: "Finished goods on an order",  color: "#0f766e", bg: "#ccfbf1" },
    PACKAGE:    { label: "Package",    hint: "A packed box",                color: "#a16207", bg: "#fef9c3" },
};

export const lotSourceMeta = (source) => LOT_SOURCE_META[source] || LOT_SOURCE_META.FINAL;

export const LOT_STATUSES = ["PENDING", "PASSED", "FAILED", "WAIVED"];

/** Short status labels for the Quality Desk, where "QC" in front of every chip is noise. */
export const LOT_STATUS_SHORT = { PENDING: "Pending", PASSED: "Passed", FAILED: "Failed", WAIVED: "Waived" };

/** What the lot is about, in words a person on the floor would use. */
export const lotDocumentLabel = (lot) => {
    if (!lot) return "";
    if (lot.workOrderNumber) return lot.workOrderNumber;
    if (lot.goodsReceiptNoteId != null) return `GRN #${lot.goodsReceiptNoteId}`;
    if (lot.packageBoxId != null) return `Box #${lot.packageBoxId}`;
    return "—";
};

// ── Non-conformance reports ───────────────────────────────────────────────────

export const listNcrs = ({ status } = {}) =>
    apiService.get("/non-conformance", status ? { status } : {});

export const listNcrsForLot = (lotId) => apiService.get(`/non-conformance/inspection-lot/${lotId}`);

/** Raised against a failed lot: this much, for this reason. */
export const raiseNcr = ({ inspectionLotId, quantity, problem, raisedBy, remarks }) =>
    apiService.post("/non-conformance", { inspectionLotId, quantity, problem, raisedBy, remarks });

/** Closes the report with a decision. Use-as-is needs a named approver. */
export const decideNcr = (id, { disposition, dispositionedBy, approvedBy, notes }) =>
    apiService.post(`/non-conformance/${id}/disposition`, { disposition, dispositionedBy, approvedBy, notes });

export const NCR_DISPOSITIONS = [
    { value: "REWORK",           label: "Rework",           hint: "Fix it and inspect again" },
    { value: "SCRAP",            label: "Scrap",            hint: "Write it off — raise the stock adjustment separately" },
    { value: "USE_AS_IS",        label: "Use as is",        hint: "Accept the deviation; needs a named approver" },
    { value: "RETURN_TO_VENDOR", label: "Return to vendor", hint: "Send it back — raise the debit note separately" },
];

export const ncrDispositionLabel = (value) =>
    NCR_DISPOSITIONS.find((d) => d.value === value)?.label || value || "—";
