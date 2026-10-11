import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, CircularProgress, Container, Grid, IconButton, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import {
    AssignmentTurnedInOutlined, BlockOutlined, HourglassEmptyOutlined, Inventory2Outlined,
    PendingActions, Refresh, ShoppingBagOutlined, Splitscreen, Warning,
} from '@mui/icons-material';
import {
    getMaterialRequestRegister,
    getMaterialRequestSummary,
} from '../../services/inventoryService';
import { resolveApiErrorMessage } from '../../services/apiService';
import MaterialRequestRegister, { waitingFor } from './MaterialRequestRegister';
import {
    alertPanelSx, heroIconButtonSx, heroSx, MUTED, statCardSx, T,
} from './warehouse/listStyles';

/* Route namespace for preserved filters — see commonTools/useViewState.
   Matches this page's own sidebar route, so that nav item clears just this list. */
const VIEW_STATE_NS = '/inventory/material-requests';

const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 3 }));

/*
 * The stores' desk for material requests.
 *
 * Above: how much is waiting and how the last week went. Left: the requests that need a second
 * look before anyone presses Approve -- ones the shelf cannot cover, and ones that have sat
 * longest. Right: the register itself, queue and history together.
 */
export default function MaterialRequestDashboard() {
    const [summary, setSummary] = useState(null);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Bumped to make the register refetch; `command` points it at a view.
    const [refreshKey, setRefreshKey] = useState(0);
    const [command, setCommand] = useState({ nonce: 0, patch: {} });

    const loadDesk = useCallback(async () => {
        setError(null);
        try {
            const [counts, open] = await Promise.all([
                getMaterialRequestSummary(),
                // The head of the queue, oldest first: enough to say what is stuck and what is short.
                getMaterialRequestRegister({ status: 'OPEN', source: 'STORES', page: 0, size: 50 }),
            ]);
            setSummary(counts || null);
            setQueue(open?.content || []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, 'Could not load the material request summary.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDesk(); }, [loadDesk]);

    const refreshAll = () => {
        loadDesk();
        setRefreshKey((k) => k + 1);
    };

    const show = (patch) => setCommand((c) => ({ nonce: c.nonce + 1, patch }));
    const allDates = { search: '', from: '', to: '' };

    const oldestAge = waitingFor(summary?.oldestWaiting);
    const statCards = [
        {
            label: 'Waiting On Stores', value: summary?.waiting, icon: HourglassEmptyOutlined, color: '#f59e0b',
            tag: summary?.waiting ? (oldestAge === 'today' ? 'Oldest: today' : `Oldest: ${oldestAge || '—'}`) : 'Clear',
            view: { status: 'OPEN', source: 'STORES', ...allDates },
        },
        {
            label: 'Partly Issued', value: summary?.partlyIssued, icon: Splitscreen, color: '#8b5cf6',
            tag: summary?.partlyIssued ? 'Balance owed' : 'None',
            view: { status: 'OPEN', source: 'STORES', ...allDates },
        },
        {
            label: 'Approved', value: summary?.approvedLast7Days, icon: AssignmentTurnedInOutlined, color: '#10b981',
            tag: 'Last 7 days',
            view: { status: 'APPROVED', source: 'STORES', ...allDates },
        },
        {
            label: 'Rejected', value: summary?.rejectedLast7Days, icon: BlockOutlined, color: '#ef4444',
            tag: 'Last 7 days',
            view: { status: 'REJECTED', source: 'STORES', ...allDates },
        },
    ];

    const shortRows = queue.filter((r) => r.stockShort);
    // Anything raised before today that the shelf could cover: nothing is stopping it but attention.
    const staleRows = queue.filter((r) => !r.stockShort && waitingFor(r.requestedDate) !== 'today').slice(0, 5);
    const reservations = summary?.salesOrderReservations || 0;
    const railVisible = shortRows.length > 0 || staleRows.length > 0 || reservations > 0;

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={6}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                Material Requests
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                What production is waiting on from the stores, and everything already issued or turned down.
                            </Typography>
                        </Box>
                        <Tooltip title="Refresh">
                            <IconButton onClick={refreshAll} sx={heroIconButtonSx} aria-label="Refresh">
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Grid container spacing={3}>
                        {statCards.map((stat) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label}>
                                <Paper elevation={0} onClick={() => show(stat.view)}
                                    sx={{
                                        ...statCardSx, cursor: 'pointer', transition: 'border-color 0.15s',
                                        '&:hover': { borderColor: `${stat.color}80` },
                                    }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: 'flex' }}>
                                            <stat.icon />
                                        </Box>
                                        <Typography sx={{
                                            color: stat.color, fontSize: '0.7rem', fontWeight: 800,
                                            bgcolor: `${stat.color}10`, px: 1, borderRadius: 1,
                                        }}>
                                            {stat.tag}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: 'white' }}>
                                        {loading ? <CircularProgress size={20} color="inherit" /> : (stat.value ?? '—')}
                                    </Typography>
                                    <Typography variant="caption"
                                        sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>{error}</Alert>
                )}

                <Grid container spacing={4}>
                    {railVisible && (
                        <Grid item xs={12} lg={3}>
                            <Stack spacing={3}>
                                {shortRows.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx('#fecaca', '#fff5f5')}>
                                        <Box sx={{ p: 2, bgcolor: '#fee2e2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Warning sx={{ color: T.error, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem' }}>
                                                Not Enough Stock ({shortRows.length})
                                            </Typography>
                                        </Box>
                                        {shortRows.slice(0, 5).map((r) => (
                                            <Box key={r.id} onClick={() => show({ status: 'OPEN', source: 'STORES', ...allDates, search: r.itemCode || '' })}
                                                sx={{ p: 2, borderBottom: '1px solid #fecaca', cursor: 'pointer', '&:hover': { bgcolor: '#fef2f2' } }}>
                                                <Stack direction="row" justifyContent="space-between" spacing={1}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.itemCode}</Typography>
                                                    <Typography sx={{ color: T.error, fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                        short {num(Number(r.remainingQty) - Number(r.availableQty))}
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>
                                                    {r.sourceNumber || 'Request'} · needs {num(r.remainingQty)}, {num(r.availableQty)} free
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {staleRows.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx('#fde68a', '#fffbeb')}>
                                        <Box sx={{ p: 2, bgcolor: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PendingActions sx={{ color: T.warning, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: '#92400e', fontSize: '0.85rem' }}>
                                                Waiting Longest
                                            </Typography>
                                        </Box>
                                        {staleRows.map((r) => (
                                            <Box key={r.id} onClick={() => show({ status: 'OPEN', source: 'STORES', ...allDates, search: r.itemCode || '' })}
                                                sx={{ p: 2, borderBottom: '1px solid #fde68a', cursor: 'pointer', '&:hover': { bgcolor: '#fffaf0' } }}>
                                                <Stack direction="row" justifyContent="space-between" spacing={1}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.itemCode}</Typography>
                                                    <Typography sx={{ color: T.warning, fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                        {waitingFor(r.requestedDate)}
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>
                                                    {r.sourceNumber || 'Request'} · {num(r.remainingQty)} {r.uom} · stock is there
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {reservations > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx('#bfdbfe', '#eff6ff')}>
                                        <Box sx={{ p: 2, bgcolor: '#dbeafe', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ShoppingBagOutlined sx={{ color: T.primary, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: '#1e40af', fontSize: '0.85rem' }}>
                                                Sales Order Reservations ({reservations})
                                            </Typography>
                                        </Box>
                                        <Box onClick={() => show({ status: 'OPEN', source: 'SALES_ORDER', ...allDates })}
                                            sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: '#e0edff' } }}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Inventory2Outlined sx={{ fontSize: 16, color: T.primary, mt: 0.25 }} />
                                                <Typography sx={{ color: '#334155', fontSize: '0.78rem' }}>
                                                    Stock held for approved sales orders. Nothing to approve — see what each
                                                    order has reserved and what it is still short of.
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    )}

                    <Grid item xs={12} lg={railVisible ? 9 : 12}>
                        <MaterialRequestRegister
                            namespace={VIEW_STATE_NS}
                            command={command}
                            refreshKey={refreshKey}
                            onChanged={loadDesk}
                        />
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
