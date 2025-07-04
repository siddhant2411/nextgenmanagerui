import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import apiService from '../../../services/apiService';
import WorkOrderList from './WorkOrderList';
import AddUpdateWorkOrder from './AddUpdateWorkOrder';
import "./WorkOrder.css";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
export default function WorkOrder() {
  const [loading, setLoading] = useState(false);
  const [workOrderList, setWorkOrderList] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalElements, setTotalElements] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const debounceTimeout = useRef(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.post('/production/workOrder/get-list', {
        page: currentPage - 1,
        size: itemsPerPage,
        sortBy,
        sortDir,
        filterDTO: filters
      });
      setWorkOrderList(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortDir, filters]);

  useEffect(() => {
    if (location.pathname === '/production/work-order') {
      fetchList();
    }
  }, [location, fetchList]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchList();
    }, 500);
  };

  const handleSort = (column) => {
    const direction = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortDir(direction);
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage + 1);
  };

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    setItemsPerPage(value);
    setCurrentPage(1);
  };

   const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const showError = (msg) => {
    setSnackbar({ open: true, message: msg, severity: 'error' });
  };

  const showSuccess = (msg) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
  };
  return (
    <Box sx={{ padding: 2 }} className="work-order-table">
      <Routes>
        <Route
          path="/"
          element={
            <WorkOrderList
              workOrderList={workOrderList}
              filters={filters}
              sortBy={sortBy}
              sortDir={sortDir}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalElements={totalElements}
              onFilterChange={handleFilterChange}
              onSort={handleSort}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          }
        />
        <Route path="/add" element={<AddUpdateWorkOrder showSuccess={showSuccess} showError={showError}/>} />
        <Route path="/edit/:workOrderId" element={<AddUpdateWorkOrder />} />
      </Routes>


       <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
