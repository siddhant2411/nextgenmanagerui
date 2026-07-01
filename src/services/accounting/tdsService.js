import apiService from "../apiService";

// TDS register / 26Q are FY (e.g. "2025-26") + quarter ("Q1".."Q4") driven.

// ── Section master ───────────────────────────────────────────────────────────
export const listTdsSections = (activeOnly = false) =>
    apiService.get("/accounting/tds/sections", { activeOnly });

export const createTdsSection = (dto) =>
    apiService.post("/accounting/tds/sections", dto);

export const updateTdsSection = (id, dto) =>
    apiService.put(`/accounting/tds/sections/${id}`, dto);

export const deleteTdsSection = (id) =>
    apiService.delete(`/accounting/tds/sections/${id}`);

// ── Register / 26Q ───────────────────────────────────────────────────────────
export const getTdsRegister = (fy, quarter) =>
    apiService.get("/accounting/tds/register", { fy, quarter });

export const download26Q = (fy, quarter) =>
    apiService.download("/accounting/tds/26q/excel", { fy, quarter }, `26Q_${fy}_${quarter}.xlsx`);

// ── Challans ─────────────────────────────────────────────────────────────────
export const listTdsChallans = (fy) =>
    apiService.get("/accounting/tds/challans", fy ? { fy } : {});

export const getTdsChallan = (id) =>
    apiService.get(`/accounting/tds/challans/${id}`);

export const createTdsChallan = (dto) =>
    apiService.post("/accounting/tds/challans", dto);

// ── Statutory vouchers (Head/Admin only on the backend) ──────────────────────
export const postPayrollVoucher = (req) =>
    apiService.post("/accounting/vouchers/payroll", req);

export const postDepreciationVoucher = (req) =>
    apiService.post("/accounting/vouchers/depreciation", req);
