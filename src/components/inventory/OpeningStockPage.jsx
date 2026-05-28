import React, { useState, useCallback } from 'react';
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider,
    IconButton, InputAdornment, LinearProgress, Paper, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    Tooltip, Typography,
} from '@mui/material';
import {
    Add, CheckCircle, Close, Download, ErrorOutline, Inbox, Search as SearchIcon,
    Upload, WarningAmber,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { receiveStock, searchInventoryItems, resolveApiErrorMessage } from '../../services/inventoryService';
import { useAuth } from '../../auth/AuthContext';

/* ─── constants ────────────────────────────────────────────────────────────── */

const TEMPLATE_COLS = ['itemCode', 'quantity', 'costPerUnit', 'batchNo', 'entryDate', 'notes'];

const HEADER_SX = {
    bgcolor: '#f8fafc',
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    py: 1.5,
    borderBottom: '2px solid #e5e7eb',
};

/* ─── template download ─────────────────────────────────────────────────────── */
const downloadTemplate = () => {
    const sample = [
        { itemCode: 'RM-0001', quantity: 100, costPerUnit: 25.5, batchNo: 'B001', entryDate: '01-04-2025', notes: 'Opening balance from Tally' },
        { itemCode: 'FG-0002', quantity: 50,  costPerUnit: 180,  batchNo: '',     entryDate: '01-04-2025', notes: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: TEMPLATE_COLS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Stock');
    XLSX.writeFile(wb, 'Opening_Stock_Import_Template.xlsx');
};

/* ─── single form ───────────────────────────────────────────────────────────── */
const SingleEntryForm = ({ onSuccess }) => {
    const { user } = useAuth();
    const [item, setItem]       = useState(null);
    const [options, setOptions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [form, setForm]       = useState({ quantity: '', costPerUnit: '', batchNo: '', entryDate: '', notes: '' });
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    const searchItems = useCallback(async (query) => {
        if (!query || query.length < 2) return;
        setSearching(true);
        try {
            const res = await searchInventoryItems({ query, page: 0, size: 20 });
            setOptions(res?.content || []);
        } finally { setSearching(false); }
    }, []);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async () => {
        if (!item)            { setError('Select an inventory item.'); return; }
        if (!form.quantity)   { setError('Enter quantity.'); return; }
        if (!form.costPerUnit){ setError('Enter cost per unit.'); return; }

        setSaving(true); setError(''); setSuccess('');
        try {
            await receiveStock({
                inventoryItemId:    item.inventoryItemId,
                procurementDecision: 'OPENING_STOCK',
                referenceId:        0,
                quantity:           Number(form.quantity),
                costPerUnit:        Number(form.costPerUnit),
                createdBy:          user?.username || 'system',
            });
            setSuccess(`Opening stock recorded for ${item.itemCode} — ${item.name}`);
            setItem(null); setOptions([]);
            setForm({ quantity: '', costPerUnit: '', batchNo: '', entryDate: '', notes: '' });
            onSuccess?.();
        } catch (e) {
            setError(resolveApiErrorMessage(e, 'Failed to save opening stock.'));
        } finally { setSaving(false); }
    };

    return (
        <Box>
            {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} icon={<CheckCircle />}>{success}</Alert>}

            <Stack spacing={2.5}>
                <Autocomplete
                    options={options}
                    value={item}
                    getOptionLabel={(o) => `[${o.itemCode}] ${o.name}`}
                    loading={searching}
                    onInputChange={(_, val) => searchItems(val)}
                    onChange={(_, val) => { setItem(val); if (val) setForm(p => ({ ...p, costPerUnit: val.standardCost || '' })); }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Item *"
                            placeholder="Search by code or name…"
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                endAdornment: (
                                    <>{searching ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    )}
                    renderOption={(props, o) => (
                        <Box component="li" {...props}>
                            <Box>
                                <Typography variant="body2" fontWeight={700}>{o.itemCode}</Typography>
                                <Typography variant="caption" color="text.secondary">{o.name} · {o.uom}</Typography>
                            </Box>
                        </Box>
                    )}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="Opening Quantity *"
                        name="quantity"
                        type="number"
                        value={form.quantity}
                        onChange={handleChange}
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">{item?.uom || 'units'}</InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                        label="Cost per Unit *"
                        name="costPerUnit"
                        type="number"
                        value={form.costPerUnit}
                        onChange={handleChange}
                        fullWidth
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="Batch / Lot No. (optional)"
                        name="batchNo"
                        value={form.batchNo}
                        onChange={handleChange}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                        label="Entry Date (optional)"
                        name="entryDate"
                        type="date"
                        value={form.entryDate}
                        onChange={handleChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </Stack>

                <TextField
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    fullWidth
                    placeholder="e.g. Migrated from Tally as on 01-Apr-2025"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving}
                    size="large"
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, bgcolor: '#2563eb', py: 1.4 }}
                >
                    {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Opening Stock'}
                </Button>
            </Stack>
        </Box>
    );
};

/* ─── bulk import ───────────────────────────────────────────────────────────── */
const BulkImportSection = ({ onSuccess }) => {
    const { user } = useAuth();
    const [rows, setRows]           = useState([]);       // parsed rows with lookup result
    const [importing, setImporting] = useState(false);
    const [progress, setProgress]   = useState(0);
    const [results, setResults]     = useState(null);     // { success, failed }
    const [fileError, setFileError] = useState('');

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileError(''); setRows([]); setResults(null);
        try {
            const data = await file.arrayBuffer();
            const wb   = XLSX.read(data);
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (!raw.length) { setFileError('File is empty.'); return; }
            // validate required columns
            const missing = ['itemCode', 'quantity', 'costPerUnit'].filter(c => !(c in raw[0]));
            if (missing.length) { setFileError(`Missing columns: ${missing.join(', ')}`); return; }

            setRows(raw.map((r, i) => ({
                _idx:        i + 2,           // 1-based + header row
                itemCode:    String(r.itemCode || '').trim(),
                quantity:    Number(r.quantity  || 0),
                costPerUnit: Number(r.costPerUnit || 0),
                batchNo:     String(r.batchNo  || '').trim(),
                notes:       String(r.notes    || '').trim(),
                _status:     'pending',
                _error:      '',
            })));
        } catch (err) {
            setFileError('Could not parse file. Make sure it is a valid Excel (.xlsx) file.');
        }
        e.target.value = '';
    };

    const startImport = async () => {
        if (!rows.length) return;
        setImporting(true); setProgress(0);

        let successCount = 0;
        let failedCount  = 0;
        const updated = [...rows];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                // look up item by code
                const search = await searchInventoryItems({ query: row.itemCode, page: 0, size: 5 });
                const found  = (search?.content || []).find(it => it.itemCode === row.itemCode);

                if (!found) throw new Error(`Item code "${row.itemCode}" not found`);
                if (row.quantity <= 0) throw new Error('Quantity must be > 0');
                if (row.costPerUnit < 0) throw new Error('Cost per unit cannot be negative');

                await receiveStock({
                    inventoryItemId:     found.inventoryItemId,
                    procurementDecision: 'OPENING_STOCK',
                    referenceId:         0,
                    quantity:            row.quantity,
                    costPerUnit:         row.costPerUnit,
                    createdBy:           user?.username || 'system',
                });

                updated[i] = { ...row, _status: 'success', _itemName: found.name, _uom: found.uom };
                successCount++;
            } catch (e) {
                updated[i] = { ...row, _status: 'error', _error: e.message || 'Unknown error' };
                failedCount++;
            }
            setRows([...updated]);
            setProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        setResults({ success: successCount, failed: failedCount });
        setImporting(false);
        if (successCount > 0) onSuccess?.();
    };

    return (
        <Box>
            {/* info banner */}
            <Box sx={{ p: 2.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#1e40af" gutterBottom>
                    Bulk Opening Stock Import
                </Typography>
                <Typography variant="body2" color="#1e40af" sx={{ mb: 1.5 }}>
                    Use this to migrate opening stock balances from Tally, Excel, or any other system.
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    onClick={downloadTemplate}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#93c5fd', color: '#1d4ed8' }}
                >
                    Download Template (.xlsx)
                </Button>
            </Box>

            {/* upload */}
            {!rows.length && (
                <Box
                    component="label"
                    sx={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: '2px dashed #cbd5e1', borderRadius: 3, p: 5, cursor: 'pointer',
                        bgcolor: '#f8fafc', transition: 'all 0.2s',
                        '&:hover': { borderColor: '#2563eb', bgcolor: '#eff6ff' },
                    }}
                >
                    <Upload sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                        Click to upload Excel file
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        .xlsx format · Must have columns: itemCode, quantity, costPerUnit
                    </Typography>
                    <input type="file" accept=".xlsx,.xls" hidden onChange={handleFile} />
                </Box>
            )}

            {fileError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{fileError}</Alert>}

            {/* preview + import */}
            {rows.length > 0 && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {rows.length} rows ready to import
                        </Typography>
                        <Stack direction="row" spacing={1.5}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Close />}
                                onClick={() => { setRows([]); setResults(null); }}
                                sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#e2e8f0', color: '#64748b' }}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={importing ? null : <Inbox />}
                                onClick={startImport}
                                disabled={importing}
                                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, bgcolor: '#2563eb' }}
                            >
                                {importing ? `Importing… (${progress}%)` : `Import ${rows.length} Items`}
                            </Button>
                        </Stack>
                    </Box>

                    {importing && <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, borderRadius: 4, height: 6 }} />}

                    {results && (
                        <Alert
                            severity={results.failed === 0 ? 'success' : results.success === 0 ? 'error' : 'warning'}
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            Import complete — <strong>{results.success}</strong> succeeded, <strong>{results.failed}</strong> failed.
                        </Alert>
                    )}

                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={HEADER_SX}>Row</TableCell>
                                    <TableCell sx={HEADER_SX}>Item Code</TableCell>
                                    <TableCell sx={HEADER_SX}>Item Name</TableCell>
                                    <TableCell align="right" sx={HEADER_SX}>Quantity</TableCell>
                                    <TableCell align="right" sx={HEADER_SX}>Cost/Unit</TableCell>
                                    <TableCell sx={HEADER_SX}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row._idx} sx={{ bgcolor: row._status === 'error' ? '#fff1f2' : row._status === 'success' ? '#f0fdf4' : undefined }}>
                                        <TableCell><Typography variant="caption" color="text.secondary">#{row._idx}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" fontWeight={700}>{row.itemCode}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {row._itemName || (row._status === 'pending' ? '—' : '')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{row.quantity} {row._uom || ''}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">₹{row.costPerUnit}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {row._status === 'pending'  && <Chip label="Pending" size="small" sx={{ height: 20, bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }} />}
                                            {row._status === 'success'  && <Chip label="Saved" size="small" icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} sx={{ height: 20, bgcolor: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 700 }} />}
                                            {row._status === 'error'    && (
                                                <Tooltip title={row._error} arrow>
                                                    <Chip label="Failed" size="small" icon={<ErrorOutline sx={{ fontSize: '14px !important' }} />} sx={{ height: 20, bgcolor: '#fee2e2', color: '#b91c1c', fontSize: '0.65rem', fontWeight: 700 }} />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}
        </Box>
    );
};

/* ─── main page ─────────────────────────────────────────────────────────────── */
const OpeningStockPage = ({ onSuccess }) => {
    const [mode, setMode] = useState('single'); // 'single' | 'bulk'

    return (
        <Box>
            {/* header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={800} color="#0f172a">Opening Stock Entry</Typography>
                <Typography variant="body2" color="text.secondary">
                    Record initial stock balances when going live. Use single entry for a few items or bulk import for migration from Tally / Excel.
                </Typography>
            </Box>

            {/* info */}
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }} icon={<WarningAmber />}>
                Opening stock should be entered <strong>once</strong> at the time of going live. Subsequent stock should come through GRN (Purchase) or Work Order completion.
            </Alert>

            {/* mode switcher */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                <Button
                    variant={mode === 'single' ? 'contained' : 'outlined'}
                    onClick={() => setMode('single')}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, ...(mode === 'single' ? { bgcolor: '#2563eb' } : { borderColor: '#e2e8f0', color: '#475569' }) }}
                >
                    Single Item Entry
                </Button>
                <Button
                    variant={mode === 'bulk' ? 'contained' : 'outlined'}
                    startIcon={<Upload />}
                    onClick={() => setMode('bulk')}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, ...(mode === 'bulk' ? { bgcolor: '#2563eb' } : { borderColor: '#e2e8f0', color: '#475569' }) }}
                >
                    Bulk Import (Excel)
                </Button>
            </Stack>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                {mode === 'single'
                    ? <SingleEntryForm onSuccess={onSuccess} />
                    : <BulkImportSection onSuccess={onSuccess} />
                }
            </Paper>
        </Box>
    );
};

export default OpeningStockPage;
