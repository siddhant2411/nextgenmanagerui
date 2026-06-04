import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Stack, Grid, CircularProgress,
    IconButton, Tooltip, Paper, Container,
} from '@mui/material';
import {
    Add, Refresh, AccountTree, CheckCircle, HourglassEmpty, Edit,
} from '@mui/icons-material';
import apiService from '../../services/apiService';
import BomList from './BomList';

const T = {
    primary: '#2563eb',
    success: '#059669',
    warning: '#d97706',
    info: '#0891b2',
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a',
    textSec: '#64748b',
};

const fetchCount = async (filters) => {
    try {
        const res = await apiService.post('/bom/filter', { page: 0, size: 1, sortBy: 'id', sortDir: 'asc', filters });
        return res.totalElements ?? 0;
    } catch {
        return 0;
    }
};

const BomHub = ({ setLoading, loading, setError, handleAddNewBomClick }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const [total, active, pendingApproval, draft] = await Promise.all([
                fetchCount([]),
                fetchCount([{ field: 'bomStatus', operator: '=', value: 'ACTIVE' }]),
                fetchCount([{ field: 'bomStatus', operator: '=', value: 'PENDING_APPROVAL' }]),
                fetchCount([{ field: 'bomStatus', operator: '=', value: 'DRAFT' }]),
            ]);
            setStats({ total, active, pendingApproval, draft });
        } catch {
            setStats({ total: 0, active: 0, pendingApproval: 0, draft: 0 });
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const statCards = [
        { label: 'Total BOMs', value: stats?.total ?? 0, icon: AccountTree, color: '#3b82f6', trend: 'All' },
        { label: 'Active', value: stats?.active ?? 0, icon: CheckCircle, color: '#10b981', trend: 'Live' },
        { label: 'Pending Review', value: stats?.pendingApproval ?? 0, icon: HourglassEmpty, color: '#f59e0b', trend: 'Awaiting' },
        { label: 'Draft', value: stats?.draft ?? 0, icon: Edit, color: '#8b5cf6', trend: 'WIP' },
    ];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* Hero Header */}
            <Box sx={{
                bgcolor: '#0f172a',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)',
                color: 'white',
                pt: 6,
                pb: 12,
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={6}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                Bill of Materials
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                Manage product structures, revisions, and component lists.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh Stats">
                                <IconButton
                                    onClick={fetchStats}
                                    sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                >
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={<Add />}
                                onClick={handleAddNewBomClick}
                                sx={{
                                    bgcolor: T.primary,
                                    borderRadius: 2.5,
                                    px: 3,
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
                                }}
                            >
                                New BOM
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        {statCards.map((stat, i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <Paper elevation={0} sx={{
                                    p: 3, borderRadius: 4,
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: 'flex' }}>
                                            <stat.icon />
                                        </Box>
                                        <Typography sx={{ color: stat.color, fontSize: '0.7rem', fontWeight: 800, bgcolor: `${stat.color}10`, px: 1, borderRadius: 1 }}>
                                            {stat.trend}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: 'white' }}>
                                        {loadingStats ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ mt: -6 }}>
                <Paper elevation={0} sx={{
                    borderRadius: 4,
                    border: `1px solid ${T.border}`,
                    bgcolor: 'white',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
                }}>
                    <BomList
                        setLoading={setLoading}
                        loading={loading}
                        setError={setError}
                        handleAddNewBomClick={handleAddNewBomClick}
                        hideHeader
                    />
                </Paper>
            </Container>
        </Box>
    );
};

export default BomHub;
