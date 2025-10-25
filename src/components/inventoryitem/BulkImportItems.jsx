import React, { useState } from "react";
import {
    Button, Dialog, DialogTitle, DialogActions, DialogContent,
    Table, TableBody, TableCell, TableHead, TableRow, Snackbar, CircularProgress,
    IconButton
} from "@mui/material";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import apiService, { postFile } from "../../services/apiService";
import { DeleteIcon } from "lucide-react";

export default function BulkImportItems() {
    const [rows, setRows] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [errorRows, setErrorRows] = useState([]);
    const [openErrorDialog, setOpenErrorDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "" });

    // CSV/Excel parser
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExt = file.name.split(".").pop().toLowerCase();

        reader.onload = (evt) => {
            if (fileExt === "csv") {
                Papa.parse(evt.target.result, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setRows(results.data);
                        setOpenDialog(true);
                    },
                });
            } else if (["xls", "xlsx"].includes(fileExt)) {
                const workbook = XLSX.read(evt.target.result, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(worksheet);
                setRows(data);
                setOpenDialog(true);
            } else {
                alert("Unsupported file format!");
            }
        };

        if (fileExt === "csv") reader.readAsText(file);
        else reader.readAsBinaryString(file);
    };

    // Map to backend payload structure
    const preparePayload = (row) => ({
        itemCode: row.itemCode || "",
        name: row.name || "",
        hsnCode: row.hsnCode || "",
        uom: row.uom || "NOS",
        itemType: row.itemType || "RAW_MATERIAL",
        productSpecification: {
            dimension: row.dimension || "",
            size: row.size || "",
            weight: row.weight || "",
            basicMaterial: row.basicMaterial || "",
            drawingNumber: row.drawingNumber || "",
            processType: row.processType || "",
        },
        revision: row.revision || 1,
        remarks: row.remarks || "",
        productInventorySettings: {
            leadTime: row.leadTime || "",
            reorderLevel: row.reorderLevel || "",
            minStock: row.minStock || "",
            maxStock: row.maxStock || "",
            purchased: row.purchased === "true" || false,
            manufactured: row.manufactured === "true" || false,
            batchTracked: row.batchTracked === "true" || false,
            serialTracked: row.serialTracked === "true" || false,
        },
        productFinanceSettings: {
            standardCost: row.standardCost || "",
            sellingPrice: row.sellingPrice || "",
            taxCategory: row.taxCategory || "",
        },
        itemGroupCode: row.itemGroupCode || "",
    });

    // On confirm, do POST for each row, catch errors
    const handleConfirm = async () => {
        setLoading(true);
        const failed = [];
        for (const row of rows) {
            try {
                const payload = preparePayload(row);
                // Replace fetch with your API util (postFile)
                const response = await postFile("/inventory_item/add", payload, []);
                console.log(response)
                // if (!response.ok) throw new Error("API Error");
            } catch (err) {
                failed.push(row);
            }
        }
        setLoading(false);
        setOpenDialog(false);
        if (failed.length) {
            setErrorRows(failed);
            setOpenErrorDialog(true);
            setSnackbar({ open: true, message: "Some items failed to upload.", severity: "error" });
        } else {
            setSnackbar({ open: true, message: "All items added successfully!", severity: "success" });
        }
    };

    const handleRemoveRow = (index) => {
        const updatedRows = rows.filter((_, idx) => idx !== index);
        setRows(updatedRows);
    };

    return (
        <>
            <Button variant="contained" component="label">
                 Bulk Import
                <input type="file" accept=".csv,.xls,.xlsx" hidden onChange={handleFileUpload} />
            </Button>
            {loading && <CircularProgress />}

            {/* Preview Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Verify Imported Items</DialogTitle>
                <DialogContent style={{ maxHeight: "400px", overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item Code</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>HSN Code</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{row.itemCode}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.hsnCode}</TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveRow(idx)}
                                            title="Remove this item"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>

                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} variant="contained" color="primary">
                        Confirm & Import
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Error Dialog */}
            <Dialog open={openErrorDialog} onClose={() => setOpenErrorDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Items Failed to Import</DialogTitle>
                <DialogContent>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item Code</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>HSN Code</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {errorRows.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{row.itemCode}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.hsnCode}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <p>Please correct these items and try again.</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenErrorDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
                severity={snackbar.severity}
            />
        </>
    );
}
