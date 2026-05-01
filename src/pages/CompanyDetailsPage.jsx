import React, { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { apiClient, resolveApiErrorMessage } from "../services/apiService";
import { useAuth } from "../auth/AuthContext";
import { ADMIN_ROLES } from "../auth/roles";

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const EMPTY_FORM = {
    companyName: "",
    legalName: "",
    tradeName: "",
    gstNumber: "",
    panNumber: "",
    cinNumber: "",
    phone: "",
    email: "",
    website: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
    currency: "INR",
    financialYearStartMonth: 4,
    notes: "",
};

const validate = (form) => {
    const errors = {};
    if (!form.companyName?.trim()) errors.companyName = "Company name is required.";
    if (form.gstNumber && form.gstNumber.length > 15) errors.gstNumber = "GSTIN must be at most 15 characters.";
    if (form.panNumber && form.panNumber.length > 10) errors.panNumber = "PAN must be at most 10 characters.";
    if (form.cinNumber && form.cinNumber.length > 21) errors.cinNumber = "CIN must be at most 21 characters.";
    return errors;
};

export default function CompanyDetailsPage() {
    const { hasAnyRole, user } = useAuth();
    const canEdit = hasAnyRole(ADMIN_ROLES);

    const [form, setForm] = useState(EMPTY_FORM);
    const [originalForm, setOriginalForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await apiClient.get("/company");
                const data = res.data;
                const filled = {
                    companyName: data.companyName || "",
                    legalName: data.legalName || "",
                    tradeName: data.tradeName || "",
                    gstNumber: data.gstNumber || "",
                    panNumber: data.panNumber || "",
                    cinNumber: data.cinNumber || "",
                    phone: data.phone || "",
                    email: data.email || "",
                    website: data.website || "",
                    street1: data.street1 || "",
                    street2: data.street2 || "",
                    city: data.city || "",
                    state: data.state || "",
                    pinCode: data.pinCode || "",
                    country: data.country || "India",
                    currency: data.currency || "INR",
                    financialYearStartMonth: data.financialYearStartMonth || 4,
                    notes: data.notes || "",
                };
                setForm(filled);
                setOriginalForm(filled);
            } catch {
                // first run — no data yet
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, []);

    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError("");
        setSuccessMessage("");

        const errors = validate(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);
        try {
            const res = await apiClient.put("/company", {
                ...form,
                financialYearStartMonth: Number(form.financialYearStartMonth),
            });
            const data = res.data;
            const filled = {
                companyName: data.companyName || "",
                legalName: data.legalName || "",
                tradeName: data.tradeName || "",
                gstNumber: data.gstNumber || "",
                panNumber: data.panNumber || "",
                cinNumber: data.cinNumber || "",
                phone: data.phone || "",
                email: data.email || "",
                website: data.website || "",
                street1: data.street1 || "",
                street2: data.street2 || "",
                city: data.city || "",
                state: data.state || "",
                pinCode: data.pinCode || "",
                country: data.country || "India",
                currency: data.currency || "INR",
                financialYearStartMonth: data.financialYearStartMonth || 4,
                notes: data.notes || "",
            };
            setForm(filled);
            setOriginalForm(filled);
            setSuccessMessage("Company details saved successfully.");
        } catch (err) {
            setSubmitError(resolveApiErrorMessage(err, "Failed to save company details."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setForm(originalForm);
        setFormErrors({});
        setSubmitError("");
        setSuccessMessage("");
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: "100%", maxWidth: 860 }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        p: { xs: 2, md: 4 },
                        background: "#fff",
                    }}
                >
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Company Details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    This information is used in generated documents such as invoices, challans, and reports.
                    {!canEdit && " Contact an admin to make changes."}
                </Typography>

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {submitError}
                    </Alert>
                )}
                {successMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {successMessage}
                    </Alert>
                )}
                    <Box component="form" onSubmit={handleSubmit}>
                        {/* Basic Information */}
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            Basic Information
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Company Name"
                                    value={form.companyName}
                                    onChange={handleChange("companyName")}
                                    error={Boolean(formErrors.companyName)}
                                    helperText={formErrors.companyName}
                                    fullWidth
                                    size="small"
                                    required
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Legal / Registered Name"
                                    value={form.legalName}
                                    onChange={handleChange("legalName")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Trade Name"
                                    value={form.tradeName}
                                    onChange={handleChange("tradeName")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    label="Phone"
                                    value={form.phone}
                                    onChange={handleChange("phone")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    label="Email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange("email")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Website"
                                    value={form.website}
                                    onChange={handleChange("website")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                        </Grid>

                        {/* Tax & Registration */}
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            Tax &amp; Registration
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="GSTIN"
                                    value={form.gstNumber}
                                    onChange={handleChange("gstNumber")}
                                    error={Boolean(formErrors.gstNumber)}
                                    helperText={formErrors.gstNumber || "15-character GSTIN"}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 15, style: { textTransform: "uppercase" } }}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="PAN"
                                    value={form.panNumber}
                                    onChange={handleChange("panNumber")}
                                    error={Boolean(formErrors.panNumber)}
                                    helperText={formErrors.panNumber || "10-character PAN"}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 10, style: { textTransform: "uppercase" } }}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="CIN"
                                    value={form.cinNumber}
                                    onChange={handleChange("cinNumber")}
                                    error={Boolean(formErrors.cinNumber)}
                                    helperText={formErrors.cinNumber || "21-character CIN"}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 21, style: { textTransform: "uppercase" } }}
                                    disabled={!canEdit}
                                />
                            </Grid>
                        </Grid>

                        {/* Address */}
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            Address
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Street Line 1"
                                    value={form.street1}
                                    onChange={handleChange("street1")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Street Line 2"
                                    value={form.street2}
                                    onChange={handleChange("street2")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="City"
                                    value={form.city}
                                    onChange={handleChange("city")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="State"
                                    value={form.state}
                                    onChange={handleChange("state")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <TextField
                                    label="PIN Code"
                                    value={form.pinCode}
                                    onChange={handleChange("pinCode")}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 10 }}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <TextField
                                    label="Country"
                                    value={form.country}
                                    onChange={handleChange("country")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                />
                            </Grid>
                        </Grid>

                        {/* Financial Settings */}
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            Financial Settings
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    label="Currency"
                                    value={form.currency}
                                    onChange={handleChange("currency")}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 3 }}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    label="Financial Year Starts"
                                    value={form.financialYearStartMonth}
                                    onChange={handleChange("financialYearStartMonth")}
                                    fullWidth
                                    size="small"
                                    disabled={!canEdit}
                                >
                                    {MONTHS.map((m) => (
                                        <MenuItem key={m.value} value={m.value}>
                                            {m.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Notes / Tagline"
                                    value={form.notes}
                                    onChange={handleChange("notes")}
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    disabled={!canEdit}
                                />
                            </Grid>
                        </Grid>

                        {canEdit && (
                            <Box sx={{ display: "flex", gap: 1.5 }}>
                                <Button type="submit" variant="contained" disabled={submitting}>
                                    {submitting ? "Saving..." : "Save Changes"}
                                </Button>
                                <Button type="button" variant="outlined" disabled={submitting} onClick={handleReset}>
                                    Discard Changes
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
