import React, { useState } from 'react';
import {
    Box, Button, Fab, Tab, Tabs, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, CircularProgress,
} from '@mui/material';
import { sendToPlanning } from '../../services/inventoryService';
import {
    Add           as AddIcon,
    Dashboard     as DashboardIcon,
    Inventory2    as StockIcon,
    LocalShipping as ProcIcon,
    MoveToInbox   as ReceiveIcon,
    ReceiptLong   as TxIcon,
    BarChart      as ValuationIcon,
    Tune          as ControlIcon,
} from '@mui/icons-material';

import InventoryDashboard    from './InventoryDashboard';
import InventoryItemPage     from './InventoryItemPage';
import TransactionsTab       from './TransactionsTab';
import ProcurementTab        from './ProcurementTab';
import StockControlPage      from './StockControlPage';
import StockValuationReport  from './StockValuationReport';
import ReceiveStockDrawer    from './ReceiveStockDrawer';
import StockLedgerDrawer     from './StockLedgerDrawer';
import BatchSerialDrawer     from './BatchSerialDrawer';
import LowStockList          from './LowStockList';

import { useAuth }     from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';
import { useViewState } from '../../commonTools/useViewState';

/* Route namespace for preserved tab/filters — see commonTools/useViewState.
   The leaf tabs namespace under this prefix, so clearing "/inventory" from the
   nav clears the whole section at once. */
const VIEW_STATE_NS = '/inventory';

/* ─── tab definitions ─────────────────────────────────────────────────────── */
const TABS = [
    { label: 'Dashboard',      icon: <DashboardIcon  fontSize="small" />, key: 'dashboard' },
    { label: 'Stock Register', icon: <StockIcon      fontSize="small" />, key: 'stock' },
    { label: 'Transactions',   icon: <TxIcon         fontSize="small" />, key: 'transactions' },
    { label: 'Procurement',    icon: <ProcIcon       fontSize="small" />, key: 'procurement' },
    { label: 'Stock Control',  icon: <ControlIcon    fontSize="small" />, key: 'stock-control' },
    { label: 'Valuation',      icon: <ValuationIcon  fontSize="small" />, key: 'valuation' },
];

/* ─── component ───────────────────────────────────────────────────────────── */
const InventoryModule = () => {
    // Which section you were reading is view state like any filter — losing it on
    // navigation is the same complaint. The inner tabs stay local: they double as
    // jump targets for handleTabChange, and a stored value would override that.
    const [tab,          setTab]          = useViewState(VIEW_STATE_NS, 'tab', 0);
    const [txInnerTab,   setTxInnerTab]   = useState(0);   // inner tab for Transactions
    const [scInnerTab,   setScInnerTab]   = useState(0);   // inner tab for Stock Control

    const [receiveOpen,         setReceiveOpen]         = useState(false);
    const [ledgerOpen,          setLedgerOpen]          = useState(false);
    const [selectedLedgerItem,  setSelectedLedgerItem]  = useState(null);
    const [batchSerialOpen,     setBatchSerialOpen]     = useState(false);
    const [selectedBatchItem,   setSelectedBatchItem]   = useState(null);
    const [lowStockOpen,        setLowStockOpen]        = useState(false);
    const [selectedItem,        setSelectedItem]        = useState(null);
    const [refreshKey,          setRefreshKey]          = useState(0);

    const { canAction } = useAuth();
    const canManage = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);

    const [planningItem,    setPlanningItem]    = useState(null);
    const [planningQty,     setPlanningQty]     = useState('');
    const [planningLoading, setPlanningLoading] = useState(false);
    const [planningResult,  setPlanningResult]  = useState(null);
    const [planningError,   setPlanningError]   = useState(null);

    const openReceive     = (item = null) => { setSelectedItem(item); setReceiveOpen(true); };
    const openLedger      = (item = null) => { setSelectedLedgerItem(item); setLedgerOpen(true); };
    const openBatchSerial = (item)        => { setSelectedBatchItem(item); setBatchSerialOpen(true); };
    const handleRefresh   = () => setRefreshKey((k) => k + 1);

    const openRequestQty = (item) => {
        const settings = item?.productInventorySettings || {};
        const maxStock  = item?.maxStock  ?? settings?.maxStock  ?? 0;
        const available = item?.availableQuantity ?? settings?.availableQuantity ?? 0;
        const suggested = Math.max(0, maxStock - available);
        setPlanningItem(item);
        setPlanningQty(suggested > 0 ? suggested.toFixed(2) : '');
        setPlanningResult(null);
        setPlanningError(null);
    };

    const closeRequestQty = () => {
        setPlanningItem(null);
        setPlanningResult(null);
        setPlanningError(null);
    };

    const confirmRequestQty = async () => {
        const qty = parseFloat(planningQty);
        if (!qty || qty <= 0) { setPlanningError('Please enter a valid quantity.'); return; }
        setPlanningLoading(true);
        setPlanningError(null);
        try {
            const result = await sendToPlanning(planningItem.inventoryItemId, qty, 'STORE');
            setPlanningResult(result);
        } catch (err) {
            setPlanningError(err?.response?.data?.error || 'Failed to send to planning.');
        } finally {
            setPlanningLoading(false);
        }
    };

    /**
     * Navigate to a top-level tab, optionally landing on a specific inner tab.
     *   handleTabChange('transactions', 2)   → Transactions → Batch & Serials
     *   handleTabChange('stock-control', 1)  → Stock Control → Physical Count
     *   handleTabChange('valuation')         → Valuation
     */
    const handleTabChange = (key, innerTab) => {
        const idx = TABS.findIndex(
            (t) => t.key === key || t.label.toLowerCase() === key.toLowerCase()
        );
        if (idx === -1) return;

        if (innerTab !== undefined) {
            if (key === 'transactions')   setTxInnerTab(innerTab);
            if (key === 'stock-control')  setScInnerTab(innerTab);
        }
        setTab(idx);
    };


    /* ── content router ─────────────────────────────────────────────────────── */
    const renderContent = () => {
        switch (TABS[tab]?.key) {

            case 'dashboard':
                return (
                    <InventoryDashboard
                        refreshKey={refreshKey}
                        onReceiveStock={openReceive}
                        onTabChange={handleTabChange}
                        onOpenLedger={() => openLedger()}
                        onOpenLowStock={() => setLowStockOpen(true)}
                    />
                );

            case 'stock':
                return (
                    <InventoryItemPage
                        refreshKey={refreshKey}
                        canReceive={canManage}
                        onReceiveStock={openReceive}
                        onRequestQty={openRequestQty}
                        onOpenLedger={openLedger}
                        onOpenBatchSerial={openBatchSerial}
                    />
                );

            case 'transactions':
                return (
                    <TransactionsTab
                        key={txInnerTab}
                        refreshKey={refreshKey}
                        onSuccess={handleRefresh}
                        initialInnerTab={txInnerTab}
                    />
                );

            case 'procurement':
                return (
                    <ProcurementTab
                        refreshKey={refreshKey}
                        canReceive={canManage}
                        onReceiveStock={openReceive}
                        onRefresh={handleRefresh}
                    />
                );

            case 'stock-control':
                return (
                    <StockControlPage
                        key={scInnerTab}
                        refreshKey={refreshKey}
                        onSuccess={handleRefresh}
                        initialInnerTab={scInnerTab}
                    />
                );

            case 'valuation':
                return <StockValuationReport refreshKey={refreshKey} />;

            default:
                return null;
        }
    };

    return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>

            {/* ── Hero Header ── */}
            <Box
                sx={{
                    bgcolor: '#0f172a',
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5,150,105,0.05) 0%, transparent 50%)',
                    color: '#fff',
                    px: { xs: 2, md: 4 },
                    pt: { xs: 3, md: 4 },
                    pb: 0,
                }}
            >
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={2}
                    mb={3}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            fontWeight={900}
                            sx={{ color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.75 }}
                        >
                            Inventory Management
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                            Stock register · receipts · procurement · transactions
                        </Typography>
                    </Box>

                    {/* ── Quick Actions ── */}
                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={<ReceiveIcon />}
                        onClick={() => openReceive()}
                        disabled={!canManage}
                        sx={{
                            textTransform: 'none', fontWeight: 800, borderRadius: 2.5,
                            bgcolor: '#2563eb',
                            boxShadow: '0 4px 14px 0 rgba(37,99,235,0.4)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Receive Stock
                    </Button>
                </Box>

                {/* ── Tabs sit at the bottom of the hero ── */}
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
                            color: 'rgba(255,255,255,0.55)',
                        },
                        '& .Mui-selected':      { color: '#fff', fontWeight: 700 },
                        '& .MuiTabs-indicator': { backgroundColor: '#fff', height: 3 },
                    }}
                >
                    {TABS.map((t, i) => (
                        <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                    ))}
                </Tabs>
            </Box>

            {/* ── Content ── */}
            <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                {renderContent()}
            </Box>

            {/* ── Floating action (mobile) ── */}
            <Fab
                color="primary"
                variant="extended"
                onClick={() => openReceive()}
                disabled={!canManage}
                sx={{
                    position: 'fixed', right: 24, bottom: 24, borderRadius: 2.5,
                    display: { xs: 'flex', md: 'none' },
                }}
            >
                <AddIcon sx={{ mr: 1 }} />
                Receive
            </Fab>

            {/* ── Drawers ── */}
            <ReceiveStockDrawer
                open={receiveOpen}
                onClose={() => setReceiveOpen(false)}
                item={selectedItem}
                onRowUpdate={handleRefresh}
            />

            <StockLedgerDrawer
                open={ledgerOpen}
                onClose={() => { setLedgerOpen(false); setSelectedLedgerItem(null); }}
                initialItem={selectedLedgerItem}
            />

            <BatchSerialDrawer
                open={batchSerialOpen}
                onClose={() => { setBatchSerialOpen(false); setSelectedBatchItem(null); }}
                item={selectedBatchItem}
            />

            <LowStockList
                open={lowStockOpen}
                onClose={() => setLowStockOpen(false)}
            />

            {/* ── Request Qty / Send to Planning dialog ── */}
            <Dialog open={!!planningItem} onClose={closeRequestQty} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Request Replenishment</DialogTitle>
                <DialogContent sx={{ pt: '12px !important' }}>
                    {planningItem && (
                        <>
                            <Typography variant="body2" fontWeight={600} mb={0.5}>
                                {planningItem.name}{' '}
                                <span style={{ color: '#64748b', fontWeight: 400 }}>({planningItem.itemCode})</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                Available:{' '}
                                <strong>
                                    {(planningItem?.availableQuantity ?? planningItem?.productInventorySettings?.availableQuantity ?? 0).toFixed(2)}
                                </strong>
                                &nbsp;|&nbsp; Reorder level:{' '}
                                <strong>
                                    {(planningItem?.reorderLevel ?? planningItem?.productInventorySettings?.reorderLevel ?? 0).toFixed(2)}
                                </strong>
                                &nbsp;|&nbsp; Max stock:{' '}
                                <strong>
                                    {(planningItem?.maxStock ?? planningItem?.productInventorySettings?.maxStock ?? 0).toFixed(2)}
                                </strong>
                            </Typography>
                        </>
                    )}
                    {planningResult ? (
                        <Alert severity={planningResult.decision === 'UNDECIDED' ? 'info' : 'success'}>
                            {planningResult.decision === 'WORK_ORDER'    && `Work Order #${planningResult.orderId} created.`}
                            {planningResult.decision === 'PURCHASE_ORDER' && `Purchase Requisition #${planningResult.orderId} created.`}
                            {planningResult.decision === 'UNDECIDED'     && 'Added to the Planning Desk — a planner will decide make/buy.'}
                        </Alert>
                    ) : (
                        <TextField
                            label="Replenishment Quantity"
                            type="number"
                            value={planningQty}
                            onChange={(e) => setPlanningQty(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ min: 0.01, step: 0.01 }}
                            helperText={(() => {
                                if (!planningItem) return '';
                                const max = planningItem?.maxStock ?? planningItem?.productInventorySettings?.maxStock ?? 0;
                                const avail = planningItem?.availableQuantity ?? planningItem?.productInventorySettings?.availableQuantity ?? 0;
                                return max > 0
                                    ? `Suggested: max (${max}) − available (${avail.toFixed(2)}) = ${Math.max(0, max - avail).toFixed(2)}`
                                    : '';
                            })()}
                        />
                    )}
                    {planningError && <Alert severity="error" sx={{ mt: 1 }}>{planningError}</Alert>}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="text" size="small" onClick={closeRequestQty} sx={{ textTransform: 'none' }}>
                        {planningResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!planningResult && (
                        <Button
                            variant="contained"
                            size="small"
                            disableElevation
                            onClick={confirmRequestQty}
                            disabled={planningLoading}
                            sx={{ textTransform: 'none', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                        >
                            {planningLoading && <CircularProgress size={13} sx={{ color: '#fff', mr: 1 }} />}
                            Send to Planning
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InventoryModule;
