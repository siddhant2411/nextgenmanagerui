import React, { useRef, useState } from "react";
import {
    Button, Dialog, DialogTitle, DialogActions, DialogContent,
    Table, TableBody, TableCell, TableHead, TableRow, Snackbar, Alert,
    CircularProgress, IconButton, Typography, Box, Tooltip, Chip,
    Stack, Avatar, LinearProgress,
} from "@mui/material";
import { Upload, DeleteOutline, Download, FileUpload, Close } from "@mui/icons-material";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createInventoryItemWithFiles } from "../../services/inventoryService";

const T = {
    primary: '#2563eb',
    success: '#059669',
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a',
    textSec: '#64748b',
};

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

/* ── Template column definitions ── */
const TEMPLATE_COLUMNS = [
    { key: 'itemCode',       label: 'Item Code',        sample: '',            note: 'Leave blank for auto-generate' },
    { key: 'name',           label: 'Product Name *',   sample: 'Steel Plate', note: 'Required' },
    { key: 'hsnCode',        label: 'HSN Code',         sample: '7208',        note: 'Indian HSN/SAC code' },
    { key: 'uom',            label: 'UOM *',            sample: 'NOS',         note: 'NOS | KG | GRAM | TON | METER | CENTIMETER | INCH | LITER | SET' },
    { key: 'itemType',       label: 'Item Type *',      sample: 'RAW_MATERIAL', note: 'RAW_MATERIAL | SEMI_FINISHED | FINISHED_GOOD | SUB_CONTRACTED | CONSUMABLE' },
    { key: 'purchased',      label: 'Purchased',        sample: 'true',        note: 'true | false' },
    { key: 'manufactured',   label: 'Manufactured',     sample: 'false',       note: 'true | false' },
    { key: 'basicMaterial',  label: 'Basic Material',   sample: 'MS',          note: 'e.g. MS, SS, Aluminium' },
    { key: 'dimension',      label: 'Dimension',        sample: '100x50x10',   note: 'Free text' },
    { key: 'size',           label: 'Size',             sample: '10mm',        note: 'Free text' },
    { key: 'weight',         label: 'Weight',           sample: '1.5',         note: 'Numeric (kg)' },
    { key: 'drawingNumber',  label: 'Drawing Number',   sample: 'DRG-001',     note: 'Engineering drawing reference' },
    { key: 'processType',    label: 'Process Type',     sample: 'CNC',         note: 'Free text' },
    { key: 'standardCost',   label: 'Standard Cost',    sample: '250',         note: 'Numeric (₹)' },
    { key: 'sellingPrice',   label: 'Selling Price',    sample: '300',         note: 'Numeric (₹)' },
    { key: 'taxCategory',    label: 'Tax Category',     sample: '18',          note: 'GST % — 0 | 3 | 5 | 12 | 18 | 28' },
    { key: 'leadTime',       label: 'Lead Time (days)', sample: '7',           note: 'Numeric' },
    { key: 'reorderLevel',   label: 'Reorder Level',    sample: '50',          note: 'Numeric' },
    { key: 'minStock',       label: 'Min Stock',        sample: '20',          note: 'Numeric' },
    { key: 'maxStock',       label: 'Max Stock',        sample: '200',         note: 'Numeric' },
    { key: 'batchTracked',   label: 'Batch Tracked',    sample: 'false',       note: 'true | false' },
    { key: 'serialTracked',  label: 'Serial Tracked',   sample: 'false',       note: 'true | false' },
    { key: 'itemGroupCode',  label: 'Item Group Code',  sample: 'GRP-001',     note: 'Free text' },
    { key: 'revision',       label: 'Revision',         sample: '1',           note: 'Numeric' },
    { key: 'remarks',        label: 'Remarks',          sample: '',            note: 'Any notes' },
];

const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    /* ── Sheet 1: Template ── */
    const headers = TEMPLATE_COLUMNS.map(c => c.label);
    const sample  = TEMPLATE_COLUMNS.map(c => c.sample);
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);

    // Column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    /* ── Sheet 2: Instructions ── */
    const instrRows = [
        ['Column', 'Field Key', 'Required', 'Valid Values / Notes'],
        ...TEMPLATE_COLUMNS.map(c => [
            c.label.replace(' *', ''),
            c.key,
            c.label.includes('*') ? 'YES' : 'No',
            c.note,
        ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instrRows);
    ws2['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 10 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

    XLSX.writeFile(wb, 'product_master_template.xlsx');
};

export default function BulkImportItems() {
    const fileRef = useRef(null);
    const [importDialog, setImportDialog] = useState({ open: false, step: 'idle' }); // idle | uploading | preview
    const [rows, setRows] = useState([]);
    const [errorRows, setErrorRows] = useState([]);
    const [openErrorDialog, setOpenErrorDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const openImport = () => setImportDialog({ open: true, step: 'idle' });
    const closeImport = () => { setImportDialog({ open: false, step: 'idle' }); setRows([]); };

    const handleFileSelected = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setImportDialog(d => ({ ...d, step: 'uploading' }));

        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();

        reader.onload = (evt) => {
            try {
                let data = [];
                if (ext === 'csv') {
                    const result = Papa.parse(evt.target.result, { header: true, skipEmptyLines: true });
                    data = result.data;
                } else {
                    const wb = XLSX.read(evt.target.result, { type: 'binary' });
                    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                }
                // strip the ' *' suffix from header keys if user uploaded the raw template headers
                const cleaned = data.map(row => {
                    const out = {};
                    Object.keys(row).forEach(k => {
                        const clean = k.replace(' *', '').trim();
                        const col = TEMPLATE_COLUMNS.find(c => c.label.replace(' *', '').trim() === clean || c.key === clean);
                        if (col) out[col.key] = row[k];
                    });
                    return out;
                });
                setRows(cleaned);
                setImportDialog(d => ({ ...d, step: 'preview' }));
            } catch {
                setSnackbar({ open: true, message: 'Failed to parse file. Use the provided template.', severity: 'error' });
                setImportDialog(d => ({ ...d, step: 'idle' }));
            }
        };
        if (ext === 'csv') reader.readAsText(file);
        else reader.readAsBinaryString(file);
    };

    const preparePayload = (row) => ({
        itemCode: row.itemCode || '',
        name: row.name || '',
        hsnCode: row.hsnCode || '',
        uom: row.uom || 'NOS',
        itemType: row.itemType || 'RAW_MATERIAL',
        leadTime: row.leadTime || '',
        purchased: row.purchased === 'true' || row.purchased === true,
        manufactured: row.manufactured === 'true' || row.manufactured === true,
        standardCost: row.standardCost || '',
        productSpecification: {
            dimension: row.dimension || '',
            size: row.size || '',
            weight: row.weight || '',
            basicMaterial: row.basicMaterial || '',
            drawingNumber: row.drawingNumber || '',
            processType: row.processType || '',
        },
        revision: row.revision || 1,
        remarks: row.remarks || '',
        productInventorySettings: {
            leadTime: row.leadTime || '',
            reorderLevel: row.reorderLevel || '',
            minStock: row.minStock || '',
            maxStock: row.maxStock || '',
            purchased: row.purchased === 'true' || row.purchased === true,
            manufactured: row.manufactured === 'true' || row.manufactured === true,
            batchTracked: row.batchTracked === 'true' || row.batchTracked === true,
            serialTracked: row.serialTracked === 'true' || row.serialTracked === true,
        },
        productFinanceSettings: {
            standardCost: row.standardCost || '',
            sellingPrice: row.sellingPrice || '',
            taxCategory: row.taxCategory || '',
        },
        itemGroupCode: row.itemGroupCode || '',
    });

    const handleConfirm = async () => {
        setLoading(true);
        const failed = [];
        for (const row of rows) {
            try {
                await createInventoryItemWithFiles(preparePayload(row), []);
            } catch {
                failed.push(row);
            }
        }
        setLoading(false);
        closeImport();
        if (failed.length) {
            setErrorRows(failed);
            setOpenErrorDialog(true);
            setSnackbar({ open: true, message: `${failed.length} item(s) failed to import.`, severity: 'error' });
        } else {
            setSnackbar({ open: true, message: `${rows.length} item(s) imported successfully!`, severity: 'success' });
        }
    };

    const handleRemoveRow = (index) => setRows(rows.filter((_, i) => i !== index));

    return (
        <>
            <Button
                variant="outlined"
                onClick={openImport}
                startIcon={<Upload />}
                sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 2.5,
                    px: 3,
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.05)' },
                }}
            >
                Bulk Import
            </Button>

            {/* ── Main Import Dialog ── */}
            <Dialog open={importDialog.open} onClose={closeImport} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

                <Box sx={{ bgcolor: '#0f172a', color: 'white', px: 3, py: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.01em' }}>
                                Bulk Import Products
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                Download the template, fill it in, then upload
                            </Typography>
                        </Box>
                        <IconButton onClick={closeImport} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
                            <Close />
                        </IconButton>
                    </Stack>
                </Box>

                {importDialog.step === 'uploading' && <LinearProgress sx={{ height: 3 }} />}

                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    {importDialog.step === 'idle' && (
                        <Stack spacing={3}>
                            {/* Step 1 — Download template */}
                            <Box sx={{ p: 3, borderRadius: 3, border: `2px dashed ${T.border}`, bgcolor: T.bg }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#eff6ff', color: T.primary, borderRadius: 2, width: 44, height: 44 }}>
                                        <Download />
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 800, color: T.text, fontSize: '0.95rem' }}>
                                            Step 1 — Download the Template
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 600 }}>
                                            Fill in your products. <strong>Name, UOM & Item Type</strong> are required.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained" disableElevation startIcon={<Download />}
                                        onClick={downloadTemplate}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap', bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' } }}
                                    >
                                        Download Template
                                    </Button>
                                </Stack>
                            </Box>

                            {/* Step 2 — Upload */}
                            <Box
                                onClick={() => fileRef.current?.click()}
                                sx={{
                                    p: 4, borderRadius: 3, border: `2px dashed ${T.border}`, bgcolor: T.bg,
                                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                                    '&:hover': { borderColor: T.primary, bgcolor: '#eff6ff' },
                                }}
                            >
                                <Avatar sx={{ bgcolor: '#ecfdf5', color: T.success, borderRadius: 2, width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                                    <FileUpload />
                                </Avatar>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Step 2 — Upload your file</Typography>
                                <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 600 }}>
                                    Click to browse · Accepts .xlsx, .xls, .csv
                                </Typography>
                            </Box>

                            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" hidden onChange={handleFileSelected} />
                        </Stack>
                    )}

                    {importDialog.step === 'uploading' && (
                        <Box sx={{ py: 5, textAlign: 'center' }}>
                            <CircularProgress size={44} thickness={4} sx={{ color: T.primary }} />
                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.textSec }}>Reading your file…</Typography>
                        </Box>
                    )}

                    {importDialog.step === 'preview' && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: T.text }}>
                                    Review before importing
                                </Typography>
                                <Chip label={`${rows.length} item(s)`} size="small"
                                    sx={{ bgcolor: '#e3f2fd', color: T.primary, fontWeight: 700, fontSize: '0.75rem' }} />
                            </Stack>
                            <Box sx={{ maxHeight: 360, overflow: 'auto', borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ ...headerCellSx, width: 40 }}>#</TableCell>
                                            <TableCell sx={headerCellSx}>Item Code</TableCell>
                                            <TableCell sx={headerCellSx}>Name</TableCell>
                                            <TableCell sx={headerCellSx}>HSN</TableCell>
                                            <TableCell sx={headerCellSx}>Type</TableCell>
                                            <TableCell sx={headerCellSx}>UOM</TableCell>
                                            <TableCell align="center" sx={{ ...headerCellSx, width: 44 }} />
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
                                                <TableCell sx={{ fontWeight: 600, color: T.primary }}>{row.itemCode || '—'}</TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                                                <TableCell>{row.hsnCode || '—'}</TableCell>
                                                <TableCell>{row.itemType || 'RAW_MATERIAL'}</TableCell>
                                                <TableCell>{row.uom || 'NOS'}</TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Remove row">
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
                                                    <Typography variant="body2" color="text.secondary">No items remaining.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, bgcolor: T.bg }}>
                    {importDialog.step === 'preview' ? (
                        <>
                            <Button onClick={() => setImportDialog(d => ({ ...d, step: 'idle' }))}
                                sx={{ textTransform: 'none', color: T.textSec }}>
                                Back
                            </Button>
                            <Button onClick={handleConfirm} variant="contained" disableElevation
                                disabled={loading || rows.length === 0}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' } }}>
                                {loading ? 'Importing…' : `Import ${rows.length} Item(s)`}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={closeImport} sx={{ textTransform: 'none', color: T.textSec }}>
                            Cancel
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── Failed items dialog ── */}
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
                    <Button onClick={() => setOpenErrorDialog(false)} sx={{ textTransform: 'none', fontWeight: 600, color: T.textSec }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Snackbar ── */}
            <Snackbar open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity}
                    variant="filled" sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
