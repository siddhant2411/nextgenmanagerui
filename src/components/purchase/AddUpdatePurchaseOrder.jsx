import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, Tabs, Tab, Chip, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, Tooltip, Divider, Stack, Alert, Container, Grid
} from '@mui/material';
import {
    ArrowBack, Save, Send, CheckCircle, Cancel, Download,
    HourglassTop, Refresh, Delete, History, Email, WhatsApp,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
    submitPurchaseOrder, approvePurchaseOrder, rejectPurchaseOrder,
    sendPurchaseOrder, cancelPurchaseOrder, recalculatePurchaseOrder,
    downloadPOPdf, deletePurchaseOrder, getNextPONumber, completePurchaseOrder,
} from '../../services/purchaseOrderService';
import POBasicTab from './tabs/POBasicTab';
import POLineItemsTab from './tabs/POLineItemsTab';
import POTaxSummaryTab from './tabs/POTaxSummaryTab';
import POReceiveTab from './tabs/POReceiveTab';
import DocumentChecklist from '../common/DocumentChecklist';
import SendPODialog from './SendPODialog';
import { useAuth } from '../../auth/AuthContext';
import { PURCHASE_MANAGE_ROLES } from '../../auth/roles';
import { resolveApiErrorMessage } from '../../services/apiService';
import { T, SHELL, STATUS, heroButtonSx, heroCtaSx } from '../../theme/moduleTokens';

const APPROVAL_STYLE = {
    DRAFT:            { bg: T.ruleSoft,        color: T.ink2,         border: T.rule },
    PENDING_APPROVAL: { bg: STATUS.seriousBg,  color: STATUS.serious, border: STATUS.seriousBg },
    APPROVED:         { bg: STATUS.goodBg,     color: STATUS.good,    border: STATUS.goodBg },
    REJECTED:         { bg: STATUS.criticalBg, color: STATUS.critical, border: STATUS.criticalBg },
};
const STATUS_STYLE = {
    DRAFT:              { bg: T.ruleSoft,        color: T.ink2 },
    SENT:               { bg: T.accentDim,       color: T.accent },
    PARTIALLY_RECEIVED: { bg: STATUS.warningBg,  color: STATUS.warningInk },
    RECEIVED:           { bg: STATUS.goodBg,     color: STATUS.good },
    COMPLETED:          { bg: STATUS.goodBg,     color: STATUS.good },
    CANCELLED:          { bg: STATUS.criticalBg, color: STATUS.critical },
};

const validationSchema = Yup.object({
    vendorId: Yup.number().required('Vendor is required').typeError('Vendor is required'),
    orderDate: Yup.string().required('Order date is required'),
    items: Yup.array().min(1, 'At least one line item is required'),
});

const EMPTY = {
    id: null,
    purchaseOrderNumber: '', vendorId: null, vendorName: '', vendorEmail: '', vendorPhone: '', poType: 'STANDARD',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: '', placeOfSupply: '',
    currency: 'INR', exchangeRate: 1,
    paymentTerms: '', creditDays: '', vendorBillingAddressId: null,
    shipToAddressId: null, salesOrderId: null,
    quotationNumber: '', quotationDate: '',
    termsAndConditions: '', internalNotes: '', remarks: '',
    items: [],
    status: 'DRAFT', approvalStatus: 'DRAFT',
    subtotal: 0, totalDiscount: 0, taxableValue: 0,
    cgstAmount: 0, sgstAmount: 0, igstAmount: 0, cessAmount: 0,
    roundOff: 0, grandTotal: 0, grandTotalInWords: '',
    gstTreatment: null, revisionNo: 0,
    sentToVendorAt: null, sentToVendorEmail: null,
};

function ConfirmDialog({ open, title, body, input, onClose, onConfirm, loading }) {
    const [val, setVal] = useState('');
    useEffect(() => { if (!open) setVal(''); }, [open]);
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>{title}</DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: input ? 2 : 0 }}>{body}</Typography>
                {input && (
                    <TextField fullWidth size="small" label={input} multiline rows={3}
                        value={val} onChange={e => setVal(e.target.value)}
                        placeholder="Type here..."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, color: T.ink2 }}>Cancel</Button>
                <Button onClick={() => onConfirm(val)} variant="contained" disableElevation
                    disabled={loading || (!!input && !val.trim())}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, background: T.accent, px: 3, '&:hover': { background: T.accentHover } }}>
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Action'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function AddUpdatePurchaseOrder() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const canApprove = hasRole && PURCHASE_MANAGE_ROLES.some(r => hasRole(r));

    const [tab, setTab] = useState(0);
    const [missingEssential, setMissingEssential] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [sendChannel, setSendChannel] = useState(null); // 'EMAIL' | 'WHATSAPP' | null

    const formik = useFormik({
        initialValues: EMPTY,
        validationSchema,
        validateOnChange: false,
        onSubmit: async (values) => {
            setSaving(true);
            setError(null);
            try {
                const payload = buildPayload(values);
                const saved = isEdit
                    ? await updatePurchaseOrder(id, payload)
                    : await createPurchaseOrder(payload);
                applyServerData(saved);
                if (!isEdit) navigate(`../${saved.id}`, { replace: true });
            } catch (e) {
                setError(resolveApiErrorMessage(e, 'Save failed. Please check your inputs.'));
            } finally {
                setSaving(false);
            }
        },
    });

    const applyServerData = useCallback((data) => {
        const items = (data.items ?? []).map(l => ({
            itemId: l.itemId, itemName: l.itemName ?? '', itemCode: l.itemCode ?? '',
            description: l.description ?? '', hsnCode: l.hsnCode ?? '',
            uom: l.uom ?? '', quantityOrdered: l.quantityOrdered, unitPrice: l.unitPrice,
            discountPct: l.discountPct ?? 0, gstRatePct: l.gstRatePct ?? 0,
            requiredByDate: l.requiredByDate ? l.requiredByDate.slice(0, 10) : '',
            remarks: l.remarks ?? '', lineNumber: l.lineNumber,
            cgstAmount: l.cgstAmount, sgstAmount: l.sgstAmount,
            igstAmount: l.igstAmount, cessAmount: l.cessAmount, lineTotal: l.lineTotal,
            batchTracked: l.batchTracked ?? false,
            serialTracked: l.serialTracked ?? false,
            quantityReceived: l.quantityReceived ?? 0,
        }));
        formik.resetForm({
            values: {
                ...EMPTY,
                id: data.id ?? null,
                purchaseOrderNumber: data.purchaseOrderNumber ?? '',
                vendorId: data.vendorId ?? null,
                vendorName: data.vendorName ?? '',
                vendorEmail: data.vendorEmail ?? '',
                vendorPhone: data.vendorPhone ?? '',
                poType: data.poType ?? 'STANDARD',
                orderDate: data.orderDate ? new Date(data.orderDate).toISOString().slice(0, 10) : '',
                expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().slice(0, 10) : '',
                placeOfSupply: data.placeOfSupply ?? '',
                currency: data.currency ?? 'INR',
                exchangeRate: data.exchangeRate ?? 1,
                paymentTerms: data.paymentTerms ?? '',
                creditDays: data.creditDays ?? '',
                vendorBillingAddressId: data.vendorBillingAddressId ? parseInt(data.vendorBillingAddressId) : null,
                shipToAddressId: data.shipToAddressId ? parseInt(data.shipToAddressId) : null,
                salesOrderId: data.salesOrderId ?? null,
                quotationNumber: data.quotationNumber ?? '',
                quotationDate: data.quotationDate ? new Date(data.quotationDate).toISOString().slice(0, 10) : '',
                termsAndConditions: data.termsAndConditions ?? '',
                internalNotes: data.internalNotes ?? '',
                remarks: data.remarks ?? '',
                items,
                status: data.status ?? 'DRAFT',
                approvalStatus: data.approvalStatus ?? 'DRAFT',
                gstTreatment: data.gstTreatment ?? null,
                subtotal: data.subtotal ?? 0,
                totalDiscount: data.totalDiscount ?? 0,
                taxableValue: data.taxableValue ?? 0,
                cgstAmount: data.cgstAmount ?? 0,
                sgstAmount: data.sgstAmount ?? 0,
                igstAmount: data.igstAmount ?? 0,
                cessAmount: data.cessAmount ?? 0,
                roundOff: data.roundOff ?? 0,
                grandTotal: data.grandTotal ?? 0,
                grandTotalInWords: data.grandTotalInWords ?? '',
                revisionNo: data.revisionNo ?? 0,
                sentToVendorAt: data.sentToVendorAt ?? null,
                sentToVendorEmail: data.sentToVendorEmail ?? null,
            },
        });
    }, []);

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            getPurchaseOrder(id)
                .then(r => applyServerData(r))
                .catch(() => setError('Failed to fetch purchase order details.'))
                .finally(() => setLoading(false));
        } else {
            getNextPONumber()
                .then(r => formik.setFieldValue('purchaseOrderNumber', r))
                .catch(() => {});
        }
    }, [id, isEdit]);

    const isDraft = formik.values.approvalStatus === 'DRAFT' || formik.values.approvalStatus === 'REJECTED';
    const isPending = formik.values.approvalStatus === 'PENDING_APPROVAL';
    const isApproved = formik.values.approvalStatus === 'APPROVED';
    const isCancelled = formik.values.status === 'CANCELLED';
    const isCompleted = formik.values.status === 'COMPLETED';
    const readOnly = !isDraft || isCancelled || isCompleted;

    const buildPayload = (v) => ({
        vendorId: v.vendorId,
        poType: v.poType,
        orderDate: v.orderDate || null,
        expectedDeliveryDate: v.expectedDeliveryDate || null,
        placeOfSupply: v.placeOfSupply || null,
        currency: v.currency,
        exchangeRate: parseFloat(v.exchangeRate) || 1,
        paymentTerms: v.paymentTerms || null,
        creditDays: v.creditDays ? parseInt(v.creditDays) : null,
        vendorBillingAddressId: v.vendorBillingAddressId || null,
        shipToAddressId: v.shipToAddressId || null,
        salesOrderId: v.salesOrderId || null,
        quotationNumber: v.quotationNumber || null,
        quotationDate: v.quotationDate || null,
        termsAndConditions: v.termsAndConditions || null,
        internalNotes: v.internalNotes || null,
        remarks: v.remarks || null,
        items: (v.items ?? []).map((l, i) => ({
            itemId: l.itemId,
            lineNumber: l.lineNumber ?? i + 1,
            description: l.description || null,
            quantityOrdered: parseFloat(l.quantityOrdered) || 0,
            unitPrice: parseFloat(l.unitPrice) || 0,
            discountPct: parseFloat(l.discountPct) || 0,
            gstRatePct: parseFloat(l.gstRatePct) || 0,
            requiredByDate: l.requiredByDate || null,
            remarks: l.remarks || null,
            salesOrderItemId: l.salesOrderItemId || null,
        })),
    });

    const runAction = async (fn, successMsg) => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fn();
            applyServerData(res);
        } catch (e) {
            setError(resolveApiErrorMessage(e, successMsg + ' action failed.'));
        } finally {
            setActionLoading(false);
            setDialog(null);
        }
    };

    const handleRecalculate = () =>
        runAction(() => recalculatePurchaseOrder(id), 'Recalculate');

    const ss = STATUS_STYLE[formik.values.status] ?? STATUS_STYLE.DRAFT;
    const as = APPROVAL_STYLE[formik.values.approvalStatus] ?? APPROVAL_STYLE.DRAFT;

    if (loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
            <CircularProgress thickness={5} size={48} sx={{ color: T.accent }} />
            <Typography sx={{ color: '#64748b', fontWeight: 500 }}>Loading Purchase Order...</Typography>
        </Box>
    );

    return (
        <Box sx={{ background: T.ground, minHeight: '100vh', pb: 8 }}>
            {/* Pinned action bar — the masthead's palette, kept in reach on a long form. */}
            <Paper elevation={0} sx={{
                position: 'sticky', top: 0, zIndex: 10,
                borderBottom: `1px solid ${SHELL.heroLine}`,
                bgcolor: SHELL.heroBg, backgroundImage: SHELL.heroImage, color: SHELL.heroInk,
                px: { xs: 2, sm: 4 }, py: 2, borderRadius: 0,
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Tooltip title="Back to list">
                            <IconButton
                                onClick={() => navigate('..')}
                                sx={{
                                    color: SHELL.heroInk, border: `1px solid ${SHELL.heroLine}`,
                                    '&:hover': { bgcolor: SHELL.heroFill },
                                }}
                            >
                                <ArrowBack />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: SHELL.heroInk, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                                {isEdit ? formik.values.purchaseOrderNumber : 'New Purchase Order'}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {isEdit && (
                                    <>
                                        <Chip label={formik.values.status?.replace(/_/g, ' ')} size="small"
                                            sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: ss.bg, color: ss.color, height: 20 }} />
                                        <Chip label={formik.values.approvalStatus?.replace(/_/g, ' ')} size="small"
                                            sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: as.bg, color: as.color, height: 20, border: `1px solid ${as.border}` }} />
                                    </>
                                )}
                                {isEdit && formik.values.revisionNo > 0 && (
                                    <Typography sx={{ fontSize: '0.7rem', color: SHELL.heroInkDim, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                        <History sx={{ fontSize: 12 }} /> Rev {formik.values.revisionNo}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                        {isEdit && (
                            <Button variant="outlined" size="small" startIcon={<Download />}
                                sx={{ ...heroButtonSx, px: 2 }}
                                onClick={() => downloadPOPdf(id)}>
                                PDF
                            </Button>
                        )}
                        {isDraft && !isCancelled && (
                            <Button variant="contained" disableElevation startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                                disabled={saving}
                                sx={{ ...heroCtaSx, px: 3, py: 0.8 }}
                                onClick={() => formik.submitForm()}>
                                {saving ? 'Saving...' : 'Save Draft'}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <Container maxWidth="xl" sx={{ mt: 4 }}>
                {error && <Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                {/* Workflow actions */}
                {isEdit && !isCancelled && !isCompleted && (
                    <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: 'white' }}>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap gap={1.5}>
                            {isDraft && (
                                <Button variant="outlined" size="small" startIcon={<HourglassTop />}
                                    sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, borderColor: T.accent, color: T.accent }}
                                    onClick={() => setDialog({ type: 'submit', title: 'Submit for Approval', body: 'This will lock the PO and send it for management review. Proceed?' })}>
                                    Submit for Approval
                                </Button>
                            )}

                            {isPending && canApprove && (
                                <>
                                    <Button variant="contained" size="small" color="success" disableElevation startIcon={<CheckCircle />}
                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700 }}
                                        onClick={() => setDialog({ type: 'approve', title: 'Approve Purchase Order', body: 'Are you sure you want to approve this purchase order?' })}>
                                        Approve PO
                                    </Button>
                                    <Button variant="outlined" size="small" color="error" startIcon={<Cancel />}
                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
                                        onClick={() => setDialog({ type: 'reject', title: 'Reject Purchase Order', body: 'Please specify the reason for rejection:', input: 'Rejection Reason' })}>
                                        Reject PO
                                    </Button>
                                </>
                            )}

                            {isApproved && formik.values.status !== 'SENT' && (
                                <Button variant="contained" size="small" disableElevation startIcon={<Send />}
                                    sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, background: '#0891b2' }}
                                    onClick={() => setDialog({ type: 'send', title: 'Send to Vendor', body: 'Confirm that this PO has been officially sent to the vendor.' })}>
                                    Mark as Sent
                                </Button>
                            )}

                            {isEdit && isApproved && (
                                <>
                                    <Button variant="outlined" size="small" startIcon={<Email />}
                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, borderColor: '#93c5fd', color: '#2563eb', bgcolor: '#eff6ff' }}
                                        onClick={() => setSendChannel('EMAIL')}>
                                        Email PO
                                    </Button>
                                    <Button variant="outlined" size="small" startIcon={<WhatsApp />}
                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, borderColor: '#86efac', color: '#16a34a', bgcolor: '#f0fdf4' }}
                                        onClick={() => setSendChannel('WHATSAPP')}>
                                        WhatsApp
                                    </Button>
                                </>
                            )}

                            {(formik.values.status === 'RECEIVED' || formik.values.status === 'PARTIALLY_RECEIVED') && (
                                <Button variant="contained" size="small" disableElevation startIcon={<CheckCircle />}
                                    sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, background: '#16a34a' }}
                                    onClick={() => setDialog({
                                        type: 'complete',
                                        title: 'Mark as Completed',
                                        body: missingEssential > 0
                                            ? `⚠️ ${missingEssential} essential document${missingEssential > 1 ? 's are' : ' is'} still pending in the Documents tab. You can still complete, but it is recommended to upload them first.`
                                            : 'Mark this purchase order as fully invoiced and closed?',
                                    })}>
                                    Mark as Completed
                                </Button>
                            )}

                            {isDraft && (
                                <Tooltip title="Refresh GST and re-calculate all taxes">
                                    <Button variant="outlined" size="small" startIcon={<Refresh />}
                                        disabled={actionLoading}
                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, borderColor: T.rule, color: T.ink2 }}
                                        onClick={handleRecalculate}>
                                        Recalculate Taxes
                                    </Button>
                                </Tooltip>
                            )}

                            <Box sx={{ flexGrow: 1 }} />

                            {!isCompleted && canApprove && (
                                <Button variant="text" size="small" color="error" startIcon={<Cancel />}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                    onClick={() => setDialog({ type: 'cancel', title: 'Cancel Purchase Order', body: 'This will permanently cancel this order. Reason:', input: 'Cancellation Reason' })}>
                                    Cancel Order
                                </Button>
                            )}

                            {isDraft && canApprove && (
                                <Button variant="text" size="small" color="error" startIcon={<Delete />}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                    onClick={() => setDialog({ type: 'delete', title: 'Delete Draft', body: 'Permanently delete this draft purchase order? This action is irreversible.' })}>
                                    Delete
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Main content area */}
                <Grid container spacing={3}>
                    <Grid item xs={12} lg={9}>
                        <Paper elevation={0} sx={{ border: `1px solid ${T.rule}`, borderRadius: 2, overflow: 'hidden', bgcolor: 'white' }}>
                            <Tabs value={tab} onChange={(_, v) => setTab(v)}
                                sx={{ borderBottom: `1px solid ${T.rule}`, bgcolor: T.accentDim, minHeight: 48 }}
                                TabIndicatorProps={{ style: { background: T.accent, height: 3 } }}>
                                <Tab label="Basic Details" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, minHeight: 48, color: T.accent }} />
                                <Tab label={`Items & Quantities (${formik.values.items?.length ?? 0})`}
                                    sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, minHeight: 48, color: T.accent }} />
                                <Tab label="GST & Financials" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, minHeight: 48, color: T.accent }} />
                                {isEdit && ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED'].includes(formik.values.status) && (
                                    <Tab label={
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <span>Receive Items</span>
                                            {formik.values.status === 'PARTIALLY_RECEIVED' && (
                                                <Chip label="Partial" size="small"
                                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e', ml: 0.5 }} />
                                            )}
                                        </Stack>
                                    } sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, minHeight: 48, color: T.accent }} />
                                )}
                                {isEdit && (
                                    <Tab label={
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <span>Documents</span>
                                            {missingEssential > 0 && (
                                                <Chip label={missingEssential} size="small"
                                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e', ml: 0.5 }} />
                                            )}
                                        </Stack>
                                    } sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, minHeight: 48, color: T.accent }} />
                                )}
                            </Tabs>

                            <Box sx={{ p: tab === 3 && isEdit && ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(formik.values.status) ? 0 : 3 }}>
                                {tab === 0 && <POBasicTab formik={formik} isEdit={isEdit} readOnly={readOnly} />}
                                {tab === 1 && <POLineItemsTab formik={formik} readOnly={readOnly} />}
                                {tab === 2 && <POTaxSummaryTab formik={formik} />}
                                {(() => {
                                    const hasReceiveTab = isEdit && ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED'].includes(formik.values.status);
                                    const receiveTabIdx = 3;
                                    const docsTabIdx = hasReceiveTab ? 4 : 3;
                                    return (
                                        <>
                                            {hasReceiveTab && tab === receiveTabIdx && (
                                                <POReceiveTab
                                                    po={formik.values}
                                                    poId={id ? Number(id) : null}
                                                    onReceived={() => {
                                                        if (id) getPurchaseOrder(id).then(applyServerData);
                                                    }}
                                                />
                                            )}
                                            {tab === docsTabIdx && isEdit && (
                                                <DocumentChecklist
                                                    entityType="PURCHASE_ORDER"
                                                    entityId={id ? Number(id) : null}
                                                    readOnly={isCompleted || isCancelled}
                                                    onMissing={setMissingEssential}
                                                />
                                            )}
                                        </>
                                    );
                                })()}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Summary Sidebar */}
                    <Grid item xs={12} lg={3}>
                        <Stack spacing={3}>
                            <Paper elevation={0} sx={{ p: 3, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: 'white' }}>
                                <Typography sx={{ fontSize: '0.7rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                                    Order Summary
                                </Typography>
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Subtotal</Typography>
                                        <Typography sx={{ fontWeight: 600 }}>₹{formik.values.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Total Tax</Typography>
                                        <Typography sx={{ fontWeight: 600 }}>₹{(formik.values.cgstAmount + formik.values.sgstAmount + formik.values.igstAmount)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                    </Stack>
                                    {formik.values.roundOff !== 0 && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography sx={{ color: T.ink2, fontSize: '0.85rem' }}>Round Off</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>₹{formik.values.roundOff?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                        </Stack>
                                    )}
                                    <Divider sx={{ my: 1 }} />
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>Grand Total</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: T.accent }}>
                                            ₹{formik.values.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: '#f8fafc' }}>
                                <Typography sx={{ fontSize: '0.7rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                                    Notes & Remarks
                                </Typography>
                                <Typography sx={{ fontSize: '0.8rem', color: '#1e293b', fontStyle: 'italic' }}>
                                    {formik.values.remarks || 'No remarks provided.'}
                                </Typography>
                            </Paper>

                            {isEdit && (
                                <Paper elevation={0} sx={{ p: 2, border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: 'white' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: T.ink2, fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                                        Related Documents
                                    </Typography>
                                    <Stack spacing={1}>
                                        <Button fullWidth variant="outlined" size="small" disableElevation
                                            onClick={() => navigate(`/purchase/${id}/invoices`)}
                                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: T.rule, color: T.ink, justifyContent: 'flex-start', fontSize: '0.82rem' }}>
                                            Vendor Invoices
                                        </Button>
                                        <Button fullWidth variant="outlined" size="small" disableElevation
                                            onClick={() => navigate('/purchase/debit-notes')}
                                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: T.rule, color: T.ink, justifyContent: 'flex-start', fontSize: '0.82rem' }}>
                                            Debit Notes
                                        </Button>
                                    </Stack>
                                </Paper>
                            )}

                            {(formik.values.quotationNumber || formik.values.quotationDate) && (
                                <Paper elevation={0} sx={{ p: 2, border: `1px solid #bfdbfe`, borderRadius: 2, bgcolor: '#eff6ff' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                                        Quotation Reference
                                    </Typography>
                                    {formik.values.quotationNumber && (
                                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                            <Typography sx={{ fontSize: '0.78rem', color: T.ink2 }}>Quotation No.</Typography>
                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{formik.values.quotationNumber}</Typography>
                                        </Stack>
                                    )}
                                    {formik.values.quotationDate && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography sx={{ fontSize: '0.78rem', color: T.ink2 }}>Quotation Date</Typography>
                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                                {new Date(formik.values.quotationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Paper>
                            )}

                            {formik.values.sentToVendorAt && (
                                <Paper elevation={0} sx={{ p: 2, border: `1px solid #bbf7d0`, borderRadius: 2, bgcolor: '#f0fdf4' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                                        Email History
                                    </Typography>
                                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                        <Typography sx={{ fontSize: '0.78rem', color: T.ink2 }}>Last Sent</Typography>
                                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                            {new Date(formik.values.sentToVendorAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </Typography>
                                    </Stack>
                                    {formik.values.sentToVendorEmail && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography sx={{ fontSize: '0.78rem', color: T.ink2 }}>To</Typography>
                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, wordBreak: 'break-all', textAlign: 'right', maxWidth: '65%' }}>
                                                {formik.values.sentToVendorEmail}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Paper>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            {/* Send PO dialogs */}
            {sendChannel && (
                <SendPODialog
                    open={!!sendChannel}
                    channel={sendChannel}
                    po={formik.values}
                    onClose={() => setSendChannel(null)}
                    onSent={(updated) => {
                        applyServerData(updated);
                        setSendChannel(null);
                    }}
                />
            )}

            {/* Confirm dialogs */}
            <ConfirmDialog
                open={!!dialog}
                title={dialog?.title ?? ''}
                body={dialog?.body ?? ''}
                input={dialog?.input}
                loading={actionLoading}
                onClose={() => setDialog(null)}
                onConfirm={async (reason) => {
                    const t = dialog?.type;
                    if (t === 'submit')   await runAction(() => submitPurchaseOrder(id), 'Submit');
                    if (t === 'approve')  await runAction(() => approvePurchaseOrder(id), 'Approve');
                    if (t === 'reject')   await runAction(() => rejectPurchaseOrder(id, reason), 'Reject');
                    if (t === 'send')     await runAction(() => sendPurchaseOrder(id), 'Send');
                    if (t === 'complete') await runAction(() => completePurchaseOrder(id), 'Complete');
                    if (t === 'cancel')   await runAction(() => cancelPurchaseOrder(id, reason), 'Cancel');
                    if (t === 'delete') {
                        setActionLoading(true);
                        try {
                            await deletePurchaseOrder(id);
                            navigate('..', { replace: true });
                        } finally {
                            setActionLoading(false);
                            setDialog(null);
                        }
                    }
                }}
            />
        </Box>
    );
}
