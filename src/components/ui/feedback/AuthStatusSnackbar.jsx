import React, { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { AUTH_FORBIDDEN_EVENT } from "../../../auth/authEvents";

export default function AuthStatusSnackbar() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const handler = (event) => {
            const nextMessage = event?.detail?.message || "Not authorized to perform this action.";
            setMessage(nextMessage);
            setOpen(true);
        };

        window.addEventListener(AUTH_FORBIDDEN_EVENT, handler);
        return () => window.removeEventListener(AUTH_FORBIDDEN_EVENT, handler);
    }, []);

    return (
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
            <Alert
                onClose={() => setOpen(false)}
                severity="warning"
                variant="filled"
                sx={{ width: "100%" }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}

