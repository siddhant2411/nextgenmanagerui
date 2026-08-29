import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, Chip, CircularProgress, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Refresh, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getOverduePOs } from '../../services/purchaseOrderService';
import {
    T, STATUS, TABLE, chipSx, heroButtonSx, panelSx,
    fmtAmount, fmtDate, fmtNum, humanize,
} from '../../theme/moduleTokens';
import ModuleHero from '../ui/moduleshell/ModuleHero';
import ModuleBody from '../ui/moduleshell/ModuleBody';

/**
 * Purchase orders past their expected delivery date.
 *
 * Sorted worst-first by the server. The row severity splits at a fortnight: under two weeks is a
 * chase, over two weeks is a problem, and the two should not look the same in a list you scan.
 */

const STATUS_STYLE = {
    SENT:               { color: T.accent,          bg: T.accentDim },
    PARTIALLY_RECEIVED: { color: STATUS.warningInk, bg: STATUS.warningBg },
};

const SERIOUS_AFTER_DAYS = 14;

const Th = ({ label, align = 'left', width }) => (
    <TableCell align={align} sx={{ ...TABLE.head, width }}>{label}</TableCell>
);

export default function OverduePOList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        getOverduePOs()
            .then(data => setRows(data ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const worst = rows.filter(r => r.daysOverdue > SERIOUS_AFTER_DAYS).length;
    const value = rows.reduce((sum, r) => sum + Number(r.grandTotal ?? 0), 0);

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>
            <ModuleHero
                title="Overdue Purchase Orders"
                subtitle={loading ? 'Checking which orders have slipped...'
                    : rows.length === 0 ? 'Nothing is past its expected delivery date.'
                    : `${fmtNum(rows.length)} order${rows.length === 1 ? '' : 's'} past the expected delivery date, worth ${fmtAmount(value)}.`}
                onBack={() => navigate('/purchase')}
                backLabel="Back to purchase orders"
                badge={!loading && rows.length > 0 && (
                    <Chip
                        label={`${fmtNum(rows.length)} late`}
                        size="small"
                        sx={{
                            bgcolor: STATUS.criticalBg, color: STATUS.critical,
                            fontWeight: 800, borderRadius: 1.5, height: 24,
                        }}
                    />
                )}
                actions={
                    <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={heroButtonSx}>
                        Refresh
                    </Button>
                }
            />

            <ModuleBody>
                <Paper elevation={0} sx={panelSx}>
                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
                            <CircularProgress size={40} thickness={4} sx={{ color: T.accent }} />
                            <Typography sx={{ mt: 2, fontWeight: 700, color: T.ink2 }}>Checking delivery dates...</Typography>
                        </Box>
                    ) : rows.length === 0 ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <Typography sx={{ fontWeight: 800, color: STATUS.good, fontSize: '1.05rem', mb: 0.5 }}>
                                Every order is on time
                            </Typography>
                            <Typography sx={{ color: T.ink2, fontSize: '0.875rem' }}>
                                No purchase order is past its expected delivery date.
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
                                <Typography sx={{ fontWeight: 900, color: T.ink, fontSize: '1.05rem' }}>
                                    Past Expected Delivery
                                </Typography>
                                <Typography variant="caption" sx={{ color: T.ink2, fontWeight: 700 }}>
                                    {worst > 0 ? `${fmtNum(worst)} over ${SERIOUS_AFTER_DAYS} days` : 'all within a fortnight'}
                                </Typography>
                            </Stack>

                            <TableContainer component={Box} sx={{ ...TABLE.container, overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 900 }}>
                                    <TableHead>
                                        <TableRow>
                                            <Th label="PO Number" />
                                            <Th label="Vendor" />
                                            <Th label="Ordered" />
                                            <Th label="Expected" />
                                            <Th label="Days late" align="right" width={110} />
                                            <Th label="Status" align="center" />
                                            <Th label="Amount" align="right" />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map(row => {
                                            const ss = STATUS_STYLE[row.status] ?? { color: T.ink2, bg: T.ruleSoft };
                                            const serious = row.daysOverdue > SERIOUS_AFTER_DAYS;
                                            const severity = serious ? STATUS.critical : STATUS.warning;

                                            return (
                                                <TableRow
                                                    key={row.id} hover
                                                    onClick={() => navigate(`/purchase/${row.id}`)}
                                                    sx={{ ...TABLE.row, borderLeft: `3px solid ${severity}` }}
                                                >
                                                    <TableCell sx={TABLE.cell}>
                                                        <Typography sx={{ fontWeight: 800, color: T.accent, fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                                                            {row.purchaseOrderNumber}
                                                        </Typography>
                                                    </TableCell>

                                                    <TableCell sx={{ ...TABLE.cell, maxWidth: 240 }}>
                                                        <Typography sx={{
                                                            fontWeight: 600, color: T.ink, fontSize: '0.8125rem',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {row.vendorName ?? '\u2014'}
                                                        </Typography>
                                                    </TableCell>

                                                    <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>{fmtDate(row.orderDate)}</TableCell>
                                                    <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>{fmtDate(row.expectedDeliveryDate)}</TableCell>

                                                    <TableCell align="right">
                                                        <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.7}>
                                                            <Warning sx={{ fontSize: 15, color: severity }} />
                                                            <Chip
                                                                label={`${row.daysOverdue}d`}
                                                                size="small"
                                                                sx={chipSx(severity, serious ? STATUS.criticalBg : STATUS.warningBg)}
                                                            />
                                                        </Stack>
                                                    </TableCell>

                                                    <TableCell align="center">
                                                        <Chip label={humanize(row.status)} size="small" sx={chipSx(ss.color, ss.bg)} />
                                                    </TableCell>

                                                    <TableCell sx={{ ...TABLE.num, fontWeight: 700 }}>{fmtAmount(row.grandTotal)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            </ModuleBody>
        </Box>
    );
}
