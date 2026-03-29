import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Add, ArrowBack, Delete } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    createJobWorkChallan,
    getJobWorkChallan,
    getVendorDropdown,
    getWorkOrderForChallan,
    searchInventoryItemsForChallan,
    searchWorkOrdersForChallan,
    updateJobWorkChallan,
} from '../../../services/jobWorkChallanService';

const BORDER_COLOR = '#e5e7eb';
const HEADER_BG = '#0f2744';

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.78rem',
    py: 1,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
};

const UOM_OPTIONS = ['KG', 'NOS', 'MTR', 'LTR', 'PCS', 'SQM', 'FT', 'INCH', 'MT', 'TON', 'GMS', 'SET', 'BOX', 'RFT', 'SQF'];

const fieldSx = {
    '& .MuiInputBase-input': { fontSize: 13.5 },
    '& .MuiInputLabel-root': { fontSize: 13.5 },
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.5,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
    },
};

const SectionHeading = ({ children }) => (
    <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
        <Typography variant="subtitle2" fontWeight={700} color="#0f2744"
            sx={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {children}
        </Typography>
    </Box>
);

const emptyLine = () => ({
    _key: Math.random().toString(36).slice(2),
    inventoryItemId: null,
    selectedItem: null,
    description: '',
    hsnCode: '',
    quantityDispatched: '',
    uom: 'NOS',
    valuePerUnit: '',
    remarks: '',
});

export default function JobWorkChallanForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [isLoadingData, setIsLoadingData] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    // Vendor
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorsLoading, setVendorsLoading] = useState(false);

    // Work Order
    const [woOptions, setWoOptions] = useState([]);
    const [selectedWo, setSelectedWo] = useState(null);
    const [woSearch, setWoSearch] = useState('');
    const [woLoading, setWoLoading] = useState(false);

    // WO Operations
    const [woOperations, setWoOperations] = useState([]);
    const [selectedWoOp, setSelectedWoOp] = useState(null);

    // Header fields
    const [agreedRatePerUnit, setAgreedRatePerUnit] = useState('');
    const [dispatchDetails, setDispatchDetails] = useState('');
    const [remarks, setRemarks] = useState('');

    // Lines
    const [lines, setLines] = useState([emptyLine()]);

    // Item search per line
    const [itemOptions, setItemOptions] = useState([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [itemSearchTimers, setItemSearchTimers] = useState({});

    // Load vendors on mount
    useEffect(() => {
        const loadVendors = async () => {
            try {
                setVendorsLoading(true);
                const data = await getVendorDropdown();
                setVendorOptions(Array.isArray(data) ? data : []);
            } catch {
                setVendorOptions([]);
            } finally {
                setVendorsLoading(false);
            }
        };
        loadVendors();
    }, []);

    // Load existing challan for edit
    useEffect(() => {
        if (!isEdit) return;
        const loadChallan = async () => {
            try {
                setIsLoadingData(true);
                const data = await getJobWorkChallan(id);
                setSelectedVendor({ id: data.vendorId, companyName: data.vendorName, gstNumber: data.vendorGstNumber });
                if (data.workOrderId) {
                    setSelectedWo({ id: data.workOrderId, workOrderNumber: data.workOrderNumber });
                    setWoSearch(data.workOrderNumber || '');
                }
                if (data.workOrderOperationId) {
                    setSelectedWoOp({ id: data.workOrderOperationId, operationName: data.workOrderOperationName });
                }
                setAgreedRatePerUnit(data.agreedRatePerUnit ?? '');
                setDispatchDetails(data.dispatchDetails || '');
                setRemarks(data.remarks || '');
                if (Array.isArray(data.lines) && data.lines.length > 0) {
                    setLines(data.lines.map(l => ({
                        _key: Math.random().toString(36).slice(2),
                        inventoryItemId: l.inventoryItemId,
                        selectedItem: l.inventoryItemId ? { id: l.inventoryItemId, itemCode: l.itemCode, itemName: l.itemName } : null,
                        description: l.description || '',
                        hsnCode: l.hsnCode || '',
                        quantityDispatched: l.quantityDispatched ?? '',
                        uom: l.uom || 'NOS',
                        valuePerUnit: l.valuePerUnit ?? '',
                        remarks: l.remarks || '',
                    })));
                }
            } catch {
                setError('Failed to load challan data.');
            } finally {
                setIsLoadingData(false);
            }
        };
        loadChallan();
    }, [id, isEdit]);

    // WO search debounce
    useEffect(() => {
        if (!woSearch.trim()) { setWoOptions([]); return; }
        const timer = setTimeout(async () => {
            try {
                setWoLoading(true);
                const res = await searchWorkOrdersForChallan(woSearch);
                setWoOptions(Array.isArray(res?.content) ? res.content : []);
            } catch {
                setWoOptions([]);
            } finally {
                setWoLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [woSearch]);

    // Load WO operations when WO changes
    const handleWoSelect = useCallback(async (wo) => {
        setSelectedWo(wo);
        setSelectedWoOp(null);
        setWoOperations([]);
        if (!wo?.id) return;
        try {
            const details = await getWorkOrderForChallan(wo.id);
            setWoOperations(Array.isArray(details?.operations) ? details.operations : []);
        } catch {
            setWoOperations([]);
        }
    }, []);

    // Item search for a line
    const searchItems = useCallback((lineKey, query) => {
        setItemSearchTimers(prev => {
            if (prev[lineKey]) clearTimeout(prev[lineKey]);
            const timer = setTimeout(async () => {
                try {
                    setItemLoading(true);
                    const res = await searchInventoryItemsForChallan(query);
                    setItemOptions(Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : []);
                } catch {
                    setItemOptions([]);
                } finally {
                    setItemLoading(false);
                }
            }, 400);
            return { ...prev, [lineKey]: timer };
        });
    }, []);

    const updateLine = (key, field, value) => {
        setLines(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
        setFieldErrors(prev => {
            const next = { ...prev };
            delete next[`line_${key}_${field}`];
            return next;
        });
    };

    const handleItemSelect = (key, item) => {
        setLines(prev => prev.map(l => l._key === key ? {
            ...l,
            selectedItem: item,
            inventoryItemId: item?.id ?? null,
            description: item?.itemName || l.description,
            hsnCode: item?.hsnCode || l.hsnCode,
            uom: item?.uom || l.uom,
        } : l));
    };

    const addLine = () => setLines(prev => [...prev, emptyLine()]);
    const removeLine = (key) => setLines(prev => prev.filter(l => l._key !== key));

    const validate = () => {
        const errs = {};
        if (!selectedVendor) errs.vendor = 'Vendor is required';
        if (lines.length === 0) errs.lines = 'At least one line is required';
        lines.forEach(l => {
            if (!l.description.trim()) errs[`line_${l._key}_description`] = 'Required';
            const qty = parseFloat(l.quantityDispatched);
            if (!l.quantityDispatched || isNaN(qty) || qty <= 0) errs[`line_${l._key}_quantityDispatched`] = 'Must be > 0';
        });
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const buildPayload = () => ({
        vendorId: selectedVendor?.id ?? null,
        workOrderId: selectedWo?.id ?? null,
        workOrderOperationId: selectedWoOp?.id ?? null,
        agreedRatePerUnit: agreedRatePerUnit !== '' ? parseFloat(agreedRatePerUnit) : null,
        dispatchDetails: dispatchDetails.trim() || null,
        remarks: remarks.trim() || null,
        lines: lines.map(l => ({
            inventoryItemId: l.inventoryItemId ?? null,
            description: l.description.trim(),
            hsnCode: l.hsnCode.trim() || null,
            quantityDispatched: parseFloat(l.quantityDispatched) || 0,
            uom: l.uom,
            valuePerUnit: l.valuePerUnit !== '' ? parseFloat(l.valuePerUnit) : null,
            remarks: l.remarks.trim() || null,
        })),
    });

    const handleSave = async () => {
        if (!validate()) return;
        try {
            setIsSaving(true);
            setError('');
            const payload = buildPayload();
            if (isEdit) {
                await updateJobWorkChallan(id, payload);
                navigate(`/production/job-work-challan/${id}`);
            } else {
                const created = await createJobWorkChallan(payload);
                navigate(`/production/job-work-challan/${created.id}`);
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save challan. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingData) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
                <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                <Typography variant="body2" color="text.secondary">Loading challan...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>
                {/* Header */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                    <IconButton size="small" onClick={() => navigate('/production/job-work-challan')}
                        sx={{ color: '#374151' }}>
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="#0f2744">
                            {isEdit ? 'Edit Job Work Challan' : 'New Job Work Challan'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isEdit ? 'Update draft challan details' : 'Create a new dispatch challan for subcontractor job work'}
                        </Typography>
                    </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

                {/* Header Section */}
                <SectionHeading>Challan Details</SectionHeading>

                <Grid container spacing={2}>
                    {/* Vendor */}
                    <Grid item xs={12} sm={6}>
                        <Autocomplete
                            options={vendorOptions}
                            loading={vendorsLoading}
                            value={selectedVendor}
                            onChange={(_, val) => { setSelectedVendor(val); setFieldErrors(p => ({ ...p, vendor: null })); }}
                            getOptionLabel={o => o ? `${o.contactCode || ''} — ${o.companyName}${o.gstNumber ? ` (GST: ${o.gstNumber})` : ''}` : ''}
                            isOptionEqualToValue={(o, v) => o.id === v?.id}
                            renderInput={params => (
                                <TextField {...params} label="Vendor *" size="small" sx={fieldSx}
                                    error={!!fieldErrors.vendor} helperText={fieldErrors.vendor}
                                    InputProps={{ ...params.InputProps, endAdornment: <>{vendorsLoading ? <CircularProgress size={14} /> : null}{params.InputProps.endAdornment}</> }}
                                />
                            )}
                            renderOption={(props, o) => (
                                <Box component="li" {...props} key={o.id}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{o.companyName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{o.contactCode}{o.gstNumber ? ` | GST: ${o.gstNumber}` : ''}</Typography>
                                    </Box>
                                </Box>
                            )}
                        />
                    </Grid>

                    {/* Work Order */}
                    <Grid item xs={12} sm={6}>
                        <Autocomplete
                            options={woOptions}
                            loading={woLoading}
                            value={selectedWo}
                            inputValue={woSearch}
                            onInputChange={(_, val) => setWoSearch(val)}
                            onChange={(_, val) => handleWoSelect(val)}
                            getOptionLabel={o => o?.workOrderNumber || ''}
                            isOptionEqualToValue={(o, v) => o.id === v?.id}
                            filterOptions={x => x}
                            renderInput={params => (
                                <TextField {...params} label="Work Order (optional)" size="small" sx={fieldSx}
                                    placeholder="Type to search..."
                                    InputProps={{ ...params.InputProps, endAdornment: <>{woLoading ? <CircularProgress size={14} /> : null}{params.InputProps.endAdornment}</> }}
                                />
                            )}
                        />
                    </Grid>

                    {/* WO Operation */}
                    {woOperations.length > 0 && (
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={woOperations}
                                value={selectedWoOp}
                                onChange={(_, val) => setSelectedWoOp(val)}
                                getOptionLabel={o => o?.operationName || ''}
                                isOptionEqualToValue={(o, v) => o.id === v?.id}
                                renderInput={params => (
                                    <TextField {...params} label="Work Order Operation (optional)" size="small" sx={fieldSx} />
                                )}
                            />
                        </Grid>
                    )}

                    {/* Agreed Rate */}
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Agreed Rate / Unit (₹)" size="small" sx={fieldSx}
                            type="number" inputProps={{ min: 0, step: 'any' }}
                            value={agreedRatePerUnit}
                            onChange={e => setAgreedRatePerUnit(e.target.value)}
                            placeholder="Optional"
                        />
                    </Grid>

                    {/* Dispatch Details */}
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Dispatch Details" size="small" sx={fieldSx}
                            value={dispatchDetails}
                            onChange={e => setDispatchDetails(e.target.value)}
                            placeholder="e.g. Via DTDC courier"
                        />
                    </Grid>

                    {/* Remarks */}
                    <Grid item xs={12}>
                        <TextField fullWidth label="Remarks" size="small" sx={fieldSx}
                            multiline rows={2}
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </Grid>
                </Grid>

                {/* Material Lines */}
                <SectionHeading>Material Lines</SectionHeading>

                {fieldErrors.lines && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 1.5 }}>{fieldErrors.lines}</Alert>}

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflowX: 'auto', mb: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headerCellSx, minWidth: 220 }}>Item / Description *</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }}>HSN Code</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }}>Qty Dispatched *</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 110 }}>UOM</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 140 }}>Value/Unit (₹)</TableCell>
                                <TableCell sx={{ ...headerCellSx, minWidth: 160 }}>Remarks</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 50, textAlign: 'center' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, idx) => (
                                <TableRow key={line._key}
                                    sx={{ bgcolor: idx % 2 === 0 ? '#fafbfc' : '#fff', '& td': { py: 0.75, borderBottom: `1px solid ${BORDER_COLOR}` } }}>
                                    {/* Item / Description */}
                                    <TableCell>
                                        <Autocomplete
                                            options={itemOptions}
                                            loading={itemLoading}
                                            value={line.selectedItem}
                                            onChange={(_, val) => handleItemSelect(line._key, val)}
                                            onInputChange={(_, val) => { if (val) searchItems(line._key, val); }}
                                            getOptionLabel={o => o ? `${o.itemCode || ''} — ${o.itemName || ''}` : ''}
                                            isOptionEqualToValue={(o, v) => o.id === v?.id}
                                            filterOptions={x => x}
                                            freeSolo
                                            renderInput={params => (
                                                <TextField {...params} size="small" placeholder="Search item or type description"
                                                    error={!!fieldErrors[`line_${line._key}_description`]}
                                                    sx={{ minWidth: 200, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                                    InputProps={{ ...params.InputProps, endAdornment: <>{itemLoading ? <CircularProgress size={12} /> : null}{params.InputProps.endAdornment}</> }}
                                                />
                                            )}
                                        />
                                        {!line.selectedItem && (
                                            <TextField
                                                size="small"
                                                placeholder="Description *"
                                                value={line.description}
                                                onChange={e => updateLine(line._key, 'description', e.target.value)}
                                                error={!!fieldErrors[`line_${line._key}_description`]}
                                                helperText={fieldErrors[`line_${line._key}_description`]}
                                                sx={{ mt: 0.5, minWidth: 200, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                            />
                                        )}
                                    </TableCell>
                                    {/* HSN */}
                                    <TableCell>
                                        <TextField size="small" value={line.hsnCode}
                                            onChange={e => updateLine(line._key, 'hsnCode', e.target.value.slice(0, 8))}
                                            placeholder="8 chars"
                                            sx={{ width: 110, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                        />
                                    </TableCell>
                                    {/* Qty */}
                                    <TableCell>
                                        <TextField size="small" type="number" value={line.quantityDispatched}
                                            onChange={e => updateLine(line._key, 'quantityDispatched', e.target.value)}
                                            error={!!fieldErrors[`line_${line._key}_quantityDispatched`]}
                                            helperText={fieldErrors[`line_${line._key}_quantityDispatched`]}
                                            inputProps={{ min: 0, step: 'any' }}
                                            placeholder="0"
                                            sx={{ width: 110, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                        />
                                    </TableCell>
                                    {/* UOM */}
                                    <TableCell>
                                        <TextField select size="small" value={line.uom}
                                            onChange={e => updateLine(line._key, 'uom', e.target.value)}
                                            sx={{ width: 100, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}>
                                            {UOM_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                        </TextField>
                                    </TableCell>
                                    {/* Value/Unit */}
                                    <TableCell>
                                        <TextField size="small" type="number" value={line.valuePerUnit}
                                            onChange={e => updateLine(line._key, 'valuePerUnit', e.target.value)}
                                            inputProps={{ min: 0, step: 'any' }}
                                            placeholder="0.00"
                                            sx={{ width: 130, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                        />
                                    </TableCell>
                                    {/* Remarks */}
                                    <TableCell>
                                        <TextField size="small" value={line.remarks}
                                            onChange={e => updateLine(line._key, 'remarks', e.target.value)}
                                            placeholder="Optional"
                                            sx={{ minWidth: 150, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                        />
                                    </TableCell>
                                    {/* Remove */}
                                    <TableCell align="center">
                                        <Tooltip title="Remove line">
                                            <span>
                                                <IconButton size="small" onClick={() => removeLine(line._key)}
                                                    disabled={lines.length === 1}
                                                    sx={{ color: lines.length === 1 ? '#d1d5db' : '#d32f2f' }}>
                                                    <Delete sx={{ fontSize: 17 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Button size="small" startIcon={<Add />} onClick={addLine}
                    sx={{ textTransform: 'none', color: '#1565c0', fontWeight: 600, mb: 3 }}>
                    Add Line
                </Button>

                <Divider sx={{ my: 2 }} />

                {/* Footer actions */}
                <Box display="flex" justifyContent="flex-end" gap={1.5}>
                    <Button onClick={() => navigate(isEdit ? `/production/job-work-challan/${id}` : '/production/job-work-challan')}
                        disabled={isSaving}
                        sx={{ textTransform: 'none', color: '#374151' }}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSave} disabled={isSaving}
                        sx={{
                            textTransform: 'none', fontWeight: 600,
                            bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                            minWidth: 140,
                        }}>
                        {isSaving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : isEdit ? 'Update Draft' : 'Save as Draft'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
