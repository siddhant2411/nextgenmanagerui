// Enhanced AddBom component using MUI, Tabs, and Formik
import React, { useCallback, useEffect, useRef, useState, version } from "react";
import {
    Box, Button, FormControl, InputLabel, Select, MenuItem,
    TextField, Typography, Tabs, Tab, Grid, Checkbox, FormControlLabel, List, ListItem, ListItemText,
    Autocomplete,
    Snackbar,
    Alert,
    Divider,
    Dialog, DialogActions, DialogContent, DialogTitle
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import apiService from "../../services/apiService";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowDownward, ArrowUpward, DeleteOutline, Expand, ExpandMore, FileDownload, PictureAsPdf } from "@mui/icons-material";
import { utils as XLSXUtils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WorkOrderTemplate from "./WorkOrderTemplate";
import dayjs from "dayjs";
import BomRouting from "./BomRouting";
import BomPositionTable from "./BomPositionTable";
import BomSidebar from "./BomSidebar";
import { deleteBomAttachment, downloadBomAttachment, downloadBomExcel, duplicateBom, uploadBomAttachment } from "../../services/bomService";
import DuplicateBomDilogue from "./DuplicateBomDilogue";

const AddBom = () => {
    const [items, setItems] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parentItems, setParentItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchedItemList, setSearchedItemList] = useState([]);
    const debounceTimeout = useRef(null);
    const navigate = useNavigate();
    const { bomId } = useParams();
    const location = useLocation();
    const [bomAttachments, setBomAttachments] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [bomDetails, setBomDetails] = useState(null);
    const [operations, setOperations] = useState([]);
    const [workCenters, setWorkCenters] = useState([]);
    const [selectedItem, setSelectedItem] = useState();
    const [selectedItemSearch, setSelectedItemSearch] = useState("");
    const [uploading, setUploading] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [duplicating, setDuplicating] = useState(false);

    const formik = useFormik({
        initialValues: {
            bomName: '',
            parentItemId: '',
            bomStatus: 'DRAFT',
            isActive: true,
            isDefault: false,
            version: 1,
            revision: '',
            effectiveFrom: '',
            effectiveTo: '',
            description: '',
            components: [],
            productFinanceSettings: {
                stanadrCost: 0,
            },
        },
        validationSchema: Yup.object({
            bomName: Yup.string().required('Required'),
            parentItemId: Yup.string().required('Required')
        }),
        onSubmit: async (values) => {
            // Helper: convert empty strings to null
            console.log(values)
            const sanitize = (obj) =>
                JSON.parse(JSON.stringify(obj, (key, value) => value === '' ? null : value));


            const bomPayload = {
                id: bomId ? bomId : null,
                bomName: values.bomName,
                parentInventoryItem: { inventoryItemId: values.parentItemId },
                description: values.description,
                isActive: values.isActive,
                isDefault: values.isDefault,
                revision: values.revision,
                effectiveFrom: values.effectiveFrom !== 'Invalid Date' ? values.effectiveFrom : null,
                effectiveTo: values.effectiveTo !== 'Invalid Date' ? values.effectiveTo : null,
                bomStatus: values.bomStatus || 'DRAFT',
                positions: values.components.map((c) => ({
                    childBom: { id: c.id },
                    quantity: parseInt(c.quantity),
                    position: parseInt(c.position || 0)
                }))

            };


            const payload = sanitize({
                bom: bomPayload,
                routing: {
                    status: values.routing?.status,
                    createdBy: values.routing?.createdBy,
                    operations: operations
                }
            });

            try {
                if (bomId) {
                    await apiService.put(`/bom/${bomId}`, payload);
                    showSnackbar("BOM updated successfully");
                } else {
                    await apiService.post('/bom', payload);
                    showSnackbar("BOM created successfully");
                }
            } catch (e) {
                showSnackbar(e.response?.data?.error, "error");
            }
        }
    });


    const handleConfirmDuplicate = async () => {
        try {
            setDuplicating(true);
            const newBom = await duplicateBom(bomId);
            showSnackbar("BOM duplicated successfully");
            setDuplicateDialogOpen(false);
            navigate(`/bom/edit/${newBom.bom?.id}`);
        } catch (e) {
            showSnackbar(e.message || "Failed to duplicate BOM", "error");
        } finally {
            setDuplicating(false);
        }
    };

    const fetchInventoryItems = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: 0, size: 10, sortBy: "name", sortDir: "asc", search };
            const data = await apiService.post("/bom/active/search", search);
            console.log(data.content)
            setSearchedItemList(data.content);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBomAttachments = async () => {
        setLoading(true)
        try {

            const res = await apiService.get(`/bom/${bomId}/attachments`);
            setBomAttachments(res)

        }
        catch (e) {
            showSnackbar("Error fetching attachments: " + e.response.data, "error")
        }
        setLoading(false)
    }
    const fetchParentItems = useCallback(async () => {
        try {
            const res = await apiService.get("/inventory_item/all", { page: 0, size: 100 });
            setParentItems(res.content);
        } catch (err) {
            console.error('Failed to fetch parent items');
        }
    }, []);

    const fetchBomDetails = useCallback(async () => {
        if (!bomId) return;
        try {
            const data = await apiService.get(`/bom/${bomId}`);
            const { bom, routing } = data;
            setBomDetails(data);
            setOperations(routing?.operations)
            setSelectedItem(bom?.parentInventoryItem)
            formik.setValues({
                bomName: bom.bomName,
                parentItemId: bom.parentInventoryItem?.inventoryItemId,
                isActive: bom.isActive,
                isDefault: bom.isDefault,
                revision: bom.revision || '',
                effectiveFrom: dayjs(bom.effectiveFrom).format("YYYY-MM-DD") || '',
                effectiveTo: dayjs(bom.effectiveTo).format("YYYY-MM-DD") || '',
                components: bom.positions || [],
                operations: routing?.operations,
                routingStatus: routing?.status,
                routingCreatedBy: routing?.createdBy,
                ecoNumber: bom.ecoNumber,
                bomStatus: bom.bomStatus,
                revision: bom.revision,
                creationDate: bom.creationDate,
                updatedDate: bom.updatedDate,
                approvalDate: bom.approvalDate,
                approvedBy: bom.approvedBy,
                description: bom.description

            });

        } catch (e) {
            showSnackbar('Failed to fetch BOM: ' + e, 'error');
        }
    }, [bomId]);


    const fetchProductionJob = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: 0,
                size: 5,
                sortBy: "jobName",
                sortDir: "asc",
                search,
            };

            const data = await apiService.get("/production/production-job", params);
            setJobs(data.content);

        } catch (err) {
            setError("Failed to fetch jobs", 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchWorkCenter = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: 0,
                size: 5,
                sortBy: "centerName",
                sortDir: "asc",
                search,
            };

            const data = await apiService.get("/manufacturing/work-center/search", params);
            setWorkCenters(data.content);

        } catch (err) {
            showSnackbar("Failed to fetch Work Centers", 'error');
        } finally {
            setLoading(false);
        }
    }, []);



    const exportDetailedPDF = () => {
        if (!bomDetails) return;

        setTimeout(() => {
            const doc = new jsPDF({ unit: "mm", format: "a4" });


            // Header info
            doc.text(`BOM Name: ${String(bomDetails?.bom?.bomName ?? "")}`, 10, 10);
            doc.text(
                `Parent Item: ${String(bomDetails?.bom?.parentInventoryItem?.itemCode ?? "")} - ${String(bomDetails?.parentInventoryItem?.name ?? "")}`,
                10,
                20
            );
            // Table rows
            const childRows = (bomDetails.bom?.positions || []).map(child => [
                child.childBom?.parentInventoryItem?.itemCode || "",
                child.childBom?.parentInventoryItem?.name || "",
                child.childBom?.parentInventoryItem?.hsnCode || "",
                child.childBom?.parentInventoryItem?.uom || "",
                child.childBom?.parentInventoryItem?.dimension || "",
                child.childBom?.parentInventoryItem?.drawingNumber || "",
                child.childBom?.revision || "",
                child.quantity ?? "",
                child.position ?? "",
            ]);

            // AutoTable
            autoTable(doc, {
                startY: 30,
                head: [[
                    "Item Code", "Name", "HSN", "UOM", "Type",
                    "Dimension", "Qty", "Position", "Remarks"
                ]],
                body: childRows,
            });

            // Save
            doc.save("Detailed_BOM_Report.pdf");
        }, 0);

    }

    const handleSearchChange = async (query) => {
        setSearchQuery(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchInventoryItems(query), 300);

    };

    const handleParentItemSearch = async (query) => {
        setSelectedItemSearch(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchInventoryItems(query), 300);
    }

    const handleFileUpload = async () => {
        if (!selectedFile) {
            showSnackbar("Please select a file", "warning");
            return;
        }
        try {
            setUploading(true);
            await uploadBomAttachment(bomId, selectedFile);
            showSnackbar("File uploaded successfully");
            fetchBomAttachments(); // refresh list
            setSelectedFile(null);
        } catch (e) {
            showSnackbar(e.response.data || "File upload failed", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleFileDelete = async (fileId) => {
        setLoading(true)
        try {
            await deleteBomAttachment(bomId, fileId)
            fetchBomAttachments();
            showSnackbar("File Deleted Successfully")
        } catch (e) {
            showSnackbar('Failed to delete File: ' + e.response.data, "error");
        }
        setLoading(false)
    };

    useEffect(() => {
        fetchParentItems();
        fetchBomDetails();
    }, [fetchParentItems, fetchBomDetails]);


    useEffect(() => {
        fetchParentItems();

        if (location.state?.duplicateBom) {
            const data = location.state.duplicateBom;
            console.log(data)
            formik.setValues({
                bomName: '', // Start fresh
                parentItemId: data.parentInventoryItem?.inventoryItemId,
                isActive: true,
                isDefault: false,
                revision: '',
                effectiveFrom: '',
                effectiveTo: '',
                components: data.components.map((c, idx) => ({
                    ...c.childBom,
                    quantity: c.quantity || 1,
                    position: c.position || (idx + 1) * 10
                }))
            });
            setBomDetails(data);

        } else {
            fetchBomDetails();
        }
    }, [fetchParentItems, fetchBomDetails]);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };


    const downloadAttachment = async (fileId, fileName) => {

        try {
            await downloadBomAttachment(fileId, fileName);
            showSnackbar('File Downloaded');
        } catch (e) {
            showSnackbar('Failed to download File: ' + e.response?.data, 'error');
        }

    }

    const handleSubmit = (() => {
        console.log("SUbmitiing")
        formik.handleSubmit()
    })


    useEffect(() => {
        if (selectedTab === 2 && bomId && bomAttachments === null) {
            fetchBomAttachments();
        }
    }, [selectedTab, bomId]);


    const downloadExcel = async () => {

        console.log("Started")
        try {
            await downloadBomExcel(bomId);
            showSnackbar('Excel Downloaded');
        }
        catch (e) {
            showSnackbar('Failed to download Excel: ' + e.response?.data, 'error');
        }

    }
    return (
        <Grid container spacing={2}>
            {/* LEFT MAIN CONTENT */}
            <Grid item xs={12} md={9}>
                <Box sx={{
                    p: 3,
                    backgroundColor: "white",
                    borderRadius: 2,
                    boxShadow: 2,
                    height: "100vh",
                    minHeight: "500px",
                    display: "flex",
                    flexDirection: "column",
                }}>


                    {/* HEADER */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5" fontWeight={700} color="primary.main">
                            {bomId
                                ? formik.values.bomName
                                : 'New BOM'}
                        </Typography>


                        <Box display="flex" gap={1}>
                            {(bomId &&
                                <>
                                    <Button size="small" variant="outlined" startIcon={<FileDownload />} sx={{ width: "100px" }} onClick={downloadExcel}>Excel</Button>
                                    {/* <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} onClick={exportDetailedPDF} sx={{ width: "100px" }}>PDF</Button> */}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                            setDuplicateDialogOpen(true)
                                        }
                                        sx={{ width: "100px" }}
                                    >
                                        Duplicate
                                    </Button>
                                </>
                            )}
                            <Button type="submit" variant="contained" color="primary" size="small" sx={{ width: "100px" }} onClick={handleSubmit}>{bomId ? 'Update' : 'Create'} </Button>


                        </Box>


                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Tabs value={selectedTab} onChange={(_, tab) => setSelectedTab(tab)} sx={{ mb: 2 }}>
                        <Tab label="Basic Info" />
                        <Tab label="Operations" />

                        {bomId && <Tab label="Attachments" />}
                    </Tabs>

                    <form onSubmit={formik.handleSubmit}>
                        {selectedTab === 0 && (
                            <Grid sx={{ display: "flex", flexDirection: "column", overflow: "auto", maxHeight: "80vh" }}>
                                <Grid container spacing={2} mt={2} mb={2}>
                                    <Grid item xs={12} sm={3} >
                                        <TextField
                                            label="BOM Name"
                                            fullWidth
                                            size="small"
                                            {...formik.getFieldProps('bomName')}
                                            error={formik.touched.bomName && Boolean(formik.errors.bomName)}
                                            helperText={formik.touched.bomName && formik.errors.bomName}
                                            sx={{
                                                "& .MuiInputBase-input": { fontSize: 14 },
                                                "& .MuiInputLabel-root": { fontSize: 14 },

                                            }}

                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={3} mb={2}>
                                        <FormControl fullWidth size="small">

                                            <Autocomplete
                                                fullWidth
                                                options={parentItems}
                                                value={selectedItem || null}
                                                getOptionLabel={(item) => item?.name + " - " + item?.itemCode ?? ""}
                                                onChange={(e, i) => {
                                                    setSelectedItem(i);
                                                    formik.setFieldValue("parentItemId", i?.inventoryItemId)

                                                }}
                                                sx={{
                                                    "& .MuiInputBase-input": { fontSize: 14 },
                                                    "& .MuiInputLabel-root": { fontSize: 14 },

                                                }}
                                                renderInput={(params) => (
                                                    <TextField {...params} size="small" placeholder="Bom Header"

                                                    />
                                                )}

                                                onInputChange={(e, v) => handleParentItemSearch(v)}
                                                loading={loading}

                                            />
                                        </FormControl>
                                    </Grid>

                                    <Grid mb={2} item xs={12} sm={3}>
                                        <TextField
                                            sx={{
                                                "& .MuiInputBase-input": { fontSize: 14 },
                                                "& .MuiInputLabel-root": { fontSize: 14 },

                                            }}

                                            type="date"
                                            label="Effective From"
                                            fullWidth size="small"
                                            InputLabelProps={{ shrink: true }}
                                            {...formik.getFieldProps('effectiveFrom')} />
                                    </Grid>
                                    <Grid
                                        mb={2}
                                        item
                                        xs={12}
                                        sm={3}>
                                        <TextField
                                            type="date"
                                            label="Effective To"
                                            fullWidth
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                            {...formik.getFieldProps('effectiveTo')}
                                            sx={{
                                                "& .MuiInputBase-input": { fontSize: 14 },
                                                "& .MuiInputLabel-root": { fontSize: 14 },

                                            }}
                                        />
                                    </Grid>

                                    <Grid
                                        item
                                        mb={2}
                                        sm={12}>
                                        <TextField
                                            type="text"
                                            label="Description"
                                            fullWidth
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                            {...formik.getFieldProps('description')}
                                            sx={{
                                                "& .MuiInputBase-input": { fontSize: 14 },
                                                "& .MuiInputLabel-root": { fontSize: 14 },

                                            }}
                                        />
                                    </Grid>


                                </Grid>




                                <BomPositionTable
                                    searchedItemList={searchedItemList}
                                    searchQuery={searchQuery}
                                    handleSearchChange={handleSearchChange}
                                    formik={formik}

                                />
                            </Grid>

                        )}

                        {selectedTab === 1 &&

                            <BomRouting operations={operations}
                                setOperations={setOperations}
                                fetchProductionJob={fetchProductionJob}
                                jobs={jobs}
                                error={error}
                                setError={setError}
                                loading={loading}
                                setLoading={setLoading}
                                fetchWorkCenter={fetchWorkCenter}
                                workCenters={workCenters}

                                keepMounted />
                        }

                        {selectedTab === 2 && bomId && (
                            <Box mt={3}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Attachments
                                </Typography>

                                {/* Upload section */}
                                <Box display="flex" alignItems="center" gap={2} mb={2}>
                                    <Button
                                        component="label"
                                        variant="outlined"
                                        size="small"
                                    >
                                        Choose File
                                        <input
                                            type="file"
                                            hidden
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                        />
                                    </Button>

                                    <Typography variant="body2" color="text.secondary">
                                        {selectedFile ? selectedFile.name : "No file selected"}
                                    </Typography>

                                    <Button
                                        onClick={handleFileUpload}
                                        variant="contained"
                                        size="small"
                                        disabled={!selectedFile || uploading}
                                    >
                                        {uploading ? "Uploading…" : "Upload"}
                                    </Button>
                                </Box>

                                {/* Attachments list */}
                                <List dense>
                                    {bomAttachments?.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No attachments uploaded
                                        </Typography>
                                    )}

                                    {bomAttachments?.map(file => (
                                        <ListItem
                                            key={file.id}
                                            divider
                                            secondaryAction={
                                                <DeleteOutline
                                                    onClick={() => handleFileDelete(file.id)}
                                                    style={{ cursor: "pointer", color: "#d32f2f" }}
                                                />
                                            }
                                        >
                                            <ListItemText
                                                primary={file.fileName.replace(/^\d+_/, "")}
                                                secondary={`Uploaded on ${new Date(file.uploadedAt).toLocaleDateString()}`}
                                                onClick={() => downloadAttachment(file.id, file.fileName)}
                                                sx={{ cursor: "pointer" }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>

                        )}


                    </form>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={3000}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    >
                        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                </Box >
            </Grid>

            {/* RIGHT INFO PANEL */}
            <Grid item xs={12} md={3}>
                <BomSidebar bomId={bomId} formik={formik} showSnackbar={showSnackbar} loading={loading} setLoading={setLoading} error={setError} setError={setError} />
            </Grid>

            <Dialog
                open={duplicateDialogOpen}
                onClose={() => setDuplicateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Duplicate BOM</DialogTitle>

                <DialogContent>
                    <Typography variant="body2">
                        This will create a new BOM as a draft using the current BOM structure.
                        <br />
                        Are you sure you want to continue?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setDuplicateDialogOpen(false)}
                        disabled={duplicating}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        disabled={duplicating}
                        onClick={handleConfirmDuplicate}
                    >
                        {duplicating ? "Duplicating…" : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Grid >
    );
};

export default AddBom;
