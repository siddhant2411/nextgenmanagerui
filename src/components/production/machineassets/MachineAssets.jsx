import React, { useCallback, useState } from "react";
import { Alert, Box, Snackbar } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import RoleProtectedRoute from "../../../auth/RoleProtectedRoute";
import { PRODUCTION_MANAGE_ROLES } from "../../../auth/roles";
import MachineAssetDetails from "./MachineAssetDetails";
import MachineAssetForm from "./MachineAssetForm";
import MachineAssetList from "./MachineAssetList";

export default function MachineAssets() {
    const [snackbar, setSnackbar] = useState({
        open: false,
        severity: "success",
        message: "",
    });

    const showMessage = useCallback((message, severity = "success") => {
        if (!message) {
            return;
        }
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleClose = (_, reason) => {
        if (reason === "clickaway") {
            return;
        }
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Routes>
                <Route
                    path="/"
                    element={<MachineAssetList onSuccess={showMessage} onError={(msg) => showMessage(msg, "error")} />}
                />
                <Route
                    path="/add"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={PRODUCTION_MANAGE_ROLES}
                            deniedMessage="You are not authorized to create machine assets."
                        >
                            <MachineAssetForm
                                onSuccess={showMessage}
                                onError={(msg) => showMessage(msg, "error")}
                            />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/edit/:machineId"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={PRODUCTION_MANAGE_ROLES}
                            deniedMessage="You are not authorized to edit machine assets."
                        >
                            <MachineAssetForm
                                onSuccess={showMessage}
                                onError={(msg) => showMessage(msg, "error")}
                            />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/:machineId"
                    element={<MachineAssetDetails onSuccess={showMessage} onError={(msg) => showMessage(msg, "error")} />}
                />
            </Routes>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4500}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert onClose={handleClose} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
