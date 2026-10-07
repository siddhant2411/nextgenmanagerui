import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { WAREHOUSE_TYPES } from "../../../services/warehouseService";
import { StateNameField } from "../../common/GstStateSelect";

const EMPTY = {
    code: "",
    name: "",
    warehouseType: "GENERAL",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    isDefault: false,
    binTracked: false,
    active: true,
};

/**
 * Create / edit a warehouse.
 *
 * <p>Two fields behave in ways worth surfacing rather than leaving the user to discover:
 * the default warehouse cannot be unset directly (another must be promoted instead), and
 * bin tracking cannot be switched off while locations exist.
 */
const WarehouseFormDialog = ({ open, warehouse, onClose, onSubmit, saving, error }) => {
    const [form, setForm] = useState(EMPTY);
    const isEdit = Boolean(warehouse?.id);

    useEffect(() => {
        if (!open) return;
        setForm(warehouse ? { ...EMPTY, ...warehouse } : EMPTY);
    }, [open, warehouse]);

    const set = (key) => (event) => {
        const value =
            event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const codeInvalid = !form.code?.trim();
    const nameInvalid = !form.name?.trim();

    const handleSubmit = () => {
        if (codeInvalid || nameInvalid) return;
        onSubmit({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() });
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? `Edit ${warehouse.code}` : "New warehouse"}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Code"
                            value={form.code}
                            onChange={set("code")}
                            fullWidth
                            required
                            error={codeInvalid}
                            helperText={codeInvalid ? "Required" : "Shown on documents"}
                            inputProps={{ maxLength: 20, style: { textTransform: "uppercase" } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <TextField
                            label="Name"
                            value={form.name}
                            onChange={set("name")}
                            fullWidth
                            required
                            error={nameInvalid}
                            helperText={nameInvalid ? "Required" : " "}
                            inputProps={{ maxLength: 120 }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            label="Type"
                            value={form.warehouseType}
                            onChange={set("warehouseType")}
                            fullWidth
                            helperText="Drives routing, not just labelling"
                        >
                            {WAREHOUSE_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="GSTIN"
                            value={form.gstin || ""}
                            onChange={set("gstin")}
                            fullWidth
                            inputProps={{ maxLength: 15 }}
                            helperText="Only if this site files separately"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Address line 1"
                            value={form.addressLine1 || ""}
                            onChange={set("addressLine1")}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Address line 2"
                            value={form.addressLine2 || ""}
                            onChange={set("addressLine2")}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                        <TextField label="City" value={form.city || ""} onChange={set("city")} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StateNameField
                            value={form.state || ""}
                            onChange={(name) => set("state")({ target: { value: name } })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            label="PIN"
                            value={form.pincode || ""}
                            onChange={set("pincode")}
                            fullWidth
                            inputProps={{ maxLength: 10 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(form.isDefault)}
                                        onChange={set("isDefault")}
                                        disabled={isEdit && warehouse?.isDefault}
                                    />
                                }
                                label="Default warehouse"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1 }}>
                                {isEdit && warehouse?.isDefault
                                    ? "Already the default. Promote another warehouse to move it."
                                    : "Anything without a warehouse of its own lands here."}
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch checked={Boolean(form.binTracked)} onChange={set("binTracked")} />
                                }
                                label="Track bin locations"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1 }}>
                                Off by default. Turn on to record aisle / rack / bin within this warehouse.
                            </Typography>

                            <FormControlLabel
                                control={<Switch checked={Boolean(form.active)} onChange={set("active")} />}
                                label="Active"
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving || codeInvalid || nameInvalid}
                >
                    {saving ? "Saving…" : isEdit ? "Save changes" : "Create warehouse"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WarehouseFormDialog;
