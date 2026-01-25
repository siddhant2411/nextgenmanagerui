import React, { useState } from 'react'
import { Chip, Divider, FormControlLabel, Typography, Box, Checkbox, FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";
import BomStatusChangeDialog from './BomStatusChangeDialog';
import apiService from '../../services/apiService';
const bomStatus = [
    { key: "DRAFT", value: "Draft" },
    { key: "PENDING_APPROVAL", value: "Under Review" },
    { key: "APPROVED", value: "Approved" },
    { key: "ACTIVE", value: "Active" },
    { key: "INACTIVE", value: "Inactive" },
    { key: "OBSOLETE", value: "Obsolete" },
    { key: "ARCHIVED", value: "Archived" }
]



export default function BomSidebar({ bomId,formik,setError,setLoading,showSnackbar,loading,error }) {

    const [dialogOpen, setDialogOpen] = useState(false);
    const [nextStatus, setNextStatus] = useState(null);
    const [statusChangePayload, setStatusChangePayload] = useState({
        bomId: bomId,
        nextStatus: "",
        ecoNumber: "",
        changeReason: "",
        approvalComments: ""
    });

    const currentStatus = formik.values.bomStatus;

    const handleChangeStatus = (e) => {
        setNextStatus(e.target.value);
        setDialogOpen(true);

    }


    const handleClose = () => {
        setDialogOpen(false);
        setNextStatus(null);
    };

    const handleConfirm = async (payload) => {
        const finalPayload = {
            bomId: bomId,
            nextStatus: payload.nextStatus,
            ecoNumber: payload.ecoNumber || "",
            changeReason: payload.changeReason || "",
            approvalComments: payload.approvalComments || ""
        };

        setStatusChangePayload(finalPayload);
        try {
            setLoading(true)
           const  res = await apiService.post("/bom/changeStatus/" + bomId, finalPayload);
           showSnackbar( "Status changed to : "+res.bomStatus)
           formik.setFieldValue("bomStatus",res.bomStatus)
           
        }
        catch (e){
            console.log(e)
             showSnackbar( "Falied to change Status: "+ e.response?.data,"error")
         
        }
        setLoading(false)
        setDialogOpen(false);
    };
    return (
        <Box
            sx={{
                p: 3,
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: 2,
                height: "100vh",
                minHeight: "500px",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Typography variant="h6" mb={2}>BOM Info</Typography>

            <Box mb={2}>
                <FormControl
                    fullWidth
                    size="small"
                    required
                    error={formik.touched.bomStatus && Boolean(formik.errors.bomStatus)}
                >
                    <InputLabel id="bom-status-label">Status</InputLabel>

                    <Select
                        labelId="bom-status-label"
                        name="bomStatus"
                        value={formik.values.bomStatus || ""}
                        label="Status"
                        onChange={(e) =>
                            handleChangeStatus(e)
                        }
                        onBlur={formik.handleBlur}
                        sx={{ width: "200px" }}
                    >
                        {bomStatus.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                                {option.value}
                            </MenuItem>
                        ))}
                    </Select>

                    {formik.touched.bomStatus && formik.errors.bomStatus && (
                        <FormHelperText>{formik.errors.bomStatus}</FormHelperText>
                    )}
                </FormControl>

            </Box>

            <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Revision</Typography>
                <Typography variant="subtitle1">{formik.values.revision}</Typography>
            </Box>



            <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Components</Typography>
                <Typography variant="subtitle1">{formik.values.components?.length}</Typography>
            </Box>

            <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Operations</Typography>
                <Typography variant="subtitle1">{formik.values.operations?.length}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="subtitle2">
                    {new Date(formik.values.creationDate).toLocaleDateString()}
                </Typography>
            </Box>

            <Box mb={2}>
                <Typography variant="body2" color="text.secondary">Updated</Typography>
                <Typography variant="subtitle2">
                    {new Date(formik.values.updatedDate).toLocaleDateString()}
                </Typography>
            </Box>

            {formik.values.ecoNumber && (
                <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">ECO Number</Typography>
                    <Typography variant="subtitle1">{formik.values.ecoNumber}</Typography>
                </Box>
            )}


            {formik.values.approvalDate && (
                <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Approved</Typography>
                    <Typography variant="subtitle2">
                        {new Date(formik.values.approvalDate).toLocaleDateString()}
                        <br /> by {formik.values.approvedBy}
                    </Typography>
                </Box>
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
    )
}
