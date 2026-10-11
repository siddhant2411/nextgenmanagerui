import {
    ACCOUNTING_ACCESS_ROLES,
    ACTION_KEYS,
    ADMIN_ROLES,
    INVENTORY_ACCESS_ROLES,
    PLANNING_ACCESS_ROLES,
    PRODUCTION_ACCESS_ROLES,
    PURCHASE_ACCESS_ROLES,
    ROLE_ACCOUNTS_ADMIN,
    ROLE_ACCOUNTS_HEAD,
    ROLE_ACCOUNTS_USER,
    ROLE_INVENTORY_ADMIN,
    ROLE_INVENTORY_USER,
    ROLE_PLANNER,
    ROLE_PRODUCTION_ADMIN,
    ROLE_PRODUCTION_USER,
    ROLE_PURCHASE_ADMIN,
    ROLE_PURCHASE_USER,
    ROLE_SALES_ADMIN,
    ROLE_SALES_USER,
    SALES_ACCESS_ROLES,
    USER_MANAGEMENT_ACCESS_ROLES,
    hasAnyRole,
} from "../../auth/roles";
import {
    loadAccounts,
    loadInventory,
    loadPlanning,
    loadProduction,
    loadPurchase,
    loadSales,
} from "../../services/dashboardService";
import { STATUS } from "../../theme/moduleTokens";
import { formatDateShort, formatINR, formatNumber, formatRelativeDay } from "../../utils/formatters";

/**
 * What the home page shows, one entry per module.
 *
 * A section is shown to anyone whose roles admit the module (`roles`), and sorted to the top for
 * the people whose own module it is (`homeRoles`) — a planner can read production, inventory and
 * purchase, but it is the planning desk they came for.
 *
 * `build` turns whatever the loader managed to read into figures. A read that failed arrives as
 * undefined and has to come out as a dash, never as a zero: "0 overdue" is a claim.
 */

const count = (value) => (Array.isArray(value) ? value.length : undefined);
const total = (page) => (typeof page?.totalElements === "number" ? page.totalElements : undefined);
const show = (value) => (value === undefined || value === null ? "—" : formatNumber(value));
const money = (value) => (value === undefined || value === null ? "—" : formatINR(value, 0));
const when = (value, severity) => (Number(value) > 0 ? severity : undefined);
const plural = (n, one, many) => `${formatNumber(n)} ${Number(n) === 1 ? one : many}`;

/** An alert only exists when its figure is a real, positive number. */
const alertIf = (value, severity, text, to) =>
    Number(value) > 0 ? [{ severity, text: text(value), to }] : [];

const add = (a, b) => (a === undefined || b === undefined ? undefined : a + b);

const PURCHASE_OVERDUE_ROLES = [...ADMIN_ROLES, ROLE_INVENTORY_ADMIN, ROLE_PURCHASE_ADMIN];

export const HOME_SECTIONS = [
    {
        key: "sales",
        label: "Sales",
        hub: "/sales/sales-order",
        roles: SALES_ACCESS_ROLES,
        homeRoles: [ROLE_SALES_ADMIN, ROLE_SALES_USER],
        load: loadSales,
        build: (d) => {
            const stock = d.summary?.stock;
            const toDispatch = count(d.dispatch);
            const overdue = count(d.overdue);
            return {
                headline: {
                    label: "Booked this month",
                    value: money(d.summary?.bookedRevenue),
                    hint: d.summary ? `${plural(d.summary.convertedToOrder ?? 0, "enquiry", "enquiries")} converted` : undefined,
                },
                stats: [
                    { label: "Open enquiries", value: show(stock?.openCount), to: "/enquiry" },
                    {
                        label: "Follow-ups overdue",
                        value: show(stock?.overdueFollowups),
                        severity: when(stock?.overdueFollowups, STATUS.warning),
                        to: "/crm/pipeline",
                    },
                    { label: "To dispatch", value: show(toDispatch), to: "/sales/sales-order" },
                    {
                        label: "Orders overdue",
                        value: show(overdue),
                        severity: when(overdue, STATUS.critical),
                        to: "/sales/sales-order",
                    },
                ],
                alerts: [
                    ...alertIf(overdue, STATUS.critical,
                        (n) => `${plural(n, "sales order", "sales orders")} past delivery date`, "/sales/sales-order"),
                    ...alertIf(stock?.overdueFollowups, STATUS.warning,
                        (n) => `${plural(n, "enquiry follow-up", "enquiry follow-ups")} overdue`, "/crm/pipeline"),
                ],
                list: {
                    title: "Waiting to dispatch",
                    empty: "Nothing waiting to dispatch.",
                    rows: (d.dispatch || []).slice(0, 5).map((so) => ({
                        id: so.id,
                        primary: so.orderNumber,
                        secondary: so.customerName,
                        meta: so.deliveryDate ? `Due ${formatDateShort(so.deliveryDate)}` : "No delivery date",
                        to: `/sales/sales-order/edit/${so.id}`,
                    })),
                },
            };
        },
    },
    {
        key: "production",
        label: "Production",
        hub: "/production/work-order",
        roles: PRODUCTION_ACCESS_ROLES,
        homeRoles: [ROLE_PRODUCTION_ADMIN, ROLE_PRODUCTION_USER],
        load: loadProduction,
        build: (d) => {
            const s = d.summary;
            const hub = "/production/work-order";
            return {
                headline: { label: "Work orders running", value: show(s?.inProgress) },
                stats: [
                    { label: "Overdue", value: show(s?.overdue), severity: when(s?.overdue, STATUS.critical), to: hub },
                    { label: "Due in 3 days", value: show(s?.dueSoon), severity: when(s?.dueSoon, STATUS.warning), to: hub },
                    { label: "In progress", value: show(s?.inProgress), to: hub },
                    { label: "On hold", value: show(s?.blocked), severity: when(s?.blocked, STATUS.serious), to: hub },
                    { label: "Ready", value: show(s?.ready), to: hub },
                    { label: "Finishing today", value: show(s?.completingToday), to: hub },
                ],
                alerts: [
                    ...alertIf(s?.overdue, STATUS.critical,
                        (n) => `${plural(n, "work order", "work orders")} overdue`, hub),
                    ...alertIf(s?.blocked, STATUS.serious,
                        (n) => `${plural(n, "work order", "work orders")} on hold`, hub),
                ],
                list: {
                    title: "Latest open work orders",
                    empty: "No open work orders.",
                    rows: (d.recent?.content || []).map((wo) => ({
                        id: wo.id,
                        primary: wo.workOrderNumber,
                        secondary: wo.bomName,
                        meta: wo.dueDate ? `Due ${formatDateShort(wo.dueDate)}` : "No due date",
                        to: `/production/work-order/edit/${wo.id}`,
                    })),
                },
            };
        },
    },
    {
        key: "planning",
        label: "Planning",
        hub: "/planning/desk",
        roles: PLANNING_ACCESS_ROLES,
        homeRoles: [ROLE_PLANNER],
        load: loadPlanning,
        build: (d) => {
            const open = count(d.queue);
            const rows = d.queue || [];
            const orders = d.queue ? new Set(rows.map((r) => r.salesOrderId).filter(Boolean)).size : undefined;
            const oldest = rows.reduce(
                (min, r) => (r.raisedOn && (!min || new Date(r.raisedOn) < new Date(min)) ? r.raisedOn : min),
                null
            );
            return {
                headline: { label: "Make or buy decisions", value: show(open) },
                stats: [
                    { label: "Decisions open", value: show(open), severity: when(open, STATUS.warning), to: "/planning/desk" },
                    { label: "Sales orders waiting", value: show(orders), to: "/planning/desk" },
                    { label: "Oldest raised", value: oldest ? formatRelativeDay(oldest) : "—", to: "/planning/desk" },
                ],
                alerts: alertIf(open, STATUS.warning,
                    (n) => `${plural(n, "make-or-buy decision", "make-or-buy decisions")} waiting`, "/planning/desk"),
                list: {
                    title: "Waiting for a decision",
                    empty: "Nothing waiting for a make-or-buy decision.",
                    rows: rows.slice(0, 5).map((r) => ({
                        id: r.procurementOrderId,
                        primary: r.itemCode,
                        secondary: r.itemName,
                        meta: r.salesOrderNumber ? `Short ${formatNumber(r.shortfallQty)} · ${r.salesOrderNumber}` : `Short ${formatNumber(r.shortfallQty)}`,
                        to: "/planning/desk",
                    })),
                },
            };
        },
    },
    {
        key: "inventory",
        label: "Inventory",
        hub: "/inventory",
        roles: INVENTORY_ACCESS_ROLES,
        homeRoles: [ROLE_INVENTORY_ADMIN, ROLE_INVENTORY_USER],
        load: loadInventory,
        build: (d, { canAction }) => {
            const requests = total(d.requests);
            const picks = count(d.picks);
            const packing = count(d.packing);
            // Stock value is restricted further than the module itself; without it the headline
            // falls back to a figure every inventory user may see.
            const headline = canAction(ACTION_KEYS.INVENTORY_VALUATION_READ)
                ? { label: "Stock value", value: money(d.summary?.totalInventoryValue) }
                : { label: "Material requests waiting", value: show(requests) };
            return {
                headline,
                stats: [
                    {
                        label: "Material requests",
                        value: show(requests),
                        severity: when(requests, STATUS.warning),
                        to: "/inventory/material-requests",
                    },
                    { label: "Picks to pick", value: show(picks), to: "/inventory/pick-lists" },
                    { label: "Being packed", value: show(packing), to: "/inventory/packing-slips" },
                    { label: "Items in master", value: show(d.summary?.totalItems), to: "/inventory-item" },
                ],
                alerts: alertIf(requests, STATUS.warning,
                    (n) => `${plural(n, "material request", "material requests")} waiting on stores`, "/inventory/material-requests"),
            };
        },
    },
    {
        key: "purchase",
        label: "Purchase",
        hub: "/purchase",
        roles: PURCHASE_ACCESS_ROLES,
        homeRoles: [ROLE_PURCHASE_ADMIN, ROLE_PURCHASE_USER],
        load: ({ roles }) => loadPurchase({ canSeeOverdue: hasAnyRole(roles, PURCHASE_OVERDUE_ROLES) }),
        build: (d, { roles }) => {
            const canSeeOverdue = hasAnyRole(roles, PURCHASE_OVERDUE_ROLES);
            const toReceive = add(total(d.sent), total(d.partlyReceived));
            const overdue = count(d.overdue);
            return {
                headline: { label: "Orders to receive", value: show(toReceive) },
                stats: [
                    {
                        label: "Requisitions to approve",
                        value: show(total(d.requisitionsToApprove)),
                        to: "/purchase/requisitions",
                    },
                    { label: "Orders to approve", value: show(total(d.ordersToApprove)), to: "/purchase" },
                    { label: "To receive", value: show(toReceive), to: "/purchase" },
                    ...(canSeeOverdue
                        ? [{
                            label: "Overdue from vendor",
                            value: show(overdue),
                            severity: when(overdue, STATUS.critical),
                            to: "/purchase/overdue",
                        }]
                        : []),
                ],
                alerts: alertIf(overdue, STATUS.critical,
                    (n) => `${plural(n, "purchase order", "purchase orders")} past the vendor's date`, "/purchase/overdue"),
                list: canSeeOverdue
                    ? {
                        title: "Overdue from vendor",
                        empty: "No purchase orders are overdue.",
                        rows: (d.overdue || []).slice(0, 5).map((po) => ({
                            id: po.id,
                            primary: po.purchaseOrderNumber,
                            secondary: po.vendorName,
                            meta: po.daysOverdue != null ? `${plural(po.daysOverdue, "day", "days")} late` : "",
                            to: `/purchase/${po.id}`,
                        })),
                    }
                    : undefined,
            };
        },
    },
    {
        key: "accounts",
        label: "Accounts",
        hub: "/accounting",
        roles: ACCOUNTING_ACCESS_ROLES,
        homeRoles: [ROLE_ACCOUNTS_ADMIN, ROLE_ACCOUNTS_HEAD, ROLE_ACCOUNTS_USER],
        load: loadAccounts,
        build: (d) => {
            const receivable = d.debtors?.totals?.total;
            const old = d.debtors?.totals?.days90Plus;
            const payable = d.creditors?.totals?.total;
            return {
                headline: { label: "Receivable", value: money(receivable) },
                stats: [
                    { label: "Receivable", value: money(receivable), to: "/accounting/reports/debtors-ageing" },
                    {
                        label: "Over 90 days",
                        value: money(old),
                        severity: when(old, STATUS.critical),
                        to: "/accounting/reports/debtors-ageing",
                    },
                    { label: "Payable", value: money(payable), to: "/accounting/reports/creditors-ageing" },
                ],
                alerts: alertIf(old, STATUS.critical,
                    (n) => `${formatINR(n, 0)} receivable is over 90 days old`, "/accounting/reports/debtors-ageing"),
            };
        },
    },
];

/** Sections this user may see, their own module first. The sort is stable, so the rest keep registry order. */
export const sectionsFor = (roles) =>
    HOME_SECTIONS
        .filter((section) => hasAnyRole(roles, section.roles))
        .sort((a, b) => Number(hasAnyRole(roles, b.homeRoles)) - Number(hasAnyRole(roles, a.homeRoles)));

const APPROVAL_KINDS = {
    PURCHASE_ORDER: { label: "Purchase order", to: (a) => `/purchase/${a.documentId}` },
    PURCHASE_REQUISITION: { label: "Requisition", to: (a) => `/purchase/requisitions/${a.documentId}` },
    SALES_ORDER: { label: "Sales order", to: (a) => `/sales/sales-order/edit/${a.documentId}` },
    VOUCHER: { label: "Voucher", to: () => "/accounting/vouchers" },
};

export const describeApproval = (approval) => {
    const kind = APPROVAL_KINDS[approval.kind] || { label: approval.kind, to: () => null };
    return { label: kind.label, to: kind.to(approval) };
};

export const QUICK_LINKS = [
    { label: "Enquiries", path: "/enquiry", roles: SALES_ACCESS_ROLES },
    { label: "Quotations", path: "/quotation", roles: SALES_ACCESS_ROLES },
    { label: "Sales orders", path: "/sales/sales-order", roles: SALES_ACCESS_ROLES },
    { label: "Work orders", path: "/production/work-order", roles: PRODUCTION_ACCESS_ROLES },
    { label: "Shop floor", path: "/production/shop-floor", roles: PRODUCTION_ACCESS_ROLES },
    { label: "Bill of materials", path: "/bom", roles: PRODUCTION_ACCESS_ROLES },
    { label: "Planning desk", path: "/planning/desk", roles: PLANNING_ACCESS_ROLES },
    { label: "Stock", path: "/inventory", roles: INVENTORY_ACCESS_ROLES },
    { label: "Pick lists", path: "/inventory/pick-lists", roles: INVENTORY_ACCESS_ROLES },
    { label: "Purchase orders", path: "/purchase", roles: PURCHASE_ACCESS_ROLES },
    { label: "Requisitions", path: "/purchase/requisitions", roles: PURCHASE_ACCESS_ROLES },
    { label: "Voucher register", path: "/accounting/vouchers", roles: ACCOUNTING_ACCESS_ROLES },
    { label: "Trial balance", path: "/accounting/reports/trial-balance", roles: ACCOUNTING_ACCESS_ROLES },
    { label: "Users", path: "/superadmin/users", roles: USER_MANAGEMENT_ACCESS_ROLES },
    { label: "Roles", path: "/superadmin/roles", roles: USER_MANAGEMENT_ACCESS_ROLES },
    { label: "Company details", path: "/superadmin/company", roles: USER_MANAGEMENT_ACCESS_ROLES },
];
