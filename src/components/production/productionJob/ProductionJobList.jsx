import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Card, CardContent, Snackbar, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MuiAlert from '@mui/material/Alert';
import { useAuth } from '../../../auth/AuthContext';
import { PRODUCTION_MANAGE_ROLES } from '../../../auth/roles';

const ProductionJobList = () => {
  const [productionJobs, setProductionJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const canManageProductionJobs = hasAnyRole(PRODUCTION_MANAGE_ROLES);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    fetchProductionJobs();
  }, []);

  const fetchProductionJobs = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/production/production-job');
      setProductionJobs(res.content);
    } catch (error) {
      showSnackbar('Failed to load production jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (id) => {
    try {
      await apiService.delete(`/production/production-job/${id}`);
      showSnackbar('Job deleted successfully');
      fetchProductionJobs();
    } catch (err) {
      showSnackbar('Failed to delete job', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="bold">Production Jobs</Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/production/production-job/add')}
              disabled={!canManageProductionJobs}
            >
              + Add Job
            </Button>
          </Box>

          {loading ? (
            <Box textAlign="center" my={5}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Job Name</strong></TableCell>
                    <TableCell><strong>Machine</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Cost/Hour</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productionJobs.length ? productionJobs.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>{job.jobName}</TableCell>
                      <TableCell>{job.machineDetails?.machineName || '-'}</TableCell>
                      <TableCell>{job.roleRequired}</TableCell>
                      <TableCell>₹{job.costPerHour}</TableCell>
                      <TableCell>{job.description}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => navigate(`/production/production-job/edit/${job.id}`)}
                          color="primary"
                          size="small"
                          disabled={!canManageProductionJobs}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => setConfirmDialog({ open: true, id: job.id })}
                          color="error"
                          size="small"
                          disabled={!canManageProductionJobs}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No production jobs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
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

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, id: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this job?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, id: null })}>Cancel</Button>
          <Button
            onClick={() => { deleteJob(confirmDialog.id); setConfirmDialog({ open: false, id: null }); }}
            color="error"
            disabled={!canManageProductionJobs}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionJobList;
