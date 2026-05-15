import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Button, CircularProgress, IconButton, Pagination,
    Stack, Tooltip, Typography, Container, Paper
} from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';
import { listTaxInvoices } from '../../../services/salesOrderService';
import InvoiceList from './InvoiceList';

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

export default function InvoiceHub() {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const initialSoNum = searchParams.get('salesOrderNumber');

    const [invoices, setInvoices]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filters, setFilters]     = useState({ 
        page: 0, size: 20, sortBy: 'invoiceDate', sortDir: 'desc',
        salesOrderNumber: initialSoNum || ''
    });
    const [activeFilters, setActiveFilters] = useState(
        initialSoNum ? [{ field: 'salesOrderNumber', value: initialSoNum, operator: '=' }] : []
    );
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        const soNum = searchParams.get('salesOrderNumber');
        if (soNum && filters.salesOrderNumber !== soNum) {
            handleApplyFilters([{ field: 'salesOrderNumber', value: soNum, operator: '=' }]);
        }
    }, [location.search]);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const cleanFilters = {};
            Object.keys(filters).forEach(k => {
                if (filters[k] !== '' && filters[k] !== null && filters[k] !== undefined) {
                    cleanFilters[k] = filters[k];
                }
            });
            const data = await listTaxInvoices(cleanFilters);
            setInvoices(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
        } catch (err) {
            console.error('Failed to load invoices', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetch(); }, [fetch]);

    const mapFiltersToParams = (filterArray) => {
        const newParams = {
            invoiceNumber: '', customerName: '', status: '', salesOrderNumber: ''
        };
        filterArray.forEach(f => {
            if (newParams.hasOwnProperty(f.field)) {
                newParams[f.field] = f.value;
            }
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

    const handlePageChange = (_, v) => setFilters(prev => ({ ...prev, page: v - 1 }));
    const handleSort = (col) => setFilters(prev => ({
        ...prev,
        sortBy: col,
        sortDir: prev.sortBy === col && prev.sortDir === 'desc' ? 'asc' : 'desc'
    }));

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* ── Hero Header ── */}
            <Box sx={{ 
                bgcolor: '#0f172a', 
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 12 
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                Financial Registry
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                Official Tax Invoices, payment tracking, and revenue monitoring.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh Registry">
                                <IconButton onClick={fetch} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
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
                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                    <Box sx={{ p: 3, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 800, color: T.text }}>Invoice Registry</Typography>
                        {totalPages > 1 && (
                            <Pagination count={totalPages} page={filters.page + 1} size="small"
                                onChange={handlePageChange} color="primary" />
                        )}
                    </Box>
                    <InvoiceList 
                        invoices={invoices} 
                        loading={loading} 
                        onRefresh={fetch}
                        filters={filters}
                        handleSort={handleSort}
                        activeFilters={activeFilters}
                        handleApplyFilters={handleApplyFilters}
                        totalPages={totalPages}
                        handlePageChange={handlePageChange}
                    />
                </Paper>
            </Container>
        </Box>
    );
}
