import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItemButton,
  ListItemText, Typography, Box, Chip, TextField, Stack, Divider, IconButton,
  Paper, Tooltip
} from '@mui/material';
import { ContentCopy, Send, Edit, Preview, Close } from '@mui/icons-material';
import apiService from '../../services/apiService';

const MERGE_FIELDS = [
  { key: '{{contactPerson}}', label: 'Contact Person' },
  { key: '{{companyName}}', label: 'Company Name' },
  { key: '{{qtnNo}}', label: 'Quotation No' },
  { key: '{{qtnDate}}', label: 'Quotation Date' },
  { key: '{{totalAmount}}', label: 'Total Amount' },
  { key: '{{phone}}', label: 'Phone' },
  { key: '{{email}}', label: 'Email' },
];

const CHANNEL_COLORS = {
  WHATSAPP: { color: '#25d366', bg: '#dcfce7', label: 'WhatsApp' },
  EMAIL: { color: '#2563eb', bg: '#dbeafe', label: 'Email' },
};

/**
 * Replaces merge field placeholders with actual quotation data.
 */
const mergeTemplate = (body, quotation) => {
  if (!body || !quotation) return body || '';
  return body
    .replace(/\{\{contactPerson\}\}/g, quotation.contactPerson || quotation.companyName || 'Sir/Madam')
    .replace(/\{\{companyName\}\}/g, quotation.companyName || 'Our Company')
    .replace(/\{\{qtnNo\}\}/g, quotation.qtnNo || '')
    .replace(/\{\{qtnDate\}\}/g, quotation.qtnDate || '')
    .replace(/\{\{totalAmount\}\}/g, `${quotation.currency || 'INR'} ${quotation.totalAmount?.toLocaleString('en-IN') || '0'}`)
    .replace(/\{\{phone\}\}/g, quotation.phone || '')
    .replace(/\{\{email\}\}/g, quotation.email || '');
};

const QuotationTemplatePicker = ({ open, onClose, channel, quotation, onSend }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
      setPreviewText('');
      setEditedText('');
      setIsEditing(false);
    }
  }, [open, channel]);

  const fetchTemplates = async () => {
    try {
      const data = await apiService.get(`/message-template/channel/${channel}`);
      // Filter for quotation related templates if possible, or just show all
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  const handleSelect = (template) => {
    setSelectedTemplate(template);
    const merged = mergeTemplate(template.body, quotation);
    setPreviewText(merged);
    setEditedText(merged);
    setIsEditing(false);
  };

  const handleSend = () => {
    const finalText = isEditing ? editedText : previewText;
    const subject = selectedTemplate?.subject
      ? mergeTemplate(selectedTemplate.subject, quotation)
      : `Quotation: ${quotation?.qtnNo || ''} - ${quotation?.companyName || ''}`;
    onSend(finalText, subject);
    onClose();
  };

  const handleCopy = () => {
    const text = isEditing ? editedText : previewText;
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
                    {previewText}
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
        <Button
          variant="contained"
          disableElevation
          startIcon={<Send />}
          disabled={!selectedTemplate}
          onClick={handleSend}
          sx={{
            textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
            bgcolor: CHANNEL_COLORS[channel]?.color,
            '&:hover': { bgcolor: channel === 'WHATSAPP' ? '#128c7e' : '#1d4ed8' },
          }}
        >
          {channel === 'WHATSAPP' ? 'Open WhatsApp' : 'Open Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotationTemplatePicker;
