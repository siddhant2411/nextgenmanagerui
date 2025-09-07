// --- Imports & Services as you have them ---

// Additional subcomponent imports (can be in the same file or separated)
import { Card, CardContent, CardHeader, Grid, TextField, Box, Button, MenuItem, Autocomplete, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SalesOrderItemsTable from './SalesOrderItemsTable'; // see below
import SalesOrderSummary from './SalesOrderSummary';      // see below
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { useParams } from 'react-router-dom';
import { searchContacts, searchQuotations } from '../../../services/commonAPI';
import apiService from '../../../services/apiService';
import TaxAndDiscountCard from './TaxAndDiscountCard';
import convertAddressToString from '../../../commonTools/convertAddress';
import { SALES_ORDER_STATUSES } from './SalesOrderStatus';
import axios from 'axios';

const AddUpdateSalesOrder = ({ onSave }) => {
    // ...your existing hooks

    // --- Commercial summary state (optional: you can calculate on fly) ---
    const [summary, setSummary] = useState({

    });
    // const [freightCharges, setFreightCharges] = useState(0);



    const voucherTypes = [
        { value: 'SALES_ORDER', label: 'Sales Order' },
        { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
        { value: 'TAX_INVOICE', label: 'Tax Invoice' }
    ];
    const [contactOptions, setContactOptions] = useState([]);
    const [quotationOptions, setQuotationOptions] = useState([]);
    const [quotationLoading, setQuotationLoading] = useState(false)
    const [pendingStatus, setPendingStatus] = useState(null); // temporary selected value
    const [openInventoryConsumeDialog, setOpenInventoryConsumeDialog] = useState(false);
    const [status, setStatus] = useState('DRAFT');

    const customerDebounce = useRef();
    const quotationDebounce = useRef();
    const { orderId } = useParams();

    const currencyMapping = {
        INR: "₹",
        USD: "$"
    };

    const [taxType, setTaxType] = useState('CGST_SGST');
    const formatCurrency = (type) => currencyMapping[type] || type;
    // --- Items state (can lift up or let Formik handle it, up to you) ---
    const [items, setItems] = useState([]);
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        if (orderId) fetchSalesOrderDetails(orderId);
    }, [orderId]);


    const fetchSalesOrderDetails = async (id) => {
        const res = await apiService.get(`/sales-orders/${id}`);
        setInitialData(res);
        formik.setFieldValue("items", res?.items);

    };


    useEffect(() => {
        if (initialData?.quotationId) {
            apiService.get(`/quotation/${initialData.quotationId}`)
                .then((response) => {
                    formik.setFieldValue("quotation", response);
                });
        }

        if (initialData?.customerId) {
            apiService.get(`/contact/${initialData.customerId}`)
                .then((response) => {
                    formik.setFieldValue("contact", response);
                });
        }

        if (orderId) {
            setStatus(initialData?.status)
        }


    }, [initialData]);


    const [isTaxOnFreight, setIsTaxOnFreight] = useState(0);
    const [freightValue, setFreightValue] = useState(0);


    // --- Other formik set up as before, but with more fields mirrored to DTO ---
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: initialData?.id || 0,
            orderNumber: initialData?.orderNumber || null,
            voucherType: initialData?.voucherType || 'SALES_ORDER',
            contact: initialData?.contact || null,  // Customer
            enquiry: initialData?.enquiry || null,
            quotation: initialData?.quotation || null,
            orderDate: initialData?.orderDate ? formatDateToInput(initialData.orderDate) : '',
            items: initialData?.items || [],   // 👈 only Formik owns items now
            paymentTerms: initialData?.paymentTerms || '',
            incoterms: initialData?.incoterms || '',
            currency: initialData?.currency || 'INR',
            deliveryAddress: initialData?.deliveryAddress || '',
            dispatchThrough: initialData?.dispatchThrough || '',
            transportMode: initialData?.transportMode || '',
            deliveryDate: initialData?.deliveryDate || '',
            packagingInstructions: initialData?.packagingInstructions || '',
            shippingMethod: initialData?.shippingMethod || '',
            poNumber: initialData?.poNumber || '',
            poDate: initialData?.poDate || '',
            reference: initialData?.reference || '',
            remarks: initialData?.remarks || '',
            status: initialData?.status || 'DRAFT'
            // ...other fields
        },
        validationSchema: Yup.object({
            contact: Yup.object().required('Customer Required'),
            items: Yup.array().min(1, 'At least 1 item'),
            orderDate: Yup.date().required('Order date required'),
            currency: Yup.string().required('Currency required'),
        }),
        onSubmit: async (values) => {
            const payload = {
                ...values,
                customerId: values.contact?.id,
                quotationId: values.quotation?.id,
                items: values.items,
                currency: values.currency,
                paymentTerms: values.paymentTerms,
                incoterms: values.incoterms,
                poNumber: values.poNumber,
                poDate: values.poDate,
                discountPercentage: extraDiscountPercentage,
                taxType: taxType,
                taxPercentage: taxCategory,
                includeFreightCharges: isTaxOnFreight,
                freightAndForwardingCharges: freightValue




                // items already included inside values.items
            };
            console.log(payload)
            onSave(payload)

        }
    });


    useEffect(() => {

        setExtraDiscountPercentage(initialData?.discountPercentage)

        setFreightValue(initialData?.freightAndForwardingCharges)
        setIsTaxOnFreight(initialData?.includeFreightCharges)
        // setStatus(initialData?.status)
    }, [initialData])



    const handleQuotationChange = async (event, value) => {

        if (!value) {
            formik.setFieldValue("quotation", null);
            return;
        }

        const response = await apiService.get('/quotation/' + value.id);
        formik.setFieldValue("quotation", response);
        formik.setFieldValue("enquiry", response?.enquiry);
        formik.setFieldValue("contact", response?.enquiry?.contact);
        formik.setFieldValue("items", response?.quotationProducts)

    };

    const handleContactSearch = (event, value) => {
        clearTimeout(customerDebounce.current);
        customerDebounce.current = setTimeout(async () => {
            const res = await searchContacts(value);
            setContactOptions(res);
        }, 500);
    };


    const handleQuotationSearch = (event, value) => {
        if (value === 'undefined') {
            // setSearchQuery('')
            return
        }
        clearTimeout(quotationDebounce.current);
        quotationDebounce.current = setTimeout(async () => {
            setQuotationLoading(true)
            const res = await searchQuotations(value);
            setQuotationOptions(res);
            setQuotationLoading(false)
        }, 500);
    };



    function formatDateToInput(date) {
        if (!date) return '';

        // If it's already a valid string in yyyy-MM-dd, return as is
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }

        // Parse date object or string
        const d = new Date(date);
        if (isNaN(d)) return '';

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0'); // Months 0-indexed
        const dd = String(d.getDate()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    }


    // state with default from quotation
    const [extraDiscountPercentage, setExtraDiscountPercentage] = useState(null);
    const [taxCategory, setTaxCategory] = useState(null);

    useEffect(() => {
        console.log(formik.values.deliveryAddress)
        if (!initialData?.deliveryAddress && formik.values.contact) {
            formik.setFieldValue("deliveryAddress", convertAddressToString(formik.values.contact?.addresses[0]))
        }

    }, [formik.values.contact])
    useEffect(() => {
        if (
            formik.values.quotation?.discountPercentage !== undefined &&
            formik.values.quotation?.discountPercentage !== null &&
            (summary.extraDiscountPercentage === undefined ||
                summary.extraDiscountPercentage === null)
        ) {
            setExtraDiscountPercentage(formik.values.quotation.discountPercentage);
        }
    }, [formik.values.quotation?.discountPercentage]);


    useEffect(() => {
        console.log(formik.values.quotation?.gstPercentage)
        if (
            formik.values.quotation?.gstPercentage !== undefined &&
            formik.values.quotation?.gstPercentage !== null &&
            (summary.taxCategory === undefined ||
                summary.taxCategory === null)
        ) {
            setTaxCategory(formik.values.quotation.gstPercentage);
        }
    }, [formik.values.quotation?.gstPercentage]);


    useEffect(() => {
        const itemsToCalculate = formik.values.items || [];

        let subTotal =
            itemsToCalculate.reduce(
                (acc, item) => acc + (item?.pricePerUnit * item?.qty || 0),
                0
            ) || 0;

        const discountAmount =
            itemsToCalculate.reduce(
                (acc, item) =>
                    acc +
                    ((item?.discountPercentage || 0) *
                        (item?.pricePerUnit || 0) /
                        100 *
                        (item?.qty || 0)),
                0
            ) || 0;

        subTotal -= discountAmount;

        const extraDiscountValue = ((extraDiscountPercentage || 0) / 100) * subTotal;

        const baseTaxableValue = subTotal - extraDiscountValue;
        const freightCharges = freightValue || 0;
        const isFreightTaxable = isTaxOnFreight || false;
        const taxableValue = isFreightTaxable
            ? baseTaxableValue + freightCharges
            : baseTaxableValue;

        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        if (taxType === "CGST_SGST") {
            cgstAmount = taxableValue * (taxCategory / 2) / 100;
            sgstAmount = taxableValue * (taxCategory / 2) / 100;
            igstAmount = 0;
        } else if (taxType === "IGST") {
            igstAmount = taxableValue * taxCategory / 100;
            cgstAmount = 0;
            sgstAmount = 0;
        } else {
            // For STANDARD, ZERO or others, set all tax to 0 or handle differently
            cgstAmount = 0;
            sgstAmount = 0;
            igstAmount = 0;
        }
        const cessAmount = 0;

        const totalBeforeRound =
            taxableValue + cgstAmount + sgstAmount + igstAmount + cessAmount;

        const roundOffAmount = Math.round(totalBeforeRound) - totalBeforeRound;
        const totalPayableAmount = Math.round(totalBeforeRound)
        const netAmount =
            taxableValue +
            cgstAmount +
            sgstAmount +
            igstAmount +
            cessAmount +
            (!isFreightTaxable ? freightCharges : 0);

        setSummary((s) => ({
            ...s,
            subTotal,
            extraDiscountPercentage, // ✅ picks up new state
            extraDiscountValue,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount,
            netAmount,
            roundOffAmount,
            totalPayableAmount

        }));
    }, [
        formik.values.items,
        freightValue,
        isTaxOnFreight,
        extraDiscountPercentage,
        taxType,
        taxCategory // ✅ will now update when user edits
    ]);



    const onStatusChange = (event) => {

        const newStatus = event.target.value;

        if(!orderId)
            return
        // if DRAFT -> APPROVED, ask confirmation
        if (status === "DRAFT" && newStatus === "APPROVED") {
            setPendingStatus(newStatus);
            setOpenInventoryConsumeDialog(true);
        } else {
            updateStatus(newStatus);
        }
    }

    const updateStatus = async (newStatus) => {
        try {
            await apiService.post(
                `/sales-orders/${orderId}/change-status/?inventoryAction=true`,
                newStatus,
                { headers: { "Content-Type": "application/json" } }
            );
            setStatus(newStatus);
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };
    const handleConfirm = () => {
        setOpenInventoryConsumeDialog(false);
        if (pendingStatus) {
            updateStatus(pendingStatus);
            setOpenInventoryConsumeDialog(null);
        }
    };


    const handleCancel = () => {
        setOpenInventoryConsumeDialog(false);
        setPendingStatus(null);
    };

    return (
        <form onSubmit={formik.handleSubmit}>
            <Card sx={{ mb: 2 }}>
                <CardHeader
                    title={formik.values.orderNumber || 'New Sales Order'}
                    action={
                        <FormControl fullWidth size="small">
                            <InputLabel id="status-label">Status</InputLabel>
                            {console.log(status)}
                            <Select
                                labelId="status-label"
                                value={status || ""}
                                onChange={(event) => onStatusChange(event)}
                            >
                                {Object.entries(SALES_ORDER_STATUSES).map(([value, { label }]) => (

                                    <MenuItem key={value} value={value}>

                                        {label}
                                    </MenuItem>

                                ))}
                            </Select>
                        </FormControl>


                    }
                />
                <CardContent>
                    {/* 1. Customer & Reference */}
                    <Grid container spacing={2}>
                        {/* Customer Information */}

                        {/* Order Information */}
                        <Grid item xs={4}>
                            <TextField
                                type="date"
                                name="orderDate"
                                label="Sales Order Date"
                                value={formatDateToInput(formik.values.orderDate)}
                                onChange={formik.handleChange}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                fullWidth
                                required
                            />
                        </Grid>

                        <Grid item xs={4}>
                            <Autocomplete
                                options={quotationOptions}
                                getOptionLabel={(opt) => opt?.qtnNo || ""}
                                value={formik.values.quotation}
                                onInputChange={(event, newInputValue) =>
                                    handleQuotationSearch(event, newInputValue)
                                }
                                onChange={(e, val) => handleQuotationChange(e, val)}
                                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Quotation No."
                                        size="small"
                                        fullWidth
                                    />
                                )}
                                loading={quotationLoading}
                                noOptionsText={quotationLoading ? "Loading..." : "No items found"}
                            />
                        </Grid>

                        <Grid item xs={4}>
                            <Autocomplete
                                options={contactOptions}
                                getOptionLabel={(opt) => opt?.companyName || ""}
                                value={formik.values.contact}
                                onInputChange={handleContactSearch}
                                onChange={(e, val) => formik.setFieldValue("contact", val)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Customer" size="small" required fullWidth />
                                )}
                            />
                        </Grid>


                        <Grid item xs={4}>
                            <TextField
                                name="poNumber"
                                label="PO Number"
                                value={formik.values.poNumber}
                                onChange={formik.handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={4}>
                            <TextField
                                name="poDate"
                                label="PO Date"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={formik.values.poDate || ""}
                                onChange={formik.handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>

                        {/* Commercials */}
                        <Grid item xs={4}>
                            <TextField
                                name="currency"
                                label="Currency"
                                value={formik.values.currency}
                                onChange={formik.handleChange}
                                fullWidth
                                size="small"
                                select
                                required
                            >
                                <MenuItem value="INR">INR</MenuItem>
                                <MenuItem value="USD">USD</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                name="paymentTerms"
                                label="Payment Terms"
                                value={formik.values.paymentTerms}
                                onChange={formik.handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                    </Grid>

                </CardContent>
            </Card>

            {/* 2. Line Items Section */}
            <SalesOrderItemsTable
                items={formik.values.items}
                setItems={items => { setItems(items); formik.setFieldValue('items', items); }}
                currency={formik.values.currency}
            />

            {/* 3. Commercial Summary Section */}
            <Card sx={{ width: "100%", mt: 2 }}>
                <CardHeader title="Finanical Details"
                    titleTypographyProps={{ fontSize: 16, fontWeight: 500 }}
                    sx={{ pb: 0.5 }} />
                <CardContent>
                    <div style={{ display: "flex", gap: "10px;" }}>
                        <TaxAndDiscountCard
                            summary={summary}
                            setSummary={setSummary}
                            currency={formatCurrency(formik.values.currency)}
                            setExtraDiscountPercentage={setExtraDiscountPercentage}
                            taxType={taxType}
                            setTaxType={setTaxType}
                            setTaxCategory={setTaxCategory}
                            taxCategory={taxCategory}
                            freightValue={freightValue}
                            setFreightValue={setFreightValue}
                            isTaxOnFreight={isTaxOnFreight}
                            setIsTaxOnFreight={setIsTaxOnFreight}
                        />
                        <SalesOrderSummary summary={summary} setSummary={setSummary} currency={formatCurrency(formik.values.currency)} setExtraDiscountPercentage={setExtraDiscountPercentage} taxType={taxType} taxCategory={taxCategory} />
                    </div>
                </CardContent>

            </Card>
            {/* 4. Logistics & References */}
            <Card sx={{ mt: 2 }}>
                <CardHeader title="Logistics & References" />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                name="deliveryAddress"
                                label="Delivery Address"
                                value={formik.values.deliveryAddress}
                                onChange={formik.handleChange}
                                fullWidth
                                size="small"
                                multiline
                                InputProps={{
                                    style: { fontSize: 13 },   // text inside the input
                                }}
                                InputLabelProps={{
                                    style: { fontSize: 13 },   // label text
                                }}
                            />

                        </Grid>
                        <Grid item xs={3}><TextField name="dispatchThrough" label="Dispatch Through" value={formik.values.dispatchThrough} onChange={formik.handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={3}><TextField name="transportMode" label="Transport Mode" value={formik.values.transportMode} onChange={formik.handleChange} fullWidth size="small" /></Grid>
                        {/* ... more logistics fields (deliveryDate, packaging, shipping) */}
                        <Grid item xs={2}><TextField name="deliveryDate" label="Delivery Date" type="date" InputLabelProps={{ shrink: true }} value={formik.values.deliveryDate || ''} onChange={formik.handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={2}><TextField name="packagingInstructions" label="Packaging Instructions" value={formik.values.packagingInstructions || ''} onChange={formik.handleChange} fullWidth size="small" /></Grid>

                        <Grid item xs={2}><TextField name="reference" label="Reference" value={formik.values.reference || ''} onChange={formik.handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={2}><TextField name="remarks" label="Remarks" value={formik.values.remarks || ''} onChange={formik.handleChange} fullWidth size="small" /></Grid>
                    </Grid>
                </CardContent>
            </Card>



            <Dialog open={openInventoryConsumeDialog} onClose={handleCancel}>
                <DialogTitle>Confirm Status Change</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Required items will be requested from inventory.
                        Do you want to continue changing status to <b>Approved</b>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} color="primary" variant="contained">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 5. Submit Button */}
            <Box mt={2} display="flex" justifyContent="flex-end">
                <Button variant="contained" type="submit" color="primary" disabled={formik.isSubmitting}>
                    {orderId ? 'Update' : 'Create'} Sales Order
                </Button>
            </Box>
        </form >
    );
}

export default AddUpdateSalesOrder;