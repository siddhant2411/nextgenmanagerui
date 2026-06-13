import {
    FactoryOutlined,
    AccountBalanceOutlined,
    BadgeOutlined,
    PaymentsOutlined,
    LibraryBooksOutlined,
    ReceiptLongOutlined,
    BarChartOutlined,
    TaskAltOutlined,
    GavelOutlined,
    PercentOutlined,
    AccountBalanceWalletOutlined,
} from "@mui/icons-material";
import { MODULE_KEYS } from "../auth/roles";

export const MODULES = [
    {
        key: "operations",
        label: "Operations",
        description: "Production, Inventory, Sales & Purchase",
        Icon: FactoryOutlined,
        landingRoute: "/dashboard",
        moduleKey: null,
        status: "active",
        color: "#3b82f6",
        legacySidebar: true,
    },
    {
        key: "accounting",
        label: "Accounting",
        description: "Books, Vouchers, Reports & GST",
        Icon: AccountBalanceOutlined,
        landingRoute: "/accounting",
        moduleKey: MODULE_KEYS.ACCOUNTING,
        status: "active",
        color: "#10b981",
        nav: [
            {
                text: "Masters",
                Icon: LibraryBooksOutlined,
                children: [
                    { text: "Chart of Accounts", path: "/accounting/masters/coa" },
                    { text: "Financial Years", path: "/accounting/masters/financial-years" },
                    { text: "Opening Balances", path: "/accounting/masters/opening-balances" },
                ],
            },
            {
                text: "Vouchers",
                Icon: ReceiptLongOutlined,
                children: [
                    { text: "Voucher Register", path: "/accounting/vouchers" },
                    { text: "Journal Entry", path: "/accounting/vouchers/journal" },
                    { text: "Receipt", path: "/accounting/vouchers/receipt" },
                    { text: "Payment", path: "/accounting/vouchers/payment" },
                    { text: "Contra", path: "/accounting/vouchers/contra" },
                ],
            },
            {
                text: "Reports",
                Icon: BarChartOutlined,
                children: [
                    { text: "Day Book", path: "/accounting/reports/day-book" },
                    { text: "Ledger", path: "/accounting/reports/ledger" },
                    { text: "Trial Balance", path: "/accounting/reports/trial-balance" },
                ],
            },
            {
                text: "Approvals",
                Icon: TaskAltOutlined,
                children: [
                    { text: "Inbox", path: "/accounting/approvals/inbox" },
                    { text: "Policies", path: "/accounting/approvals/policies" },
                ],
            },
            {
                text: "GST",
                Icon: GavelOutlined,
                comingSoon: true,
                children: [
                    { text: "GSTR-1", path: "/accounting/gst/gstr1" },
                    { text: "GSTR-3B", path: "/accounting/gst/gstr3b" },
                    { text: "HSN Summary", path: "/accounting/gst/hsn" },
                ],
            },
            {
                text: "TDS",
                Icon: PercentOutlined,
                comingSoon: true,
                children: [
                    { text: "TDS Entries", path: "/accounting/tds/entries" },
                    { text: "Challans", path: "/accounting/tds/challans" },
                ],
            },
            {
                text: "Bank",
                Icon: AccountBalanceWalletOutlined,
                comingSoon: true,
                children: [
                    { text: "Bank Accounts", path: "/accounting/bank/accounts" },
                    { text: "Reconciliation", path: "/accounting/bank/reconciliation" },
                ],
            },
        ],
    },
    {
        key: "hr",
        label: "HR",
        description: "Employee Management, Leave & Attendance",
        Icon: BadgeOutlined,
        landingRoute: "/hr",
        moduleKey: MODULE_KEYS.HR,
        status: "coming_soon",
        color: "#8b5cf6",
    },
    {
        key: "payroll",
        label: "Payroll",
        description: "Salary Processing, TDS & Payslips",
        Icon: PaymentsOutlined,
        landingRoute: "/payroll",
        moduleKey: MODULE_KEYS.PAYROLL,
        status: "coming_soon",
        color: "#f59e0b",
    },
];
