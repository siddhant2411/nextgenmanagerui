import React, { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton,
    InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell,
    TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, CheckCircle, Delete, Edit, Warning } from '@mui/icons-material';
import { addQaParameter, deleteQaParameter, getQaParameters, updateQaParameter } from '../../services/bomService';

const BORDER = '#e5e7eb';

const EMPTY_FORM = {
    name: '',
    parameterType: 'NUMERIC_RANGE',
    minValue: '',
    maxValue: '',
    unit: '',
    critical: false,
};

export default function BomQaPlan({ operations = [] }) {
    const inspectable = operations.filter(op => op.inspection);
    const [selectedOp, setSelectedOp] = useState(null);
    const [params, setParams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState({ open: false, entry: null });
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Auto-select first inspectable operation
    useEffect(() => {
        if (inspectable.length > 0 && !selectedOp) setSelectedOp(inspectable[0]);
    }, [inspectable.length]);

    useEffect(() => {
        if (!selectedOp?.id) { setParams([]); return; }
        setLoading(true);
        getQaParameters(selectedOp.id)
            .then(setParams)
            .catch(() => setParams([]))
            .finally(() => setLoading(false));
    }, [selectedOp?.id]);

    const openAdd = () => { setForm(EMPTY_FORM); setError(''); setDialog({ open: true, entry: null }); };
    const openEdit = (p) => {
        setForm({
            name: p.name,
            parameterType: p.parameterType,
            minValue: p.minValue ?? '',
            maxValue: p.maxValue ?? '',
            unit: p.unit ?? '',
            critical: p.critical ?? false,
        });
        setError('');
        setDialog({ open: true, entry: p });
    };
    const closeDialog = () => setDialog({ open: false, entry: null });

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Parameter name is required.'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                minValue: form.minValue !== '' ? Number(form.minValue) : null,
                maxValue: form.maxValue !== '' ? Number(form.maxValue) : null,
            };
            if (dialog.entry) {
                const updated = await updateQaParameter(dialog.entry.id, payload);
                setParams(prev => prev.map(p => p.id === updated.id ? updated : p));
            } else {
                const created = await addQaParameter(selectedOp.id, payload);
                setParams(prev => [...prev, created]);
            }
            closeDialog();
        } catch {
            setError('Failed to save parameter.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete parameter "${p.name}"?`)) return;
        try {
            await deleteQaParameter(p.id);
            setParams(prev => prev.filter(x => x.id !== p.id));
        } catch {
            // silent
        }
    };

    if (inspectable.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                No operations have "Requires Inspection" enabled. Go to the Operations tab and enable it on the relevant operations.
            </Alert>
        );
    }

    return (
        <Box sx={{ display: 'flex', gap: 2, mt: 1, height: '100%' }}>
            {/* Left — Operation list */}
            <Paper variant="outlined" sx={{ width: 220, flexShrink: 0, borderColor: BORDER, borderRadius: 1.5, overflow: 'hidden' }}>
                <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}`, bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Inspectable Operations
                    </Typography>
                </Box>
                {inspectable.map(op => (
                    <Box
                        key={op.id}
                        onClick={() => setSelectedOp(op)}
                        sx={{
                            px: 1.5, py: 1.25, cursor: 'pointer', borderBottom: `1px solid ${BORDER}`,
                            bgcolor: selectedOp?.id === op.id ? '#e8f4fd' : 'transparent',
                            borderLeft: selectedOp?.id === op.id ? '3px solid #1565c0' : '3px solid transparent',
                            '&:hover': { bgcolor: '#f0f7ff' },
                        }}
                    >
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: selectedOp?.id === op.id ? 700 : 500, color: '#0f2744' }}>
                            {op.sequenceNumber ? `${op.sequenceNumber}. ` : ''}{op.name || 'Unnamed'}
                        </Typography>
                    </Box>
                ))}
            </Paper>

            {/* Right — Parameters */}
            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f2744' }}>
                        {selectedOp?.name} — QA Parameters
                    </Typography>
                    <Button
                        size="small" startIcon={<Add />} variant="contained" disableElevation
                        sx={{ fontSize: '0.75rem', textTransform: 'none', bgcolor: '#1565c0', borderRadius: 1 }}
                        onClick={openAdd}
                    >
                        Add Parameter
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : params.length === 0 ? (
                    <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                        No QA parameters defined for this operation. Click "Add Parameter" to start.
                    </Alert>
                ) : (
                    <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 1.5, overflow: 'hidden' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    {['Parameter', 'Type', 'Min', 'Max', 'Unit', 'Critical', ''].map(h => (
                                        <TableCell key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', py: 0.75 }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {params.map(p => (
                                    <TableRow key={p.id} hover>
                                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{p.name}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            {p.parameterType === 'NUMERIC_RANGE' ? 'Numeric Range' : 'Pass/Fail'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{p.minValue ?? '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{p.maxValue ?? '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{p.unit || '—'}</TableCell>
                                        <TableCell>
                                            {p.critical
                                                ? <Tooltip title="Critical — batch auto-rejected on failure"><Warning sx={{ fontSize: 16, color: '#d32f2f' }} /></Tooltip>
                                                : <CheckCircle sx={{ fontSize: 16, color: '#c8e6c9' }} />}
                                        </TableCell>
                                        <TableCell sx={{ py: 0.5 }}>
                                            <IconButton size="small" onClick={() => openEdit(p)}><Edit sx={{ fontSize: 14 }} /></IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(p)} color="error"><Delete sx={{ fontSize: 14 }} /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>

            {/* Add / Edit Dialog */}
            <Dialog open={dialog.open} onClose={closeDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 600, pb: 1 }}>
                    {dialog.entry ? 'Edit Parameter' : 'Add QA Parameter'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    {error && <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>}

                    <TextField
                        label="Parameter Name" size="small" fullWidth required
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />

                    <FormControl size="small" fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select label="Type" value={form.parameterType}
                            onChange={e => setForm(f => ({ ...f, parameterType: e.target.value }))}>
                            <MenuItem value="NUMERIC_RANGE">Numeric Range</MenuItem>
                            <MenuItem value="PASS_FAIL">Pass / Fail</MenuItem>
                        </Select>
                    </FormControl>

                    {form.parameterType === 'NUMERIC_RANGE' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField label="Min Value" size="small" type="number" fullWidth
                                value={form.minValue} onChange={e => setForm(f => ({ ...f, minValue: e.target.value }))} />
                            <TextField label="Max Value" size="small" type="number" fullWidth
                                value={form.maxValue} onChange={e => setForm(f => ({ ...f, maxValue: e.target.value }))} />
                        </Box>
                    )}

                    <TextField
                        label="Unit (e.g. mm, g, HRC)" size="small" fullWidth
                        value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                        disabled={form.parameterType === 'PASS_FAIL'}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox size="small" checked={form.critical}
                                onChange={e => setForm(f => ({ ...f, critical: e.target.checked }))} />
                        }
                        label={
                            <Typography sx={{ fontSize: '0.8rem' }}>
                                Critical — failure auto-rejects the entire batch
                            </Typography>
                        }
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button size="small" onClick={closeDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button size="small" variant="contained" disableElevation onClick={handleSave}
                        disabled={saving} sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
