import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Chip, Button, CircularProgress, IconButton, Tooltip,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
    FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import {
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
} from '../../services/testTemplateService';

const INSPECTION_TYPES = [
    'VISUAL',
    'DIMENSIONAL',
    'FUNCTIONAL',
    'MATERIAL_TEST',
    'WEIGHT_CHECK',
    'PRESSURE_TEST',
    'ELECTRICAL_TEST',
];

const headerSx = {
    background: '#0b1b2b',
    color: '#e6edf5',
    fontWeight: 600,
    fontSize: '0.8rem',
    py: 1,
    whiteSpace: 'nowrap',
};

const EMPTY_FORM = {
    testName: '',
    inspectionType: 'VISUAL',
    sampleSize: 1,
    isMandatory: false,
    sequence: '',
    acceptanceCriteria: '',
    unitOfMeasure: '',
    minValue: '',
    maxValue: '',
    active: true,
};

export default function TestTemplateSection({ itemId, setError, setSnackbar }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadTemplates = useCallback(async () => {
        if (!itemId) return;
        try {
            setLoading(true);
            const response = await getAllTemplates(itemId);
            const rows = Array.isArray(response) ? response : Array.isArray(response?.content) ? response.content : Array.isArray(response?.data) ? response.data : [];
            setTemplates(rows);
        } catch (error) {
            if (setError) setError(error?.response?.data?.error || 'Failed to load test templates.');
        } finally {
            setLoading(false);
        }
    }, [itemId, setError]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleOpenCreate = () => {
        setEditingTemplate(null);
        setFormData({ ...EMPTY_FORM, sequence: (templates.length + 1) * 10 });
        setDialogOpen(true);
    };

    const handleOpenEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            testName: template.testName || '',
            inspectionType: template.inspectionType || 'IN_PROCESS',
            sampleSize: template.sampleSize ?? 1,
            isMandatory: template.isMandatory ?? false,
            sequence: template.sequence ?? '',
            acceptanceCriteria: template.acceptanceCriteria || '',
            unitOfMeasure: template.unitOfMeasure || '',
            minValue: template.minValue ?? '',
            maxValue: template.maxValue ?? '',
            active: template.active ?? true,
        });
        setDialogOpen(true);
    };

    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.testName.trim()) {
            if (setError) setError('Test name is required.');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                inventoryItemId: Number(itemId),
                testName: formData.testName,
                inspectionType: formData.inspectionType || null,
                sampleSize: Number(formData.sampleSize) || 1,
                isMandatory: Boolean(formData.isMandatory),
                sequence: formData.sequence !== '' ? Number(formData.sequence) : null,
                acceptanceCriteria: formData.acceptanceCriteria || null,
                unitOfMeasure: formData.unitOfMeasure || null,
                minValue: formData.minValue !== '' ? Number(formData.minValue) : null,
                maxValue: formData.maxValue !== '' ? Number(formData.maxValue) : null,
                active: formData.active,
            };

            if (editingTemplate?.id) {
                await updateTemplate(editingTemplate.id, payload);
                if (setSnackbar) setSnackbar('Test template updated successfully.', 'success');
            } else {
                await createTemplate(payload);
                if (setSnackbar) setSnackbar('Test template created successfully.', 'success');
            }
            setDialogOpen(false);
            await loadTemplates();
        } catch (error) {
            if (setError) setError(error?.response?.data?.error || error?.response?.data?.message || 'Failed to save test template.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenDelete = (template) => {
        setTemplateToDelete(template);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!templateToDelete?.id) return;
        try {
            setDeleting(true);
            await deleteTemplate(templateToDelete.id);
            if (setSnackbar) setSnackbar('Test template deleted.', 'success');
            setDeleteDialogOpen(false);
            await loadTemplates();
        } catch (error) {
            if (setError) setError(error?.response?.data?.error || 'Failed to delete test template.');
        } finally {
            setDeleting(false);
        }
    };

    if (!itemId) return null;

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f2744" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.85rem' }}>
                    QC Test Templates
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleOpenCreate}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                    Add Template
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={24} />
                </Box>
            ) : templates.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center', background: '#fafbfc', borderRadius: 1.5, border: '1px dashed #e5e7eb' }}>
                    <Typography variant="body2" color="text.secondary">No test templates configured for this item.</Typography>
                    <Typography variant="caption" color="text.secondary">Add templates to enable QC testing on Work Orders.</Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerSx}>Seq</TableCell>
                                <TableCell sx={headerSx}>Test Name</TableCell>
                                <TableCell sx={headerSx}>Type</TableCell>
                                <TableCell sx={headerSx}>Range (Min – Max)</TableCell>
                                <TableCell sx={headerSx}>UoM</TableCell>
                                <TableCell sx={headerSx}>Sample</TableCell>
                                <TableCell sx={headerSx}>Mandatory</TableCell>
                                <TableCell sx={headerSx}>Status</TableCell>
                                <TableCell sx={headerSx}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {templates.map((t, idx) => (
                                <TableRow key={t.id || idx} sx={{ '&:hover': { bgcolor: '#f0f4f8' }, opacity: t.active === false ? 0.5 : 1 }}>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.sequence ?? '-'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.testName || '-'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        <Chip size="small" label={t.inspectionType || '-'} variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {t.minValue != null && t.maxValue != null ? `${t.minValue} – ${t.maxValue}` : '-'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.unitOfMeasure || '-'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.sampleSize ?? '-'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {t.isMandatory ? <Chip size="small" label="Yes" color="error" sx={{ fontSize: '0.65rem', height: 20 }} /> : 'No'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" label={t.active !== false ? 'Active' : 'Inactive'} color={t.active !== false ? 'success' : 'default'} sx={{ fontSize: '0.65rem', fontWeight: 600 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => handleOpenEdit(t)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" color="error" onClick={() => handleOpenDelete(t)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#0f2744' }}>
                    {editingTemplate ? 'Edit Test Template' : 'Add Test Template'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={8}>
                            <TextField label="Test Name *" fullWidth size="small" value={formData.testName} onChange={(e) => handleFormChange('testName', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Sequence" type="number" fullWidth size="small" value={formData.sequence} onChange={(e) => handleFormChange('sequence', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Inspection Type</InputLabel>
                                <Select value={formData.inspectionType} label="Inspection Type" onChange={(e) => handleFormChange('inspectionType', e.target.value)}>
                                    {INSPECTION_TYPES.map((t) => (
                                        <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Unit of Measure" fullWidth size="small" value={formData.unitOfMeasure} onChange={(e) => handleFormChange('unitOfMeasure', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Min Value" type="number" fullWidth size="small" value={formData.minValue} onChange={(e) => handleFormChange('minValue', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Max Value" type="number" fullWidth size="small" value={formData.maxValue} onChange={(e) => handleFormChange('maxValue', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Sample Size" type="number" fullWidth size="small" value={formData.sampleSize} onChange={(e) => handleFormChange('sampleSize', e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Acceptance Criteria" fullWidth size="small" multiline rows={2} value={formData.acceptanceCriteria} onChange={(e) => handleFormChange('acceptanceCriteria', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={formData.isMandatory} onChange={(e) => handleFormChange('isMandatory', e.target.checked)} />}
                                label="Mandatory"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={formData.active} onChange={(e) => handleFormChange('active', e.target.checked)} />}
                                label="Active"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Test Template</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Remove "{templateToDelete?.testName}"? This will deactivate the template.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
