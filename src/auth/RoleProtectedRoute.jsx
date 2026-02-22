import React, { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasAnyRole } from "./roles";
import { emitForbiddenEvent } from "./authEvents";

export default function RoleProtectedRoute({
    allowedRoles = [],
    children,
    redirectTo = "/dashboard",
    deniedMessage = "Not authorized to access this area.",
}) {
    const location = useLocation();
    const { isAuthenticated, isBootstrapping, roles } = useAuth();
    const isForbidden = isAuthenticated && !isBootstrapping && !hasAnyRole(roles, allowedRoles);

    useEffect(() => {
        if (isForbidden) {
            emitForbiddenEvent(deniedMessage);
        }
    }, [isForbidden, deniedMessage]);

    if (isBootstrapping) {
        return (
            <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (isForbidden) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}
