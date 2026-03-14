import React, { useCallback, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import ShopFloorDashboard from './ShopFloorDashboard';

export default function ShopFloor() {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const showSnackbar = useCallback((message, severity = 'error') => {
    if (!message) return;
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ padding: { xs: 1, sm: 2, md: 3 }, paddingTop: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <ShopFloorDashboard setSnackbar={showSnackbar} />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
