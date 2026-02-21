import React, { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { resolveApiErrorMessage } from "../services/apiService";
import "./LoginPage.css";

const resolveErrorMessage = (error) => {
    if (error?.response?.status === 401) {
        return resolveApiErrorMessage(error, "Invalid username or password.");
    }
    return resolveApiErrorMessage(error, "Unable to sign in right now. Please try again.");
};

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoggingIn } = useAuth();
    const sessionExpiredMessageFromState = location.state?.sessionExpired
        ? location.state?.message || "Session expired. Please sign in again."
        : "";
    const params = new URLSearchParams(location.search || "");
    const sessionExpiredMessageFromQuery = params.get("sessionExpired")
        ? params.get("message") || "Session expired. Please sign in again."
        : "";
    const sessionExpiredMessage = sessionExpiredMessageFromState || sessionExpiredMessageFromQuery;
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const redirectPath = useMemo(
        () => location.state?.from?.pathname || "/",
        [location.state]
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Username and password are required.");
            return;
        }

        try {
            await login({
                username: username.trim(),
                password,
            });
            navigate(redirectPath, { replace: true });
        } catch (loginError) {
            setError(resolveErrorMessage(loginError));
        }
    };

    return (
        <div className="plm-login-page">
            <div className="plm-login-background" />
            <Paper elevation={0} className="plm-login-card">
                <Stack spacing={3}>
                    <Box className="plm-brand-chip">
                        <PrecisionManufacturingOutlinedIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            PLM Access
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            NextGenManager
                        </Typography>
                        <Typography variant="body2" className="plm-login-subtitle">
                            Sign in to manage bill of materials, routing, and production lifecycle operations.
                        </Typography>
                    </Box>

                    {error ? <Alert severity="error">{error}</Alert> : null}
                    {sessionExpiredMessage ? (
                        <Alert severity="warning">{sessionExpiredMessage}</Alert>
                    ) : null}

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                label="Username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                autoComplete="username"
                                fullWidth
                                size="small"
                                autoFocus
                            />

                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                fullWidth
                                size="small"
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={isLoggingIn}
                                startIcon={isLoggingIn ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
                                sx={{ mt: 1, height: 44 }}
                            >
                                {isLoggingIn ? "Signing in..." : "Sign In"}
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>
        </div>
    );
}
