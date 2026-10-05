import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import { getAgreement, acceptAgreement } from "../services/authService";
import { resolveApiErrorMessage } from "../services/apiService";
import "./LoginPage.css";

// Shown in place of the application until the signed-in user accepts the current user agreement.
// The text comes from the server (a file the deployment controls), so this page renders whatever
// version is current and sends that version back: if the agreement changes while the page is open,
// the server refuses the stale acceptance and the page reloads the new text.
export default function UserAgreementPage({ onAccepted, onDecline }) {
    const [agreement, setAgreement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [readToEnd, setReadToEnd] = useState(false);
    const [checked, setChecked] = useState(false);
    const scrollRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        setReadToEnd(false);
        setChecked(false);
        try {
            const data = await getAgreement();
            if (data?.accepted) {
                // Already accepted (the earlier status check just failed to say so) — nothing to ask.
                onAccepted();
                return;
            }
            setAgreement(data);
        } catch (error) {
            setLoadError(resolveApiErrorMessage(error, "The user agreement could not be loaded."));
        } finally {
            setLoading(false);
        }
    }, [onAccepted]);

    useEffect(() => {
        load();
    }, [load]);

    const checkScrolledToEnd = useCallback(() => {
        const el = scrollRef.current;
        if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
            setReadToEnd(true);
        }
    }, []);

    // Short agreements that fit without scrolling count as read.
    useEffect(() => {
        if (agreement) {
            checkScrolledToEnd();
        }
    }, [agreement, checkScrolledToEnd]);

    const handleAccept = async () => {
        setSubmitting(true);
        setSubmitError("");
        try {
            await acceptAgreement(agreement.version);
            onAccepted();
        } catch (error) {
            if (error?.response?.status === 409) {
                await load();
                setSubmitError("The agreement was updated while you were reading it. Please review the new version.");
            } else {
                setSubmitError(resolveApiErrorMessage(error, "Your acceptance could not be saved. Please try again."));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="plm-login-page">
            <div className="plm-login-background" />
            <Paper
                elevation={0}
                className="plm-login-card"
                sx={{ width: "min(780px, calc(100vw - 32px)) !important" }}
                data-testid="agreement-page"
            >
                <Stack spacing={2.5}>
                    <Box className="plm-brand-chip">
                        <PrecisionManufacturingOutlinedIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            NextGenManager
                        </Typography>
                    </Box>

                    {loading ? (
                        <Box sx={{ py: 6, display: "grid", placeItems: "center" }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : loadError ? (
                        <Stack spacing={2}>
                            <Alert severity="error">{loadError}</Alert>
                            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                                <Button variant="text" onClick={onDecline}>Sign out</Button>
                                <Button variant="contained" onClick={load}>Try again</Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    {agreement.title}
                                </Typography>
                                <Typography variant="body2" className="plm-login-subtitle">
                                    Version {agreement.version}. Please read and accept this agreement before
                                    using the application.
                                </Typography>
                            </Box>

                            {submitError ? <Alert severity="warning">{submitError}</Alert> : null}

                            <Box
                                ref={scrollRef}
                                onScroll={checkScrolledToEnd}
                                data-testid="agreement-content"
                                sx={{
                                    maxHeight: "52vh",
                                    overflowY: "auto",
                                    border: "1px solid rgba(12, 48, 84, 0.15)",
                                    borderRadius: 2,
                                    px: 2.5,
                                    py: 1.5,
                                    bgcolor: "#fff",
                                    color: "#1f2f40",
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    "& h3": { fontSize: 15, fontWeight: 700, mt: 2.5, mb: 0.75 },
                                    "& p": { my: 1 },
                                    "& ul": { pl: 3, my: 1 },
                                    "& li": { mb: 0.5 },
                                }}
                                // The text is served by our own backend from a file the deployment controls.
                                dangerouslySetInnerHTML={{ __html: agreement.content }}
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={checked}
                                        disabled={!readToEnd}
                                        onChange={(event) => setChecked(event.target.checked)}
                                        inputProps={{ "data-testid": "agreement-checkbox" }}
                                    />
                                }
                                label={
                                    readToEnd
                                        ? "I have read and agree to the User Agreement"
                                        : "Scroll to the end of the agreement to continue"
                                }
                            />

                            <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5} justifyContent="flex-end">
                                <Button variant="outlined" color="inherit" onClick={onDecline} disabled={submitting}>
                                    Decline and sign out
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleAccept}
                                    disabled={!checked || submitting}
                                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                                    data-testid="agreement-accept-btn"
                                >
                                    I Agree
                                </Button>
                            </Stack>
                        </>
                    )}
                </Stack>
            </Paper>
        </div>
    );
}
