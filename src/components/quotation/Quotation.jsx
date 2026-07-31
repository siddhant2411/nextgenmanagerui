import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Routes, useLocation, useNavigate, Route} from "react-router-dom";
import apiService from "../../services/apiService";
import {Alert, CircularProgress, Box, Paper, Stack, Typography, Button, Divider, Grid, Container, Avatar} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { AddCircleOutline, Description, PlayArrow, Autorenew, AttachMoney, ChevronLeft } from "@mui/icons-material";
import QuotationList from "./QuotationList";
import AddUpdateQuotation from "./AddUpdateQuotation";
import { useViewState } from "../../commonTools/useViewState";

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
    header:  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
};

/* Route namespace for preserved filters/sort/page — see commonTools/useViewState. */
const VIEW_STATE_NS = '/quotation';

const DEFAULT_FILTERS = {
    qtnNo: '',
    qtnDate: '',
    enqNo: '',
    enqDate: '',
    companyName: '',
    netAmount: '',
    totalAmount: '',
    quotationStatus: ''
};

const Quotation = () => {
    const [loading, setLoading] = useState(false);
    const [quotationList, setQuotationList] = useState([]);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
    const showSnackbar = (message, severity = 'error') => setSnackbar({ open: true, message, severity });
    
    const [currentPage, setCurrentPage] = useViewState(VIEW_STATE_NS, 'page', 1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useViewState(VIEW_STATE_NS, 'sortBy', 'id');
    const [sortDir, setSortDir] = useViewState(VIEW_STATE_NS, 'sortDir', 'desc');
    // activeFilters drives the FilterBar chips; it must travel with `filters` or
    // the list would come back filtered with no visible chips explaining why.
    const [activeFilters, setActiveFilters] = useViewState(VIEW_STATE_NS, 'activeFilters', []);
    const [filters, setFilters] = useViewState(VIEW_STATE_NS, 'filters', DEFAULT_FILTERS);

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
                                                Quotation Hub
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, maxWidth: 600 }}>
                                                Generate, track, and manage professional proposals for your clients.
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained" 
                                            disableElevation
                                            startIcon={<AddCircleOutline />}
                                            onClick={() => navigate('add')}
                                            sx={{
                                                borderRadius: 3, textTransform: 'none',
                                                fontWeight: 900, px: 4, py: 1.5, fontSize: '1rem',
                                                bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' },
                                                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                                            }}
                                        >
                                            New Quotation
                                        </Button>
                                    </Stack>
                                </Container>
                            </Box>

                            <Container maxWidth="xl" sx={{ mt: -8 }}>
                                {/* Stats Cards */}
                                <Grid container spacing={3} sx={{ mb: 5 }}>
                                    {[
                                        { label: 'Total Quotes', value: quotationList.length, color: T.primary, bg: '#eff6ff', icon: <Description /> },
                                        { label: 'Conversion', value: quotationList.length ? Math.round((quotationList.filter(q => q.quotationStatus === 'ACCEPTED').length / quotationList.length) * 100) + '%' : '0%', color: T.success, bg: '#ecfdf5', icon: <AttachMoney /> },
                                        { label: 'Pending Approval', value: quotationList.filter(q => q.quotationStatus === 'DRAFT' || q.quotationStatus === 'SENT').length, color: T.warning, bg: '#fffbeb', icon: <Autorenew /> },
                                        { label: 'Active Pipeline', value: quotationList.filter(q => q.quotationStatus !== 'REJECTED').length, color: '#7c3aed', bg: '#f5f3ff', icon: <PlayArrow /> },
                                    ].map((stat, i) => (
                                        <Grid item xs={12} sm={6} md={3} key={i}>
                                            <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                                <Stack direction="row" spacing={2.5} alignItems="center">
                                                    <Avatar sx={{ bgcolor: stat.bg, color: stat.color, width: 54, height: 54, borderRadius: 3 }}>
                                                        {React.cloneElement(stat.icon, { fontSize: 'medium' })}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                            {stat.label}
                                                        </Typography>
                                                        <Typography variant="h4" sx={{ fontWeight: 900, color: T.text, mt: 0.5 }}>
                                                            {stat.value}
                                                        </Typography>
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
                                    {loading && quotationList.length === 0 ? (
                                        <Box display="flex" flexDirection="column" alignItems="center" py={10}>
                                            <CircularProgress size={48} thickness={4} />
                                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.textSec }}>Syncing Quotations...</Typography>
                                        </Box>
                                    ) : error ? (
                                        <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: 3, fontWeight: 700 }}>
                                            {error}
                                            <Button size="small" variant="outlined" color="inherit" onClick={() => fetchQuotationList()} sx={{ ml: 2, textTransform: 'none', borderRadius: 2 }}>Retry</Button>
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
                            </Container>
                        </Box>
                    }
                />

                <Route path="/add" element={<AddUpdateQuotation onSave={handleSave} />} />
                <Route path="/edit/:quotationId" element={<AddUpdateQuotation onSave={handleSave} />} />
            </Routes>
        </Box>
    );
};

export default Quotation;
