import apiService from "../apiService";

// ── COA Tree ──────────────────────────────────────────────────────────────────

export const getCoaTree = () =>
    apiService.get("/accounting/coa/tree");

// ── Account Groups ─────────────────────────────────────────────────────────────

export const listGroups = () =>
    apiService.get("/accounting/account-groups");

export const createGroup = (dto) =>
    apiService.post("/accounting/account-groups", dto);

export const updateGroup = (id, dto) =>
    apiService.put(`/accounting/account-groups/${id}`, dto);

export const deleteGroup = (id) =>
    apiService.delete(`/accounting/account-groups/${id}`);

// ── Ledger Accounts ────────────────────────────────────────────────────────────

export const listLedgers = () =>
    apiService.get("/accounting/ledger-accounts");

export const searchLedgers = (q) =>
    apiService.get("/accounting/ledger-accounts/search", { q });

export const getLedger = (id) =>
    apiService.get(`/accounting/ledger-accounts/${id}`);

export const createLedger = (dto) =>
    apiService.post("/accounting/ledger-accounts", dto);

export const updateLedger = (id, dto) =>
    apiService.put(`/accounting/ledger-accounts/${id}`, dto);

export const deleteLedger = (id) =>
    apiService.delete(`/accounting/ledger-accounts/${id}`);

// ── Contact ↔ Ledger ────────────────────────────────────────────────────────────

export const getContactLedgers = (contactId) =>
    apiService.get(`/accounting/contacts/${contactId}/ledgers`);

export const ensureContactLedger = (contactId) =>
    apiService.post(`/accounting/contacts/${contactId}/ensure-ledger`);
