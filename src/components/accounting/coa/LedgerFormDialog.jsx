import React, { useState, useEffect } from "react";
import {
    Autocomplete,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";

const NATURE_OPTIONS = [
    { value: "ASSET",     label: "Asset" },
    { value: "LIABILITY", label: "Liability" },
    { value: "EQUITY",    label: "Equity" },
    { value: "INCOME",    label: "Income" },
    { value: "EXPENSE",   label: "Expense" },
];

const SUBLEDGER_OPTIONS = [
    { value: "NONE",     label: "None" },
    { value: "CUSTOMER", label: "Customer (Sundry Debtors)" },
    { value: "VENDOR",   label: "Vendor (Sundry Creditors)" },
    { value: "BANK",     label: "Bank" },
    { value: "CASH",     label: "Cash" },
    { value: "TAX",      label: "Tax" },
    { value: "TDS",      label: "TDS" },
];

const EMPTY = {
    code: "",
    name: "",
    groupId: null,
    nature: "ASSET",
    openingBalance: "",
    openingBalanceDrCr: "DR",
    subLedgerType: "NONE",
    isControlAccount: false,
    gstApplicable: false,
    gstRate: "",
    isBankAccount: false,
    isCashAccount: false,
    isReconcilable: false,
};

const LedgerFormDialog = ({ open, onClose, onSave, ledger, groups = [], defaultGroupId = null }) => {
    const isEdit = Boolean(ledger);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (ledger) {
            setForm({
                code:               ledger.code || "",
                name:               ledger.name || "",
                groupId:            ledger.groupId ?? null,
                nature:             ledger.nature || "ASSET",
                openingBalance:     ledger.openingBalance != null ? String(ledger.openingBalance) : "",
                openingBalanceDrCr: ledger.openingBalanceDrCr || "DR",
                subLedgerType:      ledger.subLedgerType || "NONE",
                isControlAccount:   ledger.isControlAccount || false,
                gstApplicable:      ledger.gstApplicable || false,
                gstRate:            ledger.gstRate != null ? String(ledger.gstRate) : "",
                isBankAccount:      ledger.isBankAccount || false,
                isCashAccount:      ledger.isCashAccount || false,
                isReconcilable:     ledger.isReconcilable || false,
            });
        } else {
            setForm({ ...EMPTY, groupId: defaultGroupId });
        }
        setErrors({});
    }, [ledger, open, defaultGroupId]);

    const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

    const handleGroupChange = (groupId) => {
        const g = groups.find((x) => x.id === groupId);
        setForm((f) => ({ ...f, groupId, nature: g?.nature || f.nature }));
    };

    const validate = () => {
        const e = {};
        if (!form.code.trim()) e.code = "Required";
        if (!form.name.trim()) e.name = "Required";
        if (!form.groupId) e.groupId = "Required";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const dto = {
                ...form,
                openingBalance: form.openingBalance !== "" ? parseFloat(form.openingBalance) : null,
                gstRate: form.gstApplicable && form.gstRate !== "" ? parseFloat(form.gstRate) : null,
            };
            await onSave(dto);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const selectedGroup = groups.find((g) => g.id === form.groupId) ?? null;
    const hasOpeningBalance = form.openingBalance !== "" && parseFloat(form.openingBalance) > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: "0.9375rem", pb: 1.5 }}>
                {isEdit ? "Edit Ledger Account" : "New Ledger Account"}
            </DialogTitle>

            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.25 }}>
                    {/* Identity */}
                    <Grid item xs={4}>
                        <TextField
                            label="Code" size="small" fullWidth required
                            value={form.code}
                            onChange={(e) => set("code", e.target.value)}
                            error={!!errors.code} helperText={errors.code}
                        />
                    </Grid>
                    <Grid item xs={8}>
                        <TextField
                            label="Name" size="small" fullWidth required
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            error={!!errors.name} helperText={errors.name}
                        />
                    </Grid>

                    {/* Group + Nature */}
                    <Grid item xs={8}>
                        <Autocomplete
                            size="small"
                            options={groups}
                            getOptionLabel={(g) => `${g.code} — ${g.name}`}
                            value={selectedGroup}
                            onChange={(_, val) => handleGroupChange(val?.id ?? null)}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Under Group"
                                    required
                                    error={!!errors.groupId}
                                    helperText={errors.groupId}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            select label="Nature" size="small" fullWidth
                            value={form.nature}
                            onChange={(e) => set("nature", e.target.value)}
                        >
                            {NATURE_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* Opening balance */}
                    <Grid item xs={hasOpeningBalance ? 7 : 12}>
                        <TextField
                            label="Opening Balance" size="small" fullWidth type="number"
                            value={form.openingBalance}
                            onChange={(e) => set("openingBalance", e.target.value)}
                            inputProps={{ min: 0, step: "0.01" }}
                            placeholder="Leave blank if zero"
                        />
                    </Grid>
                    {hasOpeningBalance && (
                        <Grid item xs={5}>
                            <TextField
                                select label="Dr / Cr" size="small" fullWidth
                                value={form.openingBalanceDrCr}
                                onChange={(e) => set("openingBalanceDrCr", e.target.value)}
                            >
                                <MenuItem value="DR">Debit (Dr)</MenuItem>
                                <MenuItem value="CR">Credit (Cr)</MenuItem>
                            </TextField>
                        </Grid>
                    )}

                    {/* Sub-ledger type */}
                    <Grid item xs={12}>
                        <TextField
                            select label="Sub-Ledger Type" size="small" fullWidth
                            value={form.subLedgerType}
                            onChange={(e) => set("subLedgerType", e.target.value)}
                        >
                            {SUBLEDGER_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* Flags */}
                    <Grid item xs={12}>
                        <Typography variant="caption" sx={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700, fontSize: "0.625rem" }}>
                            Flags
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={form.isControlAccount} onChange={(e) => set("isControlAccount", e.target.checked)} />}
                            label={<Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>Control Account</Typography>}
                            sx={{ m: 0 }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={form.isReconcilable} onChange={(e) => set("isReconcilable", e.target.checked)} />}
                            label={<Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>Reconcilable</Typography>}
                            sx={{ m: 0 }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={form.isBankAccount} onChange={(e) => set("isBankAccount", e.target.checked)} />}
                            label={<Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>Bank Account</Typography>}
                            sx={{ m: 0 }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={form.isCashAccount} onChange={(e) => set("isCashAccount", e.target.checked)} />}
                            label={<Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>Cash Account</Typography>}
                            sx={{ m: 0 }}
                        />
                    </Grid>
                    <Grid item xs={form.gstApplicable ? 6 : 12}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={form.gstApplicable} onChange={(e) => set("gstApplicable", e.target.checked)} />}
                            label={<Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>GST Applicable</Typography>}
                            sx={{ m: 0 }}
                        />
                    </Grid>
                    {form.gstApplicable && (
                        <Grid item xs={6}>
                            <TextField
                                label="GST Rate (%)" size="small" fullWidth type="number"
                                value={form.gstRate}
                                onChange={(e) => set("gstRate", e.target.value)}
                                inputProps={{ min: 0, max: 100, step: "0.1" }}
                            />
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={onClose}
                    size="small"
                    sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disableElevation
                    size="small"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={13} color="inherit" /> : null}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}
                >
                    {isEdit ? "Save Changes" : "Create Ledger"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LedgerFormDialog;
