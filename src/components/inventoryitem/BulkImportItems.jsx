import React, { useState } from "react";
import {
    Button, Dialog, DialogTitle, DialogActions, DialogContent,
    Table, TableBody, TableCell, TableHead, TableRow, Snackbar, Alert,
    CircularProgress, IconButton, Typography, Box, Tooltip, Chip
} from "@mui/material";
import { Upload, DeleteOutline } from "@mui/icons-material";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createInventoryItemWithFiles } from "../../services/inventoryService";

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: 0.3,
    py: 1,
    whiteSpace: 'nowrap',
};

export default function BulkImportItems() {
    const [rows, setRows] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [errorRows, setErrorRows] = useState([]);
    const [openErrorDialog, setOpenErrorDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const fileExt = file.name.split(".").pop().toLowerCase();

        reader.onload = (evt) => {
            if (fileExt === "csv") {
                Papa.parse(evt.target.result, {
                    header: true, skipEmptyLines: true,
                    complete: (results) => { setRows(results.data); setOpenDialog(true); },
                });
            } else if (["xls", "xlsx"].includes(fileExt)) {
                const workbook = XLSX.read(evt.target.result, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(worksheet);
                setRows(data);
                setOpenDialog(true);
            } else {
                setSnackbar({ open: true, message: "Unsupported file format. Use CSV or Excel.", severity: "error" });
            }
        };
        if (fileExt === "csv") reader.readAsText(file);
        else reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const preparePayload = (row) => ({
        itemCode: row.itemCode || "", name: row.name || "", hsnCode: row.hsnCode || "",
        uom: row.uom || "NOS", itemType: row.itemType || "RAW_MATERIAL",
        leadTime: row.leadTime || "", purchased: row.purchased === "true" || false,
        manufactured: row.manufactured === "true" || false, standardCost: row.standardCost || "",
        productSpecification: {
            dimension: row.dimension || "", size: row.size || "", weight: row.weight || "",
            basicMaterial: row.basicMaterial || "", drawingNumber: row.drawingNumber || "", processType: row.processType || "",
        },
        revision: row.revision || 1, remarks: row.remarks || "",
        productInventorySettings: {
            leadTime: row.leadTime || "", reorderLevel: row.reorderLevel || "",
            minStock: row.minStock || "", maxStock: row.maxStock || "",
            purchased: row.purchased === "true" || false, manufactured: row.manufactured === "true" || false,
            batchTracked: row.batchTracked === "true" || false, serialTracked: row.serialTracked === "true" || false,
        },
        productFinanceSettings: {
            standardCost: row.standardCost || "", sellingPrice: row.sellingPrice || "", taxCategory: row.taxCategory || "",
        },
        itemGroupCode: row.itemGroupCode || "",
    });

    const handleConfirm = async () => {
        setLoading(true);
        const failed = [];
        for (const row of rows) {
            try {
                await createInventoryItemWithFiles(preparePayload(row), []);
            } catch (err) {
                failed.push(row);
            }
        }
        setLoading(false);
        setOpenDialog(false);
        if (failed.length) {
            setErrorRows(failed);
            setOpenErrorDialog(true);
            setSnackbar({ open: true, message: `${failed.length} item(s) failed to import.`, severity: "error" });
        } else {
            setSnackbar({ open: true, message: `${rows.length} item(s) imported successfully!`, severity: "success" });
        }
    };

    const handleRemoveRow = (index) => {
        setRows(rows.filter((_, idx) => idx !== index));
    };

    return (
        <>
            <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    borderColor: BORDER_COLOR,
                    color: '#374151',
                    '&:hover': { borderColor: '#1565c0', color: '#1565c0' },
                }}
            >
                Bulk Import
                <input type="file" accept=".csv,.xls,.xlsx" hidden onChange={handleFileUpload} />
            </Button>

            {/* Preview Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744', fontSize: '1.1rem' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <span>Verify Imported Items</span>
                        <Chip label={`${rows.length} item(s)`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600, fontSize: '0.75rem' }} />
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headerCellSx, width: 40 }}>#</TableCell>
                                <TableCell sx={headerCellSx}>Item Code</TableCell>
                                <TableCell sx={headerCellSx}>Name</TableCell>
                                <TableCell sx={headerCellSx}>HSN Code</TableCell>
                                <TableCell sx={headerCellSx}>Type</TableCell>
                                <TableCell sx={headerCellSx}>UOM</TableCell>
                                <TableCell align="center" sx={{ ...headerCellSx, width: 60 }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={idx} sx={{
                                    bgcolor: idx % 2 === 0 ? '#fafbfc' : '#fff',
                                    '&:hover': { bgcolor: '#e3f2fd' },
                                    '& td': { fontSize: '0.8125rem', py: 0.5, borderBottom: `1px solid ${BORDER_COLOR}` },
                                }}>
                                    <TableCell sx={{ color: '#6b7280' }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1565c0' }}>{row.itemCode}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                                    <TableCell>{row.hsnCode || '-'}</TableCell>
                                    <TableCell>{row.itemType || 'RAW_MATERIAL'}</TableCell>
                                    <TableCell>{row.uom || 'NOS'}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Remove">
                                            <IconButton size="small" onClick={() => handleRemoveRow(idx)} sx={{ color: '#d32f2f' }}>
                                                <DeleteOutline sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">No items to import.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpenDialog(false)} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button onClick={handleConfirm} variant="contained" disabled={loading || rows.length === 0}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
                        {loading ? "Importing..." : `Import ${rows.length} Item(s)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Error Dialog */}
            <Dialog open={openErrorDialog} onClose={() => setOpenErrorDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#c62828', fontSize: '1.1rem' }}>
                    Failed Items ({errorRows.length})
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellSx}>Item Code</TableCell>
                                <TableCell sx={headerCellSx}>Name</TableCell>
                                <TableCell sx={headerCellSx}>HSN Code</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {errorRows.map((row, idx) => (
                                <TableRow key={idx} sx={{
                                    bgcolor: '#fff8e1',
                                    '& td': { fontSize: '0.8125rem', py: 0.5, borderBottom: `1px solid ${BORDER_COLOR}` },
                                }}>
                                    <TableCell sx={{ fontWeight: 500 }}>{row.itemCode}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.hsnCode}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontSize: '0.8125rem' }}>
                        Please correct these items and try importing again.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenErrorDialog(false)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#374151' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}
                    variant="filled" sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
