import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Grid, TextField, Typography, Paper, Divider,
  Snackbar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, Alert, Stack
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getLaborRoleById, createLaborRole, updateLaborRole } from '../../../services/laborRoleService';
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

const AddLaborRole = () => {
  const [roleData, setRoleData] = useState(null);
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

  const fetchRole = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLaborRoleById(id);
      setRoleData(data);
      setIsEditMode(true);
    } catch (error) {
      showSnackbar('Failed to fetch labor role', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchRole();
  }, [id, fetchRole]);

  const formik = useFormik({
    initialValues: {
      roleCode: '',
      roleName: '',
      costPerHour: '',
      description: '',
      active: true,
    },
    validationSchema: Yup.object({
      roleCode: Yup.string().required('Role Code is required'),
      roleName: Yup.string().required('Role Name is required'),
      costPerHour: Yup.number().min(0, 'Must be >= 0').required('Cost Per Hour is required'),
    }),
    onSubmit: async (values) => {
      const payload = {
        ...values,
        costPerHour: Number(values.costPerHour),
      };

      try {
        if (isEditMode) {
          await updateLaborRole(id, payload);
        } else {
          await createLaborRole(payload);
        }
        showSnackbar('Labor role saved successfully');
        formChanged.current = false;
        navigate('/production/labor-role');
      } catch (err) {
        showSnackbar('Failed to save labor role', 'error');
      }
    },
  });

  useEffect(() => {
    if (isEditMode && roleData) {
      formik.setValues({
        roleCode: roleData.roleCode || '',
        roleName: roleData.roleName || '',
        costPerHour: roleData.costPerHour ?? '',
        description: roleData.description || '',
        active: roleData.active ?? true,
      });
    }
  }, [isEditMode, roleData]);

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
              {isEditMode ? 'Edit Labor Role' : 'New Labor Role'}
            </Typography>
            {isEditMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {roleData?.roleCode} · {roleData?.roleName}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (formChanged.current) setShowLeaveDialog(true);
                else navigate('/production/labor-role');
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
              <SectionHeading>Role Details</SectionHeading>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="roleCode" label="Role Code *" value={formik.values.roleCode}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  error={formik.touched.roleCode && Boolean(formik.errors.roleCode)}
                  helperText={formik.touched.roleCode && formik.errors.roleCode}
                  size='small' sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="roleName" label="Role Name *" value={formik.values.roleName}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  error={formik.touched.roleName && Boolean(formik.errors.roleName)}
                  helperText={formik.touched.roleName && formik.errors.roleName}
                  size='small' sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.active}
                      onChange={(e) => formik.setFieldValue('active', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2">Active</Typography>}
                  sx={{ mt: 0.5 }}
                />
              </Grid>

              <SectionHeading>Costing</SectionHeading>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth name="costPerHour" label="Cost Per Hour (₹) *" type="number"
                  value={formik.values.costPerHour} onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.costPerHour && Boolean(formik.errors.costPerHour)}
                  helperText={formik.touched.costPerHour && formik.errors.costPerHour}
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
          <Button onClick={() => navigate('/production/labor-role')} variant="contained" sx={{ textTransform: 'none', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>Leave</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddLaborRole;
