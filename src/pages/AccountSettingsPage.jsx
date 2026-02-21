import React, { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { updateMyPassword } from "../services/authService";
import { resolveApiErrorMessage } from "../services/apiService";

const EMPTY_FORM = {
    currentPassword: "",
    newPassword: "",
};

const validateForm = (form) => {
    const errors = {};
    if (!form.currentPassword) {
        errors.currentPassword = "Current password is required.";
    }
    if (!form.newPassword) {
        errors.newPassword = "New password is required.";
    }
    return errors;
};

const mapPasswordError = (error) => {
    const status = error?.response?.status;
    if (status === 401) {
        return resolveApiErrorMessage(error, "Session expired. Please sign in again.");
    }
    if (status === 403) {
        return resolveApiErrorMessage(error, "You are not allowed to change the password.");
    }
    return resolveApiErrorMessage(error, "Unable to update password. Please try again.");
};

export default function AccountSettingsPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError("");
        setSuccessMessage("");

        const errors = validateForm(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setSubmitting(true);
        try {
            await updateMyPassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setSuccessMessage("Password updated successfully.");
            setForm(EMPTY_FORM);
        } catch (error) {
            setSubmitError(mapPasswordError(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                Account Settings
            </Typography>

            <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        Change Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter your current password and choose a new one.
                    </Typography>

                    {submitError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {submitError}
                        </Alert>
                    ) : null}
                    {successMessage ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMessage}
                        </Alert>
                    ) : null}

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2.2}>
                            <TextField
                                label="Current Password"
                                type="password"
                                value={form.currentPassword}
                                onChange={handleChange("currentPassword")}
                                error={Boolean(formErrors.currentPassword)}
                                helperText={formErrors.currentPassword}
                                size="small"
                                autoComplete="current-password"
                                required
                            />

                            <TextField
                                label="New Password"
                                type="password"
                                value={form.newPassword}
                                onChange={handleChange("newPassword")}
                                error={Boolean(formErrors.newPassword)}
                                helperText={formErrors.newPassword}
                                size="small"
                                autoComplete="new-password"
                                required
                            />

                            <Box sx={{ display: "flex", gap: 1.5, pt: 0.5 }}>
                                <Button type="submit" variant="contained" disabled={submitting}>
                                    {submitting ? "Updating..." : "Update Password"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    disabled={submitting}
                                    onClick={() => {
                                        setForm(EMPTY_FORM);
                                        setFormErrors({});
                                        setSubmitError("");
                                        setSuccessMessage("");
                                    }}
                                >
                                    Reset
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
