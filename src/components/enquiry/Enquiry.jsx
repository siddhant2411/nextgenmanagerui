import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import apiService from "../../services/apiService";
import {Alert, Paper, Divider, CircularProgress, Box, Button, Stack, Typography, ToggleButtonGroup, ToggleButton, Chip, Container, Avatar, Grid} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { ViewList, ViewKanban, AddCircleOutline, Refresh, FileDownload, TrendingUp, Group, AssignmentTurnedIn, Timer } from "@mui/icons-material";
import EnquiryList from "./EnquiryList";
import AddUpdateEnquiry from "./AddUpdateEnquiry";
import EnquiryDashboard from "./EnquiryDashboard";
import EnquiryKanban from "./EnquiryKanban";

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
};

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
    const [exportLoading, setExportLoading] = useState(false);
    const [activeFilters, setActiveFilters] = useState([]);
    const [filters, setFilters] = useState({
        companyName: '',
        enqNo: '',
        lastContactedDate: '',
        enqDate: '',
        closedDate: '',
        daysForNextFollowup: '',
        lastContactedDateComp: '=',
        enqDateComp: '=',
        closedDateComp: '>',
    });

    const itemsPerPage = 10;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    const mapFiltersToParams = (filterArray) => {
        const newParams = {
            companyName: '', enqNo: '', lastContactedDate: '', enqDate: '', closedDate: '',
            daysForNextFollowup: '', lastContactedDateComp: '=', enqDateComp: '=', closedDateComp: '>'
        };
        filterArray.forEach(f => {
            if (f.field === 'enqNo') newParams.enqNo = f.value;
            if (f.field === 'companyName') newParams.companyName = f.value;
            if (f.field === 'daysForNextFollowup') newParams.daysForNextFollowup = f.value;
            if (f.field === 'enqDate') {
                newParams.enqDate = f.value;
                newParams.enqDateComp = f.operator;
            }
            if (f.field === 'lastContactedDate') {
                newParams.lastContactedDate = f.value;
                newParams.lastContactedDateComp = f.operator;
            }
            if (f.field === 'closedDate') {
                newParams.closedDate = f.value;
                newParams.closedDateComp = f.operator;
            }
        });
        return newParams;
    };

    const handleApplyFilters = (filterArray) => {
        setActiveFilters(filterArray);
        const newParams = mapFiltersToParams(filterArray);
        setFilters(newParams);
        fetchEnquiryList(1, sortBy, sortDir, newParams);
        fetchEnquirySummary();
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

    const handleExport = async () => {
        setExportLoading(true);
        try {
            const params = {};
            if (filters.enqNo)            params.enqNo = filters.enqNo;
            if (filters.companyName)      params.companyName = filters.companyName;
            if (filters.enqDate)          params.enqDate = filters.enqDate;
            if (filters.lastContactedDate) params.lastContactedDate = filters.lastContactedDate;
            if (filters.closedDate)       params.closedDate = filters.closedDate;
            if (filters.enqDateComp)      params.enqDateComp = filters.enqDateComp;
            if (filters.lastContactedDateComp) params.lastContactedDateComp = filters.lastContactedDateComp;
            if (filters.closedDateComp)   params.closedDateComp = filters.closedDateComp;

            await apiService.download('/enquiry/export', params);
            showSnackbar('Export successful', 'success');
        } catch (err) {
            showSnackbar('Export failed: ' + err.message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (id === null) {
            fetchEnquiryList(currentPage, sortBy, sortDir, filters);
            fetchEnquirySummary();
            return;
        }
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

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh' }}>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 3, fontWeight: 700 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Box>
                            {/* ── Hero Header ── */}
                            <Box sx={{ 
                                bgcolor: '#0f172a', 
                                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                                color: 'white', pt: 6, pb: 15
                            }}>
                                <Container maxWidth="xl">
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.03em', mb: 1 }}>
                                                Lead Pipeline
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, maxWidth: 600 }}>
                                                Track incoming enquiries, manage client relationships, and drive conversions.
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant="outlined" startIcon={<FileDownload />}
                                                onClick={handleExport}
                                                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                            >
                                                Export Leads
                                            </Button>
                                            <Button
                                                variant="contained" disableElevation startIcon={<AddCircleOutline />}
                                                onClick={() => navigate('add')}
                                                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, px: 4, py: 1.5, bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' }, boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}
                                            >
                                                New Lead
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Container>
                            </Box>

                            <Container maxWidth="xl" sx={{ mt: -8 }}>
                                {/* Stats Cards */}
                                <Grid container spacing={3} sx={{ mb: 5 }}>
                                    {[
                                        { label: 'Active Leads', value: summary?.totalEnquiries ?? 0, color: T.primary, bg: '#eff6ff', icon: <TrendingUp /> },
                                        { label: 'Followups Today', value: summary?.todaysFollowups ?? 0, color: T.warning, bg: '#fffbeb', icon: <Timer /> },
                                        { label: 'Hot Leads', value: summary?.hotLeads ?? 0, color: T.error, bg: '#fef2f2', icon: <AssignmentTurnedIn /> },
                                        { label: 'New Clients', value: summary?.newContactsCount ?? 0, color: T.success, bg: '#ecfdf5', icon: <Group /> },
                                    ].map((stat, i) => (
                                        <Grid item xs={12} sm={6} md={3} key={i}>
                                            <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                                <Stack direction="row" spacing={2.5} alignItems="center">
                                                    <Avatar sx={{ bgcolor: stat.bg, color: stat.color, width: 54, height: 54, borderRadius: 3 }}>
                                                        {React.cloneElement(stat.icon, { fontSize: 'medium' })}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</Typography>
                                                        <Typography variant="h4" sx={{ fontWeight: 900, color: T.text, mt: 0.5 }}>{stat.value}</Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        width: '100%',
                                        borderRadius: 5,
                                        border: `1px solid ${T.border}`,
                                        bgcolor: 'white',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {/* View Toggle Bar */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Lead Pipeline Registry</Typography>
                                        <ToggleButtonGroup
                                            value={viewMode} exclusive
                                            onChange={(e, val) => val && setViewMode(val)}
                                            size="small"
                                            sx={{
                                                bgcolor: T.bg, p: 0.5, borderRadius: 3,
                                                '& .MuiToggleButton-root': {
                                                    border: 'none', borderRadius: '10px !important',
                                                    px: 3, py: 0.8, textTransform: 'none',
                                                    fontWeight: 800, fontSize: '0.85rem',
                                                    color: T.textSec,
                                                    '&.Mui-selected': { bgcolor: 'white', color: T.primary, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
                                                }
                                            }}
                                        >
                                            <ToggleButton value="list">
                                                <ViewList fontSize="small" sx={{ mr: 1 }} /> List View
                                            </ToggleButton>
                                            <ToggleButton value="kanban">
                                                <ViewKanban fontSize="small" sx={{ mr: 1 }} /> Board View
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Stack>

                                    {loading && enquiryList.length === 0 ? (
                                        <Box display="flex" flexDirection="column" alignItems="center" py={10}>
                                            <CircularProgress size={48} thickness={4} />
                                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.textSec }}>Loading leads...</Typography>
                                        </Box>
                                    ) : error ? (
                                        <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: 3, fontWeight: 700 }}>
                                            {error}
                                            <Button size="small" variant="outlined" color="inherit" onClick={() => fetchEnquiryList()} sx={{ ml: 2, textTransform: 'none', borderRadius: 2 }}>Retry</Button>
                                        </Alert>
                                    ) : (
                                        viewMode === 'kanban' ? (
                                            <EnquiryKanban enquiries={enquiryList} onStatusChange={handleStatusChange} />
                                        ) : (
                                            <EnquiryList
                                                enquiryList={enquiryList}
                                                filters={{ ...filters, sortBy, sortDir }}
                                                handleSort={handleSort}
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                handlePageChange={handlePageChange}
                                                handleApplyFilters={handleApplyFilters}
                                                activeFilters={activeFilters}
                                                handleDelete={handleDelete}
                                            />
                                        )
                                    )}
                                </Paper>
                            </Container>
                        </Box>
                    }
                />

                <Route path="/add" element={<AddUpdateEnquiry onSave={handleSave} />} />
                <Route path="/edit/:enquiryId" element={<AddUpdateEnquiry onSave={handleSave} />} />
            </Routes>
        </Box>
    );
};

export default Enquiry;
