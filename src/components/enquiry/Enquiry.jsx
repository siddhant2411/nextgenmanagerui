import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import apiService from "../../services/apiService";
import {Alert, Paper, Divider, CircularProgress, Box, Button, Stack, Typography, ToggleButtonGroup, ToggleButton, Chip, Container, Avatar, Grid, Tooltip} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { ViewList, ViewKanban, AddCircleOutline, FileDownload, FileUpload, TrendingUp, Group, AssignmentTurnedIn, Timer, Download } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from "@mui/material";
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
    // import dialog: step='idle'|'uploading'|'done'
    const [importDialog, setImportDialog] = useState({ open: false, step: 'idle', result: null, error: null });
    const importFileRef = useRef(null);
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

    const handleDownloadTemplate = async () => {
        try {
            await apiService.download('/enquiry/import-template', {});
        } catch (err) {
            showSnackbar('Failed to download template: ' + err.message);
        }
    };

    const handleImportFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setImportDialog(d => ({ ...d, step: 'uploading', result: null, error: null }));
        try {
            const res = await apiService.upload('/enquiry/bulk-import', file);
            setImportDialog(d => ({ ...d, step: 'done', result: res.data }));
            fetchEnquiryList(1, sortBy, sortDir, filters);
            fetchEnquirySummary();
        } catch (err) {
            setImportDialog(d => ({ ...d, step: 'done', result: null, error: err?.response?.data?.error || err.message }));
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
            {/* ── Import Leads Dialog ── */}
            <Dialog
                open={importDialog.open}
                onClose={() => importDialog.step !== 'uploading' && setImportDialog(d => ({ ...d, open: false }))}
                maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 5, overflow: 'hidden' } }}
            >
                {/* Header */}
                <Box sx={{ bgcolor: '#0f172a', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.2) 0%, transparent 60%)', px: 4, pt: 4, pb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'rgba(37,99,235,0.2)', width: 48, height: 48, borderRadius: 3 }}>
                            <FileUpload sx={{ color: '#60a5fa' }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
                                {importDialog.step === 'done' ? 'Import Complete' : 'Import Leads'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                {importDialog.step === 'done' ? 'Your file has been processed.' : 'Upload an Excel or CSV file to bulk-create leads.'}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
                {importDialog.step === 'uploading' && <LinearProgress sx={{ height: 3 }} />}

                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    {/* ── idle: instructions + template + upload button ── */}
                    {importDialog.step === 'idle' && (
                        <Stack spacing={3}>
                            {/* Step 1 — download template */}
                            <Box sx={{ p: 3, borderRadius: 4, border: `2px dashed ${T.border}`, bgcolor: T.bg }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#eff6ff', color: T.primary, borderRadius: 2.5, width: 44, height: 44 }}>
                                        <Download />
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 800, color: T.text, fontSize: '0.95rem' }}>Step 1 — Download the Template</Typography>
                                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 600 }}>
                                            Fill it in with your leads. Only <strong>Opportunity Name</strong> is required.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained" disableElevation startIcon={<Download />}
                                        onClick={handleDownloadTemplate}
                                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap', bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' } }}
                                    >
                                        Download Template
                                    </Button>
                                </Stack>
                            </Box>

                            {/* Step 2 — upload file */}
                            <Box
                                onClick={() => importFileRef.current?.click()}
                                sx={{
                                    p: 4, borderRadius: 4, border: `2px dashed ${T.border}`, bgcolor: T.bg,
                                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                                    '&:hover': { borderColor: T.primary, bgcolor: '#eff6ff' }
                                }}
                            >
                                <Avatar sx={{ bgcolor: '#ecfdf5', color: T.success, borderRadius: 2.5, width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                                    <FileUpload />
                                </Avatar>
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Step 2 — Upload your file</Typography>
                                <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 600 }}>
                                    Click to browse · Accepts .xlsx, .xls, .csv
                                </Typography>
                            </Box>
                        </Stack>
                    )}

                    {/* ── uploading ── */}
                    {importDialog.step === 'uploading' && (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CircularProgress size={48} thickness={4} sx={{ color: T.primary }} />
                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.textSec }}>Processing your file…</Typography>
                        </Box>
                    )}

                    {/* ── done: results ── */}
                    {importDialog.step === 'done' && (
                        <Stack spacing={2.5}>
                            {importDialog.error && (
                                <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>{importDialog.error}</Alert>
                            )}
                            {importDialog.result && (
                                <>
                                    <Stack direction="row" spacing={2}>
                                        <Box sx={{ flex: 1, p: 2.5, borderRadius: 4, bgcolor: '#ecfdf5', textAlign: 'center' }}>
                                            <Typography variant="h3" sx={{ fontWeight: 900, color: T.success }}>{importDialog.result.created}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: T.success }}>Created</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, p: 2.5, borderRadius: 4, bgcolor: importDialog.result.duplicates > 0 ? '#fffbeb' : T.bg, textAlign: 'center' }}>
                                            <Typography variant="h3" sx={{ fontWeight: 900, color: importDialog.result.duplicates > 0 ? T.warning : T.textSec }}>{importDialog.result.duplicates}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: importDialog.result.duplicates > 0 ? T.warning : T.textSec }}>Duplicates</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, p: 2.5, borderRadius: 4, bgcolor: importDialog.result.skipped > 0 ? '#fef2f2' : T.bg, textAlign: 'center' }}>
                                            <Typography variant="h3" sx={{ fontWeight: 900, color: importDialog.result.skipped > 0 ? T.error : T.textSec }}>{importDialog.result.skipped}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: importDialog.result.skipped > 0 ? T.error : T.textSec }}>Errors</Typography>
                                        </Box>
                                    </Stack>
                                    {importDialog.result.errors?.length > 0 && (
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: T.error, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Row Errors</Typography>
                                            <Box sx={{ mt: 1, maxHeight: 180, overflowY: 'auto', bgcolor: T.bg, borderRadius: 3, p: 2, border: `1px solid ${T.border}` }}>
                                                {importDialog.result.errors.map((err, i) => (
                                                    <Typography key={i} variant="caption" sx={{ display: 'block', color: T.error, fontFamily: 'monospace', lineHeight: 1.8 }}>{err}</Typography>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </>
                            )}
                            {/* Import another */}
                            <Button
                                variant="outlined" startIcon={<FileUpload />}
                                onClick={() => { setImportDialog(d => ({ ...d, step: 'idle', result: null, error: null })); }}
                                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                            >
                                Import Another File
                            </Button>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setImportDialog(d => ({ ...d, open: false }))}
                        disabled={importDialog.step === 'uploading'}
                        variant={importDialog.step === 'done' ? 'contained' : 'text'}
                        disableElevation
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, px: 3, ...(importDialog.step === 'done' ? { bgcolor: T.text, '&:hover': { bgcolor: '#1e293b' } } : { color: T.textSec }) }}
                    >
                        {importDialog.step === 'done' ? 'Done' : 'Cancel'}
                    </Button>
                </DialogActions>
            </Dialog>

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
                                                variant="outlined" startIcon={<FileUpload />}
                                                onClick={() => setImportDialog({ open: true, step: 'idle', result: null, error: null })}
                                                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                            >
                                                Import Leads
                                            </Button>
                                            <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportFileSelected} />
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
