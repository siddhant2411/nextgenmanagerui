import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Button, Stack, CircularProgress, IconButton, Tooltip, Container, Paper
} from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';
import { listDeliveryNotes } from '../../../services/salesOrderService';
import DeliveryNoteList from './DeliveryNoteList';

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

export default function DeliveryNoteHub() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const soId = searchParams.get('salesOrderId');
    const soNum = searchParams.get('salesOrderNumber');

    const [dnList, setDnList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ 
        page: 0, 
        size: 10, 
        sortBy: 'deliveryDate', 
        sortDir: 'desc',
        salesOrderId: soId || '',
        salesOrderNumber: soNum || ''
    });
    const [activeFilters, setActiveFilters] = useState(
        soNum ? [{ field: 'salesOrderNumber', value: soNum, operator: '=' }] : []
    );
    const [totalPages, setTotalPages] = useState(0);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const cleanFilters = {};
            Object.keys(filters).forEach(k => {
                if (filters[k] !== '' && filters[k] !== null && filters[k] !== undefined) {
                    cleanFilters[k] = filters[k];
                }
            });
            const data = await listDeliveryNotes(cleanFilters);
            setDnList(Array.isArray(data?.content) ? data.content : []);
            setTotalPages(data?.totalPages ?? 1);
        } catch (err) {
            console.error('Failed to fetch delivery notes', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchList(); }, [fetchList]);

    const mapFiltersToParams = (filterArray) => {
        const newParams = { salesOrderId: soId || '', salesOrderNumber: soNum || '' };
        filterArray.forEach(f => {
            if (f.field === 'salesOrderId') newParams.salesOrderId = f.value;
            if (f.field === 'salesOrderNumber') newParams.salesOrderNumber = f.value;
        });
        return newParams;
    };

    const handleApplyFilters = (newFilters) => {
        if (Array.isArray(newFilters)) {
            setActiveFilters(newFilters);
            const mapped = mapFiltersToParams(newFilters);
            setFilters(prev => ({ ...prev, ...mapped, page: 0 }));
        } else {
            setFilters(prev => ({ ...prev, ...newFilters, page: 0 }));
        }
    };
    const handlePageChange = (_, value) => setFilters(prev => ({ ...prev, page: value - 1 }));
    const handleSort = (column) => setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortDir: prev.sortBy === column && prev.sortDir === 'desc' ? 'asc' : 'desc'
    }));

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* ── Hero Header ── */}
            <Box sx={{ 
                bgcolor: '#0f172a', 
                backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 40%)',
                color: 'white', pt: 6, pb: 12 
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                Delivery Challans
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                {soId ? `Dispatches associated with Sales Order #${soId}` : 'Registry of all warehouse dispatches and outward goods.'}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh Registry">
                                <IconButton onClick={fetchList} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained" disableElevation startIcon={<ArrowBack />}
                                onClick={() => navigate('/sales/sales-order')}
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2.5, px: 3, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                            >
                                Back to Hub
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* ── Main Registry ── */}
            <Container maxWidth="xl" sx={{ mt: -6 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)' }}>
                    <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 800, color: T.text }}>Dispatch Registry</Typography>
                    </Box>
                    <DeliveryNoteList
                        dnList={dnList}
                        filters={filters}
                        handleSort={handleSort}
                        currentPage={filters.page + 1}
                        totalPages={totalPages}
                        handlePageChange={handlePageChange}
                        activeFilters={activeFilters}
                        handleApplyFilters={handleApplyFilters}
                        refreshList={fetchList}
                        loading={loading}
                        onView={(id) => navigate(`/sales/sales-order/delivery-notes/view/${id}`)}
                    />
                </Paper>
            </Container>
        </Box>
    );
}
