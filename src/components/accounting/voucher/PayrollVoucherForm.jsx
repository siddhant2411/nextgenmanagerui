import React, { useMemo, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Divider, Paper, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import { PaymentsOutlined } from "@mui/icons-material";
import { fmtAmt } from "../gst/gstCommon";
import { postPayrollVoucher } from "../../../services/accounting/tdsService";

const todayStr = () => new Date().toISOString().split("T")[0];
const EMPTY = {
    date: todayStr(), narration: "", grossSalary: "", employeePf: "", employerPf: "",
    employeeEsi: "", employerEsi: "", professionalTax: "", tds: "",
};
const num = (v) => (v === "" || v == null ? 0 : Number(v) || 0);

export default function PayrollVoucherForm() {
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const calc = useMemo(() => {
        const gross = num(form.grossSalary), eePf = num(form.employeePf), erPf = num(form.employerPf),
            eeEsi = num(form.employeeEsi), erEsi = num(form.employerEsi), pt = num(form.professionalTax), tds = num(form.tds);
        const debit = gross + erPf + erEsi;
        const net = gross - eePf - eeEsi - pt - tds;
        return { debit, net, pf: eePf + erPf, esi: eeEsi + erEsi, pt, tds };
    }, [form]);

    const submit = async () => {
        if (num(form.grossSalary) <= 0) {
            setSnack({ open: true, message: "Gross salary is required.", severity: "error" });
            return;
        }
        if (calc.net < 0) {
            setSnack({ open: true, message: "Deductions exceed gross — net pay is negative.", severity: "error" });
            return;
        }
        setSaving(true);
        try {
            const v = await postPayrollVoucher({
                date: form.date,
                narration: form.narration || null,
                grossSalary: num(form.grossSalary),
                employeePf: num(form.employeePf),
                employerPf: num(form.employerPf),
                employeeEsi: num(form.employeeEsi),
                employerEsi: num(form.employerEsi),
                professionalTax: num(form.professionalTax),
                tds: num(form.tds),
            });
            setSnack({ open: true, message: `Posted payroll voucher ${v?.voucherNumber || ""}.`, severity: "success" });
            setForm(EMPTY);
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || "Failed to post payroll.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const Row = ({ label, value, bold }) => (
        <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
            <Typography sx={{ fontSize: "0.8rem", color: bold ? "#0f172a" : "#64748b", fontWeight: bold ? 700 : 500 }}>{label}</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: bold ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{fmtAmt(value)}</Typography>
        </Stack>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white", maxWidth: 760, mx: "auto" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <PaymentsOutlined sx={{ color: "#0f766e" }} />
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Payroll Voucher</Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mb: 2 }}>Monthly payroll summary — posts salaries, statutory payables and net salary payable.</Typography>
                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Date *" type="date" size="small" value={form.date}
                            onChange={(e) => set("date", e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }} />
                        <TextField label="Narration" size="small" fullWidth value={form.narration}
                            onChange={(e) => set("narration", e.target.value)} placeholder="Payroll June 2025" />
                    </Stack>

                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", mt: 1 }}>Earnings & Employer Cost</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Gross Salary *" type="number" size="small" fullWidth value={form.grossSalary}
                            onChange={(e) => set("grossSalary", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                        <TextField label="Employer PF" type="number" size="small" fullWidth value={form.employerPf}
                            onChange={(e) => set("employerPf", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                        <TextField label="Employer ESI" type="number" size="small" fullWidth value={form.employerEsi}
                            onChange={(e) => set("employerEsi", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                    </Stack>

                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", mt: 1 }}>Employee Deductions</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Employee PF" type="number" size="small" fullWidth value={form.employeePf}
                            onChange={(e) => set("employeePf", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                        <TextField label="Employee ESI" type="number" size="small" fullWidth value={form.employeeEsi}
                            onChange={(e) => set("employeeEsi", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                        <TextField label="Professional Tax" type="number" size="small" fullWidth value={form.professionalTax}
                            onChange={(e) => set("professionalTax", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                        <TextField label="TDS (salary)" type="number" size="small" fullWidth value={form.tds}
                            onChange={(e) => set("tds", e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                    </Stack>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "#f8fafc", mt: 1 }}>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>Posting Preview</Typography>
                        <Row label="Dr Salaries & Wages" value={calc.debit} />
                        {calc.pf > 0 && <Row label="Cr PF Payable" value={calc.pf} />}
                        {calc.esi > 0 && <Row label="Cr ESI Payable" value={calc.esi} />}
                        {calc.pt > 0 && <Row label="Cr Professional Tax Payable" value={calc.pt} />}
                        {calc.tds > 0 && <Row label="Cr TDS Payable" value={calc.tds} />}
                        <Row label="Cr Salary Payable (net)" value={calc.net} />
                        <Divider sx={{ my: 1 }} />
                        <Row label="Balanced total" value={calc.debit} bold />
                    </Paper>

                    <Box sx={{ textAlign: "right", mt: 1 }}>
                        <Button variant="contained" disableElevation disabled={saving} onClick={submit}
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                            Post Payroll
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
