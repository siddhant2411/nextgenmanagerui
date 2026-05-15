import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFormik } from "formik";
import * as Yup from "yup";
import {
    Autocomplete, Box, Button,
    Grid, Paper,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
    TextField,
    Typography,
    MenuItem,
    Stack,
    IconButton,
    Divider,
    Container,
    Avatar,
    Chip,
    CircularProgress,
    Alert
} from "@mui/material";
import { inventoryItemSearch, searchEnquiry } from "../../services/commonAPI";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiService from "../../services/apiService";
import { 
    Add, RemoveCircle, Info, Description, 
    AttachMoney, LocalShipping, Receipt, Note, 
    ChevronLeft, Save, ShoppingCart, ArrowBack,
    DeleteOutline
} from "@mui/icons-material";

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
    accent:  '#eff6ff',
};

const AddUpdateQuotation = ({ onSave }) => {
    const parseNum = (val) => parseFloat(val) || 0;

    const [initialData, setInitialData] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [enquiryList, setEnquiryList] = useState([]);
    const [productList, setProductList] = useState([]);
    const { quotationId } = useParams();
    const debounceTimeout = useRef(null);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: initialData.id || 0,
            qtnNo: initialData.qtnNo || null,
            qtnDate: initialData.qtnDate || new Date().toISOString().split('T')[0],
            enquiry: {
                id: initialData.enquiry?.id || 0,
                enqNo: initialData.enquiry?.enqNo || null,
                enqDate: initialData.enquiry?.enqDate || null,
                contact: {
                    id: initialData.enquiry?.contact?.id || 0,
                    companyName: initialData.enquiry?.contact?.companyName || '',
                    gstNumber: initialData.enquiry?.contact?.gstNumber || '',
                    notes: initialData.enquiry?.contact?.notes || '',
                    addresses: initialData.enquiry?.contact?.addresses || [],
                    personDetails: initialData.enquiry?.contact?.personDetails || [],
                },
            },
            currency: initialData.currency || 'INR',
            quotationProducts: initialData.quotationProducts ? initialData.quotationProducts : (initialData.enquiry?.enquiredProducts || []),
            netAmount: initialData.netAmount ? initialData.netAmount : 0,
            gstPercentage: initialData.gstPercentage ? initialData.gstPercentage : 0,
            gstAmount: initialData.gstAmount ? initialData.gstAmount : 0,
            discountPercentage: initialData.discountPercentage ? initialData.discountPercentage : 0,
            discountAmount: initialData.discountAmount ? initialData.discountAmount : 0,
            roundOff: initialData.roundOff ? initialData.roundOff : 0,
            totalAmount: initialData.totalAmount ? initialData.totalAmount : 0,
            packagingAndForwardingChargesPercentage: initialData.packagingAndForwardingChargesPercentage ? initialData.packagingAndForwardingChargesPercentage : 0,
            packagingAndForwardingCharges: initialData.packagingAndForwardingCharges ? initialData.packagingAndForwardingCharges : 0,
            taxableAmount: initialData.discountAmount ? initialData.packagingAndForwardingCharges + initialData.netAmount - initialData.discountAmount : 0,
            validTill: initialData.validTill || '',
            paymentTerms: initialData.paymentTerms || '',
            deliveryTerms: initialData.deliveryTerms || '',
            inspectionTerms: initialData.inspectionTerms || '',
            pricesTerms: initialData.pricesTerms || '',
            notes: initialData.notes || '',
            quotationStatus: initialData.quotationStatus || 'DRAFT',
        },
        validationSchema: Yup.object({
            discountPercentage: Yup.number().min(0).max(100),
            gstPercentage: Yup.number().min(0).max(100),
            quotationProducts: Yup.array().of(
                Yup.object().shape({
                    qty: Yup.number().required().min(0.01),
                    pricePerUnit: Yup.number().required().min(0),
                })
            ),
        }),
        onSubmit: (values) => {
            onSave(values);
        },
    });


    useEffect(() => {
        const prods = formik.values.quotationProducts || [];
        let net = 0;
        prods.forEach(p => {
            const qty = parseNum(p.qty);
            const price = parseNum(p.pricePerUnit);
            net += qty * price;
        });

        const globalDp = parseNum(formik.values.discountPercentage);
        const discountAmount = +(net * globalDp / 100).toFixed(2);
        const taxableAmount = +(net - discountAmount).toFixed(2);

        const pafPct = parseNum(formik.values.packagingAndForwardingChargesPercentage);
        const packagingAndForwardingCharges = +(taxableAmount * pafPct / 100).toFixed(2);

        const gp = parseNum(formik.values.gstPercentage);
        const gstAmount = +(taxableAmount * gp / 100).toFixed(2);

        const rawTotal = taxableAmount + gstAmount + packagingAndForwardingCharges;
        const total = Math.round(rawTotal);
        const roundOff = +(total - rawTotal).toFixed(2);

        if (formik.values.totalAmount !== total) {
            formik.setFieldValue('netAmount', net.toFixed(2), false);
            formik.setFieldValue('discountAmount', discountAmount, false);
            formik.setFieldValue('taxableAmount', taxableAmount, false);
            formik.setFieldValue('packagingAndForwardingCharges', packagingAndForwardingCharges, false);
            formik.setFieldValue('gstAmount', gstAmount, false);
            formik.setFieldValue('totalAmount', total, false);
            formik.setFieldValue('roundOff', roundOff, false);
        }
    }, [
        formik.values.quotationProducts,
        formik.values.discountPercentage,
        formik.values.packagingAndForwardingChargesPercentage,
        formik.values.gstPercentage
    ]);

    const fetchQuotationDetails = useCallback(async () => {
        if (!quotationId) return;
        try {
            setLoading(true);
            const data = await apiService.get(`/quotation/${quotationId}`);
            setInitialData(data);
        } catch (err) {
            setError("Failed to fetch Quotation Details");
        } finally {
            setLoading(false);
        }
    }, [quotationId]);

    useEffect(() => {
        if (quotationId) fetchQuotationDetails();
    }, [quotationId, fetchQuotationDetails]);

    const handleEnquiryChange = async (enquiry) => {
        const response = await apiService.get('/enquiry/' + enquiry.id);
        formik.setFieldValue("enquiry", response);
        if (!quotationId && (!formik.values.quotationProducts || formik.values.quotationProducts.length === 0)) {
            const mappedProds = (response.enquiredProducts || []).map(ep => ({
                ...ep,
                pricePerUnit: ep.inventoryItem?.productFinanceSettings?.sellingPrice || ep.inventoryItem?.sellingPrice || 0
            }));
            formik.setFieldValue("quotationProducts", mappedProds);
        }
    };

    const handleSearchChange = async (event, value) => {
        if (!value || value.length < 2) return;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(async () => {
            try {
                const data = await searchEnquiry(value);
                setEnquiryList(data);
            } catch (err) { console.error(err); }
        }, 500);
    };

    const handleSearchChangeProduct = async (event, value, index) => {
        if (!value || value.length < 2) return;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(async () => {
            try {
                const data = await inventoryItemSearch(value);
                setProductList(data);
            } catch (err) { console.error(err); }
        }, 500);
    };

    const addProduct = () => {
        const updated = [...formik.values.quotationProducts, { 
            inventoryItem: null, productNameRequired: "", pricePerUnit: 0, qty: 1, discountPercentage: 0, specialInstruction: "" 
        }];
        formik.setFieldValue("quotationProducts", updated);
    };

    const removeProduct = (index) => {
        const updatedProducts = [...formik.values.quotationProducts];
        updatedProducts.splice(index, 1);
        formik.setFieldValue("quotationProducts", updatedProducts);
    };

    const printDocument = async () => {
        await apiService.download(`/quotation/pdf/${quotationId}`);
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <CircularProgress size={48} thickness={4} />
        </Box>
    );

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
            <form onSubmit={formik.handleSubmit}>
                {/* ── Hero Header ── */}
                <Box sx={{ 
                    bgcolor: '#0f172a', 
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
                    color: 'white', pt: 6, pb: 14 
                }}>
                    <Container maxWidth="xl">
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={3} alignItems="center">
                                <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <ArrowBack />
                                </IconButton>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        {quotationId ? `Quotation: #${formik.values.qtnNo || '...'}` : 'New Quotation'}
                                    </Typography>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                                        <Chip label={formik.values.quotationStatus} size="small" 
                                            sx={{ fontWeight: 900, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', height: 24 }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                            {formik.values.enquiry?.contact?.companyName || 'Drafting Proposal'}
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center">
                                {quotationId && (
                                    <Button 
                                        variant="outlined" startIcon={<Description />} 
                                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }} 
                                        onClick={printDocument}
                                    >
                                        Download PDF
                                    </Button>
                                )}
                                <Button
                                    type="submit" variant="contained" disableElevation startIcon={<Save />}
                                    sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 4, py: 1.2, textTransform: 'none', fontWeight: 800, fontSize: '1rem', '&:hover': { bgcolor: '#1d4ed8' } }}
                                >
                                    Save Quotation
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Box>

                <Container maxWidth="xl" sx={{ mt: -8 }}>
                    {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 4, fontWeight: 700 }}>{error}</Alert>}

                    <Grid container spacing={4}>
                        <Grid item xs={12} lg={8.5}>
                            <Stack spacing={4}>
                                {/* Document Settings */}
                                <Paper elevation={0} sx={{ p: 5, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                                        <Avatar sx={{ bgcolor: T.accent, color: T.primary, width: 40, height: 40, borderRadius: 2 }}>
                                            <Info sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Quotation Metadata</Typography>
                                    </Stack>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={4}>
                                            <TextField select fullWidth label="Quotation Status" name="quotationStatus" value={formik.values.quotationStatus} onChange={formik.handleChange} 
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                                {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'REVISED'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField fullWidth type="date" label="Date of Issue" name="qtnDate" value={formik.values.qtnDate} onChange={formik.handleChange} 
                                                InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField select fullWidth label="Currency" name="currency" value={formik.values.currency} onChange={formik.handleChange} 
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                                {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                {/* Customer Selection */}
                                <Paper elevation={0} sx={{ p: 5, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                                        <Avatar sx={{ bgcolor: '#ecfdf5', color: T.success, width: 40, height: 40, borderRadius: 2 }}>
                                            <Receipt sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Client Reference</Typography>
                                    </Stack>
                                    <Grid container spacing={4}>
                                        <Grid item xs={12} md={7}>
                                            <Autocomplete
                                                fullWidth options={enquiryList}
                                                getOptionLabel={(option) => option?.enqNo ? `${option.enqNo} - ${option.contact?.companyName || ''}` : ''}
                                                value={formik.values.enquiry || null}
                                                onInputChange={handleSearchChange}
                                                onChange={(event, newValue) => {
                                                    formik.setFieldValue('enquiry', newValue || null);
                                                    if (newValue) handleEnquiryChange(newValue);
                                                }}
                                                renderInput={(params) => <TextField {...params} label="Search Enquiry / Client" placeholder="Start typing enquiry number..." 
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={5}>
                                            <Box sx={{ p: 3, borderRadius: 4, bgcolor: T.bg, border: `1px solid ${T.border}`, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                {formik.values.enquiry?.contact?.companyName ? (
                                                    <>
                                                        <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Linked Company</Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text, mt: 0.5 }}>{formik.values.enquiry.contact.companyName}</Typography>
                                                        <Typography variant="body2" sx={{ color: T.textSec, mt: 1, fontWeight: 500 }}>GSTIN: {formik.values.enquiry.contact.gstNumber || 'N/A'}</Typography>
                                                    </>
                                                ) : (
                                                    <Typography sx={{ color: T.textSec, fontStyle: 'italic', textAlign: 'center', fontWeight: 600 }}>Select an enquiry to load client details</Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                {/* Line Items */}
                                <Paper elevation={0} sx={{ p: 0, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                    <Box sx={{ p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}` }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: '#fffbeb', color: T.warning, width: 40, height: 40, borderRadius: 2 }}>
                                                <ShoppingCart sx={{ fontSize: 20 }} />
                                            </Avatar>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Quoted Line Items</Typography>
                                        </Stack>
                                        <Button variant="contained" size="small" startIcon={<Add />} onClick={addProduct} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, bgcolor: T.text, '&:hover': { bgcolor: '#000' } }}>
                                            Add Item
                                        </Button>
                                    </Box>
                                    <TableContainer>
                                        <Table sx={{ minWidth: 800 }}>
                                            <TableHead sx={{ bgcolor: T.bg }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>#</TableCell>
                                                    <TableCell sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>Product Details</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>Quantity</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>Unit Price</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900, color: T.textSec, fontSize: '0.75rem', textTransform: 'uppercase', py: 2 }}>Total</TableCell>
                                                    <TableCell align="center" sx={{ py: 2 }}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {formik.values.quotationProducts?.map((product, index) => (
                                                    <TableRow key={index} sx={{ '&:hover': { bgcolor: `${T.primary}04` } }}>
                                                        <TableCell sx={{ fontWeight: 800, color: T.textSec }}>{index + 1}</TableCell>
                                                        <TableCell sx={{ py: 3, maxWidth: 300 }}>
                                                            <Autocomplete
                                                                fullWidth size="small" options={productList}
                                                                getOptionLabel={(option) => option.name || option.productNameRequired || ''}
                                                                value={product.inventoryItem || null}
                                                                onInputChange={(event, newInputValue) => handleSearchChangeProduct(event, newInputValue, index)}
                                                                onChange={(event, newValue) => {
                                                                    const updatedProducts = [...formik.values.quotationProducts];
                                                                    updatedProducts[index] = {
                                                                        ...updatedProducts[index],
                                                                        inventoryItem: newValue,
                                                                        productNameRequired: newValue?.name || '',
                                                                        pricePerUnit: newValue?.productFinanceSettings?.sellingPrice || newValue?.sellingPrice || 0,
                                                                    };
                                                                    formik.setFieldValue('quotationProducts', updatedProducts);
                                                                }}
                                                                renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select product..." sx={{ '& input': { fontWeight: 800, color: T.text } }} />}
                                                            />
                                                            <TextField
                                                                fullWidth size="small" variant="standard" placeholder="Specific requirements or model notes..."
                                                                name={`quotationProducts[${index}].specialInstruction`}
                                                                value={product.specialInstruction || ""}
                                                                onChange={formik.handleChange}
                                                                sx={{ mt: 1, '& input': { fontSize: '0.8rem', color: T.textSec, fontWeight: 500 } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <TextField size="small" type="number" name={`quotationProducts[${index}].qty`} value={product.qty || 0} onChange={formik.handleChange} 
                                                                sx={{ width: 80, '& input': { textAlign: 'center', fontWeight: 800, borderRadius: 2, bgcolor: T.bg } }} variant="outlined" />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField size="small" type="number" name={`quotationProducts[${index}].pricePerUnit`} value={product.pricePerUnit || 0} onChange={formik.handleChange} 
                                                                sx={{ width: 120, '& input': { textAlign: 'right', fontWeight: 800, borderRadius: 2, bgcolor: T.bg } }} variant="outlined" />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography sx={{ fontWeight: 900, color: T.primary }}>
                                                                {(parseNum(product.qty) * parseNum(product.pricePerUnit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton size="small" onClick={() => removeProduct(index)} sx={{ color: T.error, opacity: 0.5, '&:hover': { opacity: 1, bgcolor: '#fef2f2' } }}>
                                                                <DeleteOutline fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} lg={3.5}>
                            <Stack spacing={4} sx={{ position: 'sticky', top: 40 }}>
                                {/* Summary Card */}
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                                        <Avatar sx={{ bgcolor: T.accent, color: T.primary, width: 40, height: 40, borderRadius: 2 }}>
                                            <AttachMoney sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Quote Summary</Typography>
                                    </Stack>

                                    <Stack spacing={2.5}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" sx={{ color: T.textSec, fontWeight: 700 }}>Gross Total</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900, color: T.text }}>{formik.values.currency} {parseNum(formik.values.netAmount).toLocaleString()}</Typography>
                                        </Box>
                                        
                                        <Box sx={{ p: 2, borderRadius: 4, bgcolor: T.bg, border: `1px solid ${T.border}` }}>
                                            <Stack spacing={2}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 900 }}>Discount (%)</Typography>
                                                    <TextField size="small" name="discountPercentage" value={formik.values.discountPercentage} onChange={formik.handleChange} 
                                                        sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 900, bgcolor: 'white', borderRadius: 1 } }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 900 }}>GST (%)</Typography>
                                                    <TextField size="small" name="gstPercentage" value={formik.values.gstPercentage} onChange={formik.handleChange} 
                                                        sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 900, bgcolor: 'white', borderRadius: 1 } }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 900 }}>P&F Chgs (%)</Typography>
                                                    <TextField size="small" name="packagingAndForwardingChargesPercentage" value={formik.values.packagingAndForwardingChargesPercentage} onChange={formik.handleChange} 
                                                        sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 900, bgcolor: 'white', borderRadius: 1 } }} />
                                                </Box>
                                            </Stack>
                                        </Box>

                                        <Divider sx={{ my: 1 }} />

                                        <Box sx={{ p: 3, borderRadius: 4, bgcolor: T.primary, color: 'white', boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Payable</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.5 }}>
                                                {formik.values.currency} {parseNum(formik.values.totalAmount).toLocaleString()}
                                            </Typography>
                                            {formik.values.roundOff !== 0 && (
                                                <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7, fontWeight: 700 }}>Adj: {formik.values.roundOff}</Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                </Paper>

                                {/* Additional Terms */}
                                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                        <Avatar sx={{ bgcolor: '#f5f3ff', color: '#7c3aed', width: 40, height: 40, borderRadius: 2 }}>
                                            <Note sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: T.text }}>Terms & Notes</Typography>
                                    </Stack>
                                    <Stack spacing={3}>
                                        <TextField fullWidth label="Validity Period" name="validTill" value={formik.values.validTill} onChange={formik.handleChange} 
                                            placeholder="e.g. 15 Days" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                        <TextField fullWidth label="Payment Terms" name="paymentTerms" value={formik.values.paymentTerms} onChange={formik.handleChange} 
                                            placeholder="e.g. 50% Advance" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                        <TextField fullWidth multiline rows={4} label="Client Notes" name="notes" value={formik.values.notes} onChange={formik.handleChange} 
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                    </Stack>
                                </Paper>
                            </Stack>
                        </Grid>
                    </Grid>
                </Container>
            </form>
        </Box>
    );
};

export default AddUpdateQuotation;
