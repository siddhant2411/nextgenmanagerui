import apiService from "./apiService";

/**
 * Home-page reads.
 *
 * Every call here is quiet on a 403 and settles on its own: a tile whose figure could not be read
 * shows a dash, it does not raise a toast or take the rest of the page down with it. The home page
 * only asks for a module's figures when the user's roles admit that module, so a 403 here means
 * the UI and the API disagree about a role — worth a dash, not an alarm on every login.
 */
const QUIET = { quietForbidden: true };

const get = (endpoint, params = {}) => apiService.get(endpoint, params, QUIET);

/** Runs a keyed set of calls together; a failed call comes back as undefined under its key. */
const settle = async (calls) => {
    const keys = Object.keys(calls);
    const results = await Promise.allSettled(keys.map((key) => calls[key]()));
    return Object.fromEntries(
        keys.map((key, i) => [key, results[i].status === "fulfilled" ? results[i].value : undefined])
    );
};

/** Approvals the signed-in user can act on, oldest first. */
export const getMyApprovals = () => get("/dashboard/approvals");

export const loadSales = () =>
    settle({
        summary: () => get("/enquiry/summary", { preset: "THIS_MONTH" }),
        dispatch: () => get("/sales-orders/pending-dispatch"),
        overdue: () => get("/sales-orders/overdue"),
    });

export const loadProduction = () =>
    settle({
        summary: () => get("/production/work-order/summary"),
        recent: () =>
            apiService.post(
                "/production/work-order/get-list",
                {
                    page: 0,
                    size: 5,
                    sortBy: "createdDate",
                    sortDir: "desc",
                    filters: [
                        { field: "status", operator: "!=", value: "CLOSED" },
                        { field: "status", operator: "!=", value: "CANCELLED" },
                    ],
                },
                QUIET
            ),
    });

export const loadPlanning = () =>
    settle({
        queue: () => get("/procurement-planning/queue"),
    });

export const loadInventory = () =>
    settle({
        summary: () => get("/inventory/summary"),
        requests: () => get("/material-requests/pending", { page: 0, size: 1 }),
        picks: () => get("/pick-list", { status: "RELEASED" }),
        packing: () => get("/packing-slip", { status: "DRAFT" }),
    });

/**
 * `canSeeOverdue` mirrors the API: the overdue list is open to purchase and inventory admins only,
 * so a purchase user is not asked for it.
 */
export const loadPurchase = ({ canSeeOverdue }) =>
    settle({
        requisitionsToApprove: () =>
            get("/purchase-requisitions", { approvalStatus: "PENDING_APPROVAL", size: 1 }),
        ordersToApprove: () =>
            get("/purchase-orders", { approvalStatus: "PENDING_APPROVAL", size: 1 }),
        sent: () => get("/purchase-orders", { status: "SENT", size: 1 }),
        partlyReceived: () => get("/purchase-orders", { status: "PARTIALLY_RECEIVED", size: 1 }),
        ...(canSeeOverdue ? { overdue: () => get("/purchase-orders/overdue") } : {}),
    });

export const loadAccounts = () =>
    settle({
        debtors: () => get("/accounting/reports/debtors-ageing"),
        creditors: () => get("/accounting/reports/creditors-ageing"),
    });
