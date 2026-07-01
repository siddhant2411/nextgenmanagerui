import React, { useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Divider, Paper, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import { TrendingDownOutlined } from "@mui/icons-material";
import { fmtAmt } from "../gst/gstCommon";
import { postDepreciationVoucher } from "../../../services/accounting/tdsService";

const todayStr = () => new Date().toISOString().split("T")[0];
const EMPTY = { date: todayStr(), narration: "", amount: "" };

export default function DepreciationVoucherForm() {
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const amount = form.amount === "" ? 0 : Number(form.amount) || 0;

    const submit = async () => {
        if (amount <= 0) {
            setSnack({ open: true, message: "Depreciation amount is required.", severity: "error" });
            return;
        }
        setSaving(true);
        try {
            const v = await postDepreciationVoucher({ date: form.date, narration: form.narration || null, amount });
            setSnack({ open: true, message: `Posted depreciation voucher ${v?.voucherNumber || ""}.`, severity: "success" });
            setForm(EMPTY);
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || "Failed to post depreciation.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white", maxWidth: 600, mx: "auto" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <TrendingDownOutlined sx={{ color: "#0f766e" }} />
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Depreciation Voucher</Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mb: 2 }}>Posts Dr Depreciation / Cr Accumulated Depreciation for the period.</Typography>
                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Date *" type="date" size="small" value={form.date}
                            onChange={(e) => set("date", e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }} />
                        <TextField label="Amount *" type="number" size="small" fullWidth value={form.amount}
                            onChange={(e) => set("amount", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                    </Stack>
                    <TextField label="Narration" size="small" value={form.narration}
                        onChange={(e) => set("narration", e.target.value)} placeholder="Depreciation for Jun 2025" />

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "#f8fafc" }}>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>Posting Preview</Typography>
                        <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                            <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Dr Depreciation</Typography>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtAmt(amount)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                            <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Cr Accumulated Depreciation</Typography>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtAmt(amount)}</Typography>
                        </Stack>
                    </Paper>

                    <Box sx={{ textAlign: "right", mt: 1 }}>
                        <Button variant="contained" disableElevation disabled={saving} onClick={submit}
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                            Post Depreciation
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
