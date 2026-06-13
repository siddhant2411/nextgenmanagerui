import apiService from "../apiService";

export const listFinancialYears = () =>
    apiService.get("/accounting/financial-years");

export const getFinancialYear = (id) =>
    apiService.get(`/accounting/financial-years/${id}`);

// dto: { label, startDate, endDate }
export const createFinancialYear = (dto) =>
    apiService.post("/accounting/financial-years", dto);

export const lockPeriod = (periodId) =>
    apiService.patch(`/accounting/financial-years/periods/${periodId}/lock`);

export const unlockPeriod = (periodId) =>
    apiService.patch(`/accounting/financial-years/periods/${periodId}/unlock`);
