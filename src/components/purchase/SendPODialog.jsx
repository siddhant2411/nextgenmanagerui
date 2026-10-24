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
import { contactEmails, getSendFrom, safeFileName, sendEmail } from '../../utils/emailCompose';
import { EMAIL_SEND_HINT, EmailSendButtons, SendFromField } from '../common/EmailSend';
import { T } from '../../theme/moduleTokens';
import { fillTemplate, loadOwnCompany, mergeFieldsFor, missingNote, purchaseOrderValues, templatesFor } from '../../utils/messageTemplates';

const MERGE_FIELDS = mergeFieldsFor('purchaseOrder');

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
    const [edited, setEdited]       = useState('');
    const [subject, setSubject]     = useState('');
    const [toEmail, setToEmail]     = useState('');
    const [fromEmail, setFromEmail] = useState(getSendFrom);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError]         = useState(null);
    const [sending, setSending]     = useState(false);

    const isEmail = channel === 'EMAIL';
    const channelColor = isEmail ? '#2563eb' : '#25d366';
    const channelBg    = isEmail ? '#dbeafe'  : '#dcfce7';

    // What the placeholders are filled with: the order, the vendor's contact person and your own company.
    const [values, setValues] = useState(() => purchaseOrderValues(po, null, null));
    const fill = (text) => fillTemplate(text, values).text;

    useEffect(() => {
        if (!open) return;
        setSelected(null); setEdited('');
        setSubject(''); setIsEditing(false); setError(null);
        setToEmail(po?.vendorEmail || '');
        setValues(purchaseOrderValues(po, null, null));
        Promise.all([
            loadOwnCompany(),
            po?.vendorId ? apiService.get(`/contact/${po.vendorId}`).catch(() => null) : null,
        ]).then(([company, vendor]) => setValues(purchaseOrderValues(po, company, vendor)));
        // A PO without a vendor email on it falls back to what the vendor's contact has saved.
        if (channel === 'EMAIL' && !po?.vendorEmail && po?.vendorId) {
            apiService.get(`/contact/${po.vendorId}`)
                .then(contact => setToEmail(prev => prev || contactEmails(contact)[0] || ''))
                .catch(() => {});
        }

        apiService.get(`/message-template/channel/${channel}`)
            .then(data => {
                const poTemplates = templatesFor('purchaseOrder', data);
                setTemplates(poTemplates);
                const def = poTemplates.find(t => t.isDefault) ?? poTemplates[0];
                if (def) {
                    // Filled with what is known now; filled again below once the company and vendor arrive.
                    const known = purchaseOrderValues(po, null, null);
                    const merged = fillTemplate(def.body, known).text;
                    const mergedSubject = fillTemplate(def.subject, known).text || `Purchase Order ${po?.purchaseOrderNumber}`;
                    setSelected(def);
                    setEdited(merged);
                    setSubject(mergedSubject);
                }
            })
            .catch(() => setError('Failed to load templates'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, channel]);

    const handleSelect = (tmpl) => {
        const merged = fill(tmpl.body);
        const mergedSubject = fill(tmpl.subject) || `Purchase Order ${po?.purchaseOrderNumber}`;
        setSelected(tmpl);
        setEdited(merged);
        setSubject(mergedSubject);
        setIsEditing(false);
    };

    useEffect(() => {
        if (selected) {
            setEdited((t) => fill(t));
            setSubject((t) => fill(t));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);

    // Filled again, so a field inserted while editing goes out filled too.
    const currentText    = fill(edited);
    const currentSubject = fill(subject);
    const missing = selected ? fillTemplate(`${edited} ${subject}`, values).missing : [];

    const handleSend = async (via) => {
        if (!po?.id) return;
        const to = toEmail.trim();
        if (isEmail && !to) { setError('Vendor email is required.'); return; }
        setSending(true);
        setError(null);

        // The compose window has to open straight off the click — after an await the browser blocks it.
        if (isEmail) {
            const pdfName = `PO-${safeFileName(po.purchaseOrderNumber || po.id)}.pdf`;
            const fetchPdf = async () => (await apiService.fetchBlob(`/purchase-orders/${po.id}/pdf`)).blob;
            try {
                await sendEmail(via, { to, subject: currentSubject, body: currentText, from: fromEmail }, fetchPdf, pdfName);
            } catch {
                setError('The email was opened, but the PDF could not be prepared. Download it and attach it manually.');
                setSending(false);
                return;
            }
        } else {
            const phone = (po?.vendorPhone || '').replace(/\D/g, '');
            const waLink = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(currentText)}`
                : `https://wa.me/?text=${encodeURIComponent(currentText)}`;
            window.open(waLink, '_blank');
        }

        try {
            const updated = await markEmailSent(po.id, isEmail ? to : null);
            onSent?.(updated);
            onClose();
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
                            {isEmail ? EMAIL_SEND_HINT : 'Share PDF separately if needed'}
                        </Typography>
                    </Box>
                </Box>

                {/* Right: Compose area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {error && <Alert severity="error" sx={{ m: 2, mb: 0 }}>{error}</Alert>}
                    {missing.length > 0 && <Alert severity="warning" sx={{ m: 2, mb: 0, py: 0 }}>{missingNote(missing)}</Alert>}

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
                                    <SendFromField value={fromEmail} onChange={setFromEmail} sx={{ mb: 1.5 }} />
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
                                        {currentText}
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
                {isEmail ? (
                    <EmailSendButtons onSend={handleSend} disabled={!selected || sending || !toEmail.trim()} busy={sending} withPdf />
                ) : (
                    <Button variant="contained" disableElevation disabled={!selected || sending}
                        startIcon={<WhatsApp />}
                        onClick={() => handleSend()}
                        sx={{
                            textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
                            bgcolor: channelColor,
                            '&:hover': { bgcolor: '#128c7e' },
                        }}>
                        Open WhatsApp
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
