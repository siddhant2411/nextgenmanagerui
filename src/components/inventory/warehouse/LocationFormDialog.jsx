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
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

const EMPTY = { code: "", aisle: "", rack: "", bin: "", pickable: true, active: true };

/** Create / edit a bin within a bin-tracked warehouse. */
const LocationFormDialog = ({ open, location, warehouseCode, onClose, onSubmit, saving, error }) => {
    const [form, setForm] = useState(EMPTY);
    const isEdit = Boolean(location?.id);

    useEffect(() => {
        if (!open) return;
        setForm(location ? { ...EMPTY, ...location } : EMPTY);
    }, [open, location]);

    const set = (key) => (event) => {
        const value =
            event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const codeInvalid = !form.code?.trim();

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {isEdit ? `Edit ${location.code}` : `New location in ${warehouseCode}`}
            </DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Code"
                            value={form.code}
                            onChange={set("code")}
                            fullWidth
                            required
                            error={codeInvalid}
                            helperText={codeInvalid ? "Required" : "Printed on the pick list, e.g. A-03-2"}
                            inputProps={{ maxLength: 40, style: { textTransform: "uppercase" } }}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Aisle" value={form.aisle || ""} onChange={set("aisle")} fullWidth />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Rack" value={form.rack || ""} onChange={set("rack")} fullWidth />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Bin" value={form.bin || ""} onChange={set("bin")} fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                            <FormControlLabel
                                control={<Switch checked={Boolean(form.pickable)} onChange={set("pickable")} />}
                                label="Pickable"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 6, mt: -1 }}>
                                Turn off for staging, inspection or damage bins — they hold stock but must
                                never be picked from.
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
                    onClick={() => !codeInvalid && onSubmit({ ...form, code: form.code.trim().toUpperCase() })}
                    disabled={saving || codeInvalid}
                >
                    {saving ? "Saving…" : isEdit ? "Save changes" : "Add location"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LocationFormDialog;
