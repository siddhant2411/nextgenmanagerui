import React, { useMemo, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    TextField,
} from "@mui/material";
import { createMachineProductionLog } from "../../../services/machineAssetsService";
import {
    parseNumberInput,
    resolveMachineErrorMessage,
    validateProductionLogValues,
} from "./machineAssetsHelpers";

const getInitialValues = () => ({
    productionDate: "",
    shiftId: "",
    plannedQuantity: "",
    actualQuantity: "",
    rejectedQuantity: "",
    runtimeMinutes: "",
    downtimeMinutes: "",
});

export default function AddProductionLogDialog({ open, machine, onClose, onSuccess, onError }) {
    const [values, setValues] = useState(getInitialValues);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const errors = useMemo(() => validateProductionLogValues(values), [values]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        setValues(getInitialValues());
        onClose();
    };

    const handleChange = (field) => (event) => {
        setValues((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const handleSubmit = async () => {
        if (!machine?.id) {
            onError("Machine id is missing.");
            return;
        }
        const currentErrors = validateProductionLogValues(values);
        if (Object.keys(currentErrors).length > 0) {
            onError("Fill all required fields with valid non-negative values.");
            return;
        }

        try {
            setIsSubmitting(true);
            await createMachineProductionLog({
                machineId: machine.id,
                productionDate: values.productionDate,
                shiftId: values.shiftId || null,
                plannedQuantity: parseNumberInput(values.plannedQuantity),
                actualQuantity: parseNumberInput(values.actualQuantity),
                rejectedQuantity: parseNumberInput(values.rejectedQuantity),
                runtimeMinutes: parseNumberInput(values.runtimeMinutes),
                downtimeMinutes: parseNumberInput(values.downtimeMinutes),
            });
            onSuccess("Production log added successfully.");
            handleClose();
        } catch (error) {
            onError(resolveMachineErrorMessage(error, "Failed to add production log."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Add Production Log</DialogTitle>
            <DialogContent>
                <Stack sx={{ mt: 0.5 }} spacing={2}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Production Date"
                                type="date"
                                size="small"
                                value={values.productionDate}
                                onChange={handleChange("productionDate")}
                                InputLabelProps={{ shrink: true }}
                                error={Boolean(errors.productionDate)}
                                helperText={errors.productionDate || " "}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Shift Id"
                                size="small"
                                value={values.shiftId}
                                onChange={handleChange("shiftId")}
                                fullWidth
                            />
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Planned Quantity"
                                type="number"
                                size="small"
                                value={values.plannedQuantity}
                                onChange={handleChange("plannedQuantity")}
                                error={Boolean(errors.plannedQuantity)}
                                helperText={errors.plannedQuantity || " "}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Actual Quantity"
                                type="number"
                                size="small"
                                value={values.actualQuantity}
                                onChange={handleChange("actualQuantity")}
                                error={Boolean(errors.actualQuantity)}
                                helperText={errors.actualQuantity || " "}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Rejected Quantity"
                                type="number"
                                size="small"
                                value={values.rejectedQuantity}
                                onChange={handleChange("rejectedQuantity")}
                                error={Boolean(errors.rejectedQuantity)}
                                helperText={errors.rejectedQuantity || " "}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Runtime (minutes)"
                                type="number"
                                size="small"
                                value={values.runtimeMinutes}
                                onChange={handleChange("runtimeMinutes")}
                                error={Boolean(errors.runtimeMinutes)}
                                helperText={errors.runtimeMinutes || " "}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Downtime (minutes)"
                                type="number"
                                size="small"
                                value={values.downtimeMinutes}
                                onChange={handleChange("downtimeMinutes")}
                                error={Boolean(errors.downtimeMinutes)}
                                helperText={errors.downtimeMinutes || " "}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Add Log"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
