import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress,
  List, ListItem, ListItemIcon, ListItemText, IconButton, Alert,
} from '@mui/material';
import {
  CloudUpload, AddPhotoAlternate, PictureAsPdf, Delete, OpenInNew,
} from '@mui/icons-material';
import {
  getWorkOrderAttachments,
  uploadWorkOrderAttachments,
  deleteWorkOrderAttachment,
} from '../../../../services/workOrderService';

const BORDER_COLOR = '#e3e8ef';

export default function WorkOrderAttachmentsTab({ workOrderId, setError, setSnackbar }) {
  const [images, setImages] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgDrag, setImgDrag] = useState(false);
  const [pdfDrag, setPdfDrag] = useState(false);
  const imgRef = useRef(null);
  const pdfRef = useRef(null);

  useEffect(() => {
    if (workOrderId) fetchAttachments();
  }, [workOrderId]);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      const data = await getWorkOrderAttachments(workOrderId);
      const list = Array.isArray(data) ? data : [];
      setImages(list
        .filter(a => a.contentType?.startsWith('image/'))
        .map(a => ({ id: a.id, presignedUrl: a.presignedUrl, originalName: a.originalName }))
      );
      setPdfFiles(list
        .filter(a => a.contentType === 'application/pdf' || a.originalName?.toLowerCase().endsWith('.pdf'))
        .map(a => ({ id: a.id, presignedUrl: a.presignedUrl, name: a.originalName }))
      );
    } catch {
      // attachments are optional; don't show a blocking error
    } finally {
      setLoading(false);
    }
  };

  const addImages = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    const slots = 5 - images.length;
    if (slots <= 0) return;
    const newObjs = valid.slice(0, slots).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newObjs]);
  };

  const addPdfs = (files) => {
    const valid = Array.from(files).filter(f => f.type === 'application/pdf');
    const newObjs = valid.map(f => ({ file: f, name: f.name, url: URL.createObjectURL(f) }));
    setPdfFiles(prev => [...prev, ...newObjs]);
  };

  const removeImage = async (index) => {
    const img = images[index];
    if (img.id) {
      try {
        await deleteWorkOrderAttachment(workOrderId, img.id);
      } catch {
        setError('Failed to delete image.');
        return;
      }
    }
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removePdf = async (index) => {
    const pdf = pdfFiles[index];
    if (pdf.id) {
      try {
        await deleteWorkOrderAttachment(workOrderId, pdf.id);
      } catch {
        setError('Failed to delete document.');
        return;
      }
    }
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!workOrderId) {
      setError('Save the work order first before uploading attachments.');
      return;
    }
    const newFiles = [
      ...images.filter(i => i.file),
      ...pdfFiles.filter(p => p.file),
    ];
    if (newFiles.length === 0) {
      setSnackbar?.('No new files selected.', 'info');
      return;
    }
    setUploading(true);
    try {
      await uploadWorkOrderAttachments(workOrderId, newFiles);
      setSnackbar?.('Attachments uploaded successfully.', 'success');
      await fetchAttachments();
    } catch {
      setError('Failed to upload attachments. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = images.filter(i => i.file).length + pdfFiles.filter(p => p.file).length;

  if (!workOrderId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Save the work order first to manage attachments.</Alert>
      </Box>
    );
  }

  if (loading) {
    return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>

      {/* ── Images ── */}
      <Box sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.25, bgcolor: '#fafbfc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={600} color="#0f2744" fontSize="0.8rem">
            Images <Chip label={`${images.length}/5`} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
          </Typography>
          {images.length < 5 && (
            <Button size="small" startIcon={<AddPhotoAlternate fontSize="small" />} onClick={() => imgRef.current?.click()}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>
              Add
            </Button>
          )}
        </Box>

        {images.length === 0 ? (
          <Box
            onDragOver={(e) => { e.preventDefault(); setImgDrag(true); }}
            onDragLeave={() => setImgDrag(false)}
            onDrop={(e) => { e.preventDefault(); setImgDrag(false); addImages(e.dataTransfer.files); }}
            onClick={() => imgRef.current?.click()}
            sx={{
              p: 3, textAlign: 'center', cursor: 'pointer',
              bgcolor: imgDrag ? '#eff6ff' : '#fafafa',
              border: imgDrag ? '2px dashed #1976d2' : '2px dashed transparent',
              borderRadius: 1, m: 1,
              '&:hover': { bgcolor: '#f5f9ff' },
            }}
          >
            <CloudUpload sx={{ fontSize: 32, color: '#9ca3af', mb: 0.75 }} />
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">Drop images or click to browse</Typography>
            <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP · up to 5 files</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {images.map((img, i) => {
              const src = img.preview || img.presignedUrl;
              return (
                <Box key={i} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${BORDER_COLOR}`, '&:hover .del-btn': { opacity: 1 } }}>
                  <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => window.open(src, '_blank')} />
                  {!img.file && (
                    <IconButton size="small" onClick={() => window.open(src, '_blank')}
                      className="del-btn"
                      sx={{ position: 'absolute', top: 1, left: 1, bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', opacity: 0, transition: '0.2s', p: 0.3, '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}>
                      <OpenInNew sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => removeImage(i)}
                    className="del-btn"
                    sx={{ position: 'absolute', top: 1, right: 1, bgcolor: 'rgba(220,38,38,0.85)', color: '#fff', opacity: 0, transition: '0.2s', p: 0.3, '&:hover': { bgcolor: '#dc2626' } }}>
                    <Delete sx={{ fontSize: 13 }} />
                  </IconButton>
                  {img.file && (
                    <Chip label="New" size="small"
                      sx={{ position: 'absolute', bottom: 2, left: 2, height: 14, fontSize: '0.6rem', bgcolor: '#1565c0', color: '#fff' }} />
                  )}
                </Box>
              );
            })}
            {images.length < 5 && (
              <Box onClick={() => imgRef.current?.click()}
                sx={{ width: 80, height: 80, border: '2px dashed #d1d5db', borderRadius: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1976d2', bgcolor: '#eff6ff' } }}>
                <AddPhotoAlternate sx={{ fontSize: 22, color: '#9ca3af' }} />
                <Typography variant="caption" color="text.secondary" fontSize="0.65rem" mt={0.25}>Add</Typography>
              </Box>
            )}
          </Box>
        )}
        <input ref={imgRef} type="file" hidden multiple accept="image/*"
          onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
      </Box>

      {/* ── PDFs ── */}
      <Box sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.25, bgcolor: '#fafbfc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={600} color="#0f2744" fontSize="0.8rem">
            Documents <Chip label={pdfFiles.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
          </Typography>
          <Button size="small" startIcon={<PictureAsPdf fontSize="small" />} onClick={() => pdfRef.current?.click()}
            sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>
            Add PDF
          </Button>
        </Box>

        {pdfFiles.length === 0 ? (
          <Box
            onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
            onDragLeave={() => setPdfDrag(false)}
            onDrop={(e) => { e.preventDefault(); setPdfDrag(false); addPdfs(e.dataTransfer.files); }}
            onClick={() => pdfRef.current?.click()}
            sx={{
              p: 3, textAlign: 'center', cursor: 'pointer',
              bgcolor: pdfDrag ? '#eff6ff' : '#fafafa',
              border: pdfDrag ? '2px dashed #1976d2' : '2px dashed transparent',
              borderRadius: 1, m: 1,
              '&:hover': { bgcolor: '#f5f9ff' },
            }}
          >
            <CloudUpload sx={{ fontSize: 32, color: '#9ca3af', mb: 0.75 }} />
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">Drop PDFs or click to browse</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            <List dense disablePadding>
              {pdfFiles.map((f, i) => (
                <ListItem key={i} disablePadding
                  sx={{ borderRadius: 1, mb: 0.5, px: 1, py: 0.5, bgcolor: '#fff', border: `1px solid ${BORDER_COLOR}`, '&:hover': { bgcolor: '#f9fafb' } }}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => removePdf(i)}>
                      <Delete sx={{ fontSize: 16, color: '#ef4444' }} />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontSize="0.8rem"
                        sx={{ cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: '#1976d2' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
                        onClick={() => window.open(f.url || f.presignedUrl, '_blank')}>
                        {f.name}
                      </Typography>
                    }
                    secondary={f.file ? <Chip label="Pending upload" size="small" sx={{ height: 14, fontSize: '0.6rem', bgcolor: '#fef3c7', color: '#92400e' }} /> : null}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        <input ref={pdfRef} type="file" hidden multiple accept="application/pdf"
          onChange={(e) => { addPdfs(e.target.files); e.target.value = ''; }} />
      </Box>

      {/* ── Upload button ── */}
      {pendingCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUpload fontSize="small" />}
            sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            {uploading ? 'Uploading…' : `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`}
          </Button>
        </Box>
      )}
    </Box>
  );
}
