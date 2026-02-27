import React, { useMemo, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
} from "@mui/material";
import { changeMachineStatus } from "../../../services/machineAssetsService";
import { MACHINE_STATUS_OPTIONS } from "./constants";
import { resolveMachineErrorMessage } from "./machineAssetsHelpers";

export default function ChangeMachineStatusDialog({
    open,
    machine,
    onClose,
    onSuccess,
    onError,
}) {
    const [newStatus, setNewStatus] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const allowedStatuses = useMemo(() => {
        const currentStatus = machine?.status;
        return MACHINE_STATUS_OPTIONS.filter((status) => status !== currentStatus);
    }, [machine?.status]);

    const resetState = () => {
        setNewStatus("");
        setReason("");
        setIsSubmitting(false);
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        resetState();
        onClose();
    };

    const handleSubmit = async () => {
        if (!machine?.id) {
            onError("Machine id is missing.");
            return;
        }
        if (!newStatus) {
            onError("Select a new status.");
            return;
        }
        if (!reason.trim()) {
            onError("Reason is required to change status.");
            return;
        }

        try {
            setIsSubmitting(true);
            await changeMachineStatus(machine.id, {
                newStatus,
                reason: reason.trim(),
            });
            onSuccess("Machine status updated successfully.");
            handleClose();
        } catch (error) {
            onError(resolveMachineErrorMessage(error, "Failed to change machine status."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Change Machine Status</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        select
                        label="New Status"
                        value={newStatus}
                        onChange={(event) => setNewStatus(event.target.value)}
                        fullWidth
                        size="small"
                    >
                        {allowedStatuses.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        fullWidth
                        required
                        size="small"
                        multiline
                        minRows={3}
                        placeholder="Why is this status change needed?"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Update Status"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
