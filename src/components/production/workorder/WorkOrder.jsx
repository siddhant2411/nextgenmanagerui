import React, { useCallback, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import WorkOrderList from './WorkOrderList';
import AddUpdateWorkOrder from './AddUpdateWorkOrder';
import "./WorkOrder.css";
import Snackbar from '@mui/material/Snackbar';
import { Alert } from '@mui/material';
export default function WorkOrder() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setLoadingStable = useCallback((val) => setLoading(val), []);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error',
  });

  const showSnackbar = useCallback((message, severity = 'error') => {
    if (!message) return;
    setSnackbar({ open: true, message, severity });
  }, []);
  const setErrorStable = useCallback((val) => showSnackbar(val, 'error'), [showSnackbar]);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ padding: 3, paddingTop: 1 }}>
      <Routes>
        <Route
          path="/"
          element={
            <WorkOrderList
              setLoading={setLoadingStable}
              loading={loading}
              setError={setErrorStable}
            />
          }
        />
        <Route
          path="/add"
          element={<AddUpdateWorkOrder setError={setErrorStable} setSnackbar={showSnackbar} />}
        />
        <Route
          path="/edit/:workOrderId"
          element={<AddUpdateWorkOrder setError={setErrorStable} setSnackbar={showSnackbar} />}
        />
      </Routes>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
