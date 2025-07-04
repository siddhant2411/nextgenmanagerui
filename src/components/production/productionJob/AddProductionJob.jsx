// AddProductionJob.jsx - enhanced with feedback, loading, and navigation guard

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Card, CardContent,
  Snackbar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../../services/apiService';
import { useNavigate, useParams } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';

const AddProductionJob = () => {
  const [machines, setMachines] = useState([]);
  const [jobData, setJobData] = useState();
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const formChanged = useRef(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchJob = useCallback(async () => {
    try {
      const data = await apiService.get(`/production/production-job/${id}`);
      setJobData(data);
      setIsEditMode(true);
    } catch (error) {
      showSnackbar('Failed to fetch item', 'error');
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchJob();
  }, [id, fetchJob]);

  useEffect(() => {
    apiService.get('/machine-details')
      .then(setMachines)
      .catch(() => showSnackbar('Failed to fetch machines', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const formik = useFormik({
    initialValues: {
      jobName: '',
      machineDetails: '',
      roleRequired: '',
      costPerHour: '',
      description: '',
    },
    validationSchema: Yup.object({
      jobName: Yup.string().required('Required'),
      machineDetails: Yup.string().nullable(),
      roleRequired: Yup.string().required('Required'),
      costPerHour: Yup.number().min(0, 'Must be > 0').required('Required'),
    }),
    onSubmit: (values) => {
      const payload = {
        ...values,
        machineDetails: values.machineDetails ? { id: parseInt(values.machineDetails, 10) } : null,
      };

      const request = isEditMode
        ? apiService.put(`/production/production-job/${id}`, payload)
        : apiService.post('/production/production-job', payload);

      request
        .then(() => {
          showSnackbar('Job saved successfully');
          formChanged.current = false;
          navigate('/production/production-job');
        })
        .catch(() => showSnackbar('Failed to save job', 'error'));
    },
  });

  useEffect(() => {
    if (isEditMode && jobData) {
      formik.setValues({
        jobName: jobData.jobName || '',
        machineDetails: jobData.machineDetails?.id?.toString() || '',
        roleRequired: jobData.roleRequired || '',
        costPerHour: jobData.costPerHour || '',
        description: jobData.description || '',
      });
    }
  }, [isEditMode, jobData]);

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
    <Box sx={{ p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="bold">
              {isEditMode ? 'Edit Production Job' : 'Add Production Job'}
            </Typography>
            <Button variant="outlined" onClick={() => {
              if (formChanged.current) setShowLeaveDialog(true);
              else navigate('/production/production-job');
            }}>Cancel</Button>
          </Box>

          {loading ? <Box textAlign="center"><CircularProgress /></Box> : (
            <form onSubmit={formik.handleSubmit} onChange={() => { formChanged.current = true; }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="jobName" label="Job Name" value={formik.values.jobName}
                    onChange={formik.handleChange} onBlur={formik.handleBlur}
                    error={formik.touched.jobName && Boolean(formik.errors.jobName)}
                    helperText={formik.touched.jobName && formik.errors.jobName}
                    size='small'
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth name="machineDetails" label="Machine"
                    value={formik.values.machineDetails} onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.machineDetails && Boolean(formik.errors.machineDetails)}
                    helperText={formik.touched.machineDetails && formik.errors.machineDetails}
                    size='small'
                  >
                    {machines.map((m) => (
                      <MenuItem key={m.id} value={m.id}>{m.machineName}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth name="roleRequired" label="Role Required"
                    value={formik.values.roleRequired} onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.roleRequired && Boolean(formik.errors.roleRequired)}
                    helperText={formik.touched.roleRequired && formik.errors.roleRequired}
                    size='small'
                  >
                    {['OPERATOR', 'SUPERVISOR', 'MAINTENANCE', 'QUALITY_CONTROL'].map((role) => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="costPerHour" label="Cost Per Hour" type="number"
                    value={formik.values.costPerHour} onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.costPerHour && Boolean(formik.errors.costPerHour)}
                    helperText={formik.touched.costPerHour && formik.errors.costPerHour}
                    size='small'
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={3} name="description" label="Description"
                    value={formik.values.description} onChange={formik.handleChange}
                    size='small'
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button variant="contained" type="submit">
                      {isEditMode ? 'Update' : 'Save'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <MuiAlert severity={snackbar.severity} elevation={6} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>Are you sure you want to leave? Your changes will be lost.</DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveDialog(false)}>Stay</Button>
          <Button onClick={() => navigate('/production/production-job')} color="error">Leave</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddProductionJob;
