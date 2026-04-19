import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Alert, AlertTitle, Autocomplete, Box, Button, Card, CardContent,
    Chip, CircularProgress, Collapse, Divider, Grid, IconButton,
    Paper, Table, TableBody, TableCell, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Calculate, CalendarToday, CheckCircle, Description, ExpandLess, ExpandMore,
    Factory, Handshake, InfoOutlined, ShoppingCart, WarningAmber,
} from '@mui/icons-material';
import {
    Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer,
    Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import apiService from '../../../services/apiService';
import { filterInventoryItems } from '../../../services/inventoryService';

// ── helpers ──────────────────────────────────────────────────────────────────

const BORDER_COLOR = '#e5e7eb';

const formatInr = (value) => {
    if (value === null || value === undefined) return '₹0.00';
    return '₹' + Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const priceSourceLabel = {
    VENDOR_PRICE: 'Vendor Price',
    LAST_PURCHASE: 'Last Purchase Price',
    STANDARD_COST: 'Standard Cost',
    OVERRIDE: 'Manual Override',
};

// ── sub-cards ─────────────────────────────────────────────────────────────────

const CardHeader = ({ bg, title, subtitle, isRec }) => (
    <Box sx={{ px: 2, py: 1.5, bgcolor: bg, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
            <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{subtitle}</Typography>
        </Box>
        {isRec && (
            <Chip size="small" label="Recommended"
                sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
        )}
    </Box>
);

const UnitCostDisplay = ({ cost, color }) => (
    <Box mb={1.5}>
        <Box display="flex" alignItems="baseline" gap={0.75}>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>
                {formatInr(cost)}
            </Typography>
            <Typography variant="body2" color="text.secondary">/ unit</Typography>
        </Box>
    </Box>
);

const UnavailableCard = ({ color, title, subtitle, msg }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: `1px solid ${BORDER_COLOR}` }}>
        <CardHeader bg={color} title={title} subtitle={subtitle} isRec={false} />
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5 }}>
            <WarningAmber sx={{ fontSize: 36, mb: 1.5, color: '#9ca3af' }} />
            <Typography variant="body2" color="text.secondary" align="center">{msg}</Typography>
        </CardContent>
    </Card>
);

const CostRow = ({ label, value, bold }) => (
    <TableRow sx={{ '& td': { py: 0.4, borderBottom: 'none', fontSize: '0.8rem' } }}>
        <TableCell sx={{ color: '#6b7280', pl: 0, fontWeight: bold ? 600 : 400 }}>{label}</TableCell>
        <TableCell align="right" sx={{ pr: 0, fontWeight: bold ? 700 : 400, color: bold ? '#0f2744' : '#374151' }}>
            {formatInr(value)}
        </TableCell>
    </TableRow>
);

// ── MakeCard ──────────────────────────────────────────────────────────────────

const MakeCard = ({ analysis, isRec }) => {
    const [open, setOpen] = useState(false);

    if (!analysis?.available) {
        return <UnavailableCard color="#2e7d32" title="In-House Manufacturing" subtitle="BOM + Routing" msg="Configure a BOM and routing to enable MAKE analysis." />;
    }

    const unitCost = analysis.unitTotalCost ?? analysis.unitCost ?? 0;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isRec ? '2px solid #2e7d32' : `1px solid ${BORDER_COLOR}` }}>
            <CardHeader bg="#2e7d32" title="In-House Manufacturing" subtitle="BOM + Routing" isRec={isRec} />
            <CardContent sx={{ flexGrow: 1, p: 2 }}>
                <UnitCostDisplay cost={unitCost} color="#2e7d32" />
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Batch Total: <strong>{formatInr(analysis.batchTotalCost)}</strong>
                </Typography>

                <Table size="small" sx={{ mb: 1 }}>
                    <TableBody>
                        <CostRow label="Material" value={analysis.unitMaterialCost} />
                        <CostRow label="Operations" value={analysis.unitOperationCost} />
                        {(analysis.unitSetupCost != null && analysis.unitSetupCost > 0) && (
                            <CostRow label="  · Setup" value={analysis.unitSetupCost} />
                        )}
                        {(analysis.unitRunCost != null && analysis.unitRunCost > 0) && (
                            <CostRow label="  · Run" value={analysis.unitRunCost} />
                        )}
                        <CostRow label="Total / unit" value={unitCost} bold />
                    </TableBody>
                </Table>

                <Button size="small" endIcon={open ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => setOpen(!open)}
                    sx={{ textTransform: 'none', color: '#2e7d32', pl: 0, mt: 0.5, fontSize: '0.8rem' }}>
                    {open ? 'Hide' : 'Show'} line-level breakdown
                </Button>

                <Collapse in={open}>
                    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8faf8', borderRadius: 1.5, border: '1px solid #c8e6c9' }}>
                        {/* Material lines */}
                        {analysis.materialLines?.length > 0 && (
                            <>
                                <Typography variant="caption" fontWeight={700} color="#2e7d32" display="block" mb={0.5}>
                                    Materials
                                </Typography>
                                {analysis.materialLines.map((m, i) => (
                                    <Box key={i} display="flex" justifyContent="space-between" mb={0.25}>
                                        <Typography variant="caption" color="text.secondary">
                                            {m.itemName} × {m.quantity}
                                        </Typography>
                                        <Typography variant="caption" fontWeight={600}>{formatInr(m.totalCost)}</Typography>
                                    </Box>
                                ))}
                            </>
                        )}

                        {/* Operation lines */}
                        {analysis.operationLines?.length > 0 && (
                            <>
                                <Typography variant="caption" fontWeight={700} color="#2e7d32" display="block" mt={1.5} mb={0.5}>
                                    Operations
                                </Typography>
                                {analysis.operationLines.map((op, i) => {
                                    const badgeColors = {
                                        FIXED_RATE: '#7b1fa2',
                                        SUB_CONTRACTED: '#e65100',
                                        CALCULATED: '#1565c0',
                                    };
                                    const badgeColor = badgeColors[op.costType] || '#6b7280';
                                    return (
                                        <Box key={i} display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                            <Box display="flex" alignItems="center" gap={0.75}>
                                                <Typography variant="caption" color="text.secondary">{op.operationName}</Typography>
                                                <Chip label={op.costType || 'CALCULATED'} size="small"
                                                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: badgeColor, color: '#fff', fontWeight: 600 }} />
                                            </Box>
                                            <Typography variant="caption" fontWeight={600}>{formatInr(op.totalCost)}</Typography>
                                        </Box>
                                    );
                                })}
                            </>
                        )}
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
};

// ── BuyCard ───────────────────────────────────────────────────────────────────

const BuyCard = ({ analysis, isRec }) => {
    if (!analysis?.available) {
        return <UnavailableCard color="#1565c0" title="Purchase from Supplier" subtitle="External Procurement" msg="No purchase price or standard cost found. Add a vendor price in the item master." />;
    }

    const isEstimated = ['LAST_PURCHASE', 'STANDARD_COST'].includes(analysis.priceSource);
    const sourceLabel = priceSourceLabel[analysis.priceSource] || analysis.priceSource;
    const unitCost = analysis.unitCost ?? analysis.unitTotalCost ?? 0;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isRec ? '2px solid #1565c0' : `1px solid ${BORDER_COLOR}` }}>
            <CardHeader bg="#1565c0" title="Purchase from Supplier" subtitle="External Procurement" isRec={isRec} />
            <CardContent sx={{ flexGrow: 1, p: 2 }}>
                <UnitCostDisplay cost={unitCost} color="#1565c0" />
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Batch Total: <strong>{formatInr(analysis.batchTotalCost)}</strong>
                </Typography>

                <Chip
                    size="small"
                    label={sourceLabel}
                    color={isEstimated ? 'warning' : 'primary'}
                    variant={isEstimated ? 'outlined' : 'filled'}
                    sx={{ mb: 1.5, fontSize: '0.7rem', fontWeight: 600 }}
                />

                {isEstimated && (
                    <Alert severity="warning" variant="outlined" sx={{ mb: 1.5, py: 0.25, fontSize: '0.78rem', borderRadius: 1.5 }}>
                        Using estimated price — add a vendor price for accuracy.
                    </Alert>
                )}

                {analysis.vendorName && (
                    <Box mb={1.5} sx={{ p: 1.25, bgcolor: '#f0f4ff', borderRadius: 1.5, border: '1px solid #c5cae9' }}>
                        <Typography variant="body2" fontWeight={700} color="#0f2744">{analysis.vendorName}</Typography>
                        {analysis.gstRegistered ? (
                            <Typography variant="caption" sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                <CheckCircle sx={{ fontSize: 13 }} /> GST Registered — ITC Available
                            </Typography>
                        ) : (
                            <Typography variant="caption" sx={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                <WarningAmber sx={{ fontSize: 13 }} /> Unregistered — RCM Applicable
                            </Typography>
                        )}
                    </Box>
                )}

                {analysis.leadTimeDays != null && (
                    <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <CalendarToday sx={{ fontSize: 15 }} /> Lead Time: <strong>{analysis.leadTimeDays} days</strong>
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

// ── SubcontractCard ───────────────────────────────────────────────────────────

const SubcontractCard = ({ analysis, isRec }) => {
    if (!analysis?.available) {
        return <UnavailableCard color="#e65100" title="Job Work (Subcontract)" subtitle="GST Sec. 143 Job Work" msg="Subcontract rate not set. Configure a job work rate or use the Override field above." />;
    }

    const unitCost = analysis.unitTotalCost ?? analysis.unitCost ?? 0;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isRec ? '2px solid #e65100' : `1px solid ${BORDER_COLOR}` }}>
            <CardHeader bg="#e65100" title="Job Work (Subcontract)" subtitle="GST Sec. 143 Job Work" isRec={isRec} />
            <CardContent sx={{ flexGrow: 1, p: 2 }}>
                <UnitCostDisplay cost={unitCost} color="#e65100" />
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Batch Total: <strong>{formatInr(analysis.batchTotalCost)}</strong>
                </Typography>

                <Table size="small" sx={{ mb: 1.5 }}>
                    <TableBody>
                        <CostRow label="Raw material supplied" value={analysis.unitMaterialCost} />
                        <CostRow label="Job work charge" value={analysis.unitJobWorkCost} />
                        <CostRow label="Total / unit" value={unitCost} bold />
                    </TableBody>
                </Table>

                {analysis.vendorName && (
                    <Box mb={1.5} sx={{ p: 1.25, bgcolor: '#fff8f5', borderRadius: 1.5, border: '1px solid #ffccbc' }}>
                        <Typography variant="body2" fontWeight={700} color="#0f2744">{analysis.vendorName}</Typography>
                        {analysis.gstRegistered ? (
                            <Typography variant="caption" sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                <CheckCircle sx={{ fontSize: 13 }} /> GST Registered Supplier
                            </Typography>
                        ) : (
                            <Typography variant="caption" sx={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                <WarningAmber sx={{ fontSize: 13 }} /> Unregistered Supplier
                            </Typography>
                        )}
                    </Box>
                )}

                <Tooltip title="You supply raw materials to the job-work vendor. Vendor charges only the processing fee. Material ownership stays with you (GST Section 143).">
                    <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', width: 'fit-content' }}>
                        <InfoOutlined sx={{ fontSize: 14 }} /> How subcontracting works
                    </Typography>
                </Tooltip>
            </CardContent>
        </Card>
    );
};

// ── AnalysisResults ───────────────────────────────────────────────────────────

const RECOMMENDATION_CONFIG = {
    MAKE: { color: '#2e7d32', bg: '#e8f5e9', borderColor: '#a5d6a7', icon: <Factory />, label: 'Make In-House' },
    BUY: { color: '#1565c0', bg: '#e3f2fd', borderColor: '#90caf9', icon: <ShoppingCart />, label: 'Purchase from Supplier' },
    SUBCONTRACT: { color: '#e65100', bg: '#fff3e0', borderColor: '#ffcc80', icon: <Handshake />, label: 'Job Work (Subcontract)' },
    UNKNOWN: { color: '#616161', bg: '#f5f5f5', borderColor: '#e0e0e0', icon: <WarningAmber />, label: 'Insufficient Data' },
};

const AnalysisResults = ({ data }) => {
    const showStaleWarning =
        (data.buyAnalysis?.available && ['LAST_PURCHASE', 'STANDARD_COST'].includes(data.buyAnalysis.priceSource)) ||
        (data.subcontractAnalysis?.available && ['LAST_PURCHASE', 'STANDARD_COST'].includes(data.subcontractAnalysis.priceSource));

    const cfg = RECOMMENDATION_CONFIG[data.recommendation] || RECOMMENDATION_CONFIG.UNKNOWN;

    const chartData = [
        data.makeAnalysis?.available && { name: 'Make', cost: data.makeAnalysis.batchTotalCost, unit: data.makeAnalysis.unitTotalCost ?? data.makeAnalysis.unitCost, fill: '#2e7d32' },
        data.buyAnalysis?.available && { name: 'Buy', cost: data.buyAnalysis.batchTotalCost, unit: data.buyAnalysis.unitCost ?? data.buyAnalysis.unitTotalCost, fill: '#1565c0' },
        data.subcontractAnalysis?.available && { name: 'Subcontract', cost: data.subcontractAnalysis.batchTotalCost, unit: data.subcontractAnalysis.unitTotalCost ?? data.subcontractAnalysis.unitCost, fill: '#e65100' },
    ].filter(Boolean);

    return (
        <Box>
            {showStaleWarning && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Estimated Pricing Used</AlertTitle>
                    This analysis uses estimated pricing (Last Purchase or Standard Cost). For accurate decisions, configure <strong>Vendor Prices</strong> in the Inventory Item master.
                </Alert>
            )}

            {/* Recommendation banner */}
            <Paper elevation={0} sx={{
                mb: 2.5, p: 2, bgcolor: cfg.bg, border: `1px solid ${cfg.borderColor}`,
                borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5,
            }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Recommendation
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: cfg.color, lineHeight: 1.2 }}>
                            {cfg.label}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                    {data.makeBuyCostDifferencePct != null && (
                        <Chip
                            label={`Manufacturing ${Math.abs(data.makeBuyCostDifferencePct).toFixed(1)}% ${data.makeBuyCostDifferencePct < 0 ? 'cheaper' : 'costlier'} than buying`}
                            color={data.makeBuyCostDifferencePct < 0 ? 'success' : 'error'}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 700 }}
                        />
                    )}
                    {data.buyAnalysis?.available && data.makeAnalysis?.available && (
                        <Chip
                            label={data.breakEvenQuantity
                                ? `Break-even: ${Number(data.breakEvenQuantity).toLocaleString('en-IN')} units`
                                : 'Break-even not calculable'}
                            icon={<InfoOutlined sx={{ fontSize: '0.9rem' }} />}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Box>
            </Paper>

            {/* Recommendation reason */}
            {data.recommendationReason && (
                <Paper elevation={0} sx={{ mb: 2.5, p: 1.75, border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5, bgcolor: '#fafafa' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                        Why this recommendation
                    </Typography>
                    <Typography variant="body2" color="#374151">
                        {data.recommendationReason}
                    </Typography>
                </Paper>
            )}

            {/* Per-unit comparison table */}
            {chartData.length > 1 && (
                <Paper elevation={0} sx={{ mb: 2.5, p: 2, border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f2744" mb={1.5}>
                        Cost Comparison — {data.quantity} {data.quantity === 1 ? 'unit' : 'units'}
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        {chartData.map(d => (
                            <Box key={d.name} sx={{
                                flex: '1 1 140px', p: 1.5, borderRadius: 1.5,
                                border: `2px solid ${data.recommendation === d.name.toUpperCase() || (d.name === 'Subcontract' && data.recommendation === 'SUBCONTRACT') ? d.fill : '#e5e7eb'}`,
                                bgcolor: data.recommendation === d.name.toUpperCase() || (d.name === 'Subcontract' && data.recommendation === 'SUBCONTRACT') ? `${d.fill}14` : '#fff',
                            }}>
                                <Typography variant="caption" fontWeight={600} sx={{ color: d.fill, textTransform: 'uppercase', fontSize: '0.7rem' }}>{d.name}</Typography>
                                <Typography variant="h6" fontWeight={800} sx={{ color: d.fill, mt: 0.25 }}>{formatInr(d.unit)}<Typography component="span" variant="caption" color="text.secondary" fontWeight={400}>/unit</Typography></Typography>
                                <Typography variant="caption" color="text.secondary">Batch: {formatInr(d.cost)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Option cards */}
            <Grid container spacing={2} sx={{ mb: 2.5 }} alignItems="stretch">
                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <MakeCard analysis={data.makeAnalysis} isRec={data.recommendation === 'MAKE'} />
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <BuyCard analysis={data.buyAnalysis} isRec={data.recommendation === 'BUY'} />
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <SubcontractCard analysis={data.subcontractAnalysis} isRec={data.recommendation === 'SUBCONTRACT'} />
                </Grid>
            </Grid>

            {/* Bar chart */}
            {chartData.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f2744" mb={2} align="center">
                        Batch Cost Comparison — {data.quantity} units
                    </Typography>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 90, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN', { notation: 'compact' })}`}
                                tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 600 }} width={80} />
                            <RechartsTooltip
                                formatter={(val) => [formatInr(val), 'Batch Cost']}
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            />
                            <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={36}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                <LabelList dataKey="cost" position="right" formatter={(v) => formatInr(v)}
                                    style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            )}
        </Box>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const MakeBuyAnalysis = ({ initialItemId }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryItemId = searchParams.get('itemId') || initialItemId;

    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [buyOverride, setBuyOverride] = useState('');
    const [jobWorkOverride, setJobWorkOverride] = useState('');
    const [showOverrides, setShowOverrides] = useState(false);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const debounceTimer = React.useRef(null);

    // Search items
    const searchItems = useCallback(async (query) => {
        setItemsLoading(true);
        try {
            const payload = {
                page: 0, size: 20, sortBy: 'inventoryItemId', sortDir: 'asc',
                filters: query ? [{ field: 'name', operator: 'like', value: query }] : [],
            };
            const res = await filterInventoryItems(payload);
            setItems(res.content || []);
        } catch {
            // silently fail — don't break the UI for a dropdown search failure
        } finally {
            setItemsLoading(false);
        }
    }, []);

    // Fetch by id (when navigated from another page with ?itemId=)
    const fetchItemById = useCallback(async (id) => {
        try {
            const payload = {
                page: 0, size: 1, sortBy: 'inventoryItemId', sortDir: 'asc',
                filters: [{ field: 'inventoryItemId', operator: 'eq', value: id }],
            };
            const res = await filterInventoryItems(payload);
            if (res.content?.length > 0) {
                const item = res.content[0];
                setSelectedItem(item);
                runAnalysis(item.inventoryItemId, 1);
            }
        } catch {
            // ignore
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        searchItems('');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (queryItemId && !selectedItem) {
            fetchItemById(queryItemId);
        }
    }, [queryItemId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            searchItems(searchQuery);
        }, 400);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchQuery, searchItems]);

    const runAnalysis = async (itemId = selectedItem?.inventoryItemId, qty = quantity) => {
        if (!itemId) return;
        setLoading(true);
        setError(null);
        try {
            const payload = {
                itemId: Number(itemId),
                quantity: Number(qty) || 1,
                buyPricePerUnitOverride: buyOverride ? Number(buyOverride) : null,
                subcontractRatePerUnitOverride: jobWorkOverride ? Number(jobWorkOverride) : null,
            };
            const res = await apiService.post('/make-or-buy/analyze', payload);
            setData(res);
            setSearchParams({ itemId });
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to analyze. Please try again.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (newValue) => {
        setSelectedItem(newValue);
        setData(null);
        setError(null);
        if (newValue) {
            runAnalysis(newValue.inventoryItemId, quantity);
        } else {
            setSearchParams({});
        }
    };

    const handleQuantityChange = (e) => {
        const val = e.target.value;
        if (val === '' || Number(val) >= 0) setQuantity(val);
    };

    const handleQuantityBlur = () => {
        const qty = Number(quantity);
        if (!qty || qty < 1) setQuantity(1);
        if (selectedItem) runAnalysis(selectedItem.inventoryItemId, Math.max(1, qty || 1));
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Input panel */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 2.5, border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
                <Box mb={2}>
                    <Typography variant="h5" fontWeight={700} color="#0f2744" sx={{ fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                        Make or Buy Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                        Compare in-house manufacturing vs purchasing vs subcontracting for any product
                    </Typography>
                </Box>

                <Grid container spacing={2} alignItems="flex-start">
                    {/* Item search */}
                    <Grid item xs={12} md={5}>
                        <Autocomplete
                            options={items}
                            loading={itemsLoading}
                            filterOptions={(x) => x}
                            getOptionLabel={(option) => `${option.itemCode} — ${option.name}`}
                            isOptionEqualToValue={(option, value) => option.inventoryItemId === value.inventoryItemId}
                            value={selectedItem}
                            onInputChange={(_, newVal, reason) => {
                                if (reason === 'input') setSearchQuery(newVal);
                            }}
                            onChange={(_, newValue) => handleItemChange(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} label="Select Product" size="small" fullWidth
                                    placeholder="Search by item code or name..."
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {itemsLoading ? <CircularProgress size={14} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.inventoryItemId}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{option.itemCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{option.name}</Typography>
                                    </Box>
                                </Box>
                            )}
                        />
                    </Grid>

                    {/* Quantity */}
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label="Quantity"
                            type="number"
                            size="small"
                            fullWidth
                            value={quantity}
                            onChange={handleQuantityChange}
                            onBlur={handleQuantityBlur}
                            inputProps={{ min: 1, step: 'any' }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            InputProps={{
                                endAdornment: selectedItem?.uom
                                    ? <Typography variant="caption" color="text.secondary">{selectedItem.uom}</Typography>
                                    : null,
                            }}
                        />
                    </Grid>

                    {/* Buttons */}
                    <Grid item xs={12} sm={6} md={4} display="flex" gap={1}>
                        <Button
                            variant="outlined"
                            onClick={() => setShowOverrides(!showOverrides)}
                            endIcon={showOverrides ? <ExpandLess /> : <ExpandMore />}
                            sx={{ textTransform: 'none', borderRadius: 1.5, flexShrink: 0 }}>
                            Overrides
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => runAnalysis()}
                            disabled={!selectedItem || loading}
                            startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Calculate />}
                            sx={{
                                flexGrow: 1, textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                                bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                            }}>
                            {loading ? 'Analyzing...' : 'Analyze'}
                        </Button>
                    </Grid>
                </Grid>

                {/* Override fields */}
                <Collapse in={showOverrides}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}` }}>
                        <Typography variant="subtitle2" fontWeight={700} color="#0f2744" mb={0.5}>Price / Rate Overrides</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                            Leave blank to use the configured vendor price or last purchase cost.
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Buy Price Override (₹/unit)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={buyOverride}
                                    onChange={(e) => setBuyOverride(e.target.value)}
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                    placeholder="e.g. 250.00"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Subcontract / Job Work Rate (₹/unit)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={jobWorkOverride}
                                    onChange={(e) => setJobWorkOverride(e.target.value)}
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                    placeholder="e.g. 80.00"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>
            </Paper>

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Analysis Failed</AlertTitle>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" py={10} flexDirection="column" gap={2}>
                    <CircularProgress sx={{ color: '#1565c0' }} />
                    <Typography variant="body2" color="text.secondary">Running cost analysis...</Typography>
                </Box>
            )}

            {/* Results */}
            {!loading && data && <AnalysisResults data={data} />}

            {/* Empty state */}
            {!loading && !data && !error && (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center"
                    py={10} sx={{ color: '#9ca3af' }}>
                    <Description sx={{ fontSize: 56, mb: 2, opacity: 0.4 }} />
                    <Typography variant="h6" fontWeight={600} color="text.secondary" mb={0.5}>
                        Select a product to begin
                    </Typography>
                    <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 380 }}>
                        Choose an item and quantity above to compare Make (in-house BOM), Buy (supplier), and Subcontract (job work) costs side by side.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default MakeBuyAnalysis;
