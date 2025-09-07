export const SALES_ORDER_STATUSES = {
  DRAFT:      { label: "Draft",      color: "default" },
  APPROVED:   { label: "Approved",   color: "primary" },
  IN_PROGRESS:{ label: "In Progress",color: "warning" },
  DISPATCHED: { label: "Dispatched", color: "info" },
  COMPLETED:  { label: "Completed",  color: "success" },
  CANCELLED:  { label: "Cancelled",  color: "error" },
};

export const SALES_ORDER_TRANSITIONS = {
  DRAFT: ["APPROVED", "CANCELLED"],          // From draft → approve or cancel
  APPROVED: ["IN_PROGRESS", "CANCELLED"],    // Once approved → start work or cancel
  IN_PROGRESS: ["DISPATCHED", "CANCELLED"],  // In progress → ship or cancel
  DISPATCHED: ["COMPLETED", "CANCELLED"],    // Shipped → complete or cancel
  COMPLETED: [],                             // Final state (no transitions)
  CANCELLED: [],                             // Final state (no transitions)
};