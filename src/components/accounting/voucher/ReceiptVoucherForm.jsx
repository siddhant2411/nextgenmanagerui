import React from "react";
import SimpleVoucherPage from "./SimpleVoucherPage";
import { postReceipt } from "../../../services/accounting/accountingVoucherService";

const ReceiptVoucherForm = () => (
    <SimpleVoucherPage
        title="Receipt Voucher"
        subtitle="Record money received — debits the bank/cash account, credits the source"
        field1={{ label: "Received Into (Dr)", helperText: "Select a bank or cash account" }}
        field2={{ label: "Received From (Cr)", helperText: "Customer, income, or any account" }}
        amountLabel="Amount Received"
        accentColor="#10b981"
        accentDark="#059669"
        onSubmit={({ field1Id, field2Id, amount, date, narration }) =>
            postReceipt({ date, bankOrCashAccountId: field1Id, fromAccountId: field2Id, amount, narration })
        }
    />
);

export default ReceiptVoucherForm;
