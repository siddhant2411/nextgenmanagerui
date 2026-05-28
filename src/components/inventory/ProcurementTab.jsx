import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import {
    MoveToInbox as PendingIcon,
    LocalShipping as ProcIcon,
    AssignmentReturn as ReturnIcon,
} from '@mui/icons-material';
import PendingReceiptsTab from './PendingReceiptsTab';
import ProcurementOrdersTab from './ProcurementOrdersTab';
import DebitNoteList from './DebitNoteList';

const INNER_TABS = [
    { label: 'Pending Receipts',   icon: <PendingIcon fontSize="small" />, component: PendingReceiptsTab },
    { label: 'Procurement Orders', icon: <ProcIcon fontSize="small" />,    component: ProcurementOrdersTab },
    { label: 'Purchase Returns',   icon: <ReturnIcon fontSize="small" />,  component: DebitNoteList },
];

const ProcurementTab = ({ refreshKey, canReceive, onReceiveStock, onRefresh }) => {
    const [inner, setInner] = useState(0);
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
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 44, gap: 0.75 },
                    '& .Mui-selected': { color: '#2563eb', fontWeight: 700 },
                    '& .MuiTabs-indicator': { backgroundColor: '#2563eb', height: 2.5 },
                }}
            >
                {INNER_TABS.map((t, i) => (
                    <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                ))}
            </Tabs>

            <ActiveComp
                refreshKey={refreshKey}
                canReceive={canReceive}
                onReceiveStock={onReceiveStock}
                onRefresh={onRefresh}
            />
        </Box>
    );
};

export default ProcurementTab;
