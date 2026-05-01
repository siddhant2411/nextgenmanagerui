import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import apiService from "../../services/apiService";
import {Alert, Paper,Divider,CircularProgress, Box, Button, Stack, Typography, ToggleButtonGroup, ToggleButton, Chip} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { ViewList, ViewKanban, AddCircleOutline, Refresh } from "@mui/icons-material";
import EnquiryList from "./EnquiryList";
import AddUpdateEnquiry from "./AddUpdateEnquiry";
import EnquiryDashboard from "./EnquiryDashboard";
import EnquiryKanban from "./EnquiryKanban";

const Enquiry = () => {
    const [loading, setLoading] = useState(false);
    const [enquiryList, setEnquiryList] = useState([]);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
    const showSnackbar = (message, severity = 'error') => setSnackbar({ open: true, message, severity });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('enqDate');
    const [sortDir, setSortDir] = useState('desc');
    const [summary, setSummary] = useState(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({
        companyName: '',
        enqNo: '',
        lastContactDate: '',
        enqDate: '',
        closedDate: '',
        daysForNextFollowup: '',
        lastContactedDateComp: '=',
        enqDateComp: '=',
        closedDateComp: '>',
        statusFilter: '',
    });

    
    const itemsPerPage = 10;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    const handleFilterChange = (key, value) => {
        if (key === 'viewMode') {
            setViewMode(value);
            return;
        }
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchEnquiryList(1, sortBy, sortDir, newFilters);
        }, 600);
    };

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchEnquiryList(currentPage, column, newSortDir, filters);
    };

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await apiService.put(`/enquiry/${data.id}`, data);
            } else {
                await apiService.post('/enquiry', data);
            }
            showSnackbar('Enquiry saved successfully!', 'success');
            navigate(-1);
        } catch (err) {
            showSnackbar(err?.response?.data?.message || err?.message || 'Failed to save enquiry.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
        try {
            await apiService.delete(`/enquiry/${id}`);
            showSnackbar('Enquiry deleted.', 'success');
            fetchEnquiryList(currentPage, sortBy, sortDir, filters);
        } catch (err) {
            showSnackbar(err?.response?.data?.message || 'Failed to delete enquiry.');
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await apiService.patch(`/enquiry/${id}/status`, newStatus);
            showSnackbar(`Status updated to ${newStatus}`, 'success');
            fetchEnquiryList(currentPage, sortBy, sortDir, filters);
        } catch (err) {
            showSnackbar(err?.response?.data?.message || err?.message || 'Failed to update status.');
        }
    };

    const fetchEnquirySummary = async () => {
        setIsSummaryLoading(true);
        try {
            const data = await apiService.get('/enquiry/summary');
            setSummary(data);
        } catch (err) {
            console.error('Failed to fetch summary');
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const fetchEnquiryList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, filterData = filters) => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: page - 1,
                    size: viewMode === 'kanban' ? 200 : itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                    ...filterData,
                };
                // Remove viewMode from API params
                delete params.viewMode;
                delete params.statusFilter;
                const data = await apiService.get('/enquiry', params);
                setEnquiryList(data.content || []);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                setError('Failed to fetch enquiry list');
            } finally {
                setLoading(false);
            }
        },
        [itemsPerPage, currentPage, sortBy, sortDir, viewMode]
    );

    useEffect(() => {
        fetchEnquirySummary();
    }, []);

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchEnquiryList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/enquiry') {
            fetchEnquiryList(currentPage, sortBy, sortDir, filters);
        }
    }, [location, viewMode]);

    useEffect(() => {
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, []);

    return (
        <div>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 2, md: 3 },
                                    width: '100%',
                                    borderRadius: 2,
                                    border: '1px solid #e2e8f0',
                                    bgcolor: 'white'
                                }}
                            >
                                {/* Page Header */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                            Lead & Enquiry Management
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Track, manage and convert your sales pipeline
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <ToggleButtonGroup
                                            value={viewMode}
                                            exclusive
                                            onChange={(e, val) => val && setViewMode(val)}
                                            size="small"
                                            sx={{
                                                bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2,
                                                '& .MuiToggleButton-root': {
                                                    border: 'none', borderRadius: '8px !important',
                                                    px: 2, py: 0.5, textTransform: 'none',
                                                    fontWeight: 700, fontSize: '0.78rem',
                                                    '&.Mui-selected': { bgcolor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
                                                }
                                            }}
                                        >
                                            <ToggleButton value="list">
                                                <ViewList fontSize="small" sx={{ mr: 0.75 }} /> List
                                            </ToggleButton>
                                            <ToggleButton value="kanban">
                                                <ViewKanban fontSize="small" sx={{ mr: 0.75 }} /> Board
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                        <Button
                                            variant="contained" disableElevation
                                            startIcon={<AddCircleOutline />}
                                            onClick={() => navigate('add')}
                                            sx={{
                                                borderRadius: 2, textTransform: 'none',
                                                fontWeight: 700, px: 2.5,
                                                bgcolor: '#1e40af', '&:hover': { bgcolor: '#1e3a8a' },
                                            }}
                                        >
                                            New Lead
                                        </Button>
                                    </Stack>
                                </Stack>

                                <Divider sx={{ mb: 3, borderColor: '#f1f5f9' }} />

                                {/* Dashboard Stats */}
                                <EnquiryDashboard summary={summary} loading={isSummaryLoading} />

                                {/* Loading indicator */}
                                {loading && (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress size={32} />
                                    </Box>
                                )}

                                {/* Error */}
                                {error && !loading && (
                                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                        {error}
                                        <Button size="small" onClick={() => fetchEnquiryList()} sx={{ ml: 2 }}>Retry</Button>
                                    </Alert>
                                )}

                                {/* View */}
                                {!loading && !error && (
                                    viewMode === 'kanban' ? (
                                        <EnquiryKanban
                                            enquiries={enquiryList}
                                            onStatusChange={handleStatusChange}
                                        />
                                    ) : (
                                        <EnquiryList
                                            enquiryList={enquiryList}
                                            filters={{ ...filters, sortBy, sortDir }}
                                            handleSort={handleSort}
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            handlePageChange={handlePageChange}
                                            handleFilterChange={handleFilterChange}
                                            handleDelete={handleDelete}
                                        />
                                    )
                                )}
                            </Paper>
                        </Box>
                    }
                />

                <Route path="/add" element={<AddUpdateEnquiry onSave={handleSave} />} />
                <Route path="/edit/:enquiryId" element={<AddUpdateEnquiry onSave={handleSave} />} />
            </Routes>
        </div>
    );
};

export default Enquiry;
