import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Chip, CircularProgress, Button,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
    FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import dayjs from 'dayjs';
import { getWorkOrderTests, recordTestResult, downloadQcTestReport } from '../../../../services/workOrderService';

const RESULT_COLORS = {
    PASS: '#22c55e',
    FAIL: '#ef4444',
    CONDITIONAL_PASS: '#eab308',
    PENDING: '#9ca3af',
};

const headerSx = {
    background: '#0b1b2b',
    color: '#e6edf5',
    fontWeight: 600,
    fontSize: '0.8rem',
    py: 1,
    whiteSpace: 'nowrap',
};

export default function WorkOrderQCTab({ workOrderId, setError, setSnackbar }) {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [recordDialogOpen, setRecordDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    const [formData, setFormData] = useState({
        resultValue: '',
        testedQuantity: '',
        passedQuantity: '',
        failedQuantity: '',
        result: 'PENDING',
        testedBy: '',
        testDate: dayjs().format('YYYY-MM-DD'),
        remarks: '',
    });

    const extractArray = (response) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.content)) return response.content;
        if (Array.isArray(response?.data)) return response.data;
        return [];
    };

    const loadTests = useCallback(async () => {
        if (!workOrderId) return;
        try {
            setLoading(true);
            const response = await getWorkOrderTests(workOrderId);
            setTests(extractArray(response));
        } catch (error) {
            setError(error?.response?.data?.error || 'Failed to load QC test results.');
        } finally {
            setLoading(false);
        }
    }, [workOrderId, setError]);

    useEffect(() => {
        loadTests();
    }, [loadTests]);

    const handleOpenRecordDialog = (test) => {
        setSelectedTest(test);
        setFormData({
            resultValue: test.resultValue ?? '',
            testedQuantity: test.testedQuantity ?? '',
            passedQuantity: test.passedQuantity ?? '',
            failedQuantity: test.failedQuantity ?? '',
            result: test.result || 'PENDING',
            testedBy: test.testedBy || '',
            testDate: test.testDate ? dayjs(test.testDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            remarks: test.remarks || '',
        });
        setRecordDialogOpen(true);
    };

    const handleFormChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            // Auto pass/fail if resultValue is entered and min/max are available
            if (field === 'resultValue' && selectedTest) {
                const numVal = Number(value);
                if (!Number.isNaN(numVal) && value !== '') {
                    const min = selectedTest.minValue;
                    const max = selectedTest.maxValue;
                    if (min !== null && min !== undefined && max !== null && max !== undefined) {
                        next.result = numVal >= min && numVal <= max ? 'PASS' : 'FAIL';
                    }
                }
            }
            return next;
        });
    };

    const handleSaveResult = async () => {
        if (!selectedTest?.id) return;
        try {
            setSaving(true);
            await recordTestResult(workOrderId, selectedTest.id, {
                ...formData,
                resultValue: formData.resultValue !== '' ? Number(formData.resultValue) : null,
                testedQuantity: formData.testedQuantity !== '' ? Number(formData.testedQuantity) : null,
                passedQuantity: formData.passedQuantity !== '' ? Number(formData.passedQuantity) : null,
                failedQuantity: formData.failedQuantity !== '' ? Number(formData.failedQuantity) : null,
            });
            if (setSnackbar) setSnackbar('Test result recorded successfully.', 'success');
            setRecordDialogOpen(false);
            await loadTests();
        } catch (error) {
            setError(error?.response?.data?.error || 'Failed to save test result.');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setReportLoading(true);
            await downloadQcTestReport(workOrderId);
        } catch (error) {
            setError(error?.response?.data?.error || 'Failed to generate QC report.');
        } finally {
            setReportLoading(false);
        }
    };

    const getAutoHint = (test) => {
        if (!test || test.resultValue === null || test.resultValue === undefined) return null;
        const val = Number(test.resultValue);
        if (Number.isNaN(val)) return null;
        const min = test.minValue;
        const max = test.maxValue;
        if (min !== null && min !== undefined && max !== null && max !== undefined) {
            return val >= min && val <= max;
        }
        return null;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f2744">
                    Quality Control Tests
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    onClick={handleGenerateReport}
                    disabled={reportLoading || tests.length === 0}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                >
                    {reportLoading ? 'Generating...' : 'Generate QC Report'}
                </Button>
            </Box>

            {tests.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center', background: '#fafbfc', borderRadius: 1.5, border: '1px dashed #e5e7eb' }}>
                    <Typography variant="body2" color="text.secondary">No QC tests found for this work order.</Typography>
                    <Typography variant="caption" color="text.secondary">Tests are auto-created from item templates when the work order is created.</Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 2, overflowX: 'auto', width: '100%' }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerSx}>#</TableCell>
                                <TableCell sx={headerSx}>Test Name</TableCell>
                                <TableCell sx={headerSx}>Type</TableCell>
                                <TableCell sx={headerSx}>Range</TableCell>
                                <TableCell sx={headerSx}>Sample</TableCell>
                                <TableCell sx={headerSx}>Value</TableCell>
                                <TableCell sx={headerSx}>Result</TableCell>
                                <TableCell sx={headerSx}>Tested By</TableCell>
                                <TableCell sx={headerSx}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tests.map((test, idx) => {
                                const autoHint = getAutoHint(test);
                                return (
                                    <TableRow key={test.id || idx} sx={{ '&:hover': { bgcolor: '#f0f4f8' }, cursor: 'pointer' }} onClick={() => handleOpenRecordDialog(test)}>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{test.sequence ?? idx + 1}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                            {test.testName || '-'}
                                            {test.isMandatory && <Chip size="small" label="Mandatory" color="error" variant="outlined" sx={{ ml: 0.5, fontSize: '0.6rem', height: 18 }} />}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                            <Chip size="small" label={test.inspectionType || '-'} variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                            {test.minValue != null && test.maxValue != null
                                                ? `${test.minValue} – ${test.maxValue} ${test.unitOfMeasure || ''}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{test.sampleSize ?? '-'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                            {test.resultValue != null ? test.resultValue : '-'}
                                            {autoHint !== null && (
                                                <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>
                                                    {autoHint ? '✓' : '✗'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={test.result || 'PENDING'}
                                                sx={{
                                                    bgcolor: RESULT_COLORS[test.result] || RESULT_COLORS.PENDING,
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    minWidth: 70,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{test.testedBy || '-'}</TableCell>
                                        <TableCell>
                                            <Button size="small" sx={{ textTransform: 'none', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleOpenRecordDialog(test); }}>
                                                Record
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Record Result Dialog */}
            <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#0f2744' }}>
                    Record Test Result — {selectedTest?.testName || ''}
                </DialogTitle>
                <DialogContent>
                    {/* Info row */}
                    {selectedTest && (
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                            <Typography variant="caption" display="block" color="text.secondary">
                                <strong>Type:</strong> {selectedTest.inspectionType} | <strong>Range:</strong>{' '}
                                {selectedTest.minValue != null && selectedTest.maxValue != null
                                    ? `${selectedTest.minValue} – ${selectedTest.maxValue} ${selectedTest.unitOfMeasure || ''}`
                                    : 'N/A'}{' '}
                                | <strong>Criteria:</strong> {selectedTest.acceptanceCriteria || 'N/A'}
                            </Typography>
                        </Box>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Result Value"
                                type="number"
                                fullWidth
                                size="small"
                                value={formData.resultValue}
                                onChange={(e) => handleFormChange('resultValue', e.target.value)}
                                helperText={
                                    selectedTest?.minValue != null && selectedTest?.maxValue != null
                                        ? `Acceptable: ${selectedTest.minValue} – ${selectedTest.maxValue} ${selectedTest.unitOfMeasure || ''}`
                                        : ''
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Result</InputLabel>
                                <Select
                                    value={formData.result}
                                    label="Result"
                                    onChange={(e) => handleFormChange('result', e.target.value)}
                                >
                                    <MenuItem value="PENDING">Pending</MenuItem>
                                    <MenuItem value="PASS">Pass</MenuItem>
                                    <MenuItem value="FAIL">Fail</MenuItem>
                                    <MenuItem value="CONDITIONAL_PASS">Conditional Pass</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tested Qty" type="number" fullWidth size="small" value={formData.testedQuantity} onChange={(e) => handleFormChange('testedQuantity', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Passed Qty" type="number" fullWidth size="small" value={formData.passedQuantity} onChange={(e) => handleFormChange('passedQuantity', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Failed Qty" type="number" fullWidth size="small" value={formData.failedQuantity} onChange={(e) => handleFormChange('failedQuantity', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Tested By" fullWidth size="small" value={formData.testedBy} onChange={(e) => handleFormChange('testedBy', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Test Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={formData.testDate} onChange={(e) => handleFormChange('testDate', e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Remarks" fullWidth size="small" multiline rows={2} value={formData.remarks} onChange={(e) => handleFormChange('remarks', e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRecordDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleSaveResult} variant="contained" disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        {saving ? 'Saving...' : 'Save Result'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
