import React from "react";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthContext";

export default function PublicOnlyRoute({ children }) {
    const { isAuthenticated, isBootstrapping } = useAuth();

    if (isBootstrapping) {
        return (
            <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

