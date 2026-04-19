import React, { useState } from 'react';
import { Box, Button, Fab, Tabs, Tab, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory2 as StockIcon,
  Assignment as RequestIcon,
  LocalShipping as ProcurementIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import InventoryDashboard from './InventoryDashboard';
import InventoryItemPage from './InventoryItemPage';
import InventoryRequestList from './InventoryRequestList';
import ProcurementOrdersTab from './ProcurementOrdersTab';
import ReceiveStockDrawer from './ReceiveStockDrawer';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const tabs = [
  { label: 'Dashboard',     icon: <DashboardIcon fontSize="small" />,   component: InventoryDashboard },
  { label: 'Stock Register',icon: <StockIcon fontSize="small" />,       component: InventoryItemPage },
  { label: 'Requests',      icon: <RequestIcon fontSize="small" />,     component: InventoryRequestList },
  { label: 'Procurement',   icon: <ProcurementIcon fontSize="small" />, component: ProcurementOrdersTab },
];

const InventoryModule = () => {
  const [tab, setTab] = useState(0);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [receiveFormData, setReceiveFormData] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const { canAction } = useAuth();
  const canManageInventory = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);

  const ActiveComponent = tabs[tab].component;
  const openReceiveStock = (item = null) => {
    setSelectedItem(item);
    setReceiveFormData({});
    setReceiveOpen(true);
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header bar */}
      <Box
        sx={{
          bgcolor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          px: { xs: 2, md: 3 },
          pt: 2.5,
          pb: 0,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: '#0f2744', fontSize: { xs: '1.15rem', md: '1.35rem' }, mb: 0.5 }}
            >
              Inventory Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Manage stock levels, receipts, and procurement
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openReceiveStock()}
            disabled={!canManageInventory}
            sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700, mb: { xs: 1, sm: 0 } }}
          >
            Receive Stock
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              minHeight: 44,
              gap: 0.75,
            },
            '& .Mui-selected': { color: '#1565c0', fontWeight: 600 },
            '& .MuiTabs-indicator': { backgroundColor: '#1565c0', height: 2.5 },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <ActiveComponent
          refreshKey={refreshKey}
          onReceiveStock={openReceiveStock}
          onTabChange={(key) => {
            const nextKey = key.toLowerCase();
            const index = tabs.findIndex((t) => t.label.toLowerCase() === nextKey || t.label.toLowerCase() === 'stock register' && nextKey === 'items');
            if (index !== -1) setTab(index);
          }}
        />
      </Box>

      <Fab
        color="primary"
        variant="extended"
        onClick={() => openReceiveStock()}
        disabled={!canManageInventory}
        sx={{ position: 'fixed', right: 24, bottom: 24, borderRadius: 1 }}
      >
        <AddIcon sx={{ mr: 1 }} />
        Receive Stock
      </Fab>

      <ReceiveStockDrawer
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        item={selectedItem}
        onRowUpdate={handleRefresh}
      />
    </Box>
  );
};

export default InventoryModule;
