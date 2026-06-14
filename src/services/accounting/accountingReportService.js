import apiService from "../apiService";

// asOf: ISO date string "YYYY-MM-DD"
export const getTrialBalance = (asOf) =>
    apiService.get("/accounting/reports/trial-balance", asOf ? { asOf } : {});

// from/to: ISO date strings "YYYY-MM-DD"
export const getDayBook = (from, to) =>
    apiService.get("/accounting/reports/day-book", { from, to });

export const getLedgerStatement = (accountId, from, to) =>
    apiService.get(`/accounting/reports/ledger/${accountId}`, { from, to });

// ── Ageing (AR/AP) ──────────────────────────────────────────────────────────
export const getDebtorsAgeing = (asOf) =>
    apiService.get("/accounting/reports/debtors-ageing", asOf ? { asOf } : {});

export const getCreditorsAgeing = (asOf) =>
    apiService.get("/accounting/reports/creditors-ageing", asOf ? { asOf } : {});

export const downloadDebtorsAgeingExcel = (asOf) =>
    apiService.download("/accounting/reports/debtors-ageing/excel", asOf ? { asOf } : {}, `Debtors_Ageing_${asOf || ""}.xlsx`);

export const downloadCreditorsAgeingExcel = (asOf) =>
    apiService.download("/accounting/reports/creditors-ageing/excel", asOf ? { asOf } : {}, `Creditors_Ageing_${asOf || ""}.xlsx`);
