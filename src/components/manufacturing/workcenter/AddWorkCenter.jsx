import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Paper, Divider,
  Snackbar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Stack
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../../services/apiService';
import { useNavigate, useParams } from 'react-router-dom';

const BORDER_COLOR = '#e5e7eb';

const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 13.5 },
  "& .MuiInputLabel-root": { fontSize: 13.5 },
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
  },
};

const SectionHeading = ({ children }) => (
  <Grid item xs={12}>
    <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
      <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </Typography>
    </Box>
  </Grid>
);

const AddWorkCenter = () => {
  const [wcData, setWcData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const formChanged = useRef(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchWorkCenter = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.get(`/manufacturing/work-center/${id}`);
      setWcData(data);
      setIsEditMode(true);
    } catch (error) {
      showSnackbar('Failed to fetch work center', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchWorkCenter();
  }, [id, fetchWorkCenter]);

  const formik = useFormik({
    initialValues: {
      centerCode: '',
      centerName: '',
      machineCostPerHour: '',
      overheadPercentage: '',
      availableHoursPerDay: '',
      department: '',
      location: '',
      description: '',
    },
    validationSchema: Yup.object({
      centerCode: Yup.string().required('Center Code is required'),
      centerName: Yup.string().required('Center Name is required'),
      machineCostPerHour: Yup.number().min(0, 'Must be >= 0').nullable(),
      overheadPercentage: Yup.number().min(0, 'Must be >= 0').max(100, 'Must be <= 100').nullable(),
      availableHoursPerDay: Yup.number().min(0, 'Must be >= 0').max(24, 'Must be <= 24').required('Available Hours Per Day is required'),
    }),
    onSubmit: (values) => {
      const payload = {
        ...values,
        machineCostPerHour: values.machineCostPerHour !== '' ? Number(values.machineCostPerHour) : null,
        overheadPercentage: values.overheadPercentage !== '' ? Number(values.overheadPercentage) : null,
        availableHoursPerDay: values.availableHoursPerDay !== '' ? Number(values.availableHoursPerDay) : null,
      };

      const request = isEditMode
        ? apiService.put(`/manufacturing/work-center/${id}`, payload)
        : apiService.post('/manufacturing/work-center', payload);

      request
        .then(() => {
          showSnackbar('Work center saved successfully');
          formChanged.current = false;
          navigate('/manufacturing/work-center');
        })
        .catch(() => showSnackbar('Failed to save work center', 'error'));
    },
  });

  useEffect(() => {
    if (isEditMode && wcData) {
      formik.setValues({
        centerCode: wcData.centerCode || '',
        centerName: wcData.centerName || '',
        machineCostPerHour: wcData.machineCostPerHour ?? '',
        overheadPercentage: wcData.overheadPercentage ?? '',
        availableHoursPerDay: wcData.availableHoursPerDay ?? '',
        department: wcData.department || '',
        location: wcData.location || '',
        description: wcData.description || '',
      });
    }
  }, [isEditMode, wcData]);

  useEffect(() => {
    const beforeUnload = (e) => {
      if (formChanged.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          maxWidth: 900,
          margin: 'auto',
          borderRadius: 2,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={0.5}
          pb={1}
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={1}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
              {isEditMode ? 'Edit Work Center' : 'New Work Center'}
            </Typography>
            {isEditMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {wcData?.centerCode} · {wcData?.centerName}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (formChanged.current) setShowLeaveDialog(true);
                else navigate('/manufacturing/work-center');
              }}
              sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={formik.handleSubmit}
              sx={{
                textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 1.5,
                bgcolor: '#1565c0', boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                '&:hover': { bgcolor: '#0d47a1' },
              }}
            >
              {isEditMode ? 'Update' : 'Save'}
            </Button>
          </Stack>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="20vh" gap={2}>
            <CircularProgress size={32} sx={{ color: '#1565c0' }} />
          </Box>
        ) : (
          <form onSubmit={formik.handleSubmit} onChange={() => { formChanged.current = true; }}>
            <Grid container spacing={2}>
              <SectionHeading>Center Identity</SectionHeading>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="centerCode" label="Center Code *" value={formik.values.centerCode}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  error={formik.touched.centerCode && Boolean(formik.errors.centerCode)}
                  helperText={formik.touched.centerCode && formik.errors.centerCode}
                  size='small' sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="centerName" label="Center Name *" value={formik.values.centerName}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  error={formik.touched.centerName && Boolean(formik.errors.centerName)}
                  helperText={formik.touched.centerName && formik.errors.centerName}
                  size='small' sx={fieldSx}
                />
              </Grid>

              <SectionHeading>Costing</SectionHeading>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="machineCostPerHour" label="Machine Cost Per Hour (₹)" type="number"
                  value={formik.values.machineCostPerHour} onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.machineCostPerHour && Boolean(formik.errors.machineCostPerHour)}
                  helperText={formik.touched.machineCostPerHour && formik.errors.machineCostPerHour}
                  size='small' sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="overheadPercentage" label="Overhead Percentage (%)" type="number"
                  value={formik.values.overheadPercentage} onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.overheadPercentage && Boolean(formik.errors.overheadPercentage)}
                  helperText={formik.touched.overheadPercentage && formik.errors.overheadPercentage}
                  size='small' sx={fieldSx}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="availableHoursPerDay" label="Available Hours Per Day *" type="number"
                  value={formik.values.availableHoursPerDay} onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.availableHoursPerDay && Boolean(formik.errors.availableHoursPerDay)}
                  helperText={formik.touched.availableHoursPerDay && formik.errors.availableHoursPerDay}
                  size='small' sx={fieldSx}
                  inputProps={{ min: 0, max: 24, step: '0.5' }}
                />
              </Grid>

              <SectionHeading>Location & Department</SectionHeading>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="department" label="Department"
                  value={formik.values.department} onChange={formik.handleChange}
                  size='small' sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="location" label="Location"
                  value={formik.values.location} onChange={formik.handleChange}
                  size='small' sx={fieldSx}
                />
              </Grid>

              <SectionHeading>Description</SectionHeading>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} name="description" label="Description"
                  value={formik.values.description} onChange={formik.handleChange}
                  size='small' sx={fieldSx}
                />
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Unsaved Changes</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Are you sure you want to leave? Your changes will be lost.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowLeaveDialog(false)} sx={{ textTransform: 'none', color: '#374151' }}>Stay</Button>
          <Button onClick={() => navigate('/manufacturing/work-center')} variant="contained" sx={{ textTransform: 'none', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>Leave</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddWorkCenter;
