// breadcrumbConfig.js
// Labels follow the sidebar names so the breadcrumb reads the same as the menu.
export const breadcrumbNameMap = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/inventory-item": "Items",
  "/bom": "Bill Of Material",
  "/inventory": "Inventory",
  "/inventory/warehouses": "Warehouses",
  "/inventory/stock-transfers": "Stock Transfers",
  "/inventory/pick-lists": "Pick Lists",
  "/inventory/packing-slips": "Packing Slips",
  "/inventory/material-requests": "Material Requests",
  "/quality": "Quality",
  "/quality/inspections": "Inspections",
  "/contact": "Company",
  "/crm": "CRM",
  "/crm/pipeline": "Pipeline Desk",
  "/crm/revenue": "Revenue Desk",
  "/crm/ai-leads": "AI Lead Review",
  "/enquiry": "Enquiries",
  "/quotation": "Quotations",
  "/production": "Production",
  "/production/schedule": "Schedule Views",
  "/production/shop-floor": "Shop Floor",
  "/production/work-order": "Work Orders",
  "/production/job-work-challan": "Job Work Challan",
  "/production/make-or-buy": "Make or Buy",
  "/production/planning-desk": "Planning Desk",
  "/production/oee-dashboard": "OEE Dashboard",
  "/production/production-job": "Production Job",
  "/production/labor-role": "Labor Roles",
  "/production/calendar": "Holiday Calendar",
  "/manufacturing": "Shop Setup",
  "/manufacturing/work-center": "Work Center",
  "/manufacturing/machine-assets": "Machine Assets",
  "/manufacturing/routing": "Routing",
  "/manufacturing/downtime-reasons": "Downtime Reasons",
  "/sales": "Sales",
  "/sales/sales-order": "Sales Orders",
  "/sales/sales-order/delivery-notes": "Delivery Challans",
  "/sales/sales-order/invoices": "Invoices",
  "/purchase": "Purchase Orders",
  "/purchase/requisitions": "Requisitions",
  "/purchase/debit-notes": "Debit Notes",
  "/purchase/analytics": "Analytics",
  "/purchase/overdue": "Overdue",
  "/config": "Config",
  "/config/item-code-mapping": "Item Code",
  "/superadmin": "Admin",
  "/superadmin/users": "User List",
  "/superadmin/roles": "Role Management",
  "/superadmin/company": "Company Details",
  "/account": "Account",
  "/account/settings": "Account Settings",
  "/accounting": "Accounting",
  "/accounting/vouchers": "Voucher Register",
  "/accounting/bank": "Bank",
  "/accounting/bank/reconciliation": "Reconciliation",
  "/accounting/reports": "Reports",
  "/accounting/reports/day-book": "Day Book",
  "/accounting/reports/trial-balance": "Trial Balance",
  "/accounting/reports/profit-loss": "Profit & Loss",
  "/accounting/reports/balance-sheet": "Balance Sheet",
  "/accounting/reports/ledger": "Ledger",
  "/accounting/reports/debtors-ageing": "Debtors Ageing",
  "/accounting/reports/creditors-ageing": "Creditors Ageing",
  "/accounting/reports/stock-gl": "Stock vs GL",
  "/accounting/reports/audit-trail": "Audit Trail",
  "/accounting/gst": "GST",
  "/accounting/gst/gstr1": "GSTR-1",
  "/accounting/gst/gstr3b": "GSTR-3B",
  "/accounting/gst/filings": "GST Filings",
  "/accounting/gst/hsn": "HSN Summary",
  "/accounting/gst/register": "Register",
  "/accounting/gst/register/outward": "Outward Register",
  "/accounting/gst/register/inward": "Inward Register",
  "/accounting/tds": "TDS",
  "/accounting/tds/register": "TDS Register",
  "/accounting/tds/challans": "TDS Challans",
  "/accounting/tds/sections": "TDS Sections",
  "/accounting/masters": "Masters",
  "/accounting/masters/coa": "Chart of Accounts",
  "/accounting/masters/opening-balances": "Opening Balances",
  "/accounting/masters/financial-years": "Financial Years",
  "/planning": "Planning",
  "/planning/desk": "Planning Desk",
};

// Paths that only group pages in the menu and have no page of their own.
// The breadcrumb shows them as plain text and the search leaves them out.
export const breadcrumbGroupPaths = new Set([
  "/production",
  "/manufacturing",
  "/sales",
  "/crm",
  "/quality",
  "/config",
  "/superadmin",
  "/account",
  "/planning",
  "/accounting/bank",
  "/accounting/reports",
  "/accounting/gst",
  "/accounting/gst/register",
  "/accounting/tds",
  "/accounting/masters",
]);

// Pages hidden from the sidebar for now; the search leaves them out too.
const hiddenFromSearch = new Set([
  "/production/oee-dashboard",
  "/config",
  "/config/item-code-mapping",
]);

// Convert object → array (with breadcrumb path included)
export const breadcrumbOptions = Object.entries(breadcrumbNameMap)
  .filter(([path]) => path !== "/" && !breadcrumbGroupPaths.has(path) && !hiddenFromSearch.has(path))
  .map(([path, label]) => ({
    path,
    label,
    breadcrumb: buildBreadcrumb(path),
  }));

// helper to build breadcrumb-style text
function buildBreadcrumb(path) {
  const parts = path.split("/").filter(Boolean); // remove empty
  let current = "";
  return parts
    .map((part) => {
      current += "/" + part;
      return breadcrumbNameMap[current];
    })
    .filter(Boolean)
    .join(" › ");
}
