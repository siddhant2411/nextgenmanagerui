import apiService from "../apiService";

export const listFinancialYears = () =>
    apiService.get("/accounting/financial-years");

export const getFinancialYear = (id) =>
    apiService.get(`/accounting/financial-years/${id}`);

export const createFinancialYear = (dto) =>
    apiService.post("/accounting/financial-years", dto);

export const lockPeriod = (periodId) =>
    apiService.patch(`/accounting/financial-years/periods/${periodId}/lock`);

export const unlockPeriod = (periodId) =>
    apiService.patch(`/accounting/financial-years/periods/${periodId}/unlock`);

// ── Year-end close (Phase 5) ─────────────────────────────────────────────────
export const getYearEndClosePreview = (fyId) =>
    apiService.get(`/accounting/financial-years/${fyId}/close-preview`);

export const closeFinancialYear = (fyId) =>
    apiService.post(`/accounting/financial-years/${fyId}/close`);

export const reopenFinancialYear = (fyId, reason) =>
    apiService.post(`/accounting/financial-years/${fyId}/reopen`, { reason });
