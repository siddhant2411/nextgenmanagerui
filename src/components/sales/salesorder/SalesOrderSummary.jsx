import {
  Card, CardHeader, CardContent, Grid,
  TextField, FormControlLabel, Checkbox,
  Typography, Box
} from "@mui/material";
import React from "react";
// customize as needed

const SalesOrderSummary = ({
  summary,
  setSummary,
  currencySymbol,
  setExtraDiscountPercentage,
  taxType,
  taxCategory  // stub or use as needed
}) => (
  <div style={{ flex: "1", paddingLeft: "5%",paddingRight: "4%" }}>
    <Grid container spacing={0}>
      {/* Left Column: Editable fields */}

      {/* Right Column: Summary Table */}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: '100%' }}>
          <SummaryRow label="Sub Total" value={summary.subTotal} />
          <SummaryRow label="Discount Value" value={-summary.extraDiscountValue} />
          <hr style={{ margin: "0.1rem 0" }}></hr>
          <SummaryRow label="Taxable Value" value={summary.taxableValue} onlyWeight />
          {taxType !== 'IGST' && <SummaryRow label={`CGST (${taxCategory ? taxCategory / 2 : 0}%)`} value={summary.cgstAmount} />}
          {taxType !== 'IGST' && <SummaryRow label={`SGST (${taxCategory ? taxCategory / 2 : 0}%)`} value={summary.sgstAmount} />}
          {taxType === 'IGST' && <SummaryRow label={`IGST (${taxCategory ? taxCategory : 0}%)`} value={summary.igstAmount} />}
          <hr style={{ margin: "0.1rem 0" }}></hr>
          <SummaryRow
            label="Net Amount"
            value={summary.netAmount}
            onlyWeight
          />

          <SummaryRow
            label="Round Off"
            value={summary.roundOffAmount}
          />
          <hr style={{ margin: "0.1rem 0" }}></hr>
          <SummaryRow
            label={<span style={{ color: "#1976d2", fontWeight: 700 }}>Total Amount</span>}
            value={summary.totalPayableAmount}
            highlight
          />
        </Box>
      </Grid>

  </div>
);

// Helper for one summary row, boxed for alignment
const SummaryRow = ({ label, value, highlight, onlyWeight }) => (
  <Box sx={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontWeight: (highlight || onlyWeight) ? 700 : 400,
    color: highlight ? "#1976d2" : "text.primary",
    fontSize: (highlight || onlyWeight) ? 17 : 14,
    my: highlight ? 1 : 0
  }}>
    <span>{label}</span>
    <span style={{ minWidth: 100, textAlign: "right" }}>
      ₹ {value != null && !isNaN(value) ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
    </span>
  </Box>
);


export default SalesOrderSummary;
