import apiService, { apiClientFile } from "../apiService";

// ── Bank reconciliation (Phase 5) ────────────────────────────────────────────
export const listBankAccounts = () =>
    apiService.get("/accounting/bank/accounts");

export const getStatementMapping = (ledgerId) =>
    apiService.get(`/accounting/bank/accounts/${ledgerId}/mapping`);

export const saveStatementMapping = (ledgerId, mapping) =>
    apiService.put(`/accounting/bank/accounts/${ledgerId}/mapping`, mapping);

const postFile = async (url, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClientFile.post(url, formData, { headers: { Accept: "application/json" } });
    return response.data;
};

export const previewStatement = (file, headerRow = 1) =>
    postFile(`/accounting/bank/statement/preview?headerRow=${headerRow}`, file);

export const importStatement = (ledgerId, file) =>
    postFile(`/accounting/bank/accounts/${ledgerId}/statement`, file);

export const getReconciliationWorkspace = (ledgerId, asOf) =>
    apiService.get(`/accounting/bank/accounts/${ledgerId}/workspace`, asOf ? { asOf } : {});

export const autoMatch = (ledgerId) =>
    apiService.post(`/accounting/bank/accounts/${ledgerId}/auto-match`);

export const matchLines = (statementLineId, voucherLineId) =>
    apiService.post("/accounting/bank/match", { statementLineId, voucherLineId });

export const unmatchLine = (statementLineId) =>
    apiService.post(`/accounting/bank/statement-lines/${statementLineId}/unmatch`);

export const deleteStatementLine = (statementLineId) =>
    apiService.delete(`/accounting/bank/statement-lines/${statementLineId}`);

export const getReconciliationStatement = (ledgerId, asOf) =>
    apiService.get(`/accounting/bank/accounts/${ledgerId}/reconciliation-statement`, asOf ? { asOf } : {});
