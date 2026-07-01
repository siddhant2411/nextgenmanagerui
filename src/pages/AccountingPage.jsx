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
import StockGlReconciliationPage from "../components/accounting/reports/StockGlReconciliationPage";
import Gstr1Page from "../components/accounting/gst/Gstr1Page";
import Gstr3bPage from "../components/accounting/gst/Gstr3bPage";
import HsnSummaryPage from "../components/accounting/gst/HsnSummaryPage";
import GstRegisterPage from "../components/accounting/gst/GstRegisterPage";
import GstFilingsPage from "../components/accounting/gst/GstFilingsPage";
import TdsSectionsPage from "../components/accounting/tds/TdsSectionsPage";
import TdsRegisterPage from "../components/accounting/tds/TdsRegisterPage";
import TdsChallansPage from "../components/accounting/tds/TdsChallansPage";
import PayrollVoucherForm from "../components/accounting/voucher/PayrollVoucherForm";
import DepreciationVoucherForm from "../components/accounting/voucher/DepreciationVoucherForm";

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
        <Route path="vouchers/payroll" element={<PayrollVoucherForm />} />
        <Route path="vouchers/depreciation" element={<DepreciationVoucherForm />} />

        {/* Reports */}
        <Route path="reports/day-book"      element={<DayBookPage />} />
        <Route path="reports/ledger"        element={<LedgerStatementPage />} />
        <Route path="reports/trial-balance" element={<TrialBalancePage />} />
        <Route path="reports/debtors-ageing"   element={<AgeingReportPage variant="DEBTORS" />} />
        <Route path="reports/creditors-ageing" element={<AgeingReportPage variant="CREDITORS" />} />
        <Route path="reports/stock-gl"         element={<StockGlReconciliationPage />} />

        {/* GST */}
        <Route path="gst/gstr1"            element={<Gstr1Page />} />
        <Route path="gst/gstr3b"           element={<Gstr3bPage />} />
        <Route path="gst/hsn"              element={<HsnSummaryPage />} />
        <Route path="gst/register/outward" element={<GstRegisterPage variant="OUTWARD" />} />
        <Route path="gst/register/inward"  element={<GstRegisterPage variant="INWARD" />} />
        <Route path="gst/filings"          element={<GstFilingsPage />} />

        {/* TDS */}
        <Route path="tds/sections"  element={<TdsSectionsPage />} />
        <Route path="tds/register"  element={<TdsRegisterPage />} />
        <Route path="tds/challans"  element={<TdsChallansPage />} />

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
