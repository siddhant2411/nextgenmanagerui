import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";

const formatDuration = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    return [hours, minutes, remainingSeconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
};

const Home = () => {
    const { user, roles, expiresAt } = useAuth();
    const [secondsLeft, setSecondsLeft] = useState(null);

    useEffect(() => {
        if (!expiresAt) {
            setSecondsLeft(null);
            return undefined;
        }

        const updateCountdown = () => {
            const seconds = Math.floor((expiresAt - Date.now()) / 1000);
            setSecondsLeft(Math.max(0, seconds));
        };

        updateCountdown();
        const timerId = setInterval(updateCountdown, 1000);
        return () => clearInterval(timerId);
    }, [expiresAt]);

    const countdown = useMemo(() => {
        if (secondsLeft === null) {
            return "Unknown";
        }
        if (secondsLeft <= 0) {
            return "Expired";
        }
        return formatDuration(secondsLeft);
    }, [secondsLeft]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                Welcome back
            </Typography>

            <Card sx={{ maxWidth: 680, borderRadius: 3, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        Who am I
                    </Typography>

                    <Stack spacing={1}>
                        <Typography variant="body1">
                            <strong>Username:</strong> {user?.username || "-"}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography variant="body1">
                                <strong>Roles:</strong>
                            </Typography>
                            {(roles || []).length > 0 ? (
                                roles.map((role) => <Chip key={role} size="small" label={role} />)
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No roles assigned
                                </Typography>
                            )}
                        </Box>

                        <Typography variant="body1">
                            <strong>Token expiry:</strong> {countdown}
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Home;

