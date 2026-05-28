import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import {
    ReceiptLong  as GRNIcon,
    Assignment   as RequestIcon,
    SwapVert     as RegisterIcon,
} from '@mui/icons-material';
import GRNList               from './GRNList';
import InventoryRequestList  from './InventoryRequestList';
import InwardOutwardRegister from './InwardOutwardRegister';

const INNER_TABS = [
    { label: 'GRN / Receipts',         icon: <GRNIcon      fontSize="small" />, component: GRNList },
    { label: 'Material Requests',       icon: <RequestIcon  fontSize="small" />, component: InventoryRequestList },
    { label: 'Inward/Outward Register', icon: <RegisterIcon fontSize="small" />, component: InwardOutwardRegister },
];

const TransactionsTab = ({ refreshKey, onSuccess, initialInnerTab = 0 }) => {
    const [inner, setInner] = useState(initialInnerTab);
    const ActiveComp = INNER_TABS[inner].component;

    return (
        <Box>
            <Tabs
                value={inner}
                onChange={(_, v) => setInner(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    mb: 3,
                    bgcolor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    px: 1,
                    '& .MuiTab-root':       { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 44, gap: 0.75 },
                    '& .Mui-selected':      { color: '#2563eb', fontWeight: 700 },
                    '& .MuiTabs-indicator': { backgroundColor: '#2563eb', height: 2.5 },
                }}
            >
                {INNER_TABS.map((t, i) => (
                    <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                ))}
            </Tabs>

            <ActiveComp refreshKey={refreshKey} onSuccess={onSuccess} />
        </Box>
    );
};

export default TransactionsTab;
