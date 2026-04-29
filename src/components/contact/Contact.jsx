import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
} from '@mui/material';
import apiService, { resolveApiErrorMessage } from '../../services/apiService';
import ContactList from './ContactList';
import AddUpdateContact from './AddUpdateContact';

const Contact = () => {
    const [contactList, setContactList]   = useState([]);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [currentPage, setCurrentPage]   = useState(1);
    const [totalPages, setTotalPages]     = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [rowsPerPage, setRowsPerPage]   = useState(20);
    const [sortBy, setSortBy]             = useState('companyName');
    const [sortDir, setSortDir]           = useState('asc');
    const [filters, setFilters]           = useState({ query: '', type: '' });
    const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

    const itemsPerPage    = rowsPerPage;
    const navigate        = useNavigate();
    const location        = useLocation();
    const debounceTimeout = useRef(null);

    const showSnackbar = (message, severity = 'success') =>
        setSnackbar({ open: true, message, severity });

    // ── fetch ──────────────────────────────────────────────────────────────
    const fetchContactList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, f = filters) => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: page - 1,
                    size: itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                    ...(f.query && { query: f.query }),
                    ...(f.type  && { type:  f.type  }),
                };
                const data = await apiService.get('/contact', params);
                setContactList(data.content || []);
                setTotalPages(data.totalPages || 1);
                setTotalElements(data.totalElements ?? data.content?.length ?? 0);
                setCurrentPage(page);
            } catch (err) {
                setError('Failed to fetch contacts.');
            } finally {
                setLoading(false);
            }
        },
        [currentPage, sortBy, sortDir, filters]
    );

    useEffect(() => {
        if (location.pathname === '/contact') {
            fetchContactList(currentPage, sortBy, sortDir, filters);
        }
    }, [location.pathname]);

    useEffect(() => {
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, []);

    // ── handlers ───────────────────────────────────────────────────────────
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchContactList(1, sortBy, sortDir, newFilters);
        }, 500);
    };

    const handleSort = (column) => {
        const newDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newDir);
        fetchContactList(currentPage, column, newDir, filters);
    };

    const handlePageChange = (_, page) => {
        fetchContactList(page, sortBy, sortDir, filters);
    };

    const handleRowsPerPageChange = (event) => {
        const newSize = parseInt(event.target.value, 10);
        setRowsPerPage(newSize);
        fetchContactList(1, sortBy, sortDir, filters);
    };

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await apiService.put(`/contact/${data.id}`, data);
                showSnackbar('Contact updated successfully.');
            } else {
                await apiService.post('/contact', data);
                showSnackbar('Contact created successfully.');
            }
            navigate('/contact');
        } catch (err) {
            showSnackbar(resolveApiErrorMessage(err, 'Failed to save contact.'), 'error');
        }
    };

    const handleDeleteRequest = (id) => setDeleteDialog({ open: true, id });

    const handleDeleteConfirm = async () => {
        const { id } = deleteDialog;
        setDeleteDialog({ open: false, id: null });
        try {
            await apiService.delete(`/contact/${id}`);
            showSnackbar('Contact deleted.');
            fetchContactList(currentPage, sortBy, sortDir, filters);
        } catch (err) {
            showSnackbar(resolveApiErrorMessage(err, 'Failed to delete contact.'), 'error');
        }
    };

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this contact? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            <Routes>
                <Route
                    path="/"
                    element={
                        loading ? (
                            <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />
                        ) : error ? (
                            <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>
                        ) : (
                            <ContactList
                                contacts={contactList}
                                filters={filters}
                                sortBy={sortBy}
                                sortDir={sortDir}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalElements={totalElements}
                                rowsPerPage={rowsPerPage}
                                handleSort={handleSort}
                                handlePageChange={handlePageChange}
                                handleRowsPerPageChange={handleRowsPerPageChange}
                                handleFilterChange={handleFilterChange}
                                handleDelete={handleDeleteRequest}
                            />
                        )
                    }
                />
                <Route path="/add"         element={<AddUpdateContact onSave={handleSave} />} />
                <Route path="/edit/:contactId" element={<AddUpdateContact onSave={handleSave} />} />
            </Routes>
        </>
    );
};

export default Contact;
