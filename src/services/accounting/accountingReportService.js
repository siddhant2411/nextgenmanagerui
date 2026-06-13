import apiService from "../apiService";

// asOf: ISO date string "YYYY-MM-DD"
export const getTrialBalance = (asOf) =>
    apiService.get("/accounting/reports/trial-balance", asOf ? { asOf } : {});

// from/to: ISO date strings "YYYY-MM-DD"
export const getDayBook = (from, to) =>
    apiService.get("/accounting/reports/day-book", { from, to });

export const getLedgerStatement = (accountId, from, to) =>
    apiService.get(`/accounting/reports/ledger/${accountId}`, { from, to });
