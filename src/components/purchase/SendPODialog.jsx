import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, List, ListItemButton, ListItemText,
    Typography, Box, Chip, TextField, Stack, Divider,
    IconButton, Tooltip, Tab, Tabs, Alert,
} from '@mui/material';
import {
    ContentCopy, Send, Edit, Preview, Close, Download,
    Email, WhatsApp,
} from '@mui/icons-material';
import apiService from '../../services/apiService';
import { downloadPOPdf, markEmailSent } from '../../services/purchaseOrderService';
import { T } from '../../theme/moduleTokens';

const MERGE_FIELDS = [
    { key: '{{contactPerson}}',     label: 'Contact Person' },
    { key: '{{vendorName}}',        label: 'Vendor Name' },
    { key: '{{poNumber}}',          label: 'PO Number' },
    { key: '{{quotationNumber}}',   label: 'Quotation No.' },
    { key: '{{quotationDate}}',     label: 'Quotation Date' },
    { key: '{{orderDate}}',         label: 'Order Date' },
    { key: '{{expectedDeliveryDate}}', label: 'Delivery Date' },
    { key: '{{currency}}',          label: 'Currency' },
    { key: '{{grandTotal}}',        label: 'Grand Total' },
    { key: '{{companyName}}',       label: 'Your Company' },
];

const fmt = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
};

const mergePO = (text, po) => {
    if (!text || !po) return text || '';
    return text
        .replace(/\{\{contactPerson\}\}/g,        po.vendorContactPerson || po.vendorName || 'Sir/Madam')
        .replace(/\{\{vendorName\}\}/g,            po.vendorName || '')
        .replace(/\{\{poNumber\}\}/g,              po.purchaseOrderNumber || '')
        .replace(/\{\{quotationNumber\}\}/g,       po.quotationNumber || '—')
        .replace(/\{\{quotationDate\}\}/g,         fmt(po.quotationDate))
        .replace(/\{\{orderDate\}\}/g,             fmt(po.orderDate))
        .replace(/\{\{expectedDeliveryDate\}\}/g,  fmt(po.expectedDeliveryDate))
        .replace(/\{\{currency\}\}/g,              po.currency || 'INR')
        .replace(/\{\{grandTotal\}\}/g,            po.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00')
        .replace(/\{\{companyName\}\}/g,           po.companyName || '');
};

/**
 * Dialog for composing and sending a PO via Email or WhatsApp.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   po          — PurchaseOrderDto object
 *   channel     — 'EMAIL' | 'WHATSAPP'
 *   onSent      — (updatedPo) => void  called after marking as sent
 */
export default function SendPODialog({ open, onClose, po, channel, onSent }) {
    const [templates, setTemplates] = useState([]);
    const [selected, setSelected]   = useState(null);
    const [preview, setPreview]     = useState('');
    const [edited, setEdited]       = useState('');
    const [subject, setSubject]     = useState('');
    const [toEmail, setToEmail]     = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError]         = useState(null);
    const [sending, setSending]     = useState(false);

    const isEmail = channel === 'EMAIL';
    const channelColor = isEmail ? '#2563eb' : '#25d366';
    const channelBg    = isEmail ? '#dbeafe'  : '#dcfce7';

    useEffect(() => {
        if (!open) return;
        setSelected(null); setPreview(''); setEdited('');
        setSubject(''); setIsEditing(false); setError(null);
        setToEmail(po?.vendorEmail || '');

        apiService.get(`/message-template/channel/${channel}`)
            .then(data => {
                const poTemplates = (data || []).filter(t => t.category === 'PURCHASE_ORDER');
                setTemplates(poTemplates);
                const def = poTemplates.find(t => t.isDefault) ?? poTemplates[0];
                if (def) {
                    const merged = mergePO(def.body, po);
                    const mergedSubject = mergePO(def.subject, po) || `Purchase Order ${po?.purchaseOrderNumber}`;
                    setSelected(def);
                    setPreview(merged);
                    setEdited(merged);
                    setSubject(mergedSubject);
                }
            })
            .catch(() => setError('Failed to load templates'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, channel]);

    const handleSelect = (tmpl, currentPo) => {
        const src = currentPo || po;
        const merged = mergePO(tmpl.body, src);
        const mergedSubject = mergePO(tmpl.subject, src) || `Purchase Order ${src?.purchaseOrderNumber}`;
        setSelected(tmpl);
        setPreview(merged);
        setEdited(merged);
        setSubject(mergedSubject);
        setIsEditing(false);
    };

    const currentText    = isEditing ? edited : preview;
    const currentSubject = subject;

    const handleSend = async () => {
        if (!po?.id) return;
        setSending(true);
        setError(null);
        try {
            // Record send in backend first (mailto navigation may interrupt async calls)
            const updated = await markEmailSent(po.id, isEmail ? toEmail : null);
            onSent?.(updated);
            onClose();
            // Open client after dialog closes
            if (isEmail) {
                const mailtoLink = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(currentSubject)}&body=${encodeURIComponent(currentText)}`;
                window.open(mailtoLink, '_blank');
            } else {
                const phone = (po?.vendorPhone || '').replace(/\D/g, '');
                const waLink = phone
                    ? `https://wa.me/${phone}?text=${encodeURIComponent(currentText)}`
                    : `https://wa.me/?text=${encodeURIComponent(currentText)}`;

                window.open(waLink, '_blank');
            }
        } catch {
            setError('Failed to record send action.');
        } finally {
            setSending(false);
        }
    };

    const handleDownloadPdf = () => {
        if (po?.id) downloadPOPdf(po.id);
    };

    const handleCopy = () => navigator.clipboard.writeText(currentText);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

            <DialogTitle sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                bgcolor: channelBg, borderBottom: '1px solid #e2e8f0', py: 1.5, px: 3,
            }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {isEmail
                        ? <Email sx={{ color: channelColor, fontSize: 20 }} />
                        : <WhatsApp sx={{ color: channelColor, fontSize: 20 }} />}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: T.ink }}>
                        Send PO via {isEmail ? 'Email' : 'WhatsApp'}
                    </Typography>
                    <Chip label={po?.purchaseOrderNumber} size="small"
                        sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'white' }} />
                </Stack>
                <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, display: 'flex', minHeight: 460 }}>
                {/* Left: Template List */}
                <Box sx={{ width: 260, borderRight: '1px solid #e2e8f0', overflow: 'auto', bgcolor: '#fafafa', flexShrink: 0 }}>
                    <Typography variant="caption" sx={{
                        px: 2, pt: 2, pb: 1, display: 'block', fontWeight: 700,
                        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem',
                    }}>
                        Templates
                    </Typography>
                    <List dense sx={{ px: 1 }}>
                        {templates.length === 0 && (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">No templates found.</Typography>
                            </Box>
                        )}
                        {templates.map(t => (
                            <ListItemButton key={t.id} selected={selected?.id === t.id}
                                onClick={() => handleSelect(t)}
                                sx={{
                                    borderRadius: 2, mb: 0.5, py: 1.5,
                                    '&.Mui-selected': { bgcolor: channelBg, border: `1px solid ${channelColor}40` },
                                }}>
                                <ListItemText
                                    primary={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.name}</Typography>}
                                    secondary={t.isDefault && <Chip label="Default" size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, mt: 0.5 }} />}
                                />
                            </ListItemButton>
                        ))}
                    </List>

                    <Divider sx={{ mt: 1 }} />
                    <Box sx={{ p: 2 }}>
                        <Button fullWidth size="small" variant="outlined" startIcon={<Download />}
                            onClick={handleDownloadPdf}
                            sx={{ textTransform: 'none', fontSize: '0.78rem', borderColor: '#cbd5e1', color: '#475569' }}>
                            Download PDF first
                        </Button>
                        <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mt: 0.8, lineHeight: 1.4, textAlign: 'center' }}>
                            {isEmail ? 'Attach the PDF manually in your email client' : 'Share PDF separately if needed'}
                        </Typography>
                    </Box>
                </Box>

                {/* Right: Compose area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {error && <Alert severity="error" sx={{ m: 2, mb: 0 }}>{error}</Alert>}

                    {selected ? (
                        <>
                            {/* To + Subject (email only) */}
                            {isEmail && (
                                <Box sx={{ px: 3, pt: 2, pb: 1.5 }}>
                                    <TextField fullWidth size="small" label="To (Vendor Email)"
                                        value={toEmail}
                                        onChange={e => setToEmail(e.target.value)}
                                        placeholder="vendor@example.com"
                                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                    <TextField fullWidth size="small" label="Subject"
                                        value={currentSubject}
                                        onChange={e => setSubject(e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                </Box>
                            )}

                            <Box sx={{ px: 3, pt: isEmail ? 0 : 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                                    Message Body
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title={isEditing ? 'Preview' : 'Edit'}>
                                        <IconButton size="small" onClick={() => setIsEditing(v => !v)}
                                            sx={{ color: isEditing ? channelColor : '#94a3b8' }}>
                                            {isEditing ? <Preview fontSize="small" /> : <Edit fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Copy to clipboard">
                                        <IconButton size="small" onClick={handleCopy} sx={{ color: '#94a3b8' }}>
                                            <ContentCopy sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Box>

                            <Divider />

                            <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                                {isEditing ? (
                                    <TextField multiline fullWidth minRows={10}
                                        value={edited}
                                        onChange={e => setEdited(e.target.value)}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem', lineHeight: 1.6, borderRadius: 1.5 } }} />
                                ) : (
                                    <Box sx={{
                                        p: 2.5, borderRadius: 2, bgcolor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        whiteSpace: 'pre-wrap', fontSize: '0.85rem',
                                        lineHeight: 1.8, color: '#1e293b',
                                    }}>
                                        {preview}
                                    </Box>
                                )}
                            </Box>

                            {/* Merge fields */}
                            <Box sx={{ px: 3, pb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.6rem', display: 'block', mb: 0.5 }}>
                                    MERGE FIELDS — click to insert when editing
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {MERGE_FIELDS.map(f => (
                                        <Chip key={f.key} label={f.key} size="small"
                                            onClick={() => { if (isEditing) setEdited(prev => prev + ' ' + f.key); }}
                                            sx={{
                                                height: 20, fontSize: '0.6rem', fontWeight: 600,
                                                bgcolor: '#f1f5f9', color: '#475569',
                                                cursor: isEditing ? 'pointer' : 'default',
                                                '&:hover': isEditing ? { bgcolor: '#e2e8f0' } : {},
                                                fontFamily: 'monospace',
                                            }} />
                                    ))}
                                </Stack>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box textAlign="center">
                                <Typography variant="h3" sx={{ mb: 1 }}>📋</Typography>
                                <Typography variant="body2" color="text.secondary">Select a template from the left</Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fafafa' }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
                    Cancel
                </Button>
                <Button variant="contained" disableElevation disabled={!selected || sending}
                    startIcon={isEmail ? <Email /> : <WhatsApp />}
                    onClick={handleSend}
                    sx={{
                        textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
                        bgcolor: channelColor,
                        '&:hover': { bgcolor: isEmail ? '#1d4ed8' : '#128c7e' },
                    }}>
                    {isEmail ? 'Open in Email Client' : 'Open WhatsApp'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
