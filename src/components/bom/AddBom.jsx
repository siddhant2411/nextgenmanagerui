// Enhanced AddBom component using MUI, Tabs, and Formik
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Box, Button, FormControl, InputLabel, Select, MenuItem,
    TextField, Typography, Tabs, Tab, Grid, Checkbox, FormControlLabel, List, ListItem, ListItemText,
    Autocomplete,
    TableCell,
    TableBody,
    TableRow,
    TableHead,
    TableContainer,
    Table,
    Paper,
    IconButton
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import apiService from "../../services/apiService";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowDownward, ArrowUpward, DeleteOutline } from "@mui/icons-material";
import { utils as XLSXUtils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WorkOrderTemplate from "./WorkOrderTemplate";
import BomJob from "./BomJob";

const AddBom = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parentItems, setParentItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchedItemList, setSearchedItemList] = useState([]);
    const debounceTimeout = useRef(null);
    const navigate = useNavigate();
    const { bomId } = useParams();
    const location = useLocation();
    const [bomAttachments, setBomAttachments] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [bomDetails, setBomDetails] = useState(null);

    const formik = useFormik({
    initialValues: {
        bomName: '',
        parentItemId: '',
        bomType: 'PRODUCTION',
        isActive: true,
        isDefault: false,
        revision: '',
        effectiveFrom: '',
        effectiveTo: '',
        components: [],
        productionTemplate: {
            estimatedHours: '',
            estimatedCostOfLabour: '',
            estimatedCostOfBom: '',
            overheadCostPercentage: '',
            overheadCostValue: '',
            totalCostOfWorkOrder: '',
            details: '',
            workOrderJobLists: [{
                productionJob: {
                    id: '',
                    jobName: '',
                    machineDetails: null,
                    roleRequired: '',
                    costPerHour: '',
                    description: ''
                },
                numberOfHours: 0,
            }]
        }
    },
    validationSchema: Yup.object({
        bomName: Yup.string().required('Required'),
        parentItemId: Yup.string().required('Required'),
        productionTemplate: Yup.object({
            estimatedHours: Yup.number().nullable(),
            estimatedCostOfLabour: Yup.number().nullable(),
            estimatedCostOfBom: Yup.number().nullable(),
            overheadCostPercentage: Yup.number().nullable(),
            overheadCostValue: Yup.number().nullable(),
            totalCostOfWorkOrder: Yup.number().nullable(),
            details: Yup.string().nullable()
        })
    }),
    onSubmit: async (values) => {
        // Helper: convert empty strings to null
        const sanitize = (obj) =>
            JSON.parse(JSON.stringify(obj, (key, value) => value === '' ? null : value));

        const bomPayload = {
            bomName: values.bomName,
            parentInventoryItem: { inventoryItemId: values.parentItemId },
            bomType: values.bomType,
            isActive: values.isActive,
            isDefault: values.isDefault,
            revision: values.revision,
            effectiveFrom: values.effectiveFrom,
            effectiveTo: values.effectiveTo,
            childInventoryItems: values.components.map((c) => ({
                childInventoryItem: { inventoryItemId: c.inventoryItemId },
                quantity: parseInt(c.quantity),
                position: parseInt(c.position || 0)
            }))
        };

        const templatePayload = {
            id: values.productionTemplate.id,
            estimatedHours: values.productionTemplate.estimatedHours,
            estimatedCostOfLabour: values.productionTemplate.estimatedCostOfLabour,
            estimatedCostOfBom: values.productionTemplate.estimatedCostOfBom,
            overheadCostPercentage: values.productionTemplate.overheadCostPercentage,
            overheadCostValue: values.productionTemplate.overheadCostValue,
            totalCostOfWorkOrder: values.productionTemplate.totalCostOfWorkOrder,
            details: values.productionTemplate.details,
            workOrderJobLists: values.productionTemplate.workOrderJobLists.map(j => {
                const hasJob =
                    j.productionJob &&
                    (j.productionJob.id ||
                        j.productionJob.jobName ||
                        j.productionJob.machineDetails?.id ||
                        j.productionJob.roleRequired ||
                        j.productionJob.costPerHour ||
                        j.productionJob.description);

                return {
                    productionJob: hasJob
                        ? {
                              id: j.productionJob.id && j.productionJob.id !== 0 ? j.productionJob.id : null,
                              jobName: j.productionJob.jobName,
                              machineDetails: j.productionJob.machineDetails?.id
                                  ? { id: j.productionJob.machineDetails.id }
                                  : null,
                              roleRequired: j.productionJob.roleRequired,
                              costPerHour: j.productionJob.costPerHour,
                              description: j.productionJob.description
                          }
                        : null,
                    numberOfHours: j.numberOfHours
                };
            })
        };

        const payload = sanitize({
            bom: bomPayload,
            workOrderProductionTemplate: templatePayload
        });

        try {
            if (bomId) {
                await apiService.put(`/bom/${bomId}`, payload);
            } else {
                await apiService.post('/bom', payload);
            }
            navigate(-1);
        } catch (e) {
            alert('Failed to save BOM');
        }
    }
});


    const fetchInventoryItems = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: 0, size: 10, sortBy: "name", sortDir: "asc", search };
            const data = await apiService.get("/inventory_item/all", params);
            setSearchedItemList(data.content);
        } catch (err) {
            setError("Failed to fetch inventory items");
        } finally {
            setLoading(false);
        }
    }, []);

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
            const { bom, workOrderProductionTemplate } = data;

            setBomDetails(data);

            formik.setValues({
                bomName: bom.bomName,
                parentItemId: bom.parentInventoryItem?.inventoryItemId,
                bomType: bom.bomType || 'PRODUCTION',
                isActive: bom.isActive,
                isDefault: bom.isDefault,
                revision: bom.revision || '',
                effectiveFrom: bom.effectiveFrom || '',
                effectiveTo: bom.effectiveTo || '',
                components: bom.childInventoryItems.map((c, idx) => ({
                    ...c.childInventoryItem,
                    quantity: c.quantity || 1,
                    position: c.position || (idx + 1) * 10
                })),
                productionTemplate: {
                    id: workOrderProductionTemplate?.id || null,
                    estimatedHours: workOrderProductionTemplate?.estimatedHours || 0,
                    estimatedCostOfLabour: workOrderProductionTemplate?.estimatedCostOfLabour || 0,
                    estimatedCostOfBom: workOrderProductionTemplate?.estimatedCostOfBom || 0,
                    overheadCostPercentage: workOrderProductionTemplate?.overheadCostPercentage || 0,
                    overheadCostValue: workOrderProductionTemplate?.overheadCostValue || 0,
                    totalCostOfWorkOrder: workOrderProductionTemplate?.totalCostOfWorkOrder || 0,
                    details: workOrderProductionTemplate?.details || '',
                    workOrderJobLists: workOrderProductionTemplate?.workOrderJobLists?.map(j => ({
                        productionJob: j.productionJob,
                        numberOfHours: j.numberOfHours
                    })) || []
                }
            });

            setBomAttachments(bom.bomAttachmentList || []);
        } catch (e) {
            console.error('Failed to fetch BOM');
        }
    }, [bomId]);

    const exportDetailedPDF = () => {
        if (!bomDetails) return;
        const doc = new jsPDF();
        doc.text(`BOM Name: ${bomDetails.bomName}`, 10, 10);
        doc.text(`Parent Item: ${bomDetails.parentInventoryItem.itemCode} - ${bomDetails.parentInventoryItem.name}`, 10, 20);

        const childRows = bomDetails.childInventoryItems.map(child => [
            child.childInventoryItem.itemCode,
            child.childInventoryItem.name,
            child.childInventoryItem.hsnCode,
            child.childInventoryItem.uom,
            child.childInventoryItem.itemType,
            child.childInventoryItem.dimension,
            child.quantity,
            child.position,
            child.childInventoryItem.remarks
        ]);

        autoTable(doc, {
            startY: 30,
            head: [[
                "Item Code", "Name", "HSN", "UOM", "Type",
                "Dimension", "Qty", "Position", "Remarks"
            ]],
            body: childRows
        });

        doc.save("Detailed_BOM_Report.pdf");
    };

    const exportDetailedExcel = () => {
        if (!bomDetails) return;
        const header = [
            "Item Code", "Name", "HSN Code", "UOM", "Item Type",
            "Dimension", "Quantity", "Position", "Remarks"
        ];
        const data = bomDetails.childInventoryItems.map(child => ([
            child.childInventoryItem.itemCode,
            child.childInventoryItem.name,
            child.childInventoryItem.hsnCode,
            child.childInventoryItem.uom,
            child.childInventoryItem.itemType,
            child.childInventoryItem.dimension,
            child.quantity,
            child.position,
            child.childInventoryItem.remarks
        ]));
        const worksheet = XLSXUtils.aoa_to_sheet([header, ...data]);
        const workbook = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(workbook, worksheet, "Detailed BOM");
        writeFile(workbook, "Detailed_BOM_Report.xlsx");
    };

    const handleSearchChange = async (query) => {
        setSearchQuery(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchInventoryItems(query), 300);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return alert('Select file first');
        try {
            await apiService.upload(`/bom/${bomId}/upload`, selectedFile);
            fetchBomDetails();
        } catch (e) {
            alert('File upload failed');
        }
    };

    const handleFileDelete = async (fileId) => {
        try {
            await apiService.delete(`/bom/delete/${fileId}`);
            fetchBomDetails();
        } catch (e) {
            alert('Delete failed');
        }
    };

    useEffect(() => {
        fetchParentItems();
        fetchBomDetails();
    }, [fetchParentItems, fetchBomDetails]);

    const moveRow = (index, direction) => {
        const newComponents = [...formik.values.components];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newComponents.length) return;
        const temp = newComponents[index];
        newComponents[index] = newComponents[targetIndex];
        newComponents[targetIndex] = temp;

        const tempPos = newComponents[index].position;
        newComponents[index].position = newComponents[targetIndex].position;
        newComponents[targetIndex].position = tempPos;

        formik.setFieldValue('components', newComponents);
    };

    useEffect(() => {
        fetchParentItems();

        if (location.state?.duplicateBom) {
            const data = location.state.duplicateBom;
            console.log(data)
            formik.setValues({
                bomName: '', // Start fresh
                parentItemId: data.parentInventoryItem?.inventoryItemId,
                bomType: data.bomType || 'PRODUCTION',
                isActive: true,
                isDefault: false,
                revision: '',
                effectiveFrom: '',
                effectiveTo: '',
                components: data.components.map((c, idx) => ({
                    ...c.childInventoryItem,
                    quantity: c.quantity || 1,
                    position: c.position || (idx + 1) * 10
                }))
            });
            setBomDetails(data); // optional, for export use
            setBomAttachments([]);
        } else {
            fetchBomDetails();
        }
    }, [fetchParentItems, fetchBomDetails]);

    return (
        <Box sx={{ p: 3, backgroundColor: 'white', borderRadius: 2, boxShadow: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{bomId ? 'Edit BOM' : 'Add BOM'}</Typography>
                {bomId && (
                    <Box display="flex" gap={1}>
                        <Button size="small" variant="text" onClick={exportDetailedExcel}>Excel</Button>
                        <Button size="small" variant="text" onClick={exportDetailedPDF}>PDF</Button>

                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate('/bom/add', { state: { duplicateBom: formik.values } })}
                        >
                            Duplicate
                        </Button>
                    </Box>


                )}
            </Box>

            <Tabs value={selectedTab} onChange={(_, tab) => setSelectedTab(tab)} sx={{ mb: 2 }}>
                <Tab label="Basic Info" />
                <Tab label="Components" />
                <Tab label="Operations" />
                <Tab label="Estimation" />
                {bomId && <Tab label="Attachments" />}
            </Tabs>

            <form onSubmit={formik.handleSubmit}>
                {selectedTab === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField label="BOM Name" fullWidth size="small" {...formik.getFieldProps('bomName')} error={formik.touched.bomName && Boolean(formik.errors.bomName)} helperText={formik.touched.bomName && formik.errors.bomName} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Parent Item</InputLabel>
                                <Select label="Parent Item" {...formik.getFieldProps('parentItemId')}>
                                    {parentItems.map((item) => (
                                        <MenuItem key={item.inventoryItemId} value={item.inventoryItemId}>{item.itemCode} - {item.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}><TextField label="Revision" fullWidth size="small" {...formik.getFieldProps('revision')} /></Grid>
                        <Grid item xs={12} sm={6}><TextField type="date" label="Effective From" fullWidth size="small" InputLabelProps={{ shrink: true }} {...formik.getFieldProps('effectiveFrom')} /></Grid>
                        <Grid item xs={12} sm={6}><TextField type="date" label="Effective To" fullWidth size="small" InputLabelProps={{ shrink: true }} {...formik.getFieldProps('effectiveTo')} /></Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>BOM Type</InputLabel>
                                <Select label="BOM Type" {...formik.getFieldProps('bomType')}>
                                    <MenuItem value="PRODUCTION">Production</MenuItem>
                                    <MenuItem value="ENGINEERING">Engineering</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}><FormControlLabel control={<Checkbox {...formik.getFieldProps('isActive')} checked={formik.values.isActive} />} label="Is Active" /></Grid>
                        <Grid item xs={12} sm={3}><FormControlLabel control={<Checkbox {...formik.getFieldProps('isDefault')} checked={formik.values.isDefault} />} label="Default BOM" /></Grid>
                    </Grid>
                )}

                {selectedTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>Components</Typography>
                        <Box mb={2}>
                            <Autocomplete
                                fullWidth
                                size="small"
                                options={searchedItemList}
                                inputValue={searchQuery}
                                onInputChange={(e, newValue, reason) => {
                                    if (reason === 'input') handleSearchChange(newValue);
                                }}
                                getOptionLabel={(option) => `${option.name} | ${option.itemCode}`}
                                onChange={(e, newValue) => {
                                    if (newValue) {
                                        const newPosition = (formik.values.components.length + 1) * 10;
                                        formik.setFieldValue('components', [...formik.values.components, {
                                            ...newValue,
                                            quantity: 1,
                                            position: newPosition
                                        }]);
                                        setSearchQuery('');
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Add Component" />
                                )}
                            />
                        </Box>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Position</TableCell>
                                        <TableCell>Component Name</TableCell>
                                        <TableCell>Item Code</TableCell>
                                        <TableCell>Quantity</TableCell>
                                        <TableCell>UOM</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formik.values.components.map((component, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={component.position || (index + 1) * 10}
                                                    onChange={(e) => {
                                                        const newComponents = [...formik.values.components];
                                                        newComponents[index].position = parseInt(e.target.value, 10);
                                                        formik.setFieldValue('components', newComponents);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{component.name}</TableCell>
                                            <TableCell>{component.itemCode}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="number"
                                                    value={component.quantity || 1}
                                                    onChange={(e) => {
                                                        const newComponents = [...formik.values.components];
                                                        newComponents[index].quantity = e.target.value;
                                                        formik.setFieldValue('components', newComponents);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{component.uom}</TableCell>
                                            <TableCell>
                                                <IconButton onClick={() => moveRow(index, 'up')}><ArrowUpward fontSize="small" /></IconButton>
                                                <IconButton onClick={() => moveRow(index, 'down')}><ArrowDownward fontSize="small" /></IconButton>
                                                <IconButton color="error" onClick={() => {
                                                    const updated = formik.values.components
                                                        .filter((_, i) => i !== index)
                                                        .map((item, idx) => ({
                                                            ...item,
                                                            position: (idx + 1) * 10
                                                        }));
                                                    formik.setFieldValue('components', updated);
                                                }}><DeleteOutline /></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {selectedTab === 2 &&

                    <BomJob formik={formik} />
                }

                {selectedTab === 3 &&

                    <WorkOrderTemplate formik={formik} selectedTab={selectedTab} />

                }
                {selectedTab === 4 && bomId && (
                    <Box mt={2}>
                        <Typography variant="h6">Attachments</Typography>
                        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
                        <Button onClick={handleFileUpload} sx={{ mt: 1 }} variant="outlined">Upload</Button>
                        <List>
                            {bomAttachments.map(file => (
                                <ListItem key={file.id} secondaryAction={<DeleteOutline onClick={() => handleFileDelete(file.id)} style={{ cursor: 'pointer' }} />}>
                                    <ListItemText primary={file.fileName} secondary={`Uploaded`} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                <Box mt={3}>
                    <Button type="submit" variant="contained" color="primary">{bomId ? 'Update BOM' : 'Create BOM'}</Button>
                </Box>
            </form>
        </Box >
    );
};

export default AddBom;
