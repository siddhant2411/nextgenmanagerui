import React, { useEffect, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ArrowBack } from "@mui/icons-material";

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

const BORDER_COLOR = '#e5e7eb';

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13.5 },
    "& .MuiInputLabel-root": { fontSize: 13.5 },
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.5,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
    },
};

const SectionHeading = ({ children }) => (
    <Grid item xs={12}>
        <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
            <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {children}
            </Typography>
        </Box>
    </Grid>
);

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
    workCenter: Yup.number().typeError("Work center is required").required("Work center is required"),
    status: Yup.string().required(),
    costPerHour: Yup.number().typeError("Cost per hour is required").min(0, "Cost must be ≥ 0").required("Cost per hour is required"),
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
    const [isDirty, setIsDirty] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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
                if (onSuccess) onSuccess(isEditMode ? "Machine updated successfully." : "Machine created successfully.");
                const nextId = response?.id || machineId;
                navigate(nextId ? `/production/machine-assets/${nextId}` : "/production/machine-assets");
            } catch (error) {
                if (onError) onError(resolveMachineErrorMessage(error, "Failed to save machine details."));
            } finally {
                setSubmitting(false);
            }
        },
    });

    // Track dirty state
    useEffect(() => {
        const initial = getInitialValues();
        const hasChanges = Object.keys(initial).some(key => String(formik.values[key] || '') !== String(initial[key] || ''));
        setIsDirty(hasChanges && !isEditMode);
    }, [formik.values]);

    useEffect(() => {
        if (!isEditMode) return;
        const loadMachine = async () => {
            try {
                setIsLoading(true);
                const machine = await getMachineDetailsById(machineId);
                formik.setValues({
                    machineCode: machine?.machineCode || "",
                    machineName: machine?.machineName || "",
                    status: machine?.status || "ACTIVE",
                    workCenter: machine?.workCenter?.id ?? "",
                    costPerHour: machine?.costPerHour ?? "",
                    description: machine?.description || "",
                });
                setWorkCenterInputValue(getWorkCenterDisplayValue(machine?.workCenter) || "");
                setSelectedWorkCenter(machine?.workCenter && typeof machine.workCenter === "object" ? machine.workCenter : null);
            } catch (error) {
                if (onError) onError(resolveMachineErrorMessage(error, "Failed to load machine details."));
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
                const response = await searchWorkCenters({ page: 0, size: 10, sortBy: "centerName", sortDir: "asc", search: workCenterInputValue.trim() });
                if (!isActive) return;
                setWorkCenterOptions(Array.isArray(response?.content) ? response.content : Array.isArray(response) ? response : []);
            } catch { if (isActive) setWorkCenterOptions([]); }
            finally { if (isActive) setWorkCenterLoading(false); }
        }, 300);
        return () => { isActive = false; clearTimeout(timeoutId); };
    }, [workCenterInputValue]);

    const handleBack = () => {
        if (isDirty) { setShowLeaveDialog(true); return; }
        navigate("/production/machine-assets");
    };

    if (isLoading) return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
            <CircularProgress size={32} sx={{ color: '#1565c0' }} />
            <Typography variant="body2" color="text.secondary">Loading machine...</Typography>
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>

                {/* Page Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center"
                    flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            {isEditMode ? 'Edit Machine' : 'New Machine'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {isEditMode ? 'Update machine details and configuration' : 'Add a new machine to your production floor'}
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Button onClick={handleBack} variant="outlined" size="small"
                            sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151', borderRadius: 1.5 }}>
                            Cancel
                        </Button>
                        <Button onClick={formik.handleSubmit} variant="contained" size="small"
                            disabled={formik.isSubmitting}
                            sx={{
                                textTransform: 'none', fontWeight: 600, borderRadius: 1.5, px: 3,
                                bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                            }}>
                            {formik.isSubmitting ? 'Saving...' : isEditMode ? 'Update Machine' : 'Create Machine'}
                        </Button>
                    </Box>
                </Box>

                <Box component="form" onSubmit={formik.handleSubmit}>
                    <Grid container spacing={2}>

                        <SectionHeading>Machine Identity</SectionHeading>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField name="machineCode" label="Machine Code *" fullWidth size="small" sx={fieldSx}
                                value={formik.values.machineCode} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.machineCode && Boolean(formik.errors.machineCode)}
                                helperText={formik.touched.machineCode && formik.errors.machineCode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField name="machineName" label="Machine Name *" fullWidth size="small" sx={fieldSx}
                                value={formik.values.machineName} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.machineName && Boolean(formik.errors.machineName)}
                                helperText={formik.touched.machineName && formik.errors.machineName} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField select name="status" label="Status" fullWidth size="small" sx={fieldSx}
                                value={formik.values.status} onChange={formik.handleChange}>
                                {MACHINE_STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                        </Grid>

                        <SectionHeading>Configuration</SectionHeading>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={workCenterOptions} loading={workCenterLoading}
                                value={selectedWorkCenter} inputValue={workCenterInputValue}
                                onInputChange={(_, v, reason) => {
                                    setWorkCenterInputValue(v);
                                    if (reason === "input" || reason === "clear") { setSelectedWorkCenter(null); formik.setFieldValue("workCenter", ""); }
                                }}
                                onChange={(_, option) => {
                                    setSelectedWorkCenter(option || null);
                                    formik.setFieldValue("workCenter", option?.id ?? "");
                                    formik.setFieldTouched("workCenter", true, false);
                                }}
                                isOptionEqualToValue={(option, value) => option?.id !== undefined && value?.id !== undefined && option.id === value.id}
                                getOptionLabel={(option) => getWorkCenterDisplayValue(option) || ""}
                                renderInput={(params) => (
                                    <TextField {...params} name="workCenter" label="Work Center *" size="small" fullWidth sx={fieldSx}
                                        onBlur={() => formik.setFieldTouched("workCenter", true, true)}
                                        error={formik.touched.workCenter && Boolean(formik.errors.workCenter)}
                                        helperText={formik.touched.workCenter && formik.errors.workCenter} />
                                )}
                                noOptionsText="No work centers found" fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField name="costPerHour" label="Cost Per Hour (₹) *" type="number" fullWidth size="small" sx={fieldSx}
                                inputProps={{ min: 0 }}
                                value={formik.values.costPerHour} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.costPerHour && Boolean(formik.errors.costPerHour)}
                                helperText={formik.touched.costPerHour && formik.errors.costPerHour} />
                        </Grid>

                        <SectionHeading>Description</SectionHeading>
                        <Grid item xs={12}>
                            <TextField name="description" label="Description" multiline minRows={3} fullWidth size="small" sx={fieldSx}
                                value={formik.values.description} onChange={formik.handleChange}
                                helperText="Optional notes about the machine, maintenance schedule, etc." />
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {/* Leave Confirmation Dialog */}
            <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Unsaved Changes</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        You have unsaved changes. Are you sure you want to leave?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShowLeaveDialog(false)} sx={{ textTransform: 'none', color: '#374151' }}>Stay</Button>
                    <Button variant="contained" color="error" onClick={() => navigate("/production/machine-assets")}
                        sx={{ textTransform: 'none' }}>Leave</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
