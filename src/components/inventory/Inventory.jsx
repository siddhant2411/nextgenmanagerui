import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import InventoryList from './InventoryList';
import { Button } from 'react-bootstrap';
import InventoryForm from './InventoryForm';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Typography, Alert, CircularProgress
} from '@mui/material';
import { addInventory, getPresentInventory, updateInventory, sendToPlanning } from '../../services/inventoryService';

const Inventory = () => {
    const [loading, setLoading] = useState(false);
    const [inventoryList, setInventoryList] = useState([]);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('inventoryItemRef');
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({
        itemCode: '',
        name: '',
        hsnCode: '',
        itemType: '',
        uom: '',
    });

    const [planningDialog, setPlanningDialog] = useState({ open: false, item: null });
    const [planningQty, setPlanningQty] = useState('');
    const [planningLoading, setPlanningLoading] = useState(false);
    const [planningResult, setPlanningResult] = useState(null);
    const [planningError, setPlanningError] = useState(null);

    const itemsPerPage = 10;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            fetchInventoryList(currentPage, sortBy, sortDir, newFilters);
        }, 1500);
    };

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchInventoryList(currentPage, column, newSortDir, filters);
    };

    const handleOpenPlanningDialog = (item) => {
        const suggested = Math.max(0, (item.maxStock || 0) - (item.totalQuantity || 0));
        setPlanningQty(suggested > 0 ? suggested.toFixed(2) : '');
        setPlanningResult(null);
        setPlanningError(null);
        setPlanningDialog({ open: true, item });
    };

    const handleClosePlanningDialog = () => {
        setPlanningDialog({ open: false, item: null });
        setPlanningResult(null);
        setPlanningError(null);
    };

    const handleConfirmSendToPlanning = async () => {
        const qty = parseFloat(planningQty);
        if (!qty || qty <= 0) {
            setPlanningError('Please enter a valid quantity.');
            return;
        }
        setPlanningLoading(true);
        setPlanningError(null);
        try {
            const result = await sendToPlanning(planningDialog.item.inventoryItemId, qty, 'STORE');
            setPlanningResult(result);
        } catch (err) {
            setPlanningError(err?.response?.data?.error || 'Failed to send to planning.');
        } finally {
            setPlanningLoading(false);
        }
    };

    const handleAdd = () => {
        navigate('add');
    };

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await updateInventory(data.id, data); // Update
            } else {
                await addInventory(data); // Create
            }
            navigate(-1);
        } catch (err) {
            // handled
        }
    };

    const fetchInventoryList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, filters) => {
            setLoading(true);
            setError(null); // Reset error state
            try {
                const params = {
                    page: page - 1, // API expects zero-based page index
                    size: itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                    ...filters, // Pass filters in API request
                };

                const data = await getPresentInventory(params);
                setInventoryList(data.content || []);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(page);
            } catch (err) {
                setError('Failed to fetch inventory list');
            } finally {
                setLoading(false);
            }
        },
        [currentPage, sortBy, sortDir]
    );

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchInventoryList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/inventory') {
            fetchInventoryList(currentPage, sortBy, sortDir, filters);
        }
    }, [location]);

    if (loading) {
        return (
            <div className="text-center">
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error: {error}</div>;
    }

    const { item: planItem } = planningDialog;

    return (
        <div>
            <Routes>
                <Route
                    path="/"
                    element={
                        <InventoryList
                            inventoryList={inventoryList}
                            setSortBy={setSortBy}
                            setSortDir={setSortDir}
                            filters={filters}
                            handleSort={handleSort}
                            onFilterChange={handleFilterChange}
                            handleAdd={handleAdd}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            handlePageChange={handlePageChange}
                            onSendToPlanning={handleOpenPlanningDialog}
                        />
                    }
                />
                <Route
                    path="/add"
                    element={
                        <InventoryForm
                            onSave={handleSave}
                            initialData={null}
                        />
                    }
                />

            </Routes>

            {/* Send to Planning dialog */}
            <Dialog open={planningDialog.open} onClose={handleClosePlanningDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Send to Planning</DialogTitle>
                <DialogContent sx={{ pt: '12px !important' }}>
                    {planItem && (
                        <>
                            <Typography variant="body2" fontWeight={600} mb={0.5}>
                                {planItem.name} <span style={{ color: '#64748b', fontWeight: 400 }}>({planItem.itemCode})</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                Current stock: <strong>{planItem.totalQuantity?.toFixed(2)}</strong> &nbsp;|&nbsp;
                                Reorder level: <strong>{planItem.reorderLevel?.toFixed(2)}</strong> &nbsp;|&nbsp;
                                Max stock: <strong>{planItem.maxStock?.toFixed(2)}</strong>
                            </Typography>
                        </>
                    )}
                    {planningResult ? (
                        <Alert severity={planningResult.decision === 'UNDECIDED' ? 'info' : 'success'}>
                            {planningResult.decision === 'WORK_ORDER' && `Work Order #${planningResult.orderId} created.`}
                            {planningResult.decision === 'PURCHASE_ORDER' && `Purchase Requisition #${planningResult.orderId} created.`}
                            {planningResult.decision === 'UNDECIDED' && 'Added to the Planning Desk queue — a planner will decide make/buy.'}
                        </Alert>
                    ) : (
                        <TextField
                            label="Replenishment Quantity"
                            type="number"
                            value={planningQty}
                            onChange={(e) => setPlanningQty(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ min: 0.01, step: 0.01 }}
                            helperText={planItem && planItem.maxStock > 0
                                ? `Suggested: max stock (${planItem.maxStock}) − current (${planItem.totalQuantity?.toFixed(2)}) = ${Math.max(0, (planItem.maxStock || 0) - (planItem.totalQuantity || 0)).toFixed(2)}`
                                : ''}
                        />
                    )}
                    {planningError && <Alert severity="error" sx={{ mt: 1 }}>{planningError}</Alert>}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outline-secondary" size="sm" onClick={handleClosePlanningDialog}>
                        {planningResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!planningResult && (
                        <Button
                            variant="primary" size="sm"
                            onClick={handleConfirmSendToPlanning}
                            disabled={planningLoading}
                        >
                            {planningLoading ? <CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} /> : null}
                            Confirm
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Inventory;
