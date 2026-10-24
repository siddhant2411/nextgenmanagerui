import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItemButton,
  ListItemText, Typography, Box, Chip, TextField, Stack, Divider, IconButton,
  Paper, Tooltip, Alert
} from '@mui/material';
import { ContentCopy, Send, Edit, Preview, Close } from '@mui/icons-material';
import apiService from '../../services/apiService';
import { getSendFrom, safeFileName, sendEmail } from '../../utils/emailCompose';
import { EMAIL_SEND_HINT, EmailSendButtons, SendFromField } from '../common/EmailSend';
import { fillTemplate, loadOwnCompany, mergeFieldsFor, missingNote, quotationValues, templatesFor } from '../../utils/messageTemplates';

/*
 * Sends what the picker composed: WhatsApp opens a chat with the text, email goes out with the
 * quotation PDF attached. Shared by the quotation list and the quotation page.
 */
export const sendComposedQuotation = (channel, qtn, text, subject, mail) => {
  if (channel === 'WHATSAPP') {
    const phone = qtn?.phone || '';
    if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  } else {
    const fetchPdf = async () => (await apiService.fetchBlob(`/quotation/pdf/${qtn.id}`)).blob;
    sendEmail(mail.via, { to: mail.to, subject, body: text, from: mail.from }, fetchPdf, `Quotation-${safeFileName(qtn.qtnNo || qtn.id)}.pdf`)
      .catch(() => alert('The email was opened, but the PDF could not be prepared. Download it and attach it manually.'));
  }
};

export const WhatsAppIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MERGE_FIELDS = mergeFieldsFor('quotation');

const CHANNEL_COLORS = {
  WHATSAPP: { color: '#25d366', bg: '#dcfce7', label: 'WhatsApp' },
  EMAIL: { color: '#2563eb', bg: '#dbeafe', label: 'Email' },
};

const QuotationTemplatePicker = ({ open, onClose, channel, quotation, onSend }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [fromEmail, setFromEmail] = useState(getSendFrom);
  const isEmail = channel === 'EMAIL';

  // What the placeholders are filled with: the full quotation (its enquiry, customer and contact
  // person) and your own company. The row a list passes in is used until those have loaded.
  const [values, setValues] = useState(() => quotationValues(quotation, null));
  const fill = (text) => fillTemplate(text, values).text;

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
      setEditedText('');
      setIsEditing(false);
      setToEmail(quotation?.email || '');
      setValues(quotationValues(quotation, null));
      Promise.all([
        loadOwnCompany(),
        quotation?.id ? apiService.get(`/quotation/${quotation.id}`).catch(() => null) : null,
      ]).then(([company, full]) => setValues(quotationValues(full || quotation, company)));
    }
  }, [open, channel]);

  const fetchTemplates = async () => {
    try {
      const data = await apiService.get(`/message-template/channel/${channel}`);
      // Purchase-order templates have nothing to fill them from a quotation.
      setTemplates(templatesFor('quotation', data));
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  const handleSelect = (template) => {
    setSelectedTemplate(template);
    const merged = fill(template.body);
    setEditedText(merged);
    setIsEditing(false);
  };

  const handleSend = (via) => {
    // Filled again, so a field inserted while editing goes out filled too.
    const finalText = fill(editedText);
    const subject = selectedTemplate?.subject
      ? fill(selectedTemplate.subject)
      : `Quotation: ${values.qtnNo || quotation?.qtnNo || ''} - ${values.customerName || ''}`;
    onSend(finalText, subject, { via, to: toEmail.trim(), from: fromEmail });
    onClose();
  };

  useEffect(() => {
    if (selectedTemplate) {
      setEditedText((t) => fill(t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const missing = selectedTemplate ? fillTemplate(editedText, values).missing : [];

  const handleCopy = () => {
    const text = editedText;
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        bgcolor: CHANNEL_COLORS[channel]?.bg || '#f8fafc',
        borderBottom: '1px solid #e2e8f0', py: 1.5, px: 3
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {channel === 'WHATSAPP' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          ) : (
            <Box sx={{ width: 20, height: 20, color: '#2563eb', display: 'flex', alignItems: 'center', fontSize: 16 }}>📧</Box>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} Quotation
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', minHeight: 420 }}>
        {/* Left: Template List */}
        <Box sx={{ width: 280, borderRight: '1px solid #e2e8f0', overflow: 'auto', bgcolor: '#fafafa' }}>
          <Typography variant="caption" sx={{
            px: 2, pt: 2, pb: 1, display: 'block', fontWeight: 700,
            color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem'
          }}>
            Select a template
          </Typography>
          <List dense sx={{ px: 1 }}>
            {templates.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">No templates found.</Typography>
              </Box>
            )}
            {templates.map((t) => (
              <ListItemButton
                key={t.id}
                selected={selectedTemplate?.id === t.id}
                onClick={() => handleSelect(t)}
                sx={{
                  borderRadius: 2, mb: 0.5, py: 1.5,
                  '&.Mui-selected': { bgcolor: `${CHANNEL_COLORS[channel]?.bg}`, border: `1px solid ${CHANNEL_COLORS[channel]?.color}40` },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {t.name}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={0.5} mt={0.5}>
                      <Chip label={t.category} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }} />
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Right: Preview / Edit */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedTemplate ? (
            <>
              <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedTemplate.name}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={isEditing ? 'Preview' : 'Edit before sending'}>
                    <IconButton
                      size="small"
                      onClick={() => setIsEditing(!isEditing)}
                      sx={{ color: isEditing ? '#2563eb' : '#94a3b8' }}
                    >
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

              {missing.length > 0 && (
                <Alert severity="warning" sx={{ mx: 3, mt: 2, borderRadius: 2, py: 0 }}>{missingNote(missing)}</Alert>
              )}

              {isEmail && (
                <Box sx={{ px: 3, pt: 2 }}>
                  <TextField fullWidth size="small" label="To" type="email"
                    value={toEmail} onChange={(e) => setToEmail(e.target.value)}
                    placeholder="customer@example.com" sx={{ mb: 1.5 }} />
                  <SendFromField value={fromEmail} onChange={setFromEmail} />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b', fontSize: '0.7rem' }}>
                    {EMAIL_SEND_HINT}
                  </Typography>
                </Box>
              )}

              <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                {isEditing ? (
                  <TextField
                    multiline
                    fullWidth
                    minRows={10}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem', lineHeight: 1.6 } }}
                  />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5, borderRadius: 2, bgcolor: '#f8fafc',
                      whiteSpace: 'pre-wrap', fontSize: '0.85rem',
                      lineHeight: 1.8, color: '#1e293b',
                    }}
                  >
                    {fill(editedText)}
                  </Paper>
                )}
              </Box>

              {/* Merge Fields Reference */}
              <Box sx={{ px: 3, pb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.6rem', display: 'block', mb: 0.5 }}>
                  AVAILABLE MERGE FIELDS
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {MERGE_FIELDS.map(f => (
                    <Chip
                      key={f.key}
                      label={f.key}
                      size="small"
                      onClick={() => { if (isEditing) setEditedText(prev => prev + ' ' + f.key); }}
                      sx={{
                        height: 20, fontSize: '0.6rem', fontWeight: 600,
                        bgcolor: '#f1f5f9', color: '#475569', cursor: isEditing ? 'pointer' : 'default',
                        fontFamily: 'monospace'
                      }}
                    />
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
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
        {isEmail ? (
          <EmailSendButtons onSend={handleSend} disabled={!selectedTemplate || !toEmail.trim()} withPdf />
        ) : (
          <Button
            variant="contained"
            disableElevation
            startIcon={<Send />}
            disabled={!selectedTemplate}
            onClick={() => handleSend()}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
              bgcolor: CHANNEL_COLORS[channel]?.color,
              '&:hover': { bgcolor: '#128c7e' },
            }}
          >
            Open WhatsApp
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QuotationTemplatePicker;
