import React from "react";
import SimpleVoucherPage from "./SimpleVoucherPage";
import { postPayment } from "../../../services/accounting/accountingVoucherService";

const PaymentVoucherForm = () => (
    <SimpleVoucherPage
        title="Payment Voucher"
        subtitle="Record money paid out — debits the payee account, credits the bank/cash"
        field1={{ label: "Paid To (Dr)", helperText: "Vendor, expense, or any account" }}
        field2={{ label: "Paid From (Cr)", helperText: "Select a bank or cash account" }}
        amountLabel="Amount Paid"
        accentColor="#f59e0b"
        accentDark="#d97706"
        onSubmit={({ field1Id, field2Id, amount, date, narration }) =>
            postPayment({ date, toAccountId: field1Id, bankOrCashAccountId: field2Id, amount, narration })
        }
    />
);

export default PaymentVoucherForm;
