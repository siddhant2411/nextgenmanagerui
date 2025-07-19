import React, { useState } from 'react';
import { Tabs, Tab, Box, Paper, Typography } from '@mui/material';
import InventoryDashboard from './InventoryDashboard';
import InventoryItemPage from './InventoryItemPage';
import InventoryInstanceList from './InventoryInstanceList';
import InventoryRequestList from './InventoryRequestList';
import ProcurementOrdersTab from './ProcurementOrdersTab';
// import GroupedInventoryView from './GroupedInventoryView';

const tabs = [
  { label: 'Dashboard', component: InventoryDashboard },
  { label: 'Items', component: InventoryItemPage },
  { label: 'Instances', component: InventoryInstanceList },
  { label: 'Request', component: InventoryRequestList },
  { label: 'Arrival', component: ProcurementOrdersTab },
  // { label: 'Grouped', component: GroupedInventoryView },
];

const InventoryModule = () => {
  const [tab, setTab] = useState(0);

  const handleTabChange = (event, newValue) => setTab(newValue);
  const ActiveComponent = tabs[tab].component;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ mb: 3, p: 2 }}>
        <Typography variant="h5" fontWeight={600} color="primary" gutterBottom>
          Inventory Module
        </Typography>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <ActiveComponent onTabChange={(key) => {
          const index = tabs.findIndex((t) => t.label.toLowerCase() === key.toLowerCase());
          if (index !== -1) setTab(index);
        }} />
      </Paper>
    </Box>
  );
};

export default InventoryModule;
