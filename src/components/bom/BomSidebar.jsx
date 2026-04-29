import React, { useState } from 'react'
import { Chip, Divider, Typography, Box, FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";
import BomStatusChangeDialog from './BomStatusChangeDialog';
import apiService from '../../services/apiService';
import { resolveApiErrorMessage } from '../../services/apiService';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const BORDER_COLOR = '#e5e7eb';

const bomStatus = [
    { key: "DRAFT", value: "Draft", color: "#e3f2fd", textColor: "#1565c0" },
    { key: "PENDING_APPROVAL", value: "Under Review", color: "#fff3e0", textColor: "#e65100" },
    { key: "APPROVED", value: "Approved", color: "#e8f5e9", textColor: "#2e7d32" },
    { key: "ACTIVE", value: "Active", color: "#e8f5e9", textColor: "#2e7d32" },
    { key: "INACTIVE", value: "Inactive", color: "#fafafa", textColor: "#757575" },
    { key: "OBSOLETE", value: "Obsolete", color: "#ffebee", textColor: "#c62828" },
    { key: "ARCHIVED", value: "Archived", color: "#fafafa", textColor: "#9e9e9e" }
];

const InfoRow = ({ label, children }) => (
    <Box mb={2}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 500 }}>
            {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Box>
);

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function BomSidebar({ bomId, formik, operations = [], setError, setLoading, showSnackbar, loading, error }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { canAction } = useAuth();
    const canChangeBomStatus = canAction(ACTION_KEYS.BOM_STATUS_VERSION_WRITE);
    const [nextStatus, setNextStatus] = useState(null);

    const currentStatus = formik.values.bomStatus;
    const statusInfo = bomStatus.find(s => s.key === currentStatus);

    const handleChangeStatus = (e) => {
        if (!canChangeBomStatus) {
            showSnackbar("You are not authorized to change BOM status.", "error");
            return;
        }
        setNextStatus(e.target.value);
        setDialogOpen(true);
    };

    const handleClose = () => { setDialogOpen(false); setNextStatus(null); };

    const handleConfirm = async (payload) => {
        if (!canChangeBomStatus) {
            showSnackbar("You are not authorized to change BOM status.", "error");
            return;
        }
        const finalPayload = {
            bomId, nextStatus: payload.nextStatus, ecoNumber: payload.ecoNumber || "",
            changeReason: payload.changeReason || "", approvalComments: payload.approvalComments || ""
        };
        try {
            setLoading(true);
            const res = await apiService.post("/bom/changeStatus/" + bomId, finalPayload);
            showSnackbar("Status changed to: " + res.bomStatus);
            formik.setFieldValue("bomStatus", res.bomStatus);
            formik.setFieldValue("revision", res.revision);
            formik.setFieldValue("ecoNumber", res.ecoNumber);
            formik.setFieldValue("changeReason", res.changeReason);
            formik.setFieldValue("approvedBy", res.approvedBy);
            formik.setFieldValue("approvalDate", res.approvalDate);
            formik.setFieldValue("approvalComments", res.approvalComments);
            formik.setFieldValue("effectiveFrom", res.effectiveFrom);
            formik.setFieldValue("effectiveTo", res.effectiveTo);
            formik.setFieldValue("updatedDate", res.updatedDate);
        } catch (e) {
            showSnackbar(resolveApiErrorMessage(e, "Failed to change BOM status."), "error");
        }
        setLoading(false);
        setDialogOpen(false);
    };

    return (
        <Box
            sx={{
                p: 2.5,
                backgroundColor: "#fff",
                borderRadius: 2,
                border: `1px solid ${BORDER_COLOR}`,
                position: { md: 'sticky' },
                top: { md: 80 },
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 2 }}>
                BOM Details
            </Typography>

            {/* Status */}
            <InfoRow label="Status">
                <FormControl fullWidth size="small"
                    error={formik.touched.bomStatus && Boolean(formik.errors.bomStatus)}>
                    <Select
                        name="bomStatus"
                        value={formik.values.bomStatus || ""}
                        onChange={handleChangeStatus}
                        onBlur={formik.handleBlur}
                        disabled={!canChangeBomStatus || loading}
                        sx={{
                            borderRadius: 1.5,
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            bgcolor: statusInfo?.color || '#fafafa',
                            color: statusInfo?.textColor || '#374151',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_COLOR },
                        }}
                    >
                        {bomStatus.map((option) => (
                            <MenuItem key={option.key} value={option.key} sx={{ fontSize: '0.8125rem' }}>
                                {option.value}
                            </MenuItem>
                        ))}
                    </Select>
                    {formik.touched.bomStatus && formik.errors.bomStatus && (
                        <FormHelperText>{formik.errors.bomStatus}</FormHelperText>
                    )}
                </FormControl>
            </InfoRow>

            {/* Stats */}
            <InfoRow label="Revision">
                <Typography variant="body2" fontWeight={500}>{formik.values.revision || '-'}</Typography>
            </InfoRow>

            <Box display="flex" gap={2} mb={2}>
                <Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#f8f9fa', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={700} color="#1565c0">{formik.values.components?.length || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Components</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#f8f9fa', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={700} color="#1565c0">{operations?.length || formik.values.operations?.length || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Operations</Typography>
                </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Dates */}
            <InfoRow label="Created">
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{formatDate(formik.values.creationDate)}</Typography>
            </InfoRow>

            <InfoRow label="Last Updated">
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{formatDate(formik.values.updatedDate)}</Typography>
            </InfoRow>

            {formik.values.ecoNumber && (
                <InfoRow label="ECO Number">
                    <Chip size="small" label={formik.values.ecoNumber} variant="outlined" sx={{ fontSize: '0.75rem', borderColor: BORDER_COLOR }} />
                </InfoRow>
            )}

            {formik.values.approvalDate && (
                <>
                    <Divider sx={{ my: 1.5 }} />
                    <InfoRow label="Approved">
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{formatDate(formik.values.approvalDate)}</Typography>
                        <Typography variant="caption" color="text.secondary">by {formik.values.approvedBy}</Typography>
                    </InfoRow>
                </>
            )}

            {nextStatus && (
                <BomStatusChangeDialog
                    open={dialogOpen}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                    currentStatus={currentStatus}
                    nextStatus={nextStatus}
                />
            )}
        </Box>
    );
}
