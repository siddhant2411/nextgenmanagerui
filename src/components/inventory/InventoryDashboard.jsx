import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Skeleton,
  Fade
} from '@mui/material';
import {
  ErrorOutline,
  Inventory2,
  MoveToInbox,
  PriceCheck,
  WarningAmber,
  AssignmentTurnedIn,
  TrendingDown,
  NorthEast
} from '@mui/icons-material';
import { getInventorySummary, searchInventoryItems } from '../../services/inventoryService';

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const getAvailableQty = (item) => item?.availableQuantity ?? item?.productInventorySettings?.availableQuantity ?? 0;
const getReservedQty = (item) => item?.reservedQuantity ?? item?.productInventorySettings?.reservedQuantity ?? 0;
const getMinStock = (item) => item?.minStock ?? item?.productInventorySettings?.minStock ?? 0;

const kpiStyles = {
  available: { 
    bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', 
    color: '#0d47a1', 
    icon: Inventory2,
    border: '#90caf9'
  },
  warning: { 
    bg: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)', 
    color: '#f57f17', 
    icon: WarningAmber,
    border: '#fff176'
  },
  danger: { 
    bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)', 
    color: '#880e4f', 
    icon: ErrorOutline,
    border: '#f06292'
  },
  pending: {
    bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    color: '#4a148c',
    icon: AssignmentTurnedIn,
    border: '#ba68c8'
  },
  reserved: {
    bg: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
    color: '#283593',
    icon: AssignmentTurnedIn,
    border: '#9fa8da'
  },
  value: { 
    bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', 
    color: '#1b5e20', 
    icon: PriceCheck,
    border: '#81c784'
  },
};

const KpiCard = ({ label, value, helper, type, loading }) => {
  const style = kpiStyles[type];
  const Icon = style.icon;
  
  return (
    <Card 
      elevation={0} 
      sx={{ 
        height: '100%', 
        border: `1px solid ${style.border}`, 
        borderRadius: 3, 
        background: style.bg,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }
      }}
    >
      <CardContent sx={{ p: '20px !important' }}>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={600} sx={{ color: style.color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
              {label}
            </Typography>
            <Box sx={{ p: 0.8, bgcolor: 'rgba(255,255,255,0.4)', borderRadius: 1.5, display: 'flex' }}>
              <Icon sx={{ fontSize: 18, color: style.color }} />
            </Box>
          </Box>
          {loading ? (
            <Skeleton width="60%" height={40} />
          ) : (
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: style.color }}>
                {value}
              </Typography>
              <Typography variant="caption" sx={{ color: style.color, opacity: 0.8, fontWeight: 500 }}>
                {helper}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const InventoryDashboard = ({ onTabChange, onReceiveStock, refreshKey }) => {
  const [summary, setSummary] = useState({});
  const [attentionItems, setAttentionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const summaryRes = await getInventorySummary();
      setSummary(summaryRes || {});

      const attentionRes = await searchInventoryItems({
        page: 0, size: 20, sortBy: 'availableQuantity', sortDir: 'asc',query:''
      });
      const items = attentionRes?.content || [];
      setAttentionItems(
        items.filter(it => {
          const avail = getAvailableQty(it);
          const min = getMinStock(it);
          return avail < 0 || avail <= min;
        }).slice(0, 8)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey]);

  const stats = useMemo(() => {
    const counts = { low: 0, negative: 0 };
    attentionItems.forEach(it => {
      if (getAvailableQty(it) < 0) counts.negative++;
      else counts.low++;
    });
    return counts;
  }, [attentionItems]);

  return (
    <Fade in={true} timeout={600}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#0f2744', mb: 0.5 }}>
              Operational Health
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review stock vitals and manage supply chain bottlenecks
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button 
              variant="contained" 
              startIcon={<MoveToInbox />} 
              onClick={() => onReceiveStock?.()} 
              sx={{ 
                bgcolor: '#1565c0', 
                borderRadius: 2, 
                px: 3, 
                py: 1.2, 
                textTransform: 'none', 
                fontWeight: 600,
                boxShadow: '0 4px 14px 0 rgba(21,101,192,0.39)'
              }}
            >
              Receive Stock
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => onTabChange?.('Stock Register')} 
              sx={{ borderRadius: 2, px: 2, textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151' }}
            >
              Full Register
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Available" value={summary?.available ?? 0} helper={`Across ${summary?.totalItems ?? 0} SKUs`} type="available" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Reserved" value={summary?.reserved ?? 0} helper="Committed to WOs / SOs" type="reserved" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Low Stock" value={stats.low} helper="Replenishment needed" type="warning" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Critical" value={stats.negative} helper="Negative inventory" type="danger" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Pending Requests" value={summary?.requested ?? 0} helper="Awaiting material" type="pending" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <KpiCard label="Inventory Value" value={money(summary?.totalInventoryValue)} helper="Live asset value" type="value" loading={loading} />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 4, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <TrendingDown sx={{ color: '#f57f17' }} />
                    <Typography variant="h6" fontWeight={800}>Inventory Attention List</Typography>
                  </Box>
                  <Button size="small" endIcon={<NorthEast />} onClick={() => onTabChange?.('Stock Register')} sx={{ textTransform: 'none' }}>
                    View All
                  </Button>
                </Box>

                {loading ? (
                  <Stack spacing={2}>{[1,2,3].map(i => <Skeleton key={i} height={60} variant="rounded" />)}</Stack>
                ) : attentionItems.length > 0 ? (
                  <List disablePadding>
                    {attentionItems.map((item, idx) => {
                      const avail = getAvailableQty(item);
                      const reserved = getReservedQty(item);
                      const min = getMinStock(item);
                      const isNegative = avail < 0;
                      return (
                        <ListItem
                          key={item.inventoryItemId}
                          divider={idx !== attentionItems.length - 1}
                          sx={{
                            px: 0, py: 2,
                            '&:hover': { bgcolor: '#f9fafb' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography fontWeight={700} sx={{ color: '#1f2937' }}>
                                {item.itemCode || 'No Code'} — {item.name}
                              </Typography>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>GROUP: {item.itemGroupCode || 'GEN'}</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>•</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>UOM: {item.uom}</Typography>
                                {reserved > 0 && (
                                  <>
                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>•</Typography>
                                    <Typography variant="caption" sx={{ color: '#283593', fontWeight: 600 }}>Reserved: {reserved}</Typography>
                                  </>
                                )}
                              </Stack>
                            }
                          />
                          <Box textAlign="right">
                            <Typography variant="body1" fontWeight={800} color={isNegative ? 'error.main' : 'warning.main'}>
                              {avail}
                            </Typography>
                            <Chip
                              label={isNegative ? 'Negative' : `Min: ${min}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: isNegative ? '#fef2f2' : '#fffbeb',
                                color: isNegative ? '#991b1b' : '#92400e',
                                border: `1px solid ${isNegative ? '#fee2e2' : '#fef3c7'}`
                              }}
                            />
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Box py={8} textAlign="center">
                    <Typography color="text.secondary">All items are within healthy stock levels.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Card 
                elevation={0} 
                sx={{ 
                  bgcolor: '#0f172a', 
                  color: '#fff', 
                  borderRadius: 4, 
                  p: 1,
                  backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.05) 0%, transparent 50%)' 
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={800} gutterBottom>Quick Support</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                    Need help with inventory audits or serial tracking?
                  </Typography>
                  <Button fullWidth variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                    Open Knowledge Base
                  </Button>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>Supply Chain Alerts</Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                      <Typography variant="subtitle2" fontWeight={700}>System Baseline Status</Typography>
                      <Typography variant="caption" color="text.secondary">All synchronization tasks completed successfully.</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
};

export default InventoryDashboard;
