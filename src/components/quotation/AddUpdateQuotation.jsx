import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFormik } from "formik";
import * as Yup from "yup";
import {
    Autocomplete, Box, Button,
    Card,
    CardContent,
    CardHeader,
    Grid, Paper,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
    TextField,
    Typography,
    MenuItem,
    Stack,
    IconButton,
    Divider
} from "@mui/material";
import { inventoryItemSearch, searchEnquiry } from "../../services/commonAPI";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiService from "../../services/apiService";
import { 
    Add, RemoveCircle, Info, Description, 
    AttachMoney, LocalShipping, Receipt, Note, 
    ChevronLeft, Save, ShoppingCart
} from "@mui/icons-material";

const AddUpdateQuotation = ({ onSave }) => {
    const parseNum = (val) => parseFloat(val) || 0;

    const [initialData, setInitialData] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState('');
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
        // ONLY prefill products if it's a new quotation and current list is empty
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
        updatedProducts.splice(index, 1); // Remove product at index
        formik.setValues({ ...formik.values, quotationProducts: updatedProducts });
    };

    const printDocument = async () => {
        await apiService.download(`/quotation/pdf/${quotationId}`);
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
            <form onSubmit={formik.handleSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f1f5f9' } }}>
                                <ChevronLeft />
                            </IconButton>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                    {initialData.id ? 'Edit Quotation' : 'New Quotation'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {initialData.id ? `Managing Quotation #${initialData.qtnNo}` : 'Create a professional proposal'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            select label="Currency" name="currency"
                            value={formik.values.currency} onChange={formik.handleChange}
                            size="small" sx={{ minWidth: 100, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                        >
                            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>

                        <TextField
                            select label="Status" name="quotationStatus"
                            value={formik.values.quotationStatus} onChange={formik.handleChange}
                            size="small" sx={{ minWidth: 160, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                        >
                            {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'REVISED'].map((status) => (
                                <MenuItem key={status} value={status}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status === 'ACCEPTED' ? '#10b981' : status === 'REJECTED' ? '#ef4444' : '#94a3b8' }} />
                                        {status}
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>

                        {quotationId && (
                            <Button 
                                variant="outlined" startIcon={<Description />} 
                                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }} 
                                onClick={printDocument}
                            >
                                Preview PDF
                            </Button>
                        )}
                        
                        <Button
                            type="submit" variant="contained" disableElevation startIcon={<Save />}
                            sx={{ borderRadius: 2.5, px: 4, py: 1, textTransform: 'none', fontWeight: 800, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}
                        >
                            Save Quotation
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Stack spacing={3}>
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#eff6ff', color: '#2563eb' }}><Info fontSize="small" /></Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>General Information</Typography>
                                </Stack>
                                <Grid container spacing={3}>
                                    {formik.values.qtnNo && (
                                        <Grid item xs={12} md={4}>
                                            <TextField fullWidth label="Quotation No" value={formik.values.qtnNo} inputProps={{ readOnly: true }} variant="filled" size="small" />
                                        </Grid>
                                    )}
                                    <Grid item xs={12} md={4}>
                                        <TextField fullWidth type="date" label="Quotation Date" name="qtnDate" value={formik.values.qtnDate} onChange={formik.handleChange} size="small" InputLabelProps={{ shrink: true }} />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField select fullWidth label="Currency" name="currency" value={formik.values.currency} onChange={formik.handleChange} size="small">
                                            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                        </TextField>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f0fdf4', color: '#16a34a' }}><Receipt fontSize="small" /></Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Customer & Enquiry Reference</Typography>
                                </Stack>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Autocomplete
                                            fullWidth options={enquiryList}
                                            getOptionLabel={(option) => option?.enqNo || ''}
                                            value={formik.values.enquiry || null}
                                            onInputChange={handleSearchChange}
                                            onChange={(event, newValue) => {
                                                formik.setFieldValue('enquiry', newValue || null);
                                                if (newValue) handleEnquiryChange(newValue);
                                            }}
                                            renderInput={(params) => <TextField {...params} label="Search Enquiry No" size="small" placeholder="Type to search..." />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Enquiry Date</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formik.values.enquiry?.enqDate || 'N/A'}</Typography>
                                        </Box>
                                    </Grid>
                                    
                                    {formik.values.enquiry?.contact && (
                                        <>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>COMPANY</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 700 }}>{formik.values.enquiry.contact.companyName}</Typography>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>GST NO</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 700 }}>{formik.values.enquiry.contact.gstNumber || 'N/A'}</Typography>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>PERSON</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 700 }}>{formik.values.enquiry.contact.personDetails?.[0]?.personName || 'N/A'}</Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>SHIPPING ADDRESS</Typography>
                                                <Typography variant="body2" color="text.primary">
                                                    {formik.values.enquiry.contact.addresses?.[0] 
                                                        ? [formik.values.enquiry.contact.addresses[0].street1, formik.values.enquiry.contact.addresses[0].city, formik.values.enquiry.contact.addresses[0].state].filter(Boolean).join(', ')
                                                        : 'No address found'}
                                                </Typography>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </Paper>

                            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#fef3c7', color: '#d97706' }}><ShoppingCart fontSize="small" /></Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Product Items</Typography>
                                    </Stack>
                                    <Button variant="contained" size="small" startIcon={<Add />} onClick={addProduct} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#0f172a' }}>
                                        Add Item
                                    </Button>
                                </Box>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, width: 50 }}>#</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Product Name / Description</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>Qty</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, width: 150 }}>Price</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, width: 150 }}>Net Total</TableCell>
                                                <TableCell align="center" sx={{ width: 50 }}></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formik.values.quotationProducts?.map((product, index) => (
                                                <TableRow key={index} sx={{ '&:last-child td': { border: 0 } }}>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{index + 1}</Typography></TableCell>
                                                    <TableCell>
                                                        <Autocomplete
                                                            size="small" options={productList}
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
                                                            renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select product..." />}
                                                        />
                                                        <TextField
                                                            fullWidth size="small" variant="standard" placeholder="Additional instructions..."
                                                            name={`quotationProducts[${index}].specialInstruction`}
                                                            value={formik.values.quotationProducts[index]?.specialInstruction || ""}
                                                            onChange={formik.handleChange}
                                                            sx={{ mt: 0.5, '& input': { fontSize: '0.75rem', color: '#64748b' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField size="small" type="number" name={`quotationProducts[${index}].qty`} value={formik.values.quotationProducts[index]?.qty || 0} onChange={formik.handleChange} sx={{ '& input': { textAlign: 'center' } }} variant="standard" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField size="small" type="number" name={`quotationProducts[${index}].pricePerUnit`} value={formik.values.quotationProducts[index]?.pricePerUnit || 0} onChange={formik.handleChange} sx={{ '& input': { textAlign: 'right' } }} variant="standard" />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {formik.values.currency} {(() => {
                                                                const p = formik.values.quotationProducts[index];
                                                                return (parseNum(p.qty) * parseNum(p.pricePerUnit)).toLocaleString(undefined, { minimumFractionDigits: 2 });
                                                            })()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" onClick={() => removeProduct(index)} color="error" sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                            <RemoveCircle fontSize="small" />
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

                    <Grid item xs={12} md={4}>
                        <Stack spacing={3}>
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: '#eff6ff', border: '1px solid #dbeafe', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#2563eb', color: 'white' }}><AttachMoney fontSize="small" /></Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e40af' }}>Financial Summary</Typography>
                                </Stack>
                                
                                <Stack spacing={2.5}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>Gross Total</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{formik.values.currency} {parseNum(formik.values.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>Global Discount (%)</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <TextField size="small" name="discountPercentage" value={formik.values.discountPercentage} onChange={formik.handleChange} sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 700 }, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 } }} />
                                            <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700 }}>-{parseNum(formik.values.discountAmount).toLocaleString()}</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>P&F Charges (%)</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <TextField size="small" name="packagingAndForwardingChargesPercentage" value={formik.values.packagingAndForwardingChargesPercentage} onChange={formik.handleChange} sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 700 }, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 } }} />
                                            <Typography variant="body2" sx={{ color: '#059669', fontWeight: 700 }}>+{parseNum(formik.values.packagingAndForwardingCharges).toLocaleString()}</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>GST (%)</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <TextField size="small" name="gstPercentage" value={formik.values.gstPercentage} onChange={formik.handleChange} sx={{ width: 60, '& input': { py: 0.5, textAlign: 'center', fontWeight: 700 }, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 } }} />
                                            <Typography variant="body2" sx={{ color: '#2563eb', fontWeight: 700 }}>+{parseNum(formik.values.gstAmount).toLocaleString()}</Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ borderColor: '#dbeafe', my: 1 }} />

                                    <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#2563eb', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>Total Amount</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'white' }}>{formik.values.currency} {parseNum(formik.values.totalAmount).toLocaleString()}</Typography>
                                        </Stack>
                                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', color: 'rgba(255,255,255,0.8)', mt: 0.5, fontWeight: 600 }}>Round off: {formik.values.roundOff}</Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f5f3ff', color: '#7c3aed' }}><Note fontSize="small" /></Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Terms & Conditions</Typography>
                                </Stack>
                                <Stack spacing={2.5}>
                                    <TextField fullWidth label="Validity" name="validTill" value={formik.values.validTill} onChange={formik.handleChange} size="small" />
                                    <TextField fullWidth label="Payment Terms" name="paymentTerms" value={formik.values.paymentTerms} onChange={formik.handleChange} size="small" />
                                    <TextField fullWidth label="Delivery" name="deliveryTerms" value={formik.values.deliveryTerms} onChange={formik.handleChange} size="small" />
                                    <TextField fullWidth multiline rows={3} label="Internal Notes" name="notes" value={formik.values.notes} onChange={formik.handleChange} />
                                </Stack>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default AddUpdateQuotation;
