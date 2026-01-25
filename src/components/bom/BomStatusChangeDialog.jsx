import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography
} from "@mui/material";
import { useState } from "react";

export default function BomStatusChangeDialog({
    open,
    onClose,
    onConfirm,
    currentStatus,
    nextStatus
}) {
    const [form, setForm] = useState({
        ecoNumber: "",
        changeReason: "",
        approvalComments: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const isPending = nextStatus === "PENDING_APPROVAL";
    const isApproved = nextStatus === "APPROVED";

    const handleSubmit = () => {
        onConfirm({
            nextStatus,
            ...form
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Change BOM Status
            </DialogTitle>

            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    {currentStatus} → <strong>{nextStatus}</strong>
                </Typography>

                <Stack spacing={2}>
                    <TextField
                        label="ECO Number"
                        name="ecoNumber"
                        value={form.ecoNumber}
                        onChange={handleChange}
                        disabled={isApproved}
                        required={isPending || isApproved}
                        fullWidth
                        size="small"
                    />

                    <TextField
                        label="Change Reason"
                        name="changeReason"
                        value={form.changeReason}
                        onChange={handleChange}
                        disabled={isApproved}
                        required={isPending || isApproved}
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                    />

                    {isApproved && (
                        <TextField
                            label="Approval Comments"
                            name="approvalComments"
                            value={form.approvalComments}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
}
