import React, { useEffect, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";

import {
    createMachineDetails,
    getMachineDetailsById,
    searchWorkCenters,
    updateMachineDetails,
} from "../../../services/machineAssetsService";
import { MACHINE_STATUS_OPTIONS } from "./constants";
import {
    getWorkCenterDisplayValue,
    parseNumberInput,
    resolveMachineErrorMessage,
} from "./machineAssetsHelpers";

const getInitialValues = () => ({
    machineCode: "",
    machineName: "",
    status: "ACTIVE",
    workCenter: "",
    costPerHour: "",
    description: "",
});

const validationSchema = Yup.object({
    machineCode: Yup.string().trim().required("Machine code is required"),
    machineName: Yup.string().trim().required("Machine name is required"),
    workCenter: Yup.number()
        .typeError("Work center is required")
        .required("Work center is required"),
    status: Yup.string().required(),
    costPerHour: Yup.number()
        .typeError("Cost per hour is required")
        .min(0, "Cost per hour must be zero or greater")
        .required("Cost per hour is required"),
    description: Yup.string().nullable(),
});

export default function MachineAssetForm({ onSuccess, onError }) {
    const { machineId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(machineId);

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [workCenterOptions, setWorkCenterOptions] = useState([]);
    const [workCenterLoading, setWorkCenterLoading] = useState(false);
    const [workCenterInputValue, setWorkCenterInputValue] = useState("");
    const [selectedWorkCenter, setSelectedWorkCenter] = useState(null);

    const formik = useFormik({
        initialValues: getInitialValues(),
        validationSchema,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting }) => {
            const payload = {
                machineCode: values.machineCode.trim(),
                machineName: values.machineName.trim(),
                status: values.status,
                workCenter: { id: Number(values.workCenter) },
                costPerHour: parseNumberInput(values.costPerHour),
                description: values.description.trim() || null,
            };

            try {
                const response = isEditMode
                    ? await updateMachineDetails(machineId, payload)
                    : await createMachineDetails(payload);

                onSuccess(
                    isEditMode
                        ? "Machine updated successfully."
                        : "Machine created successfully."
                );

                const nextId = response?.id || machineId;
                navigate(
                    nextId
                        ? `/production/machine-assets/${nextId}`
                        : "/production/machine-assets"
                );
            } catch (error) {
                onError(
                    resolveMachineErrorMessage(
                        error,
                        "Failed to save machine details."
                    )
                );
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (!isEditMode) return;

        const loadMachine = async () => {
            try {
                setIsLoading(true);
                const machine = await getMachineDetailsById(machineId);
                const initialWorkCenterValue = machine?.workCenter?.id ?? "";
                const initialWorkCenterDisplayValue =
                    getWorkCenterDisplayValue(machine?.workCenter) ||
                    "";

                formik.setValues({
                    machineCode: machine?.machineCode || "",
                    machineName: machine?.machineName || "",
                    status: machine?.status || "ACTIVE",
                    workCenter: initialWorkCenterValue,
                    costPerHour: machine?.costPerHour ?? "",
                    description: machine?.description || "",
                });

                setWorkCenterInputValue(initialWorkCenterDisplayValue);
                setSelectedWorkCenter(
                    machine?.workCenter && typeof machine.workCenter === "object"
                        ? machine.workCenter
                        : null
                );
            } catch (error) {
                onError(
                    resolveMachineErrorMessage(
                        error,
                        "Failed to load machine details."
                    )
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadMachine();
    }, [isEditMode, machineId]);

    useEffect(() => {
        let isActive = true;
        const timeoutId = setTimeout(async () => {
            try {
                setWorkCenterLoading(true);
                const response = await searchWorkCenters({
                    page: 0,
                    size: 10,
                    sortBy: "centerName",
                    sortDir: "asc",
                    search: workCenterInputValue.trim(),
                });

                if (!isActive) {
                    return;
                }

                const options = Array.isArray(response?.content)
                    ? response.content
                    : Array.isArray(response)
                      ? response
                      : [];
                setWorkCenterOptions(options);
            } catch (error) {
                if (isActive) {
                    setWorkCenterOptions([]);
                }
            } finally {
                if (isActive) {
                    setWorkCenterLoading(false);
                }
            }
        }, 300);

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [workCenterInputValue]);

    if (isLoading) {
        return (
            <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card elevation={0} sx={{ border: "1px solid #e5e9f2", borderRadius: 2 }}>
            <CardContent>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                    sx={{ mb: 2 }}
                >
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                        {isEditMode ? "Edit Machine" : "Create Machine"}
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                            navigate("/production/machine-assets")
                        }
                    >
                        Back to List
                    </Button>
                </Stack>

                <Box component="form" onSubmit={formik.handleSubmit}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="machineCode"
                                label="Machine Code"
                                value={formik.values.machineCode}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={
                                    formik.touched.machineCode &&
                                    Boolean(formik.errors.machineCode)
                                }
                                helperText={
                                    formik.touched.machineCode &&
                                    formik.errors.machineCode
                                }
                                size="small"
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="machineName"
                                label="Machine Name"
                                value={formik.values.machineName}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={
                                    formik.touched.machineName &&
                                    Boolean(formik.errors.machineName)
                                }
                                helperText={
                                    formik.touched.machineName &&
                                    formik.errors.machineName
                                }
                                size="small"
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                name="status"
                                label="Status"
                                value={formik.values.status}
                                onChange={formik.handleChange}
                                size="small"
                                fullWidth
                            >
                                {MACHINE_STATUS_OPTIONS.map((status) => (
                                    <MenuItem key={status} value={status}>
                                        {status}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={workCenterOptions}
                                loading={workCenterLoading}
                                value={selectedWorkCenter}
                                inputValue={workCenterInputValue}
                                onInputChange={(_, nextInputValue, reason) => {
                                    setWorkCenterInputValue(nextInputValue);
                                    if (reason === "input") {
                                        setSelectedWorkCenter(null);
                                        formik.setFieldValue("workCenter", "");
                                    }
                                    if (reason === "clear") {
                                        setSelectedWorkCenter(null);
                                        formik.setFieldValue("workCenter", "");
                                    }
                                }}
                                onChange={(_, option) => {
                                    setSelectedWorkCenter(option || null);
                                    formik.setFieldValue(
                                        "workCenter",
                                        option?.id ?? ""
                                    );
                                    formik.setFieldTouched("workCenter", true, false);
                                }}
                                isOptionEqualToValue={(option, value) => {
                                    if (option?.id !== undefined && value?.id !== undefined) {
                                        return option.id === value.id;
                                    }
                                    return false;
                                }}
                                getOptionLabel={(option) =>
                                    getWorkCenterDisplayValue(option) ||
                                    ""
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        name="workCenter"
                                        label="Work Center"
                                        onBlur={() =>
                                            formik.setFieldTouched("workCenter", true, true)
                                        }
                                        error={
                                            formik.touched.workCenter &&
                                            Boolean(formik.errors.workCenter)
                                        }
                                        helperText={
                                            formik.touched.workCenter &&
                                            formik.errors.workCenter
                                        }
                                        size="small"
                                        fullWidth
                                    />
                                )}
                                noOptionsText="No work centers found"
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="costPerHour"
                                label="Cost Per Hour"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={formik.values.costPerHour}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={
                                    formik.touched.costPerHour &&
                                    Boolean(formik.errors.costPerHour)
                                }
                                helperText={
                                    formik.touched.costPerHour &&
                                    formik.errors.costPerHour
                                }
                                size="small"
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                name="description"
                                label="Description"
                                multiline
                                minRows={3}
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                size="small"
                                fullWidth
                            />
                        </Grid>
                    </Grid>

                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={formik.isSubmitting}
                        >
                            {formik.isSubmitting
                                ? "Saving..."
                                : isEditMode
                                ? "Update Machine"
                                : "Create Machine"}
                        </Button>
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
