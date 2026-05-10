import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Routes, useLocation, useNavigate, Route} from "react-router-dom";
import apiService from "../../services/apiService";
import {Alert, CircularProgress, Box, Paper, Stack, Typography, Button, Divider, Grid} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { AddCircleOutline, Description, PlayArrow, Autorenew, AttachMoney } from "@mui/icons-material";
import QuotationList from "./QuotationList";
import AddUpdateQuotation from "./AddUpdateQuotation";

const Quotation = () => {
    const [loading, setLoading] = useState(false);
    const [quotationList, setQuotationList] = useState([]);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
    const showSnackbar = (message, severity = 'error') => setSnackbar({ open: true, message, severity });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('desc');
    const [activeFilters, setActiveFilters] = useState([]);
    const [filters, setFilters] = useState({
        qtnNo: '',
        qtnDate: '',
        enqNo: '',
        enqDate: '',
        companyName: '',
        netAmount: '',
        totalAmount: '',
        quotationStatus: ''
    });

    const itemsPerPage = 10;
    const navigate = useNavigate();
    const location = useLocation();

    const mapFiltersToParams = (filterArray) => {
        const newParams = {
            qtnNo: '', qtnDate: '', enqNo: '', enqDate: '',
            companyName: '', netAmount: '', totalAmount: '', quotationStatus: ''
        };
        filterArray.forEach(f => {
            if (newParams.hasOwnProperty(f.field)) {
                newParams[f.field] = f.value;
            }
        });
        return newParams;
    };

    const handleApplyFilters = (filterArray) => {
        setActiveFilters(filterArray);
        const newParams = mapFiltersToParams(filterArray);
        setFilters(newParams);
        fetchQuotationList(1, sortBy, sortDir, newParams);
    };

    const fetchQuotationList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, filterData = filters) => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: page - 1,
                    size: itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                };

                // Only add filters that have a non-empty value
                Object.keys(filterData).forEach(key => {
                    if (filterData[key] !== '' && filterData[key] !== null && filterData[key] !== undefined) {
                        params[key] = filterData[key];
                    }
                });

                const data = await apiService.get('/quotation', params);
                setQuotationList(data.content || []);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                setError('Failed to fetch quotation list');
            } finally {
                setLoading(false);
            }
        },
        [itemsPerPage, currentPage, sortBy, sortDir]
    );

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchQuotationList(currentPage, column, newSortDir, filters);
    };

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await apiService.put(`/quotation/${data.id}`, data);
            } else {
                await apiService.post('/quotation', data);
            }
            showSnackbar('Quotation saved successfully', 'success');
            navigate(-1);
        } catch (err) {
            showSnackbar(err?.response?.data?.message || err?.message || 'Failed to save quotation.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quotation?')) return;
        try {
            await apiService.delete(`/quotation/${id}`);
            showSnackbar('Quotation deleted', 'success');
            fetchQuotationList(currentPage, sortBy, sortDir, filters);
        } catch (err) {
            showSnackbar('Failed to delete quotation');
        }
    };

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchQuotationList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/quotation') {
            fetchQuotationList(currentPage, sortBy, sortDir, filters);
        }
    }, [location]);

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
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', mb: 0.5 }}>
                                            Quotation Hub
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                                            Review, track and send professional proposals
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained" 
                                        disableElevation
                                        startIcon={<AddCircleOutline />}
                                        onClick={() => navigate('add')}
                                        sx={{
                                            borderRadius: 3, textTransform: 'none',
                                            fontWeight: 800, px: 3, py: 1.2,
                                            bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' },
                                            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                                        }}
                                    >
                                        Create New Quotation
                                    </Button>
                                </Stack>

                                <Grid container spacing={3} sx={{ mb: 4 }}>
                                    {[
                                        { label: 'Total Volume', value: quotationList.length, color: '#2563eb', bg: '#eff6ff', icon: <Description /> },
                                        { label: 'Accepted', value: quotationList.filter(q => q.quotationStatus === 'ACCEPTED').length, color: '#059669', bg: '#ecfdf5', icon: <PlayArrow /> },
                                        { label: 'Pending/Draft', value: quotationList.filter(q => q.quotationStatus === 'DRAFT' || q.quotationStatus === 'SENT').length, color: '#d97706', bg: '#fffbeb', icon: <Autorenew /> },
                                        { label: 'Conversion Rate', value: quotationList.length ? Math.round((quotationList.filter(q => q.quotationStatus === 'ACCEPTED').length / quotationList.length) * 100) + '%' : '0%', color: '#7c3aed', bg: '#f5f3ff', icon: <AttachMoney /> },
                                    ].map((stat, i) => (
                                        <Grid item xs={12} sm={6} md={3} key={i}>
                                            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: stat.bg, color: stat.color, display: 'flex' }}>
                                                        {React.cloneElement(stat.icon, { fontSize: 'small' })}
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {stat.label}
                                                        </Typography>
                                                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>
                                                            {stat.value}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                                
                                <Divider sx={{ mb: 4, borderColor: '#f1f5f9' }} />

                                {loading && quotationList.length === 0 ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress size={32} />
                                    </Box>
                                ) : error ? (
                                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                        {error}
                                        <Button size="small" onClick={() => fetchQuotationList()} sx={{ ml: 2 }}>Retry</Button>
                                    </Alert>
                                ) : (
                                    <QuotationList
                                        handleSort={handleSort}
                                        filters={{ ...filters, sortBy, sortDir }}
                                        handleApplyFilters={handleApplyFilters}
                                        activeFilters={activeFilters}
                                        quotationList={quotationList}
                                        handleDelete={handleDelete}
                                        totalPages={totalPages}
                                        currentPage={currentPage}
                                        handlePageChange={handlePageChange}
                                        refreshList={() => fetchQuotationList(currentPage, sortBy, sortDir, filters)}
                                    />
                                )}
                            </Paper>
                        </Box>
                    }
                />

                <Route path="/add" element={<AddUpdateQuotation onSave={handleSave} />} />
                <Route path="/edit/:quotationId" element={<AddUpdateQuotation onSave={handleSave} />} />
            </Routes>
        </div>
    );
};

export default Quotation;
