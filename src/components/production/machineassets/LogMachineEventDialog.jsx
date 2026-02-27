import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
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
import { createMachineEvent } from "../../../services/machineAssetsService";
import {
    MACHINE_EVENT_SOURCE_OPTIONS,
    MACHINE_EVENT_TYPE_OPTIONS,
} from "./constants";
import {
    resolveMachineErrorMessage,
    validateEventTimeRange,
} from "./machineAssetsHelpers";

const getInitialValues = () => ({
    eventType: "RUNNING",
    startTime: "",
    endTime: "",
    source: "MANUAL",
});

export default function LogMachineEventDialog({ open, machine, onClose, onSuccess, onError }) {
    const [values, setValues] = useState(getInitialValues);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const timeRangeError = useMemo(
        () => validateEventTimeRange(values.startTime, values.endTime),
        [values.endTime, values.startTime]
    );

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        setValues(getInitialValues());
        onClose();
    };

    const handleChange = (field) => (event) => {
        setValues((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const handleSubmit = async () => {
        if (!machine?.id) {
            onError("Machine id is missing.");
            return;
        }
        if (!values.eventType || !values.startTime || !values.source) {
            onError("Event type, start time and source are required.");
            return;
        }
        if (timeRangeError) {
            onError(timeRangeError);
            return;
        }

        try {
            setIsSubmitting(true);
            await createMachineEvent({
                machineId: machine.id,
                eventType: values.eventType,
                startTime: dayjs(values.startTime).toISOString(),
                endTime: values.endTime ? dayjs(values.endTime).toISOString() : null,
                source: values.source,
            });
            onSuccess("Machine event logged successfully.");
            handleClose();
        } catch (error) {
            onError(resolveMachineErrorMessage(error, "Failed to log machine event."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Log Machine Event</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        select
                        label="Event Type"
                        size="small"
                        value={values.eventType}
                        onChange={handleChange("eventType")}
                        fullWidth
                    >
                        {MACHINE_EVENT_TYPE_OPTIONS.map((eventType) => (
                            <MenuItem key={eventType} value={eventType}>
                                {eventType}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Start Time"
                        type="datetime-local"
                        size="small"
                        value={values.startTime}
                        onChange={handleChange("startTime")}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />

                    <TextField
                        label="End Time"
                        type="datetime-local"
                        size="small"
                        value={values.endTime}
                        onChange={handleChange("endTime")}
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(timeRangeError)}
                        helperText={timeRangeError || "Optional"}
                        fullWidth
                    />

                    <TextField
                        select
                        label="Source"
                        size="small"
                        value={values.source}
                        onChange={handleChange("source")}
                        fullWidth
                    >
                        {MACHINE_EVENT_SOURCE_OPTIONS.map((source) => (
                            <MenuItem key={source} value={source}>
                                {source}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Log Event"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
