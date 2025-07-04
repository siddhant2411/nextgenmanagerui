import React, { useEffect, useState, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
    Card, CardHeader, CardContent,
    Grid, TextField, Button, Box, MenuItem,
    Autocomplete
} from '@mui/material';
import { useNavigate, useParams } from "react-router-dom";
import apiService from '../../../services/apiService';
import { searchContacts, searchQuotations } from '../../../services/commonAPI';

const voucherTypes = [
    { value: 'SALES_ORDER', label: 'Sales Order' },
    { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
    { value: 'TAX_INVOICE', label: 'Tax Invoice' }
];

const AddUpdateSalesOrder = ({ onSave }) => {
    const { orderId } = useParams();
    const [initialData, setInitialData] = useState(null);
    const [contactOptions, setContactOptions] = useState([]);
    const [quotationOptions, setQuotationOptions] = useState([]);
    const [quotationDetails, setQuotationDetails] = useState(null);
    const customerDebounce = useRef();
    const quotationDebounce = useRef();
    const navigate = useNavigate();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: initialData?.id || 0,
            orderNumber: initialData?.orderNumber || null,
            voucherType: initialData?.voucherType || 'SALES_ORDER',
            quotation: initialData?.quotation || null,
            contact: initialData?.contact || null
        },
        validationSchema: Yup.object({}),
        onSubmit: async (values) => {
            const payload = {
                ...values,
                quotationId: values.quotation?.id,
                contactId: values.contact?.id
            };
            try {
                const res = orderId
                    ? await apiService.put(`/sales-order/${orderId}`, payload)
                    : await apiService.post(`/sales-order`, payload);
                onSave?.(res);
                navigate('/sales-orders');
            } catch (err) {
                console.error("Error saving sales order", err);
            }
        }
    });

    const fetchSalesOrder = async (id) => {
        const data = await apiService.get(`/sales-order/${id}`);
        setInitialData(data);
    };

    const fetchQuotationDetails = async (id) => {
        try {
            const data = await apiService.get(`/quotation/${id}`);
            setQuotationDetails(data);
        } catch {
            console.error("Failed to fetch quotation details");
        }
    };

    useEffect(() => {
        if (orderId) fetchSalesOrder(orderId);
    }, [orderId]);

    useEffect(() => {
        const qId = formik.values.quotation?.id;
        if (qId) fetchQuotationDetails(qId);
    }, [formik.values.quotation]);

    useEffect(() => {
        if (quotationDetails?.enquiry?.contact) {
            formik.setFieldValue('contact', quotationDetails.enquiry.contact);
        }
    }, [quotationDetails]);

    const handleQuotationSearch = (e, val) => {
        clearTimeout(quotationDebounce.current);
        quotationDebounce.current = setTimeout(async () => {
            const res = await searchQuotations(val);
            setQuotationOptions(res);
        }, 500);
    };

    const handleContactSearch = (e, val) => {
        clearTimeout(customerDebounce.current);
        customerDebounce.current = setTimeout(async () => {
            const res = await searchContacts(val);
            setContactOptions(res);
        }, 500);
    };

    return (
        <form onSubmit={formik.handleSubmit}>
            <Card>
                <CardHeader
                    title={formik.values.orderNumber || 'New Sales Order'}
                    action={
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                select
                                label="Voucher Type"
                                name="voucherType"
                                value={formik.values.voucherType}
                                onChange={formik.handleChange}
                                size="small"
                            >
                                {voucherTypes.map(v => (
                                    <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    }
                />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Autocomplete
                                fullWidth
                                options={quotationOptions}
                                getOptionLabel={opt => opt.qtnNo || ''}
                                value={formik.values.quotation}
                                onInputChange={handleQuotationSearch}
                                onChange={(e, val) => formik.setFieldValue('quotation', val)}
                                renderInput={params => (
                                    <TextField {...params} label="Quotation No." size="small" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <Autocomplete
                                fullWidth
                                options={contactOptions}
                                getOptionLabel={opt => opt?.companyName || ''}
                                value={formik.values.contact}
                                onInputChange={handleContactSearch}
                                onChange={(e, val) => formik.setFieldValue('contact', val)}
                                renderInput={params => (
                                    <TextField
                                        {...params}
                                        label="Company Name"
                                        size="small"
                                        error={Boolean(formik.touched.contact && formik.errors.contact)}
                                        helperText={formik.touched.contact && formik.errors.contact}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
            <Box mt={2} display="flex" justifyContent="flex-end">
                <Button type="submit" variant="contained" color="primary">
                    {orderId ? 'Update' : 'Create'} Order
                </Button>
            </Box>
        </form>
    );
};

export default AddUpdateSalesOrder;
