// breadcrumbConfig.ts
export const breadcrumbNameMap= {
  "/": "Home",
  "/inventory-item": "Inventory Item",
  "/bom": "BOM",
  "/inventory": "Inventory",
  "/contact": "Contact",
  "/enquiry": "Enquiry",
  "/quotation": "Quotation",
  "/production": "Production",
  "/production/work-order": "Work Order",
  "/production/production-job": "Production Job",
  "/sales": "Sales",
  "/sales/sales-order": "Sales Order",
  "/config": "Config",
  "/config/item-code-mapping": "Item Code Mapping",
};


// Convert object → array (with breadcrumb path included)
export const breadcrumbOptions = Object.entries(breadcrumbNameMap).map(
  ([path, label]) => ({
    path,
    label,
    breadcrumb: buildBreadcrumb(path), // 👇 helper function
  })
);

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