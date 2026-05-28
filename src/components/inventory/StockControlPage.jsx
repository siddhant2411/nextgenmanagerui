import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography, Paper, Stack } from '@mui/material';
import {
    Inbox       as OpeningIcon,
    FactCheck   as CountIcon,
} from '@mui/icons-material';
import OpeningStockPage from './OpeningStockPage';
import StockCountPage   from './StockCountPage';

const INNER_TABS = [
    {
        label:     'Opening Stock Entry',
        icon:      <OpeningIcon fontSize="small" />,
        component: OpeningStockPage,
        hint:      'Set the initial stock balance for each item — do this once before you start recording day-to-day transactions.',
    },
    {
        label:     'Physical Stock Count',
        icon:      <CountIcon fontSize="small" />,
        component: StockCountPage,
        hint:      'Enter physical (actual) quantities counted on the floor. Variances are auto-adjusted against the system balance.',
    },
];

const StockControlPage = ({ refreshKey, onSuccess, initialInnerTab = 0 }) => {
    const [inner, setInner] = useState(initialInnerTab);
    const { component: ActiveComp, hint } = INNER_TABS[inner];

    return (
        <Box>
            {/* ── Inner tabs ── */}
            <Tabs
                value={inner}
                onChange={(_, v) => setInner(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    mb: 2,
                    bgcolor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    px: 1,
                    '& .MuiTab-root':     { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 44, gap: 0.75 },
                    '& .Mui-selected':    { color: '#2563eb', fontWeight: 700 },
                    '& .MuiTabs-indicator': { backgroundColor: '#2563eb', height: 2.5 },
                }}
            >
                {INNER_TABS.map((t, i) => (
                    <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                ))}
            </Tabs>

            {/* ── Context hint ── */}
            <Paper
                variant="outlined"
                sx={{ px: 2.5, py: 1.5, mb: 2.5, borderRadius: 2, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="#0369a1">
                        {hint}
                    </Typography>
                </Stack>
            </Paper>

            <ActiveComp refreshKey={refreshKey} onSuccess={onSuccess} />
        </Box>
    );
};

export default StockControlPage;
