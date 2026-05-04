import React, { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse,
    Dialog, DialogActions, DialogContent, DialogTitle, Divider,
    IconButton, Stack, Table, TableBody, TableCell, TableHead,
    TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Cancel, CheckCircle, ExpandLess, ExpandMore,
    HourglassEmpty, Warning,
} from '@mui/icons-material';
import { submitQaBatch } from '../../../../services/workOrderService';
import dayjs from 'dayjs';

const OVERALL = {
    PENDING: { label: 'Pending', color: '#78909c', bg: '#eceff1', icon: <HourglassEmpty sx={{ fontSize: 13 }} /> },
    PASS:    { label: 'All Pass', color: '#2e7d32', bg: '#e8f5e9', icon: <CheckCircle sx={{ fontSize: 13 }} /> },
    FAIL:    { label: 'Failed',   color: '#c62828', bg: '#ffebee', icon: <Cancel sx={{ fontSize: 13 }} /> },
};

function ResultChip({ result }) {
    const cfg = OVERALL[result] || OVERALL.PENDING;
    return (
        <Chip icon={cfg.icon} label={cfg.label} size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: cfg.bg, color: cfg.color }} />
    );
}

function HistoryRow({ results }) {
    const [open, setOpen] = useState(false);
    if (!results?.length) return null;
    return (
        <Box>
            <Button size="small" onClick={() => setOpen(o => !o)}
                startIcon={open ? <ExpandLess sx={{ fontSize: 13 }} /> : <ExpandMore sx={{ fontSize: 13 }} />}
                sx={{ fontSize: '0.68rem', textTransform: 'none', color: '#64748b', p: 0, mt: 0.5 }}>
                History ({results.length})
            </Button>
            <Collapse in={open}>
                <Box sx={{ mt: 0.5, pl: 1 }}>
                    {results.map(r => (
                        <Box key={r.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 0.25 }}>
                            {r.result === 'PASS'
                                ? <CheckCircle sx={{ fontSize: 12, color: '#2e7d32' }} />
                                : <Cancel sx={{ fontSize: 12, color: '#c62828' }} />}
                            <Typography sx={{ fontSize: '0.7rem', color: '#374151' }}>
                                {r.checkedQuantity != null ? `${r.checkedQuantity} units — ` : ''}
                                {r.actualValue != null ? `${r.actualValue}` : r.passed ? 'Pass' : 'Fail'}
                                {r.checkedBy ? ` · ${r.checkedBy}` : ''}
                                {r.checkedAt ? ` · ${dayjs(r.checkedAt).format('DD MMM HH:mm')}` : ''}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
}

export default function QaCheckDialog({ open, onClose, operation, entries = [], batchQty, onSaved }) {
    const [checkedBy, setCheckedBy] = useState('');
    const [items, setItems] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            const init = {};
            entries.forEach(e => {
                init[e.id] = { actualValue: '', passed: false, remarks: '' };
            });
            setItems(init);
            setCheckedBy('');
            setError('');
        }
    }, [open, entries.length]);

    const setItem = (id, field, value) =>
        setItems(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await submitQaBatch(operation.id, {
                checkedQuantity: batchQty || null,
                checkedBy: checkedBy || null,
                items: entries.map(e => ({
                    entryId: e.id,
                    actualValue: e.parameterType === 'NUMERIC_RANGE' && items[e.id]?.actualValue !== ''
                        ? Number(items[e.id]?.actualValue) : null,
                    passed: e.parameterType === 'PASS_FAIL' ? !!items[e.id]?.passed : null,
                    remarks: items[e.id]?.remarks || null,
                })),
            });
            onSaved?.();
            onClose();
        } catch {
            setError('Failed to save QA results.');
        } finally {
            setSaving(false);
        }
    };

    const criticalFail = entries.some(e => e.overallResult === 'FAIL' && e.critical);
    const opName = operation?.operationName || operation?.routingOperation?.name;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2744' }}>
                            QA Check — {opName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {batchQty != null ? `Batch: ${batchQty} units · ` : ''}
                            {entries.length} parameter{entries.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        {entries.some(e => e.overallResult === 'FAIL') && <ResultChip result="FAIL" />}
                        {entries.every(e => e.overallResult === 'PASS') && entries.length > 0 && <ResultChip result="PASS" />}
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: '8px !important' }}>
                {criticalFail && (
                    <Alert severity="error" icon={<Warning />} sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                        Critical parameter has failed — batch should be reviewed for rejection.
                    </Alert>
                )}
                {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.8rem' }}>{error}</Alert>}

                {entries.length === 0 ? (
                    <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                        No QA parameters defined for this operation. Add them in the BOM QA Plan tab.
                    </Alert>
                ) : (
                    <>
                        {/* Shared checked-by field */}
                        <TextField
                            label="Checked By (applies to all)" size="small" value={checkedBy}
                            onChange={e => setCheckedBy(e.target.value)}
                            sx={{ mb: 2, width: 260 }}
                        />

                        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Parameter</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Spec</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', width: 160 }}>This Batch</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', width: 200 }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', width: 80 }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.map(entry => (
                                    <TableRow key={entry.id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                {entry.critical && (
                                                    <Tooltip title="Critical">
                                                        <Warning sx={{ fontSize: 13, color: '#d32f2f' }} />
                                                    </Tooltip>
                                                )}
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                                        {entry.parameterName}
                                                    </Typography>
                                                    <HistoryRow results={entry.results} />
                                                </Box>
                                            </Stack>
                                        </TableCell>

                                        <TableCell>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {entry.parameterType === 'NUMERIC_RANGE'
                                                    ? `${entry.minValue ?? '—'} – ${entry.maxValue ?? '—'}${entry.unit ? ` ${entry.unit}` : ''}`
                                                    : 'Pass / Fail'}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            {entry.parameterType === 'NUMERIC_RANGE' ? (
                                                <TextField
                                                    size="small" type="number"
                                                    placeholder={entry.unit || 'value'}
                                                    value={items[entry.id]?.actualValue ?? ''}
                                                    onChange={e => setItem(entry.id, 'actualValue', e.target.value)}
                                                    sx={{ width: 140, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                                                />
                                            ) : (
                                                <Checkbox
                                                    size="small"
                                                    checked={!!items[entry.id]?.passed}
                                                    onChange={e => setItem(entry.id, 'passed', e.target.checked)}
                                                />
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                size="small" placeholder="optional"
                                                value={items[entry.id]?.remarks ?? ''}
                                                onChange={e => setItem(entry.id, 'remarks', e.target.value)}
                                                sx={{ width: '100%', '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.5 } }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <ResultChip result={entry.overallResult || 'PENDING'} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button size="small" onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>
                    Skip
                </Button>
                {entries.length > 0 && (
                    <Button size="small" variant="contained" disableElevation onClick={handleSave}
                        disabled={saving}
                        sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
                        {saving ? <CircularProgress size={14} sx={{ mr: 1, color: '#fff' }} /> : null}
                        {saving ? 'Saving…' : 'Save QA Results'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
