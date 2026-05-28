import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Alert, Avatar, Box, Button, CircularProgress,
    Container, Grid, IconButton, Paper, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography, Chip
} from '@mui/material';
import {
    ArrowBack, CheckCircle, LocalShipping, Save, Description,
} from '@mui/icons-material';
import {
    getSalesOrder, getDeliveryNote, createDeliveryNote, downloadDeliveryNotePdf,
} from '../../../services/salesOrderService';
import StockAllocationModal from './StockAllocationModal';


const today = () => new Date().toISOString().split('T')[0];

const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
    header:  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
};



export default function AddUpdateDeliveryNote() {
    const navigate = useNavigate();
    const { dnId } = useParams();
    const [searchParams] = useSearchParams();
    const soId = searchParams.get('soId');

    const isView = Boolean(dnId);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [so, setSo] = useState(null);
    const [dn, setDn] = useState(null);
    const [dispatchQtys, setDispatchQtys] = useState({});
    
    // New states for Stock Allocation
    const [modalOpen, setModalOpen] = useState(false);
    const [activeItem, setActiveItem] = useState(null);
    const [allocatedInstances, setAllocatedInstances] = useState({});

    const [form, setForm] = useState({
        deliveryDate: today(),
        lrNumber: '',
        transporter: '',
        vehicleNumber: '',
        ewayBillNumber: '',
        dispatchThrough: '',
        remarks: '',
        deliveryNoteNo: '',
    });

    
    useEffect(() => {
        if (isView) {
            setLoading(true);
            getDeliveryNote(dnId)
                .then(data => {
                    setDn(data);
                    setForm({
                        deliveryDate: data.deliveryDate ?? today(),
                        lrNumber: data.lrNumber ?? '',
                        transporter: data.transporter ?? '',
                        vehicleNumber: data.vehicleNumber ?? '',
                        ewayBillNumber: data.ewayBillNumber ?? '',
                        dispatchThrough: data.dispatchThrough ?? '',
                        remarks: data.remarks ?? '',
                        deliveryNoteNo: data.deliveryNoteNo ?? '',
                    });
                })
                .catch(() => setError('Failed to load delivery note.'))
                .finally(() => setLoading(false));
        } else if (soId) {
            setLoading(true);
            getSalesOrder(soId)
                .then(data => {
                    setSo(data);
                    const initial = {};
                    (data.items ?? []).forEach(item => {
                        const id = item.inventoryItem?.inventoryItemId ?? item.inventoryItem?.id;
                        if (id != null) initial[id] = item.remainingQty ?? item.qty ?? 0;
                    });
                    setDispatchQtys(initial);
                    setForm(prev => ({
                        ...prev,
                        dispatchThrough: data.dispatchThrough ?? '',
                        deliveryDate: data.deliveryDate ?? today(),
                    }));
                })
                .catch(() => setError('Failed to load sales order.'))
                .finally(() => setLoading(false));
        }
    }, [dnId, soId, isView]);

    const soItems = so?.items ?? [];

    const handleSubmit = async () => {
        if (!soId && !so?.id) { setError('No sales order selected.'); return; }
        const items = soItems
            .map(item => {
                const id = item.inventoryItem?.inventoryItemId ?? item.inventoryItem?.id;
                const qty = parseInt(dispatchQtys[id] ?? 0, 10);
                return { 
                    inventoryItemId: id, 
                    quantityDelivered: qty,
                    allocatedInstanceIds: allocatedInstances[id] || []
                };
            })
            .filter(i => i.quantityDelivered > 0);


        if (items.length === 0) { setError('At least one item must have a dispatch quantity > 0.'); return; }

        const payload = {
            salesOrderId: so?.id ?? parseInt(soId, 10),
            deliveryDate: form.deliveryDate || null,
            lrNumber: form.lrNumber || null,
            transporter: form.transporter || null,
            vehicleNumber: form.vehicleNumber || null,
            ewayBillNumber: form.ewayBillNumber || null,
            dispatchThrough: form.dispatchThrough || null,
            remarks: form.remarks || null,
            deliveryNoteNo: form.deliveryNoteNo || null,
            items,
        };

        setSaving(true);
        setError(null);
        try {
            await createDeliveryNote(payload);
            setSuccess(true);
            setTimeout(() => navigate(`/sales/sales-order/edit/${so?.id ?? soId}`), 1200);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Failed to create delivery note.');
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Stack spacing={2} alignItems="center">
                <CircularProgress thickness={5} size={48} sx={{ color: T.primary }} />
                <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 600 }}>Loading Challan Details...</Typography>
            </Stack>
        </Box>
    );

    const orderNumber = so?.orderNumber ?? dn?.salesOrderNumber;
    const customerName = so?.customerName ?? dn?.customerName;

    const SectionHeader = ({ icon: Icon, title }) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${T.primary}10`, color: T.primary, display: 'flex' }}>
                <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: T.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {title}
            </Typography>
        </Stack>
    );

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 8 }}>
            {/* ── Top Bar ── */}
            <Box sx={{ bgcolor: 'white', borderBottom: `1px solid ${T.border}`, py: 2, sticky: 'top', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <IconButton onClick={() => navigate(-1)} sx={{ border: `1px solid ${T.border}`, '&:hover': { bgcolor: T.bg } }}>
                                <ArrowBack sx={{ fontSize: 20 }} />
                            </IconButton>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: T.text, lineHeight: 1.2 }}>
                                    {isView ? dn?.deliveryNoteNo || 'Delivery Note' : 'New Dispatch Challan'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 600 }}>
                                        {orderNumber ? `Ref: ${orderNumber}` : 'Sales Order Reference'}
                                    </Typography>
                                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: T.border }} />
                                    <Typography variant="caption" sx={{ color: T.primary, fontWeight: 700 }}>
                                        {customerName || 'Select Customer'}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                        
                        <Stack direction="row" spacing={3} alignItems="center">
                            {!isView && (
                                <TextField
                                    label="Challan No (Optional)"
                                    variant="standard"
                                    placeholder="[ Auto-Generate ]"
                                    value={form.deliveryNoteNo}
                                    onChange={handleFieldChange('deliveryNoteNo')}
                                    InputProps={{ disableUnderline: true, sx: { fontSize: '0.75rem', fontWeight: 700, bgcolor: T.bg, px: 2, py: 0.5, borderRadius: 1.5, color: T.textSec } }}
                                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.7rem', fontWeight: 800, color: T.primary, ml: 1 } }}
                                    sx={{ width: 160 }}
                                />
                            )}
                            <Stack direction="row" spacing={2}>
                            {!isView ? (
                                <Button
                                    variant="contained" disableElevation
                                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                                    onClick={handleSubmit}
                                    disabled={saving || success}
                                    sx={{ 
                                        borderRadius: 2.5, px: 4, py: 1.2, fontWeight: 800, textTransform: 'none',
                                        bgcolor: T.success, '&:hover': { bgcolor: '#047857' },
                                        boxShadow: '0 4px 14px 0 rgba(5, 150, 105, 0.3)'
                                    }}
                                >
                                    {saving ? 'Processing...' : 'Issue Challan'}
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    startIcon={<LocalShipping />}
                                    onClick={() => downloadDeliveryNotePdf(dnId, dn?.deliveryNoteNo)}
                                    sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, textTransform: 'none', borderColor: T.border, color: T.text }}
                                >
                                    Print Challan
                                </Button>
                            )}
                            </Stack>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontWeight: 600 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 600 }}>Dispatch successful! Returning to order...</Alert>}

                <Grid container spacing={4}>
                    {/* ── Left Column: Items ── */}
                    <Grid item xs={12} lg={8}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white' }}>
                            <SectionHeader icon={Description} title="Line Items for Dispatch" />
                            
                            <TableContainer sx={{ mt: 1 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, color: T.textSec, fontSize: '0.75rem', borderBottom: `2px solid ${T.bg}` }}>PRODUCT DETAILS</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: T.textSec, fontSize: '0.75rem', borderBottom: `2px solid ${T.bg}` }}>ORDERED</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: T.textSec, fontSize: '0.75rem', borderBottom: `2px solid ${T.bg}` }}>DISPATCH QTY</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {isView ? (
                                            (dn?.items ?? []).map((item, idx) => (
                                                <TableRow key={idx} sx={{ '&:hover': { bgcolor: T.bg } }}>
                                                    <TableCell sx={{ py: 2.5, borderBottom: `1px solid ${T.bg}` }}>
                                                        <Stack direction="row" spacing={2} alignItems="center">
                                                            <Avatar sx={{ bgcolor: `${T.primary}10`, color: T.primary, width: 40, height: 40, borderRadius: 2, fontSize: '0.8rem', fontWeight: 700 }}>
                                                                {idx + 1}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>
                                                                    {item.itemName || 'Unknown Item'}
                                                                </Typography>
                                                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                                    {(item.batchNumbers ?? []).map(b => (
                                                                        <Chip key={b} label={`Batch: ${b}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, borderRadius: 1 }} />
                                                                    ))}
                                                                    {(item.serialNumbers ?? []).map(s => (
                                                                        <Chip key={s} label={`S/N: ${s}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, borderRadius: 1, borderColor: T.primary, color: T.primary }} />
                                                                    ))}
                                                                </Stack>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ borderBottom: `1px solid ${T.bg}` }}>
                                                        <Typography sx={{ color: T.textSec, fontSize: '0.875rem' }}>—</Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ borderBottom: `1px solid ${T.bg}` }}>
                                                        <Box sx={{ display: 'inline-block', px: 2, py: 0.5, bgcolor: `${T.success}10`, color: T.success, borderRadius: 1.5, fontWeight: 800 }}>
                                                            {item.quantityDelivered}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            soItems.map((item, idx) => {
                                                const id = item.inventoryItem?.inventoryItemId ?? item.inventoryItem?.id;
                                                const orderedQty = parseFloat(item.qty) || 0;
                                                const currentDispatch = dispatchQtys[id] ?? 0;

                                                return (
                                                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: T.bg } }}>
                                                        <TableCell sx={{ py: 2.5, borderBottom: `1px solid ${T.bg}` }}>
                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <Avatar sx={{ bgcolor: `${T.primary}10`, color: T.primary, width: 40, height: 40, borderRadius: 2, fontSize: '0.8rem', fontWeight: 700 }}>
                                                                    {idx + 1}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>
                                                                        {item.inventoryItemName || item.inventoryItem?.name || 'Unnamed Product'}
                                                                    </Typography>
                                                                    <Typography sx={{ color: T.textSec, fontSize: '0.75rem' }}>
                                                                        {item.inventoryItem?.itemCode || 'No Code'}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ borderBottom: `1px solid ${T.bg}` }}>
                                                            <Typography sx={{ fontWeight: 600, color: T.textSec }}>{orderedQty}</Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ borderBottom: `1px solid ${T.bg}` }}>
                                                            <Stack alignItems="flex-end" spacing={1}>
                                                                <TextField
                                                                    size="small" type="number"
                                                                    value={currentDispatch}
                                                                    onChange={e => setDispatchQtys(prev => ({
                                                                        ...prev,
                                                                        [id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                                                    }))}
                                                                    inputProps={{ min: 0, max: orderedQty, style: { textAlign: 'right', fontWeight: 800, color: T.primary } }}
                                                                    sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: T.bg } }}
                                                                />
                                                                <Button 
                                                                    size="small" 
                                                                    variant={allocatedInstances[id]?.length > 0 ? "contained" : "outlined"}
                                                                    color={allocatedInstances[id]?.length > 0 ? "success" : "primary"}
                                                                    onClick={() => { 
                                                                        setActiveItem({ ...item, allocatedInstanceIds: allocatedInstances[id] }); 
                                                                        setModalOpen(true); 
                                                                    }}
                                                                    sx={{ fontSize: '0.7rem', py: 0.2, borderRadius: 1.5, textTransform: 'none' }}
                                                                >
                                                                    {allocatedInstances[id]?.length > 0 ? `Allocated (${allocatedInstances[id].length})` : 'Select Stock'}
                                                                </Button>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ mt: 4, p: 3, borderRadius: 3, bgcolor: '#fefce8', border: '1px solid #fef08a' }}>
                                <Stack direction="row" spacing={2}>
                                    <Typography variant="body2" sx={{ color: '#854d0e', fontWeight: 700 }}>Notes / Remarks:</Typography>
                                    <Typography variant="body2" sx={{ color: '#a16207' }}>
                                        {isView ? (dn?.remarks || 'No remarks provided.') : 'Ensure physical quantity matches the digital entry before issuing the challan.'}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* ── Right Column: Metadata ── */}
                    <Grid item xs={12} lg={4}>
                        <Stack spacing={4}>
                            {/* Logistic Info */}
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white' }}>
                                <SectionHeader icon={LocalShipping} title="Logistics & Tracking" />
                                <Stack spacing={3}>
                                    <TextField
                                        fullWidth label="Transporter Name" variant="filled" size="small"
                                        value={form.transporter} onChange={handleFieldChange('transporter')}
                                        disabled={isView} InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                    <TextField
                                        fullWidth label="Vehicle Number" variant="filled" size="small"
                                        value={form.vehicleNumber} onChange={handleFieldChange('vehicleNumber')}
                                        disabled={isView} InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                    <TextField
                                        fullWidth label="LR / Consignment No" variant="filled" size="small"
                                        value={form.lrNumber} onChange={handleFieldChange('lrNumber')}
                                        disabled={isView} InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                    <TextField
                                        fullWidth label="Dispatch Date" variant="filled" size="small" type="date"
                                        value={form.deliveryDate} onChange={handleFieldChange('deliveryDate')}
                                        disabled={isView} InputLabelProps={{ shrink: true }}
                                        InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                </Stack>
                            </Paper>

                            {/* Compliance Info */}
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white' }}>
                                <SectionHeader icon={CheckCircle} title="Compliance" />
                                <Stack spacing={3}>
                                    <TextField
                                        fullWidth label="E-Way Bill Number" variant="filled" size="small"
                                        value={form.ewayBillNumber} onChange={handleFieldChange('ewayBillNumber')}
                                        disabled={isView} InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                    <TextField
                                        fullWidth label="Dispatch Through" variant="filled" size="small"
                                        value={form.dispatchThrough} onChange={handleFieldChange('dispatchThrough')}
                                        disabled={isView} InputProps={{ disableUnderline: true, sx: { borderRadius: 2, bgcolor: T.bg } }}
                                    />
                                </Stack>
                            </Paper>

                            {isView && (
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ color: T.textSec, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                                        System Generated Challan
                                    </Typography>
                                    <Typography sx={{ color: T.textSec, fontSize: '0.65rem' }}>
                                        Created on: {fmtDate(dn?.createdAt)}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            {/* Stock Allocation Modal */}
            <StockAllocationModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                item={activeItem} 
                requiredQty={activeItem ? dispatchQtys[activeItem.inventoryItem?.inventoryItemId ?? activeItem.inventoryItem?.id] : 0}
                onAllocate={(ids) => {
                    if (activeItem) {
                        const id = activeItem.inventoryItem?.inventoryItemId ?? activeItem.inventoryItem?.id;
                        setAllocatedInstances(prev => ({ ...prev, [id]: ids }));
                    }
                }} 
            />
        </Box>
    );
}
