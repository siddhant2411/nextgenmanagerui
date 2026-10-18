import apiService from "../apiService";

// from/to: "YYYY-MM-DD"; entityType, action, username optional. Returns { entries, truncated }.
export const searchAuditTrail = (params) =>
    apiService.get("/accounting/audit-trail", params);

export const getAuditHistory = (entityType, entityId) =>
    apiService.get("/accounting/audit-trail/history", { entityType, entityId });

// Automatic reversals that failed and whose voucher is still in the books.
export const getFailedReversals = () =>
    apiService.get("/accounting/audit-trail/failed-reversals");
