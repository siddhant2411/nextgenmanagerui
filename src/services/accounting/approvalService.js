import apiService from "../apiService";

// ── Approver inbox ─────────────────────────────────────────────────────────────

export const getApprovalInbox = (role) =>
    apiService.get("/approvals/inbox", { role });

// approved: boolean, comment: string
export const actOnStep = (stepId, approved, comment) =>
    apiService.post(`/approvals/steps/${stepId}/act`, { approved, comment });

export const getApprovalRequest = (documentType, documentId) =>
    apiService.get("/approvals/requests", { documentType, documentId });

// ── Policy admin (ACCOUNTS_ADMIN+) ────────────────────────────────────────────

export const listApprovalPolicies = () =>
    apiService.get("/accounting/approval-policies");

export const getApprovalPolicy = (documentType) =>
    apiService.get(`/accounting/approval-policies/${documentType}`);

export const upsertApprovalPolicy = (documentType, enabled) =>
    apiService.put(`/accounting/approval-policies/${documentType}`, null, {
        params: { enabled },
    });

export const addApprovalRule = (documentType, dto) =>
    apiService.post(`/accounting/approval-policies/${documentType}/rules`, dto);

export const deleteApprovalRule = (ruleId) =>
    apiService.delete(`/accounting/approval-policies/rules/${ruleId}`);
