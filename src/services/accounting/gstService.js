import apiService from "../apiService";

// All GST endpoints are date-range driven (from/to, ISO "YYYY-MM-DD"), except
// filing which targets an accounting periodId. The frontend resolves a chosen
// month-period into its {startDate, endDate, id} via the financial-year data.

// ── Registers ────────────────────────────────────────────────────────────────
export const getOutwardRegister = (from, to) =>
    apiService.get("/accounting/gst/register/outward", { from, to });

export const getInwardRegister = (from, to) =>
    apiService.get("/accounting/gst/register/inward", { from, to });

export const downloadOutwardRegisterExcel = (from, to) =>
    apiService.download("/accounting/gst/register/outward/excel", { from, to }, `Outward_Register_${from}_${to}.xlsx`);

export const downloadInwardRegisterExcel = (from, to) =>
    apiService.download("/accounting/gst/register/inward/excel", { from, to }, `Inward_Register_${from}_${to}.xlsx`);

// ── HSN Summary ──────────────────────────────────────────────────────────────
export const getHsnSummary = (from, to) =>
    apiService.get("/accounting/gst/hsn-summary", { from, to });

export const downloadHsnSummaryExcel = (from, to) =>
    apiService.download("/accounting/gst/hsn-summary/excel", { from, to }, `HSN_Summary_${from}_${to}.xlsx`);

// ── GSTR-1 ───────────────────────────────────────────────────────────────────
export const getGstr1 = (from, to) =>
    apiService.get("/accounting/gst/gstr1", { from, to });

export const downloadGstr1Excel = (from, to) =>
    apiService.download("/accounting/gst/gstr1/excel", { from, to }, `GSTR1_${from}_${to}.xlsx`);

export const downloadGstr1Json = (from, to) =>
    apiService.download("/accounting/gst/gstr1/json", { from, to }, `GSTR1_${from}_${to}.json`);

// ── GSTR-3B ──────────────────────────────────────────────────────────────────
export const getGstr3b = (from, to) =>
    apiService.get("/accounting/gst/gstr3b", { from, to });

export const downloadGstr3bExcel = (from, to) =>
    apiService.download("/accounting/gst/gstr3b/excel", { from, to }, `GSTR3B_${from}_${to}.xlsx`);

export const downloadGstr3bJson = (from, to) =>
    apiService.download("/accounting/gst/gstr3b/json", { from, to }, `GSTR3B_${from}_${to}.json`);

// ── Filing (Head/Admin only on the backend) ──────────────────────────────────
export const fileGstr1 = (periodId) =>
    apiService.post(`/accounting/gst/file/gstr1/${periodId}`);

export const fileGstr3b = (periodId) =>
    apiService.post(`/accounting/gst/file/gstr3b/${periodId}`);

export const listGstReturns = (fyId) =>
    apiService.get("/accounting/gst/returns", { fy: fyId });

export const getGstReturn = (id) =>
    apiService.get(`/accounting/gst/returns/${id}`);
