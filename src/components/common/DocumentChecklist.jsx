import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Stack, Chip, IconButton, Tooltip, CircularProgress,
    LinearProgress, Button, Divider, Paper, Alert, TextField, InputAdornment,
} from '@mui/material';
import {
    CheckCircle, RadioButtonUnchecked, RemoveCircleOutline,
    CloudUpload, Download, DeleteOutline, WarningAmber, Add, Close,
} from '@mui/icons-material';
import {
    getChecklist, updateChecklistStatus, uploadChecklistFile, removeChecklistFile,
    addCustomDocument, deleteCustomDocument,
} from '../../services/documentChecklistService';

const STATUS_CONFIG = {
    PENDING:          { icon: RadioButtonUnchecked, color: '#94a3b8', label: 'Pending' },
    RECEIVED:         { icon: CheckCircle,          color: '#16a34a', label: 'Received' },
    NOT_APPLICABLE:   { icon: RemoveCircleOutline,  color: '#94a3b8', label: 'N/A' },
};

const TIER_NEXT_STATUS = {
    PENDING:        'RECEIVED',
    RECEIVED:       'NOT_APPLICABLE',
    NOT_APPLICABLE: 'PENDING',
};

function DocRow({ item, entityType, entityId, readOnly, onUpdated, onDeleted }) {
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    const isEssential = item.tier === 'ESSENTIAL';
    const isCustom = item.documentType === 'CUSTOM';

    const cycleStatus = async () => {
        if (readOnly || busy) return;
        setBusy(true);
        try {
            const next = TIER_NEXT_STATUS[item.status] ?? 'PENDING';
            const updated = await updateChecklistStatus(entityType, entityId, item.id, next, null);
            onUpdated(updated);
        } finally { setBusy(false); }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const updated = await uploadChecklistFile(entityType, entityId, item.id, file);
            onUpdated(updated);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveFile = async () => {
        setBusy(true);
        try {
            const updated = await removeChecklistFile(entityType, entityId, item.id);
            onUpdated(updated);
        } finally { setBusy(false); }
    };

    const handleDelete = async () => {
        setBusy(true);
        try {
            await deleteCustomDocument(entityType, entityId, item.id);
            onDeleted(item.id);
        } finally { setBusy(false); }
    };

    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{
            py: 1.25, px: 1.5,
            borderRadius: 1.5,
            background: isEssential && item.status === 'PENDING' ? '#fffbeb' : 'transparent',
            border: isEssential && item.status === 'PENDING' ? '1px solid #fde68a' : '1px solid transparent',
            '&:hover': { background: '#f8fafc' },
            transition: 'background 0.15s',
        }}>
            {/* Status toggle */}
            <Tooltip title={`Click to mark ${TIER_NEXT_STATUS[item.status]?.replace(/_/g, ' ')}`}>
                <Box sx={{ cursor: readOnly ? 'default' : 'pointer', color: cfg.color, display: 'flex' }}
                    onClick={cycleStatus}>
                    {busy ? <CircularProgress size={20} sx={{ color: cfg.color }} /> : <Icon sx={{ fontSize: 22 }} />}
                </Box>
            </Tooltip>

            {/* Doc name + tier chip */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {item.documentTypeLabel}
                    </Typography>
                    {isEssential ? (
                        <Chip label="Essential" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }} />
                    ) : isCustom ? (
                        <Chip label="Custom" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700, bgcolor: '#f0f4ff', color: '#3730a3' }} />
                    ) : (
                        <Chip label="Recommended" size="small" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534' }} />
                    )}
                </Stack>
                {item.fileName && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.2 }}>
                        {item.fileName}
                    </Typography>
                )}
            </Box>

            {/* File actions */}
            <Stack direction="row" spacing={0.5} alignItems="center">
                {item.fileUrl && (
                    <Tooltip title="View / Download">
                        <IconButton size="small" component="a" href={item.fileUrl} target="_blank" rel="noopener">
                            <Download fontSize="small" sx={{ color: '#3b82f6' }} />
                        </IconButton>
                    </Tooltip>
                )}
                {item.fileUrl && !readOnly && (
                    <Tooltip title="Remove file">
                        <IconButton size="small" onClick={handleRemoveFile} disabled={busy}>
                            <DeleteOutline fontSize="small" sx={{ color: '#ef4444' }} />
                        </IconButton>
                    </Tooltip>
                )}
                {!item.fileUrl && !readOnly && (
                    <>
                        <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
                        <Tooltip title="Upload document">
                            <Button size="small" variant="outlined" startIcon={
                                uploading ? <CircularProgress size={12} /> : <CloudUpload sx={{ fontSize: 14 }} />
                            }
                                disabled={uploading}
                                onClick={() => fileRef.current?.click()}
                                sx={{
                                    fontSize: '0.7rem', height: 26, textTransform: 'none',
                                    borderColor: '#93c5fd', color: '#2563eb',
                                    '&:hover': { borderColor: '#3b82f6', bgcolor: '#eff6ff' },
                                }}>
                                Upload
                            </Button>
                        </Tooltip>
                    </>
                )}
                {isCustom && !readOnly && (
                    <Tooltip title="Remove this document">
                        <IconButton size="small" onClick={handleDelete} disabled={busy}>
                            <Close fontSize="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        </Stack>
    );
}

function AddCustomDocRow({ entityType, entityId, onAdded }) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef();

    const handleOpen = () => {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleCancel = () => {
        setOpen(false);
        setLabel('');
    };

    const handleAdd = async () => {
        if (!label.trim()) return;
        setSaving(true);
        try {
            const created = await addCustomDocument(entityType, entityId, label.trim());
            onAdded(created);
            setLabel('');
            setOpen(false);
        } finally { setSaving(false); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleAdd();
        if (e.key === 'Escape') handleCancel();
    };

    if (!open) {
        return (
            <Button
                size="small"
                startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={handleOpen}
                sx={{
                    mt: 1, ml: 1, fontSize: '0.78rem', textTransform: 'none', color: '#475569',
                    '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' },
                }}
            >
                Add document
            </Button>
        );
    }

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, px: 1.5 }}>
            <TextField
                inputRef={inputRef}
                size="small"
                placeholder="Document name…"
                value={label}
                onChange={e => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
            />
            <Button
                size="small"
                variant="contained"
                disabled={!label.trim() || saving}
                onClick={handleAdd}
                sx={{ textTransform: 'none', fontSize: '0.78rem', minWidth: 60 }}
            >
                {saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Add'}
            </Button>
            <IconButton size="small" onClick={handleCancel}>
                <Close fontSize="small" />
            </IconButton>
        </Stack>
    );
}

/**
 * Reusable document checklist panel.
 *
 * Props:
 *   entityType  — "PURCHASE_ORDER" | "VENDOR_BILL" | etc.
 *   entityId    — Long id of the entity
 *   readOnly    — disables status cycling and uploads
 *   onMissing   — callback(count) called whenever essential-pending count changes
 */
export default function DocumentChecklist({ entityType, entityId, readOnly = false, onMissing }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!entityId) return;
        setLoading(true);
        try {
            const data = await getChecklist(entityType, entityId);
            // Filter out PURCHASE_ORDER doc type — it's the document being created itself
            setItems((data ?? []).filter(i => i.documentType !== 'PURCHASE_ORDER'));
        } catch {
            setError('Failed to load document checklist');
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (onMissing) {
            const missing = items.filter(i => i.tier === 'ESSENTIAL' && i.status === 'PENDING').length;
            onMissing(missing);
        }
    }, [items, onMissing]);

    const handleUpdated = (updated) => {
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    };

    const handleAdded = (created) => {
        setItems(prev => [...prev, created]);
    };

    const handleDeleted = (deletedId) => {
        setItems(prev => prev.filter(i => i.id !== deletedId));
    };

    if (!entityId) return null;

    const essential = items.filter(i => i.tier === 'ESSENTIAL');
    const recommended = items.filter(i => i.tier === 'RECOMMENDED' && i.documentType !== 'CUSTOM');
    const custom = items.filter(i => i.documentType === 'CUSTOM');
    const missingCount = essential.filter(i => i.status === 'PENDING').length;

    return (
        <Box>
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>{error}</Alert>}

            {missingCount > 0 && !readOnly && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{
                    mb: 1.5, px: 1.5, py: 1, borderRadius: 1.5,
                    bgcolor: '#fffbeb', border: '1px solid #fde68a',
                }}>
                    <WarningAmber sx={{ fontSize: 16, color: '#d97706' }} />
                    <Typography sx={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                        {missingCount} essential document{missingCount > 1 ? 's' : ''} still pending
                    </Typography>
                </Stack>
            )}

            {loading ? (
                <LinearProgress sx={{ borderRadius: 1 }} />
            ) : (
                <Stack spacing={0}>
                    {essential.length > 0 && (
                        <>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, px: 1.5 }}>
                                Essential
                            </Typography>
                            {essential.map(item => (
                                <DocRow key={item.id} item={item} entityType={entityType}
                                    entityId={entityId} readOnly={readOnly}
                                    onUpdated={handleUpdated} onDeleted={handleDeleted} />
                            ))}
                        </>
                    )}

                    {recommended.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, px: 1.5 }}>
                                Recommended
                            </Typography>
                            {recommended.map(item => (
                                <DocRow key={item.id} item={item} entityType={entityType}
                                    entityId={entityId} readOnly={readOnly}
                                    onUpdated={handleUpdated} onDeleted={handleDeleted} />
                            ))}
                        </>
                    )}

                    {custom.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, px: 1.5 }}>
                                Other Documents
                            </Typography>
                            {custom.map(item => (
                                <DocRow key={item.id} item={item} entityType={entityType}
                                    entityId={entityId} readOnly={readOnly}
                                    onUpdated={handleUpdated} onDeleted={handleDeleted} />
                            ))}
                        </>
                    )}

                    {!readOnly && (
                        <>
                            {(essential.length > 0 || recommended.length > 0 || custom.length > 0) && custom.length === 0 && (
                                <Divider sx={{ my: 1.5 }} />
                            )}
                            <AddCustomDocRow
                                entityType={entityType}
                                entityId={entityId}
                                onAdded={handleAdded}
                            />
                        </>
                    )}
                </Stack>
            )}
        </Box>
    );
}
