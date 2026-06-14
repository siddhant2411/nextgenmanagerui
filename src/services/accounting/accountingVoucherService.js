import apiService from "../apiService";

// ── List / Read ───────────────────────────────────────────────────────────────

export const listVouchers = (params = {}) =>
    apiService.get("/accounting/vouchers", params);

export const getVoucher = (id) =>
    apiService.get(`/accounting/vouchers/${id}`);

// ── Create ────────────────────────────────────────────────────────────────────
// Journal: { date, narration, lines: [{ ledgerAccountId, drAmount, crAmount, narration }] }

export const postJournal = (dto) =>
    apiService.post("/accounting/vouchers/journal", dto);

// Receipt: { date, narration, bankOrCashAccountId, fromAccountId, amount }
export const postReceipt = (dto) =>
    apiService.post("/accounting/vouchers/receipt", dto);

// Payment: { date, narration, bankOrCashAccountId, toAccountId, amount }
export const postPayment = (dto) =>
    apiService.post("/accounting/vouchers/payment", dto);

// Contra: { date, narration, fromAccountId, toAccountId, amount }
export const postContra = (dto) =>
    apiService.post("/accounting/vouchers/contra", dto);

// ── Reversal ──────────────────────────────────────────────────────────────────

export const reverseVoucher = (id, reason) =>
    apiService.post(`/accounting/vouchers/${id}/reverse`, { reason });
