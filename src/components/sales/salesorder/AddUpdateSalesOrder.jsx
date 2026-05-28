import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
    Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
    Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Divider, Grid, IconButton, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Alert,
    Avatar, MenuItem, Menu,
} from '@mui/material';
import {
    Add, ArrowBack, Save, ShoppingCart, Business, AccountBalance,
    LocalShipping, DeleteOutline, CheckCircle, Cancel, HourglassTop,
    Send, Refresh, Warning, History, Email, LocalShippingOutlined,
    Receipt, Payments, AssignmentTurnedIn, RequestQuote, PictureAsPdf,
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiService, { resolveApiErrorMessage } from '../../../services/apiService';
import { inventoryItemSearch, searchContacts, searchQuotations } from '../../../services/commonAPI';
import convertAddressToString from '../../../commonTools/convertAddress';
import {
    getSalesOrder, createSalesOrder, updateSalesOrder,
    submitSalesOrder, approveSalesOrder, rejectSalesOrder,
    sendSalesOrder, cancelSalesOrder, completeSalesOrder,
    recalculateSalesOrder, deleteSalesOrder, getNextSONumber,
    createTaxInvoice, getNextInvoiceNumber,
    getTaxInvoicesBySalesOrder, listDeliveryNotes, getSalesOrderProfitability,
    getPaymentsForOrder, downloadSOPdf, downloadOrderAcknowledgement, downloadProformaInvoice,
} from '../../../services/salesOrderService';
import SendSalesOrderDialog from './SendSalesOrderDialog';
import RecordPaymentDialog from './RecordPaymentDialog';

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

const STATUS_STYLE = {
    DRAFT:                { color: '#64748b', bg: '#f8fafc' },
    APPROVED:             { color: '#2563eb', bg: '#eff6ff' },
    IN_PROGRESS:          { color: '#7c3aed', bg: '#f5f3ff' },
    PARTIALLY_DISPATCHED: { color: '#d97706', bg: '#fffbeb' },
    FULLY_DISPATCHED:     { color: '#059669', bg: '#ecfdf5' },
    INVOICED:             { color: '#0891b2', bg: '#ecfeff' },
    COMPLETED:            { color: '#059669', bg: '#ecfdf5' },
    CANCELLED:            { color: '#dc2626', bg: '#fef2f2' },
};

const APPROVAL_STYLE = {
    DRAFT:            { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
    PENDING_APPROVAL: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    APPROVED:         { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
    REJECTED:         { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

const parseNum = (v) => parseFloat(v) || 0;

const AddUpdateSalesOrder = ({ onSave }) => {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { orderId } = useParams();
    const isEdit     = Boolean(orderId);
    const debounce   = useRef(null);

    const [loading, setLoading]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError]               = useState(null);
    const [dialog, setDialog]             = useState(null);  // { type, title, body, input? }
    const [dialogInput, setDialogInput]   = useState('');
    const [sendDialogOpen, setSendDialogOpen] = useState(false);

    const [invoiceDialog, setInvoiceDialog] = useState(false);
    const [invoiceForm, setInvoiceForm]     = useState({ invoiceDate: new Date().toISOString().split('T')[0], dueDate: '' });
    const [invoiceNextNum, setInvoiceNextNum] = useState('');
    const [invoiceSaving, setInvoiceSaving] = useState(false);
    const [invoiceError, setInvoiceError]   = useState(null);

    const [contactOptions, setContactOptions]     = useState([]);
    const [quotationOptions, setQuotationOptions] = useState([]);
    const [productOptions, setProductOptions]     = useState([]);

    const [linkedInvoices, setLinkedInvoices] = useState([]);
    const [linkedChallans, setLinkedChallans] = useState([]);
    
    const [profitability, setProfitability] = useState(null);

    const [invAnchor, setInvAnchor] = useState(null);
    const [dnAnchor, setDnAnchor] = useState(null);

    const [payments, setPayments]               = useState([]);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: 0,
            orderNumber: '',
            orderDate: new Date().toISOString().split('T')[0],
            contact: null,
            quotation: null,
            items: [],
            currency: 'INR',
            taxType: 'CGST_SGST',
            placeOfSupply: '',
            placeOfSupplyStateCode: '',
            poNumber: '',
            poDate: '',
            deliveryAddress: '',
            dispatchThrough: '',
            transportMode: '',
            deliveryDate: '',
            remarks: '',
            discountPercentage: 0,
            freightAndForwardingCharges: 0,
            includeFreightCharges: false,
            subTotal: 0,
            taxableValue: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalPayableAmount: 0,
            discountAmount: 0,
            roundOffAmount: 0,
            status: 'DRAFT',
            approvalStatus: 'DRAFT',
            approvedBy: null,
            approvedDate: null,
            rejectionReason: null,
            sentToCustomerAt: null,
            revisionNo: 0,
        },
        validationSchema: Yup.object({
            contact:   Yup.object().nullable().required('Customer is required'),
            orderDate: Yup.date().required('Order date is required'),
            items:     Yup.array().min(1, 'At least one item is required'),
        }),
        onSubmit: async (values) => {
            setSaving(true);
            setError(null);
            try {
                const payload = buildPayload(values);
                let res;
                if (isEdit) {
                    res = await updateSalesOrder(orderId, payload);
                } else {
                    res = await createSalesOrder(payload);
                }
                applyServerData(res);
                if (!isEdit) navigate(`/sales/sales-order/edit/${res.id}`);
            } catch (e) {
                setError(resolveApiErrorMessage(e, 'Failed to save sales order.'));
            } finally {
                setSaving(false);
            }
        },
    });

    // ── Live tax calculation ──────────────────────────────────────────────────
    useEffect(() => {
        const items   = formik.values.items || [];
        const isIntra = formik.values.taxType === 'CGST_SGST';
        const gDisc   = parseNum(formik.values.discountPercentage);
        let sub = 0, cgst = 0, sgst = 0, igst = 0;

        items.forEach(item => {
            const gross   = parseNum(item.qty) * parseNum(item.pricePerUnit);
            const taxable = gross * (1 - gDisc / 100);
            const gst     = parseNum(item.gstRatePct);
            sub  += gross;
            if (isIntra) {
                cgst += taxable * (gst / 2) / 100;
                sgst += taxable * (gst / 2) / 100;
            } else {
                igst += taxable * gst / 100;
            }
        });

        const gDiscAmt = sub * (gDisc / 100);
        const taxable  = sub - gDiscAmt;
        const freight  = parseNum(formik.values.freightAndForwardingCharges);
        const before   = taxable + cgst + sgst + igst + freight;
        const rounded  = Math.round(before);
        const roundOff = rounded - before;

        if (
            Math.abs(formik.values.totalPayableAmount - rounded) > 0.01 ||
            Math.abs(formik.values.cgstAmount - cgst) > 0.01 ||
            Math.abs(formik.values.sgstAmount - sgst) > 0.01 ||
            Math.abs(formik.values.igstAmount - igst) > 0.01 ||
            Math.abs(formik.values.discountAmount - gDiscAmt) > 0.01
        ) {
            formik.setFieldValue('subTotal',           sub,      false);
            formik.setFieldValue('discountAmount',      gDiscAmt, false);
            formik.setFieldValue('taxableValue',        taxable,  false);
            formik.setFieldValue('cgstAmount',          cgst,     false);
            formik.setFieldValue('sgstAmount',          sgst,     false);
            formik.setFieldValue('igstAmount',          igst,     false);
            formik.setFieldValue('totalPayableAmount',  rounded,  false);
            formik.setFieldValue('roundOffAmount',      roundOff, false);
        }
    }, [formik.values.items, formik.values.taxType, formik.values.discountPercentage, formik.values.freightAndForwardingCharges]);

    // ── Load order ────────────────────────────────────────────────────────────
    const applyServerData = (data) => {
        formik.setValues({
            id: data.id ?? 0,
            orderNumber: data.orderNumber ?? '',
            orderDate:   data.orderDate ?? new Date().toISOString().split('T')[0],
            contact:     data.contact
                ?? (data.customerId ? { id: data.customerId, contactId: data.customerId, companyName: data.customerName } : null),
            quotation:   data.quotation
                ?? (data.quotationId ? { id: data.quotationId, qtnNo: data.quotationNumber } : null),
            items:       (data.items ?? []).map(i => ({
                id: i.id,
                inventoryItem:      i.inventoryItem,
                qty:                i.qty ?? 0,
                pricePerUnit:       i.pricePerUnit ?? 0,
                discountPercentage: i.discountPercentage ?? 0,
                gstRatePct:         i.cgstRate != null ? (parseNum(i.cgstRate) + parseNum(i.sgstRate || 0)) || parseNum(i.igstRate) : (i.gstRatePct ?? 18),
                hsnCode:            i.hsnCode ?? '',
                unitPriceAfterDiscount: i.unitPriceAfterDiscount ?? 0,
                totalAmountOfProduct:   i.totalAmountOfProduct ?? 0,
                cgstAmount: i.cgstAmount ?? 0,
                sgstAmount: i.sgstAmount ?? 0,
                igstAmount: i.igstAmount ?? 0,
            })),
            currency:    data.currency    ?? 'INR',
            taxType:     data.taxType     ?? 'CGST_SGST',
            placeOfSupply:          data.placeOfSupply ?? '',
            placeOfSupplyStateCode: data.placeOfSupplyStateCode ?? '',
            poNumber:    data.poNumber    ?? '',
            poDate:      data.poDate      ?? '',
            deliveryAddress:        data.deliveryAddress ?? '',
            dispatchThrough:        data.dispatchThrough ?? '',
            transportMode:          data.transportMode ?? '',
            deliveryDate:           data.deliveryDate ?? '',
            remarks:     data.remarks ?? '',
            discountPercentage:     data.discountPercentage ?? 0,
            freightAndForwardingCharges: data.freightAndForwardingCharges ?? 0,
            includeFreightCharges:  data.includeFreightCharges ?? false,
            subTotal:    data.subTotal    ?? 0,
            taxableValue: data.taxableValue ?? 0,
            cgstAmount:  data.cgstAmount  ?? 0,
            sgstAmount:  data.sgstAmount  ?? 0,
            igstAmount:  data.igstAmount  ?? 0,
            totalPayableAmount: data.totalPayableAmount ?? 0,
            roundOffAmount:     data.roundOffAmount ?? 0,
            status:           data.status          ?? 'DRAFT',
            approvalStatus:   data.approvalStatus  ?? 'DRAFT',
            approvedBy:       data.approvedBy      ?? null,
            approvedDate:     data.approvedDate    ?? null,
            rejectionReason:  data.rejectionReason ?? null,
            sentToCustomerAt: data.sentToCustomerAt ?? null,
            revisionNo:       data.revisionNo      ?? 0,
        });
    };

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            getSalesOrder(orderId).then(applyServerData).catch(() => setError('Failed to load order.')).finally(() => setLoading(false));
            
            // Fetch linked documents
            getTaxInvoicesBySalesOrder(orderId).then(setLinkedInvoices).catch(() => {});
            listDeliveryNotes({ salesOrderId: orderId }).then(res => setLinkedChallans(res.content || [])).catch(() => {});
            
            // Fetch profitability (only works for authorized roles)
            getSalesOrderProfitability(orderId).then(setProfitability).catch(() => {});

            // Fetch advance payments
            getPaymentsForOrder(orderId).then(setPayments).catch(() => {});
        } else {
            getNextSONumber().then(n => formik.setFieldValue('orderNumber', n)).catch(() => {});
            
            // Handle prefill from Quotation
            if (location.state?.prefillQuotationId) {
                setLoading(true);
                apiService.get(`/quotation/${location.state.prefillQuotationId}`)
                    .then(q => {
                        formik.setFieldValue('quotation', q);
                        if (q.enquiry?.contact) {
                            formik.setFieldValue('contact', q.enquiry.contact);
                            if (q.enquiry.contact.addresses?.length > 0) {
                                formik.setFieldValue('deliveryAddress', convertAddressToString(q.enquiry.contact.addresses[0]));
                            }
                        }
                        if (q.quotationProducts) {
                            formik.setFieldValue('items', q.quotationProducts.map(p => ({
                                inventoryItem: p.inventoryItem,
                                qty: p.qty || 1,
                                pricePerUnit: p.pricePerUnit || 0,
                                discountPercentage: p.discountPercentage || 0,
                                gstRatePct: q.gstPercentage || 18,
                                hsnCode: p.inventoryItem?.hsnCode || '',
                            })));
                        }
                        formik.setFieldValue('discountPercentage', q.discountPercentage || 0);
                    })
                    .catch(() => setError('Failed to load prefilled quotation.'))
                    .finally(() => setLoading(false));
            }
        }
    }, [orderId, isEdit, location.state]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const buildPayload = (v) => ({
        customerId:   v.contact?.id ?? v.contact?.contactId,
        quotationId:  v.quotation?.id ?? null,
        orderDate:    v.orderDate,
        currency:     v.currency,
        taxType:      v.taxType,
        placeOfSupply:          v.placeOfSupply,
        placeOfSupplyStateCode: v.placeOfSupplyStateCode,
        paymentTerms: v.paymentTerms,
        incoterms:    v.incoterms,
        poNumber:     v.poNumber,
        poDate:       v.poDate || null,
        deliveryAddress:     v.deliveryAddress,
        dispatchThrough:     v.dispatchThrough,
        transportMode:       v.transportMode,
        deliveryDate:        v.deliveryDate || null,
        remarks:             v.remarks,
        discountPercentage:  parseFloat(v.discountPercentage) || 0,
        taxPercentage:       0,
        freightAndForwardingCharges: parseFloat(v.freightAndForwardingCharges) || 0,
        includeFreightCharges: v.includeFreightCharges,
        items: (v.items ?? []).map(i => ({
            inventoryItem:      i.inventoryItem,
            qty:                parseFloat(i.qty) || 0,
            pricePerUnit:       parseFloat(i.pricePerUnit) || 0,
            discountPercentage: parseFloat(i.discountPercentage) || 0,
            gstRatePct:         parseFloat(i.gstRatePct) || 0,
            hsnCode:            i.hsnCode || '',
        })),
    });

    const handleSearch = (type, value) => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(async () => {
            if (type === 'contact')   setContactOptions(await searchContacts(value));
            if (type === 'quotation') setQuotationOptions(await searchQuotations(value));
            if (type === 'product')   setProductOptions(await inventoryItemSearch(value));
        }, 400);
    };

    const addItem = () => formik.setFieldValue('items', [...formik.values.items,
        { inventoryItem: null, qty: 1, pricePerUnit: 0, gstRatePct: 18, hsnCode: '' }]);

    const removeItem = (i) => {
        const updated = [...formik.values.items];
        updated.splice(i, 1);
        formik.setFieldValue('items', updated);
    };

    const runAction = async (fn, label) => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fn();
            if (res) applyServerData(res);
        } catch (e) {
            setError(resolveApiErrorMessage(e, `${label} failed.`));
        } finally {
            setActionLoading(false);
            setDialog(null);
            setDialogInput('');
        }
    };

    const confirmDialog = () => {
        const t = dialog?.type;
        if (t === 'submit')   runAction(() => submitSalesOrder(orderId),           'Submit');
        if (t === 'approve')  runAction(() => approveSalesOrder(orderId),          'Approve');
        if (t === 'reject')   runAction(() => rejectSalesOrder(orderId, dialogInput), 'Reject');
        if (t === 'cancel')   runAction(() => cancelSalesOrder(orderId, dialogInput), 'Cancel');
        if (t === 'complete') runAction(() => completeSalesOrder(orderId),         'Complete');
        if (t === 'delete')   runAction(async () => { await deleteSalesOrder(orderId); navigate('/sales/sales-order'); }, 'Delete');
    };

    const handleCreateInvoice = async () => {
        setInvoiceSaving(true);
        setInvoiceError(null);
        try {
            const res = await createTaxInvoice({
                salesOrderId: orderId,
                invoiceDate:  invoiceForm.invoiceDate,
                dueDate:      invoiceForm.dueDate || null,
                invoiceNumber: invoiceForm.invoiceNumber || null,
            });
            setInvoiceDialog(false);
            navigate(`/sales/sales-order/invoices/view/${res.id}`);
        } catch (e) {
            setInvoiceError(resolveApiErrorMessage(e, 'Failed to create invoice.'));
        } finally {
            setInvoiceSaving(false);
        }
    };

    // ── Derived state ─────────────────────────────────────────────────────────
    const isDraft      = ['DRAFT', 'REJECTED'].includes(formik.values.approvalStatus);
    const isPending    = formik.values.approvalStatus === 'PENDING_APPROVAL';
    const isApproved   = formik.values.approvalStatus === 'APPROVED';
    const isCancelled  = formik.values.status === 'CANCELLED';
    const isCompleted  = formik.values.status === 'COMPLETED';
    const isDispatched = ['FULLY_DISPATCHED','INVOICED','COMPLETED'].includes(formik.values.status);
    const readOnly     = !isDraft || isCancelled || isCompleted;

    const ss = STATUS_STYLE[formik.values.status]          ?? STATUS_STYLE.DRAFT;
    const as = APPROVAL_STYLE[formik.values.approvalStatus] ?? APPROVAL_STYLE.DRAFT;

    const SectionHeader = ({ icon, title, subtitle }) => (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: `${T.primary}15`, color: T.primary, width: 40, height: 40, borderRadius: 2 }}>{icon}</Avatar>
            <Box>
                <Typography sx={{ fontWeight: 900, color: T.text, fontSize: '1rem', lineHeight: 1.2 }}>{title}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: T.textSec, fontWeight: 500 }}>{subtitle}</Typography>
            </Box>
        </Stack>
    );

    if (loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2, bgcolor: T.bg }}>
            <CircularProgress size={48} thickness={4} />
            <Typography sx={{ fontWeight: 800, color: T.textSec }}>Loading Sales Order...</Typography>
        </Box>
    );

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
            {/* ── Hero Header ── */}
            <Box sx={{ 
                bgcolor: '#0f172a', 
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                color: 'white', pt: 6, pb: 15
            }}>
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Tooltip title="Exit to Hub">
                                <IconButton onClick={() => navigate('/sales/sales-order')} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                                    {isEdit ? `Order #${formik.values.orderNumber}` : 'New Sales Order'}
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Chip label={formik.values.status?.replace(/_/g, ' ')} size="small"
                                        sx={{ fontSize: '0.65rem', fontWeight: 900, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', height: 22, textTransform: 'uppercase' }} />
                                    {isEdit && (
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                            Revision {formik.values.revisionNo}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            {isDraft && !isCancelled && (
                                <Button variant="contained" disableElevation disabled={saving}
                                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                                    sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 3, bgcolor: T.primary, px: 4, '&:hover': { bgcolor: '#1d4ed8' } }}
                                    onClick={() => formik.submitForm()}>
                                    {saving ? 'Saving...' : 'Save Sales Order'}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -8 }}>
                {error && <Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ mb: 4, borderRadius: 4, fontWeight: 700 }}>{error}</Alert>}

                <Grid container spacing={4}>
                    {/* ── Main Document Registry ── */}
                    <Grid item xs={12} lg={9}>
                        <Stack spacing={4}>
                            
                            {/* Status Workflow Ribbon */}
                            {isEdit && !isCancelled && (
                                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {isDraft && (
                                            <Button size="small" variant="outlined" startIcon={<HourglassTop />}
                                                sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', borderColor: T.primary, color: T.primary }}
                                                onClick={() => setDialog({ type: 'submit', title: 'Finalize Order', body: 'Submit this order for approval? It will be locked for editing.' })}>
                                                Submit for Approval
                                            </Button>
                                        )}
                                        {isPending && (
                                            <>
                                                <Button size="small" variant="contained" color="success" disableElevation startIcon={<CheckCircle />}
                                                    sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none' }}
                                                    onClick={() => setDialog({ type: 'approve', title: 'Approve Order', body: 'This will authorize the order and reserve inventory.' })}>
                                                    Approve
                                                </Button>
                                                <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                                                    sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none' }}
                                                    onClick={() => setDialog({ type: 'reject', title: 'Reject Order', body: 'Reason for rejection:', input: 'Rejection Reason' })}>
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                        {isApproved && !isCompleted && (
                                            <Button size="small" variant="contained" disableElevation startIcon={<Send />}
                                                sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', bgcolor: '#0891b2' }}
                                                onClick={() => setSendDialogOpen(true)}>
                                                {formik.values.sentToCustomerAt ? 'Resend to Customer' : 'Send to Customer'}
                                            </Button>
                                        )}
                                        {isApproved && !isDispatched && (
                                            <Button size="small" variant="outlined" startIcon={<LocalShippingOutlined />}
                                                sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', color: T.success, borderColor: T.success }}
                                                onClick={() => navigate(`/sales/sales-order/delivery-notes/add?soId=${orderId}`)}>
                                                Create Dispatch
                                            </Button>
                                        )}
                                        {(formik.values.status === 'FULLY_DISPATCHED' || formik.values.status === 'APPROVED') && (
                                            <Button size="small" variant="outlined" startIcon={<Receipt />}
                                                sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', color: '#7c3aed', borderColor: '#7c3aed' }}
                                                onClick={() => {
                                                    setInvoiceError(null);
                                                    setInvoiceForm({ 
                                                        invoiceDate: new Date().toISOString().split('T')[0], 
                                                        dueDate: '', 
                                                        invoiceNumber: '' 
                                                    });
                                                    getNextInvoiceNumber().then(n => setInvoiceNextNum(n)).catch(() => {});
                                                    setInvoiceDialog(true);
                                                }}>
                                                Create Invoice
                                            </Button>
                                        )}
                                        {isEdit && !isCancelled && (
                                            <Button size="small" variant="outlined" startIcon={<Payments />}
                                                sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', color: '#059669', borderColor: '#059669' }}
                                                onClick={() => setPaymentDialogOpen(true)}>
                                                Record Payment
                                            </Button>
                                        )}
                                        <Box sx={{ flexGrow: 1 }} />
                                        {!isCompleted && (
                                            <Button size="small" color="error" startIcon={<Cancel />} sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none' }}
                                                onClick={() => setDialog({ type: 'cancel', title: 'Cancel Order', body: 'Reason for cancellation:', input: 'Reason' })}>
                                                Void Order
                                            </Button>
                                        )}
                                    </Stack>
                                </Paper>
                            )}

                            {/* Main Form Content */}
                            <Paper elevation={0} sx={{ p: 5, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                <SectionHeader icon={<Business />} title="Entity Details" subtitle="Client identification and order reference" />
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={6}>
                                        <Autocomplete options={contactOptions} getOptionLabel={(o) => o?.companyName || ''}
                                            value={formik.values.contact}
                                            onInputChange={(_, v) => handleSearch('contact', v)}
                                            onChange={(_, v) => {
                                                formik.setFieldValue('contact', v);
                                                if (v?.addresses?.length > 0)
                                                    formik.setFieldValue('deliveryAddress', convertAddressToString(v.addresses[0]));
                                            }}
                                            disabled={readOnly}
                                            renderInput={(p) => <TextField {...p} label="Select Customer *" error={Boolean(formik.errors.contact)} helperText={formik.errors.contact} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Autocomplete options={quotationOptions} getOptionLabel={(o) => o?.qtnNo || ''}
                                            value={formik.values.quotation}
                                            onInputChange={(_, v) => handleSearch('quotation', v)}
                                            onChange={async (_, v) => {
                                                formik.setFieldValue('quotation', v);
                                                if (v?.quotationProducts) {
                                                    formik.setFieldValue('items', v.quotationProducts.map(p => ({
                                                        inventoryItem: p.inventoryItem, qty: p.qty,
                                                        pricePerUnit: p.pricePerUnit,
                                                        gstRatePct: 18, hsnCode: p.inventoryItem?.hsnCode || '',
                                                    })));
                                                }
                                            }}
                                            disabled={readOnly}
                                            renderInput={(p) => <TextField {...p} label="Link Reference Quotation" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Order Date" name="orderDate" value={formik.values.orderDate} onChange={formik.handleChange} InputLabelProps={{ shrink: true }} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                    <Grid item xs={12} md={3}><TextField fullWidth label="Client PO#" name="poNumber" value={formik.values.poNumber} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                    <Grid item xs={12} md={3}><TextField fullWidth type="date" label="PO Date" name="poDate" value={formik.values.poDate} onChange={formik.handleChange} InputLabelProps={{ shrink: true }} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                    <Grid item xs={12} md={3}><TextField fullWidth label="Currency" name="currency" value={formik.values.currency} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                </Grid>

                                <Divider sx={{ my: 5, borderStyle: 'dashed' }} />

                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                                    <SectionHeader icon={<ShoppingCart />} title="Order Manifest" subtitle={`Line item breakdown (${formik.values.items.length} positions)`} />
                                    {!readOnly && (
                                        <Button variant="outlined" startIcon={<Add />} onClick={addItem} sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>
                                            Add Row
                                        </Button>
                                    )}
                                </Stack>
                                
                                <TableContainer sx={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: T.bg }}>
                                            <TableRow>
                                                {['Item Specification', 'HSN', 'Quantity', 'Rate', 'GST', 'Subtotal', ''].map(h => (
                                                    <TableCell key={h} sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', py: 2 }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formik.values.items.map((item, idx) => (
                                                <TableRow key={idx} sx={{ '&:hover': { bgcolor: `${T.bg}50` } }}>
                                                    <TableCell sx={{ width: '35%', py: 2 }}>
                                                        <Autocomplete options={productOptions} getOptionLabel={(o) => o.name || ''}
                                                            value={item.inventoryItem}
                                                            onInputChange={(_, v) => handleSearch('product', v)}
                                                            onChange={(_, v) => {
                                                                const u = [...formik.values.items];
                                                                u[idx] = { 
                                                                    ...u[idx], 
                                                                    inventoryItem: v, 
                                                                    pricePerUnit: v?.productFinanceSettings?.sellingPrice || 0, 
                                                                    gstRatePct: v?.productFinanceSettings?.gstRate || 18,
                                                                    hsnCode: v?.hsnCode || '' 
                                                                };
                                                                formik.setFieldValue('items', u);
                                                            }}
                                                            disabled={readOnly}
                                                            renderInput={(p) => <TextField {...p} size="small" placeholder="Find Product..." variant="standard" sx={{ '& .MuiInput-root': { fontWeight: 700 } }} />}
                                                        />
                                                    </TableCell>
                                                    <TableCell><TextField variant="standard" value={item.hsnCode} disabled={readOnly} sx={{ width: 70 }} /></TableCell>
                                                    <TableCell><TextField variant="standard" type="number" value={item.qty} disabled={readOnly} onChange={(e) => { const u = [...formik.values.items]; u[idx].qty = e.target.value; formik.setFieldValue('items', u); }} inputProps={{ style: { textAlign: 'center', fontWeight: 700 } }} sx={{ width: 60 }} /></TableCell>
                                                    <TableCell><TextField variant="standard" type="number" value={item.pricePerUnit} disabled={readOnly} onChange={(e) => { const u = [...formik.values.items]; u[idx].pricePerUnit = e.target.value; formik.setFieldValue('items', u); }} inputProps={{ style: { textAlign: 'right', fontWeight: 700 } }} sx={{ width: 80 }} /></TableCell>
                                                    <TableCell><TextField variant="standard" type="number" value={item.gstRatePct} disabled={readOnly} sx={{ width: 50 }} inputProps={{ style: { textAlign: 'center' } }} /></TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900, color: T.text }}>
                                                        ₹{(parseNum(item.qty) * parseNum(item.pricePerUnit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {!readOnly && (
                                                            <IconButton size="small" onClick={() => removeItem(idx)} sx={{ color: T.error, bgcolor: `${T.error}10`, '&:hover': { bgcolor: `${T.error}20` } }}>
                                                                <DeleteOutline fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Divider sx={{ my: 5, borderStyle: 'dashed' }} />

                                <Grid container spacing={5}>
                                    <Grid item xs={12} md={6}>
                                        <SectionHeader icon={<LocalShipping />} title="Delivery & Dispatch" subtitle="Logistics and routing parameters" />
                                        <Stack spacing={3}>
                                            <TextField fullWidth multiline rows={3} label="Consignee Delivery Address" name="deliveryAddress" value={formik.values.deliveryAddress} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }} />
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}><TextField fullWidth label="Dispatch Through" name="dispatchThrough" value={formik.values.dispatchThrough} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                                <Grid item xs={6}><TextField fullWidth label="Transport Mode" name="transportMode" value={formik.values.transportMode} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                            </Grid>
                                            <TextField fullWidth multiline rows={2} label="Internal Remarks" name="remarks" value={formik.values.remarks} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }} />
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <SectionHeader icon={<AccountBalance />} title="Taxation Strategy" subtitle="GST treatment and supplemental charges" />
                                        <Stack spacing={3}>
                                            <TextField select fullWidth label="GST Treatment" name="taxType" value={formik.values.taxType} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                                <MenuItem value="CGST_SGST">Intra-State (CGST + SGST)</MenuItem>
                                                <MenuItem value="IGST">Inter-State (IGST)</MenuItem>
                                            </TextField>
                                            <Grid container spacing={2}>
                                                <Grid item xs={8}><TextField fullWidth label="Place of Supply" name="placeOfSupply" value={formik.values.placeOfSupply} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                                <Grid item xs={4}><TextField fullWidth label="Code" name="placeOfSupplyStateCode" value={formik.values.placeOfSupplyStateCode} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} /></Grid>
                                            </Grid>
                                            <TextField fullWidth label="Global Discount %" name="discountPercentage" type="number" value={formik.values.discountPercentage} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                            <TextField fullWidth label="Freight Charges (₹)" name="freightAndForwardingCharges" type="number" value={formik.values.freightAndForwardingCharges} onChange={formik.handleChange} disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Stack>
                    </Grid>

                    {/* ── Sidebar Analytics & Actions ── */}
                    <Grid item xs={12} lg={3}>
                        <Stack spacing={4} sx={{ position: 'sticky', top: 32 }}>
                            
                            {/* Summary Card */}
                            <Paper elevation={0} sx={{ borderRadius: 5, border: `1px solid ${T.border}`, overflow: 'hidden', bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                <Box sx={{ p: 4, bgcolor: T.text, color: 'white' }}>
                                    <Typography sx={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, mb: 1 }}>Grand Total</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}>₹{parseNum(formik.values.totalPayableAmount).toLocaleString('en-IN')}</Typography>
                                </Box>
                                <Box sx={{ p: 4 }}>
                                    <Stack spacing={2.5}>
                                        {[
                                            ['Net Taxable', formik.values.taxableValue],
                                            ['Tax Liability', parseNum(formik.values.cgstAmount) + parseNum(formik.values.sgstAmount) + parseNum(formik.values.igstAmount)],
                                            ['Adjustments', formik.values.roundOffAmount + parseNum(formik.values.freightAndForwardingCharges)],
                                        ].map(([label, val]) => (
                                            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 500 }}>{label}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 900, color: T.text }}>₹{parseNum(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                            </Box>
                                        ))}
                                        <Divider sx={{ my: 1 }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.7rem', textTransform: 'uppercase' }}>Fulfillment</Typography>
                                            <Chip label={formik.values.status} size="small" sx={{ borderRadius: 1.5, fontWeight: 900, fontSize: '0.65rem', bgcolor: `${T.primary}10`, color: T.primary }} />
                                        </Box>
                                    </Stack>
                                </Box>
                            </Paper>

                            {/* Profitability Card (Only visible to authorized roles) */}
                            {profitability && (
                                <Paper elevation={0} sx={{ borderRadius: 5, border: `1px solid ${T.border}`, overflow: 'hidden', bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Box sx={{ p: 3, bgcolor: '#0f172a', color: 'white' }}>
                                        <Typography sx={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, mb: 1 }}>Gross Profit</Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.03em', color: profitability.grossProfit >= 0 ? '#4ade80' : '#f87171' }}>
                                            ₹{parseNum(profitability.grossProfit).toLocaleString('en-IN')}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 3 }}>
                                        <Stack spacing={2}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 500 }}>Total Revenue</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 900, color: T.text }}>₹{parseNum(profitability.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 500 }}>Actual COGS</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 900, color: T.text }}>₹{parseNum(profitability.totalActualCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                            </Box>
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.7rem', textTransform: 'uppercase' }}>Margin</Typography>
                                                <Chip label={`${parseNum(profitability.grossMarginPercentage).toFixed(2)}%`} size="small" sx={{ borderRadius: 1.5, fontWeight: 900, fontSize: '0.65rem', bgcolor: profitability.grossMarginPercentage >= 0 ? '#dcfce7' : '#fee2e2', color: profitability.grossMarginPercentage >= 0 ? '#166534' : '#991b1b' }} />
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Paper>
                            )}

                            {/* Approval Status Card */}
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                <Typography sx={{ fontWeight: 900, mb: 3, color: T.text, fontSize: '1.1rem' }}>Approval Flow</Typography>
                                <Stack spacing={3}>
                                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: `${as.bg}`, border: `1px solid ${as.border}` }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar sx={{ bgcolor: as.color, width: 32, height: 32 }}>
                                                {formik.values.approvalStatus === 'APPROVED' ? <CheckCircle sx={{ fontSize: 20 }} /> : <History sx={{ fontSize: 20 }} />}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', color: as.color }}>{formik.values.approvalStatus.replace(/_/g, ' ')}</Typography>
                                                <Typography sx={{ fontSize: '0.7rem', color: T.textSec }}>{formik.values.approvedBy ? `By ${formik.values.approvedBy}` : 'Pending review'}</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                    {formik.values.rejectionReason && (
                                        <Alert severity="error" icon={<Cancel />} sx={{ borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 }}>
                                            {formik.values.rejectionReason}
                                        </Alert>
                                    )}
                                </Stack>
                            </Paper>

                            {/* Advance Payments Card */}
                            {isEdit && (
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography sx={{ fontWeight: 900, color: T.text, fontSize: '1.1rem' }}>Payments</Typography>
                                        {!isCancelled && (
                                            <Button size="small" variant="contained" disableElevation startIcon={<Add />}
                                                onClick={() => setPaymentDialogOpen(true)}
                                                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, fontSize: '0.7rem', bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                                                Add
                                            </Button>
                                        )}
                                    </Stack>
                                    {(() => {
                                        const totalPaid  = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                                        const balance    = Math.max(0, parseFloat(formik.values.totalPayableAmount || 0) - totalPaid);
                                        return (
                                            <Stack spacing={1}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 500 }}>Order Value</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 900 }}>₹{parseNum(formik.values.totalPayableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 500 }}>Received</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#059669' }}>₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                                </Stack>
                                                <Divider />
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography sx={{ fontWeight: 900, color: balance > 0 ? '#dc2626' : '#059669', fontSize: '0.85rem' }}>Balance Due</Typography>
                                                    <Typography sx={{ fontWeight: 900, color: balance > 0 ? '#dc2626' : '#059669' }}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                                </Stack>
                                                {payments.length > 0 && (
                                                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                                                        {payments.slice(0, 3).map(p => (
                                                            <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center"
                                                                sx={{ p: 1, borderRadius: 2, bgcolor: '#f8fafc', border: `1px solid ${T.border}` }}>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.text }}>{p.paymentDate}</Typography>
                                                                    <Typography sx={{ fontSize: '0.65rem', color: T.textSec }}>{p.paymentMode}{p.referenceNumber ? ` · ${p.referenceNumber}` : ''}</Typography>
                                                                </Box>
                                                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669' }}>₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                                                            </Stack>
                                                        ))}
                                                        {payments.length > 3 && (
                                                            <Typography sx={{ fontSize: '0.7rem', color: T.textSec, textAlign: 'center', mt: 0.5 }}>
                                                                +{payments.length - 3} more — click "Add" to view all
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Stack>
                                        );
                                    })()}
                                </Paper>
                            )}

                            {/* Export Documents Card */}
                            {isEdit && (
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Typography sx={{ fontWeight: 900, mb: 2, color: T.text, fontSize: '1.1rem' }}>Export Documents</Typography>
                                    <Stack spacing={1.5}>
                                        <Button fullWidth variant="outlined" startIcon={<AssignmentTurnedIn />}
                                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: '#0891b2', borderColor: '#bae6fd' }}
                                            onClick={() => downloadOrderAcknowledgement(orderId, formik.values.orderNumber).catch(() => alert('Failed to download.'))}>
                                            Order Acknowledgement
                                        </Button>
                                        <Button fullWidth variant="outlined" startIcon={<RequestQuote />}
                                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: '#7c3aed', borderColor: '#ddd6fe' }}
                                            onClick={() => downloadProformaInvoice(orderId, formik.values.orderNumber).catch(() => alert('Failed to download.'))}>
                                            Pro Forma Invoice
                                        </Button>
                                        <Button fullWidth variant="outlined" startIcon={<PictureAsPdf />}
                                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: '#dc2626', borderColor: '#fecaca' }}
                                            onClick={() => downloadSOPdf(orderId, formik.values.orderNumber).catch(() => alert('Failed to download.'))}>
                                            Tax Invoice
                                        </Button>
                                    </Stack>
                                </Paper>
                            )}

                            {/* Related Documents Card */}
                            {isEdit && (
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                                    <Typography sx={{ fontWeight: 900, mb: 3, color: T.text, fontSize: '1.1rem' }}>Quick Links</Typography>
                                    <Stack spacing={1.5}>
                                        <Button fullWidth variant="outlined" startIcon={<Receipt />} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: T.textSec, borderColor: T.border }}
                                            onClick={(e) => {
                                                if (linkedInvoices.length === 1) {
                                                    navigate(`/sales/sales-order/invoices/view/${linkedInvoices[0].id}`);
                                                } else if (linkedInvoices.length > 1) {
                                                    setInvAnchor(e.currentTarget);
                                                } else {
                                                    navigate(`/sales/sales-order/invoices?salesOrderNumber=${formik.values.orderNumber}`);
                                                }
                                            }}>
                                            {linkedInvoices.length > 0 ? `Invoices (${linkedInvoices.length})` : 'Linked Invoices'}
                                        </Button>

                                        <Button fullWidth variant="outlined" startIcon={<LocalShippingOutlined />} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: T.textSec, borderColor: T.border }}
                                            onClick={(e) => {
                                                if (linkedChallans.length === 1) {
                                                    navigate(`/sales/sales-order/delivery-notes/view/${linkedChallans[0].id}`);
                                                } else if (linkedChallans.length > 1) {
                                                    setDnAnchor(e.currentTarget);
                                                } else {
                                                    navigate(`/sales/sales-order/delivery-notes?salesOrderNumber=${formik.values.orderNumber}`);
                                                }
                                            }}>
                                            {linkedChallans.length > 0 ? `Challans (${linkedChallans.length})` : 'Linked Challans'}
                                        </Button>
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            {/* Document Context Menus */}
            <Menu anchorEl={invAnchor} open={Boolean(invAnchor)} onClose={() => setInvAnchor(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 200, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }}>
                <Typography sx={{ px: 2, py: 1, fontSize: '0.65rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase' }}>Select Invoice</Typography>
                {linkedInvoices.map(inv => (
                    <MenuItem key={inv.id} onClick={() => { setInvAnchor(null); navigate(`/sales/sales-order/invoices/view/${inv.id}`); }} sx={{ py: 1.5 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Receipt sx={{ fontSize: 16, color: T.primary }} />
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{inv.invoiceNumber}</Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: T.textSec }}>{inv.invoiceDate} · ₹{parseFloat(inv.totalAmount || 0).toLocaleString()}</Typography>
                            </Box>
                        </Stack>
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={() => { setInvAnchor(null); navigate(`/sales/sales-order/invoices?salesOrderNumber=${formik.values.orderNumber}`); }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: T.primary, width: '100%', textAlign: 'center' }}>View All Invoices</Typography>
                </MenuItem>
            </Menu>

            <Menu anchorEl={dnAnchor} open={Boolean(dnAnchor)} onClose={() => setDnAnchor(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 200, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }}>
                <Typography sx={{ px: 2, py: 1, fontSize: '0.65rem', fontWeight: 900, color: T.textSec, textTransform: 'uppercase' }}>Select Challan</Typography>
                {linkedChallans.map(dn => (
                    <MenuItem key={dn.id} onClick={() => { setDnAnchor(null); navigate(`/sales/sales-order/delivery-notes/view/${dn.id}`); }} sx={{ py: 1.5 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <LocalShipping sx={{ fontSize: 16, color: T.success }} />
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{dn.deliveryNoteNo}</Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: T.textSec }}>{dn.deliveryDate}</Typography>
                            </Box>
                        </Stack>
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={() => { setDnAnchor(null); navigate(`/sales/sales-order/delivery-notes?salesOrderNumber=${formik.values.orderNumber}`); }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: T.success, width: '100%', textAlign: 'center' }}>View All Challans</Typography>
                </MenuItem>
            </Menu>

            {/* Standard Dialogs */}
            <Dialog open={Boolean(dialog)} onClose={() => { setDialog(null); setDialogInput(''); }} PaperProps={{ sx: { borderRadius: 5, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900, fontSize: '1.25rem' }}>{dialog?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontWeight: 500, color: T.textSec }}>{dialog?.body}</DialogContentText>
                    {dialog?.input && (
                        <TextField fullWidth multiline rows={3} label={dialog.input} value={dialogInput}
                            onChange={(e) => setDialogInput(e.target.value)}
                            sx={{ mt: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} autoFocus />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => { setDialog(null); setDialogInput(''); }} sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', color: T.textSec }}>Cancel</Button>
                    <Button variant="contained" disableElevation onClick={confirmDialog}
                        sx={{ borderRadius: 3, fontWeight: 900, textTransform: 'none', bgcolor: ['reject','cancel','delete'].includes(dialog?.type) ? T.error : T.primary }}>
                        {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Proceed'}
                    </Button>
                </DialogActions>
            </Dialog>

            <SendSalesOrderDialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} orderId={orderId} order={formik.values} onSent={(res) => { setSendDialogOpen(false); if (res) applyServerData(res); }} />

            {isEdit && (
                <RecordPaymentDialog
                    open={paymentDialogOpen}
                    onClose={() => setPaymentDialogOpen(false)}
                    orderId={orderId}
                    orderNumber={formik.values.orderNumber}
                    totalPayable={formik.values.totalPayableAmount}
                    payments={payments}
                    onPaymentsChanged={() => getPaymentsForOrder(orderId).then(setPayments).catch(() => {})}
                />
            )}

            <Dialog open={invoiceDialog} onClose={() => !invoiceSaving && setInvoiceDialog(false)} PaperProps={{ sx: { borderRadius: 5, p: 2 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Create Tax Invoice {invoiceNextNum && `· ${invoiceNextNum}`}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField 
                            fullWidth label="Invoice Number" 
                            placeholder="[ Auto-Generate ]"
                            value={invoiceForm.invoiceNumber} 
                            onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} 
                            helperText="Leave blank for automatic professional sequence"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} 
                        />
                        <TextField fullWidth type="date" label="Invoice Date" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        <TextField fullWidth type="date" label="Payment Due Date (Optional)" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        {invoiceError && <Alert severity="error" sx={{ borderRadius: 3 }}>{invoiceError}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setInvoiceDialog(false)} sx={{ fontWeight: 800, textTransform: 'none' }}>Back</Button>
                    <Button variant="contained" disableElevation disabled={invoiceSaving} onClick={handleCreateInvoice} sx={{ borderRadius: 3, fontWeight: 900, textTransform: 'none', bgcolor: '#7c3aed' }}>
                        {invoiceSaving ? <CircularProgress size={20} color="inherit" /> : 'Generate Invoice'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AddUpdateSalesOrder;
