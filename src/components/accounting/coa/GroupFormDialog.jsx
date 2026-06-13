import React, { useState, useEffect } from "react";
import {
    Autocomplete,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    TextField,
} from "@mui/material";

const NATURE_OPTIONS = [
    { value: "ASSET",     label: "Asset" },
    { value: "LIABILITY", label: "Liability" },
    { value: "EQUITY",    label: "Equity" },
    { value: "INCOME",    label: "Income" },
    { value: "EXPENSE",   label: "Expense" },
];

const EMPTY = { code: "", name: "", nature: "ASSET", parentGroupId: null, scheduleIIIHead: "", sortOrder: 0 };

const GroupFormDialog = ({ open, onClose, onSave, group, groups = [] }) => {
    const isEdit = Boolean(group);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (group) {
            setForm({
                code:           group.code || "",
                name:           group.name || "",
                nature:         group.nature || "ASSET",
                parentGroupId:  group.parentGroupId ?? null,
                scheduleIIIHead: group.scheduleIIIHead || "",
                sortOrder:      group.sortOrder || 0,
            });
        } else {
            setForm(EMPTY);
        }
        setErrors({});
    }, [group, open]);

    const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

    const validate = () => {
        const e = {};
        if (!form.code.trim()) e.code = "Required";
        if (!form.name.trim()) e.name = "Required";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave(form);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const parentOptions = groups.filter((g) => !group || g.id !== group.id);
    const selectedParent = parentOptions.find((g) => g.id === form.parentGroupId) ?? null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: "0.9375rem", pb: 1.5 }}>
                {isEdit ? "Edit Account Group" : "New Account Group"}
            </DialogTitle>

            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.25 }}>
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

                    <Grid item xs={6}>
                        <TextField
                            select label="Nature" size="small" fullWidth required
                            value={form.nature}
                            onChange={(e) => set("nature", e.target.value)}
                        >
                            {NATURE_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            label="Sort Order" size="small" fullWidth type="number"
                            value={form.sortOrder}
                            onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Autocomplete
                            size="small"
                            options={parentOptions}
                            getOptionLabel={(g) => `${g.code} — ${g.name}`}
                            value={selectedParent}
                            onChange={(_, val) => set("parentGroupId", val?.id ?? null)}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => (
                                <TextField {...params} label="Parent Group" placeholder="None (top level)" />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Schedule III Head" size="small" fullWidth
                            value={form.scheduleIIIHead}
                            onChange={(e) => set("scheduleIIIHead", e.target.value)}
                            placeholder="e.g. Property, Plant & Equipment"
                        />
                    </Grid>
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
                    {isEdit ? "Save Changes" : "Create Group"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GroupFormDialog;
