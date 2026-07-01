import React, { useEffect, useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useFinancialYears } from "../gst/gstCommon";

// TDS quarters follow the Indian FY: Q1 Apr-Jun .. Q4 Jan-Mar.
export const TDS_QUARTERS = [
    { value: "Q1", label: "Q1 (Apr–Jun)" },
    { value: "Q2", label: "Q2 (Jul–Sep)" },
    { value: "Q3", label: "Q3 (Oct–Dec)" },
    { value: "Q4", label: "Q4 (Jan–Mar)" },
];

// Derives the "YYYY-YY" string the backend stores (from a FY's start date).
export const fyString = (fy) => {
    if (!fy?.startDate) return "";
    const y = new Date(fy.startDate).getFullYear();
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};

const currentQuarter = () => {
    const m = new Date().getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
};

/**
 * FY + quarter selector. Emits { fy: "2025-26", quarter: "Q1", fyLabel }.
 */
export const FyQuarterSelector = ({ value, onChange }) => {
    const { fys, loading } = useFinancialYears();
    const [fyId, setFyId] = useState("");
    const [quarter, setQuarter] = useState(currentQuarter());

    const emit = (fy, q) => {
        if (!fy || !q) return;
        onChange?.({ fy: fyString(fy), quarter: q, fyLabel: fy.label });
    };

    useEffect(() => {
        if (loading || !fys.length || fyId) return;
        const activeFy = fys.find((f) => f.status === "ACTIVE") || fys[0];
        setFyId(activeFy?.id ?? "");
        emit(activeFy, quarter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, fys]);

    const onFyChange = (id) => {
        setFyId(id);
        emit(fys.find((f) => f.id === id), quarter);
    };
    const onQuarterChange = (q) => {
        setQuarter(q);
        emit(fys.find((f) => f.id === fyId), q);
    };

    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
            <TextField
                select label="Financial Year" size="small" value={fyId}
                onChange={(e) => onFyChange(e.target.value)} disabled={loading || !fys.length}
                sx={{ minWidth: 180 }}
            >
                {fys.map((f) => (
                    <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                ))}
            </TextField>
            <TextField
                select label="Quarter" size="small" value={quarter}
                onChange={(e) => onQuarterChange(e.target.value)} sx={{ minWidth: 160 }}
            >
                {TDS_QUARTERS.map((q) => (
                    <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>
                ))}
            </TextField>
            {value?.fy && (
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", pb: 1 }}>
                    FY {value.fy} · {value.quarter}
                </Typography>
            )}
        </Stack>
    );
};
