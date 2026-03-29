import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, Typography, Chip, Box
} from "@mui/material";
import { useState } from "react";

const BORDER_COLOR = '#e5e7eb';

const statusLabels = {
    DRAFT: 'Draft', PENDING_APPROVAL: 'Under Review', APPROVED: 'Approved',
    ACTIVE: 'Active', INACTIVE: 'Inactive', OBSOLETE: 'Obsolete', ARCHIVED: 'Archived',
};

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13.5 },
    "& .MuiInputLabel-root": { fontSize: 13.5 },
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.5,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
    },
};

export default function BomStatusChangeDialog({
    open, onClose, onConfirm, currentStatus, nextStatus
}) {
    const [form, setForm] = useState({
        ecoNumber: "", changeReason: "", approvalComments: ""
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const isPending = nextStatus === "PENDING_APPROVAL";
    const isApproved = nextStatus === "APPROVED";

    const handleSubmit = () => {
        onConfirm({ nextStatus, ...form });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 600, color: '#0f2744', fontSize: '1.1rem', pb: 1 }}>
                Change BOM Status
            </DialogTitle>

            <DialogContent>
                <Box display="flex" alignItems="center" gap={1} mb={2.5} mt={0.5}>
                    <Chip label={statusLabels[currentStatus] || currentStatus} size="small" variant="outlined"
                        sx={{ fontSize: '0.75rem', borderColor: BORDER_COLOR }} />
                    <Typography variant="body2" color="text.secondary">→</Typography>
                    <Chip label={statusLabels[nextStatus] || nextStatus} size="small"
                        sx={{ fontSize: '0.75rem', bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                </Box>

                <Stack spacing={2}>
                    <TextField
                        label="ECO Number"
                        name="ecoNumber"
                        value={form.ecoNumber}
                        onChange={handleChange}
                        disabled={isApproved}
                        required={isPending || isApproved}
                        fullWidth size="small"
                        sx={fieldSx}
                    />
                    <TextField
                        label="Change Reason"
                        name="changeReason"
                        value={form.changeReason}
                        onChange={handleChange}
                        disabled={isApproved}
                        required={isPending || isApproved}
                        fullWidth size="small" multiline rows={2}
                        sx={fieldSx}
                    />
                    {isApproved && (
                        <TextField
                            label="Approval Comments"
                            name="approvalComments"
                            value={form.approvalComments}
                            onChange={handleChange}
                            required fullWidth size="small" multiline rows={2}
                            sx={fieldSx}
                        />
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained"
                    sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
}
