import React, { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { resolveApiErrorMessage } from "../services/apiService";
import { recoveryResetPassword, recoveryRequestOtp, getRecoveryInfo } from "../services/authService";
import "./LoginPage.css";

const resolveErrorMessage = (error) => {
    if (error?.response?.status === 401) {
        return resolveApiErrorMessage(error, "Invalid username / email or password.");
    }
    return resolveApiErrorMessage(error, "Unable to sign in right now. Please try again.");
};

const resolveRecoveryErrorMessage = (error) => {
    if (error?.response?.status === 401) return "Invalid recovery secret.";
    if (error?.response?.status === 404) return "User not found.";
    if (error?.response?.status === 503) return "Recovery is not configured on this server. Contact your system administrator.";
    return resolveApiErrorMessage(error, "Password reset failed. Please try again.");
};

function ForgotPasswordDialog({ open, onClose }) {
    const [step, setStep] = useState(1); // OTP mode only: 1 = enter login, 2 = enter OTP + new password
    const [login, setLogin] = useState("");
    const [username, setUsername] = useState("");
    const [passcode, setPasscode] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [recoveryInfo, setRecoveryInfo] = useState({ hint: "", mode: "passcode" });

    React.useEffect(() => {
        if (open) {
            getRecoveryInfo()
                .then((info) => setRecoveryInfo(info))
                .catch(() => {});
        }
    }, [open]);

    const isPasscodeMode = recoveryInfo.mode !== "otp";

    const handleClose = () => {
        setStep(1);
        setLogin("");
        setUsername("");
        setPasscode("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setError("");
        setSuccess(false);
        onClose();
    };

    const validatePasswordFields = () => {
        if (!newPassword || !confirmPassword) return "All fields are required.";
        if (newPassword !== confirmPassword) return "Passwords do not match.";
        if (newPassword.length < 6) return "New password must be at least 6 characters.";
        return null;
    };

    // Passcode mode: single-step, calls /auth/recovery/reset with {recoverySecret, username, newPassword}
    const handlePasscodeReset = async (e) => {
        e.preventDefault();
        setError("");
        if (!username.trim() || !passcode.trim()) {
            setError("All fields are required.");
            return;
        }
        const pwError = validatePasswordFields();
        if (pwError) { setError(pwError); return; }
        setLoading(true);
        try {
            await recoveryResetPassword({ recoverySecret: passcode.trim(), username: username.trim(), newPassword });
            setSuccess(true);
        } catch (err) {
            setError(resolveRecoveryErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // OTP mode step 1: request OTP
    const handleSendCode = async (e) => {
        e.preventDefault();
        setError("");
        if (!login.trim()) {
            setError("Login is required.");
            return;
        }
        setLoading(true);
        try {
            await recoveryRequestOtp({ login: login.trim() });
            setStep(2);
        } catch (err) {
            setError(resolveRecoveryErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // OTP mode step 2: submit OTP + new password
    const handleOtpReset = async (e) => {
        e.preventDefault();
        setError("");
        if (!otp.trim()) { setError("All fields are required."); return; }
        const pwError = validatePasswordFields();
        if (pwError) { setError(pwError); return; }
        setLoading(true);
        try {
            await recoveryResetPassword({ login: login.trim(), otp: otp.trim(), newPassword });
            setSuccess(true);
        } catch (err) {
            setError(resolveRecoveryErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const passwordFields = (
        <>
            <TextField
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                size="small"
                autoComplete="new-password"
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                size="small"
                autoComplete="new-password"
            />
        </>
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogContent>
                {success ? (
                    <Alert severity="success" sx={{ mt: 1 }}>
                        Password reset successfully. You can now sign in with your new password.
                    </Alert>
                ) : isPasscodeMode ? (
                    <Stack spacing={2} sx={{ mt: 1 }} component="form" onSubmit={handlePasscodeReset}>
                        {recoveryInfo.hint ? (
                            <Typography variant="body2" color="text.secondary">
                                {recoveryInfo.hint}
                            </Typography>
                        ) : null}
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <TextField
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                            size="small"
                            autoFocus
                            autoComplete="username"
                        />
                        <TextField
                            label={recoveryInfo.label || "Passcode"}
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            fullWidth
                            size="small"
                            type="password"
                            autoComplete="off"
                        />
                        {passwordFields}
                    </Stack>
                ) : step === 1 ? (
                    <Stack spacing={2} sx={{ mt: 1 }} component="form" onSubmit={handleSendCode}>
                        {recoveryInfo.hint ? (
                            <Typography variant="body2" color="text.secondary">
                                {recoveryInfo.hint}
                            </Typography>
                        ) : null}
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <TextField
                            label="Login"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            fullWidth
                            size="small"
                            autoFocus
                            autoComplete="username"
                            helperText="Email (super admin) or tenantCode_username"
                        />
                    </Stack>
                ) : (
                    <Stack spacing={2} sx={{ mt: 1 }} component="form" onSubmit={handleOtpReset}>
                        <Typography variant="body2" color="text.secondary">
                            A 6-digit verification code was sent to your registered email. It expires in 15 minutes.
                        </Typography>
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <TextField
                            label="Verification Code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            fullWidth
                            size="small"
                            autoFocus
                            inputProps={{ maxLength: 6, inputMode: "numeric" }}
                        />
                        {passwordFields}
                        <Typography variant="caption" color="text.secondary">
                            Didn't receive a code?{" "}
                            <span
                                style={{ cursor: "pointer", textDecoration: "underline" }}
                                onClick={() => { setStep(1); setError(""); setOtp(""); }}
                            >
                                Go back and try again
                            </span>
                        </Typography>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} disabled={loading}>
                    {success ? "Close" : "Cancel"}
                </Button>
                {!success && isPasscodeMode && (
                    <Button
                        variant="contained"
                        onClick={handlePasscodeReset}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                )}
                {!success && !isPasscodeMode && step === 1 && (
                    <Button
                        variant="contained"
                        onClick={handleSendCode}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                        {loading ? "Sending..." : "Send Code"}
                    </Button>
                )}
                {!success && !isPasscodeMode && step === 2 && (
                    <Button
                        variant="contained"
                        onClick={handleOtpReset}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

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
    const [forgotOpen, setForgotOpen] = useState(false);

    const redirectPath = useMemo(
        () => location.state?.from?.pathname || "/apps",
        [location.state]
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Username / email and password are required.");
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
                            NextGenManager
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

                    {error ? <Alert severity="error" data-testid="login-error">{error}</Alert> : null}
                    {sessionExpiredMessage ? (
                        <Alert severity="warning">{sessionExpiredMessage}</Alert>
                    ) : null}

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                label="Username / Email"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                autoComplete="username"
                                fullWidth
                                size="small"
                                autoFocus
                                inputProps={{ "data-testid": "username" }}
                            />

                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                fullWidth
                                size="small"
                                inputProps={{ "data-testid": "password" }}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={isLoggingIn}
                                startIcon={isLoggingIn ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
                                sx={{ mt: 1, height: 44 }}
                                data-testid="login-btn"
                            >
                                {isLoggingIn ? "Signing in..." : "Sign In"}
                            </Button>

                            <Button
                                variant="text"
                                size="small"
                                onClick={() => setForgotOpen(true)}
                                sx={{ alignSelf: "center", textTransform: "none" }}
                            >
                                Forgot password?
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>

            <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
        </div>
    );
}
