import React from "react";
import {
    Card, CardHeader, CardContent, Grid,
    TextField, FormControlLabel, Checkbox,
    Typography, Box, MenuItem, Select, FormControl, InputLabel
} from "@mui/material";



const TaxTypeOptions = [
    { value: "IGST", label: "IGST" },
    { value: "CGST_SGST", label: "CGST & SGST" },
];

const taxPecentageOption = [
    { value: "5", label: "5%" },
    { value: "12", label: "12%" },
    { value: "18", label: "18%" },
    { value: "28", label: "28%" },
];


const TaxAndDiscountCard = ({
    summary,
    setSummary,
    currencySymbol,
    setExtraDiscountPercentage,
    taxType,
    setTaxType,
    setTaxCategory,
    taxCategory,
    setTaxPercentageValue,
    freightValue,
    setFreightValue,
    isTaxOnFreight,
    setIsTaxOnFreight
}) => (

    <div style={{ flex: 1, padding: "10px"}}>
        <Grid container spacing={2} alignItems="center">
            {/* Taxable Freight + Charges */}
            <Grid item xs={12} sm={6}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isTaxOnFreight}
                            size="small"
                            onChange={(e) => setIsTaxOnFreight(e.target.checked)}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 13 }}>
                            Taxable Freight Charges
                        </Typography>
                    }
                />
            </Grid>

        </Grid>
        <Grid container spacing={2} alignItems="center" mt={3}>
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Freight & Forwarding Charges"
                    value={freightValue}
                    onChange={(e) => setFreightValue(Number(e.target.value))}
                    size="small"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <span style={{ fontSize: 13, marginRight: 4 }}>
                                {currencySymbol}
                            </span>
                        ),
                    }}
                    inputProps={{
                        style: { fontSize: 13, textAlign: "right", padding: 7 },
                    }}
                />
            </Grid>

            {/* Extra Discount */}
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Extra Discount (%)"
                    value={summary.extraDiscountPercentage ?? ""}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        setSummary((s) => ({ ...s, extraDiscountPercentage: value }));
                        if (setExtraDiscountPercentage) setExtraDiscountPercentage(value);
                    }}
                    size="small"
                    fullWidth
                    inputProps={{
                        style: { fontSize: 13, textAlign: "right", padding: 7 },
                    }}
                />
            </Grid>

        </Grid>
        <Grid container spacing={2} alignItems="center" mt={5}>
            {/* Tax Type */}
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                    <InputLabel id="tax-type-label" sx={{ fontSize: 13 }}>
                        Tax Type
                    </InputLabel>
                    <Select
                        labelId="tax-type-label"
                        value={taxType || ""}
                        onChange={(e) => setTaxType(e.target.value)}
                        sx={{ fontSize: 13 }}
                    >
                        {TaxTypeOptions.map((option) => (
                            <MenuItem
                                key={option.value}
                                value={option.value}
                                sx={{ fontSize: 13 }}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            {/* Tax Category / Percentage */}
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                    <InputLabel id="tax-category-label" sx={{ fontSize: 13 }}>
                        Tax Category
                    </InputLabel>
                    <Select
                        labelId="tax-category-label"
                        value={taxCategory || ""}
                        onChange={(e) => setTaxCategory(e.target.value)}
                        sx={{ fontSize: 13 }}
                    >
                        {taxPecentageOption.map((option) => (
                            <MenuItem
                                key={option.value}
                                value={option.value}
                                sx={{ fontSize: 13 }}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
    </div>

);


export default TaxAndDiscountCard;
