import React from "react";
import SimpleVoucherPage from "./SimpleVoucherPage";
import { postContra } from "../../../services/accounting/accountingVoucherService";

const ContraVoucherForm = () => (
    <SimpleVoucherPage
        title="Contra Voucher"
        subtitle="Transfer between cash/bank accounts — e.g. cash deposit or bank withdrawal"
        field1={{ label: "Transfer To (Dr)", helperText: "Destination bank or cash account" }}
        field2={{ label: "Transfer From (Cr)", helperText: "Source bank or cash account" }}
        amountLabel="Transfer Amount"
        accentColor="#8b5cf6"
        accentDark="#7c3aed"
        onSubmit={({ field1Id, field2Id, amount, date, narration }) =>
            postContra({ date, toAccountId: field1Id, fromAccountId: field2Id, amount, narration })
        }
    />
);

export default ContraVoucherForm;
