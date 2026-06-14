import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AccountingPlaceholder from "../components/accounting/common/AccountingPlaceholder";
import ChartOfAccountsPage from "../components/accounting/coa/ChartOfAccountsPage";
import FinancialYearsPage from "../components/accounting/period/FinancialYearsPage";
import OpeningBalancesPage from "../components/accounting/opening/OpeningBalancesPage";
import VoucherRegister from "../components/accounting/voucher/VoucherRegister";
import JournalVoucherForm from "../components/accounting/voucher/JournalVoucherForm";
import ReceiptVoucherForm from "../components/accounting/voucher/ReceiptVoucherForm";
import PaymentVoucherForm from "../components/accounting/voucher/PaymentVoucherForm";
import ContraVoucherForm from "../components/accounting/voucher/ContraVoucherForm";
import TrialBalancePage from "../components/accounting/reports/TrialBalancePage";
import DayBookPage from "../components/accounting/reports/DayBookPage";
import LedgerStatementPage from "../components/accounting/reports/LedgerStatementPage";
import AgeingReportPage from "../components/accounting/reports/AgeingReportPage";

const AccountingPage = () => (
    <Routes>
        <Route index element={<Navigate to="masters/coa" replace />} />

        {/* Masters */}
        <Route
            path="masters/coa"
            element={<ChartOfAccountsPage />}
        />
        <Route
            path="masters/financial-years"
            element={<FinancialYearsPage />}
        />
        <Route
            path="masters/opening-balances"
            element={<OpeningBalancesPage />}
        />

        {/* Vouchers */}
        <Route path="vouchers" element={<VoucherRegister />} />
        <Route path="vouchers/journal" element={<JournalVoucherForm />} />
        <Route path="vouchers/receipt" element={<ReceiptVoucherForm />} />
        <Route path="vouchers/payment" element={<PaymentVoucherForm />} />
        <Route path="vouchers/contra" element={<ContraVoucherForm />} />

        {/* Reports */}
        <Route path="reports/day-book"      element={<DayBookPage />} />
        <Route path="reports/ledger"        element={<LedgerStatementPage />} />
        <Route path="reports/trial-balance" element={<TrialBalancePage />} />
        <Route path="reports/debtors-ageing"   element={<AgeingReportPage variant="DEBTORS" />} />
        <Route path="reports/creditors-ageing" element={<AgeingReportPage variant="CREDITORS" />} />

        {/* Approvals */}
        <Route
            path="approvals/inbox"
            element={<AccountingPlaceholder screenName="Approvals Inbox" />}
        />
        <Route
            path="approvals/policies"
            element={<AccountingPlaceholder screenName="Approval Policies" />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="masters/coa" replace />} />
    </Routes>
);

export default AccountingPage;
