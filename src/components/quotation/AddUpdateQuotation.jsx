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
    MenuItem
} from "@mui/material";
import { inventoryItemSearch, searchContacts, searchEnquiry } from "../../services/commonAPI";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiService from "../../services/apiService";
import { Remove, RemoveCircle } from "@mui/icons-material";
import enquiry from "../enquiry/Enquiry";

const AddUpdateQuotation = ({ onSave }) => {

    const [initialData, setInitialData] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState('');
    const [error, setError] = useState(null);
    const [enquiryList, setEnquiryList] = useState([]);
    const [productList, setProductList] = useState([]);
    const { quotationId } = useParams();

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
            quotationProducts: initialData.quotationProducts ? initialData.quotationProducts : initialData.enquiry?.enquiredProducts || [],
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
            discountPercentage: Yup.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100"),
            gstPercentage: Yup.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100"),
            packagingAndForwardingChargesPercentage: Yup.number().min(0, "Cannot be negative"),
            quotationProducts: Yup.array().of(
                Yup.object().shape({
                    qty: Yup.number().required("Qty is required").min(0.01, "Qty must be greater than 0"),
                    pricePerUnit: Yup.number().required("Price is required").min(0, "Price cannot be negative"),
                })
            ),
        }),
        onSubmit: (values) => {
            const updatedValues = { ...values };

            if (values.id === 0) {


                delete updatedValues.enqNo;
                delete updatedValues.id;

            }


            onSave(updatedValues)
        },
    });

    const { packagingAndForwardingChargesPercentage, discountAmount } = formik.values;

    useEffect(() => {
        const pct = parseFloat(formik.values.packagingAndForwardingChargesPercentage) || 0;
        const disc = parseFloat(formik.values.discountAmount) || 0;
        // say P&F charges = pct% of discountAmount
        const pandf = +(disc * pct / 100).toFixed(2);

        formik.setFieldValue('packagingAndForwardingCharges', pandf);
    }, [
        packagingAndForwardingChargesPercentage,
        discountAmount
    ]);

    const parseFloatOrZero = (value) => isNaN(parseFloat(value)) ? 0 : parseFloat(value);



    useEffect(() => {
        const net = parseFloatOrZero(formik.values.netAmount);
        const discount = parseFloatOrZero(formik.values.discountPercentage);
        const pandf = parseFloatOrZero(formik.values.packagingAndForwardingCharges);
        const discountAmount = ((discount / 100) * net).toFixed(2);
        const taxable = (net - discountAmount + pandf).toFixed(2);
        formik.setFieldValue('discountAmount', discountAmount);
        formik.setFieldValue('taxableAmount', taxable);
    }, [formik.values.discountPercentage, formik.values.netAmount, formik.values.packagingAndForwardingCharges]);

    useEffect(() => {
        const taxable = parseFloatOrZero(formik.values.taxableAmount);
        const gst = parseFloatOrZero(formik.values.gstPercentage);
        const gstAmount = ((gst / 100) * taxable).toFixed(2);
        const total = (taxable + parseFloatOrZero(gstAmount)).toFixed(2);
        const roundOff = (Math.round(total) - total).toFixed(2);
        formik.setFieldValue('gstAmount', gstAmount);
        formik.setFieldValue('totalAmount', Math.round(total));
        formik.setFieldValue('roundOff', roundOff);
    }, [formik.values.gstPercentage, formik.values.taxableAmount]);

    const fetchQuotationDetails = useCallback(async () => {
        if (!quotationId) return;

        try {
            setLoading(true);
            const data = await apiService.get(`/quotation/${quotationId}`);
            setInitialData(data)
        } catch (err) {
            setError("Failed to fetch Enquiry Details");
        } finally {
            setLoading(false);
        }
    }, [quotationId])

    useEffect(() => {
        if (location.pathname.includes('/quotation/edit')) {
            fetchQuotationDetails();
        }
    }, [location]);

    const handleEnquiryChange = async (enquiry) => {

        const response = await apiService.get('/enquiry/' + enquiry.id);
        formik.setFieldValue("enquiry", response);

    }

    const [searchQuery, setSearchQuery] = useState(formik.values.enquiry?.enqNo || '');
    const handleSearchChange = async (event, value) => {
        if (value === 'undefined') {
            // setSearchQuery('')
            return
        }
        setSearchQuery(value);
        setLoading(true)
        const data = await searchEnquiry(value);
        // console.log(data)
        setEnquiryList(data);
        setLoading(false)
    };

    const headerStyle = {
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
        color: '#333',
        fontSize: '1rem',
        borderBottom: '2px solid #ccc',
    }

    const cellTextInputStyle = {
        width: "60px",
        backgroundColor: "transparent",
        "& .MuiInputBase-input": {
            color: "black",        // Keep text visible
            caretColor: "black",   // Keep cursor visible
            textAlign: "center",
            fontSize: "14px"// Center align text
        },

    }

    useEffect(() => {
        formik.setFieldValue("quotationProducts", formik.values.enquiry?.enquiredProducts);
    }, [formik.values.enquiry]);



    const debounceTimeout = useRef(null);
    const handleSearchChangeProduct = async (event, value, index) => {
        if (event?.target?.value === 'undefined') {
            // setSearchQuery('')
            return
        }
        // formik.setFieldValue(`enquiredProducts[${index}].searchQuery`, value);

        setLoading(true)
        // console.log("query",value)
        debounceTimeout.current = setTimeout(async () => {
            const data = await inventoryItemSearch(event?.target?.value);
            setProductList(data);
            setLoading(false)
        }, 1500)
        // console.log(data)

    };

    const addProduct = () => {
        formik.setValues({
            ...formik.values,
            quotationProducts: [
                ...formik.values.quotationProducts,
                { productNameRequired: "", pricePerUnit: "", qty: "" }, // Empty product template
            ],
        });
    };

    // const [netAmount,setNetAmount] = useState(0);

    // useEffect(() => {
    //     let amount_total = 0;
    //     console.log(formik.values.netAmount)

    //     console.log("USe EFfect")
    //     const products = formik.values.quotationProducts || [];

    //     products.forEach((product) => {
    //         const amount = parseFloat(
    //             (product.qty * (
    //                 (product.pricePerUnit || 0) -
    //                 ((product?.discountPercentage || 0) * (product?.pricePerUnit || 0) / 100)
    //             )).toFixed(2)
    //         );

    //         amount_total += amount;
    //     });

    //     console.log(formik.values.netAmount)
    //     formik.setFieldValue("netAmount", amount_total);


    // }, [formik.values.quotationProducts, initialData, formik.values.enquiry])


    // Helper
    const parseNum = v => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };

    useEffect(() => {
        const prods = formik.values.quotationProducts || [];

        // 1) Net
        let net = 0;
        prods.forEach(p => {
            const qty = parseNum(p.qty);
            const price = parseNum(p.pricePerUnit);
            const dp = parseNum(p.discountPercentage);
            net += qty * price * (1 - dp / 100);
        });

        // 2) Discount & taxable
        const globalDp = parseNum(formik.values.discountPercentage);
        const pafPct = parseNum(formik.values.packagingAndForwardingChargesPercentage);
        const discountAmount = +(net * globalDp / 100).toFixed(2);
        const taxableAmount = +(net - discountAmount).toFixed(2);

        // 3) P&F charges (pct of the discount)
        const packagingAndForwardingCharges = +(((net - discountAmount) * pafPct / 100)).toFixed(2);

        // 4) GST, total & roundOff
        const gp = parseNum(formik.values.gstPercentage);
        const gstAmount = +(taxableAmount * gp / 100).toFixed(2);
        const rawTotal = taxableAmount + gstAmount + packagingAndForwardingCharges;
        const total = Math.round(rawTotal);
        const roundOff = +(total - rawTotal).toFixed(2);

        // 5) Write back _all_ computed fields
        formik.setFieldValue('netAmount', net.toFixed(2));
        formik.setFieldValue('discountAmount', discountAmount);
        formik.setFieldValue('taxableAmount', taxableAmount);
        formik.setFieldValue('packagingAndForwardingCharges', packagingAndForwardingCharges);
        formik.setFieldValue('gstAmount', gstAmount);
        formik.setFieldValue('totalAmount', total);
        formik.setFieldValue('roundOff', roundOff);

    }, [
        formik.values.quotationProducts,
        formik.values.discountPercentage,
        formik.values.packagingAndForwardingChargesPercentage,
        formik.values.gstPercentage
    ]);

    useEffect(() => {
        const taxableAmount = Number(formik.values.taxableAmount || 0);
        const gstPercentage = Number(formik.values.gstPercentage || 0);

        const gstAmount = (taxableAmount * gstPercentage * 0.01).toFixed(2);
        const totalAmount = (taxableAmount + Number(gstAmount)).toFixed(2);

        formik.setValues({
            ...formik.values,
            gstAmount,
            totalAmount
        });

    }, [formik.values.taxableAmount, formik.values.gstPercentage]);

    const removeProduct = (index) => {
        const updatedProducts = [...formik.values.quotationProducts];
        updatedProducts.splice(index, 1); // Remove product at index
        formik.setValues({ ...formik.values, quotationProducts: updatedProducts });
    };

    const printDocument = async () => {
        await apiService.download(`/quotation/pdf/${quotationId}`)
    }

    return (
        <div>
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader
                        title={
                            <Typography variant="h4" gutterBottom>
                                {initialData.id ? 'Update Quotation' : 'Add Quotation'}
                            </Typography>
                        }
                        action={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    select
                                    label="Quotation Status"
                                    name="quotationStatus"
                                    value={formik.values.quotationStatus}
                                    onChange={formik.handleChange}
                                    size="small"
                                    sx={{ minWidth: 120 }}
                                >
                                    {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {status.charAt(0) + status.slice(1).toLowerCase()}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {quotationId && formik.values.quotationStatus === 'ACCEPTED' && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => navigate('/sales/sales-order/add', {
                                            state: { prefillQuotationId: quotationId }
                                        })}
                                    >
                                        Convert to Sales Order
                                    </Button>
                                )}
                                {quotationId && (
                                    <Button variant="contained" color="info" onClick={printDocument}>
                                        Print
                                    </Button>
                                )}
                            </Box>
                        }
                    />


                    <CardContent>


                        <Grid container spacing={2}>
                            {(initialData.id) &&
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        margin="normal"
                                        label="Quotation No"
                                        name="qtnNo"
                                        value={formik.values.qtnNo}
                                        onChange={formik.handleChange}
                                        // error={formik.touched.enqNo && Boolean(formik.errors.enqNo)}
                                        // helperText={formik.touched.enqNo && formik.errors.enqNo}
                                        inputProps={{ readOnly: true }}
                                        size="small"
                                    />

                                </Grid>
                            }
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    margin="normal"
                                    name="qtnDate"
                                    value={formik.values.qtnDate}
                                    onChange={formik.handleChange}
                                    error={formik.touched.qtnDate && Boolean(formik.errors.qtnDate)}
                                    helperText={formik.touched.qtnDate && formik.errors.qtnDate}
                                    size="small"
                                    InputLabelProps={{
                                        shrink: true
                                    }}
                                    label="Quotation Date"
                                />


                            </Grid>
                        </Grid>

                        <Card sx={{ maxWidth: 'inherit', mx: 'auto', mt: '10px', mb: '10px' }}>
                            <CardHeader title={
                                <Typography variant="h6" gutterBottom sx={{ mb: 0, mt: 1 }}>
                                    Enquiry Details
                                </Typography>} />
                            <Grid container spacing={6}>
                                <Grid item xs={6}>
                                    <Autocomplete
                                        fullWidth
                                        name="enquiry.enqNo"
                                        onChange={(event, newValue) => {
                                            formik.setFieldValue('enquiry', newValue || null);
                                            handleEnquiryChange(newValue);
                                        }}
                                        inputValue={searchQuery}
                                        value={formik.values.enquiry || null} // ✅ Fix value issue
                                        onInputChange={(event, newInputValue) => {
                                            handleSearchChange(event, newInputValue);
                                        }}
                                        options={enquiryList}
                                        getOptionLabel={(option) =>
                                            option?.enqNo || ''}
                                        isOptionEqualToValue={(option, value) =>
                                            !!option?.enqNo && !!value?.enqNo && option.enqNo === value.enqNo
                                        }
                                        loading={loading}
                                        noOptionsText={loading ? 'Loading...' : 'No items found'}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Enquiry No"
                                                variant="outlined"
                                                fullWidth
                                                size="small"
                                            />

                                        )}
                                        sx={{ ml: 2, mt: 2 }}
                                    />

                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Enquiry Date"
                                        margin="normal"
                                        readOnly
                                        name="enqDate"
                                        value={formik.values.enquiry?.enqDate ? String(formik.values.enquiry.enqDate) : ' '}
                                        size="small"
                                        sx={{ mt: 2, ml: -2 }}
                                    />
                                </Grid>
                            </Grid>
                            {/*{console.log(formik.values.enquiry)}*/}
                            <Grid container spacing={6}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Company"
                                        margin="normal"
                                        readOnly
                                        name="companyName"
                                        value={formik.values.enquiry?.contact?.companyName ? String(formik.values.enquiry.contact.companyName) : ''}
                                        size="small"
                                        sx={{ ml: 2, mt: 2 }}
                                    />
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="GST No."
                                        margin="normal"
                                        readOnly
                                        name="gstNo"
                                        value={formik.values.enquiry?.contact?.gstNumber ? String(formik.values.enquiry.contact.gstNumber) : ''}
                                        size="small"
                                        sx={{ mt: 2, ml: -2 }}
                                    />
                                </Grid>

                            </Grid>

                            <Grid container spacing={6}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Contact Person"
                                        margin="normal"
                                        readOnly
                                        name="person"
                                        value={formik.values.enquiry?.contact?.personDetails[0]?.personName ? String(formik.values.enquiry.contact.personDetails[0]?.personName) : ''}
                                        size="small"
                                        sx={{ ml: 2, mt: 2 }}
                                    />
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Address."
                                        margin="normal"
                                        readOnly
                                        name="address"
                                        value={
                                            formik.values.enquiry?.contact?.addresses?.[0]
                                                ? [
                                                    formik.values.enquiry.contact.addresses[0].street1,
                                                    formik.values.enquiry.contact.addresses[0].street2,
                                                    formik.values.enquiry.contact.addresses[0].state,
                                                    formik.values.enquiry.contact.addresses[0].country
                                                ].filter(Boolean).join(', ') // Removes empty values and joins with ", "
                                                : ''
                                        }
                                        size="small"
                                        sx={{
                                            mt: 2, ml: -2,
                                            '& .MuiInputBase-input': { fontSize: '14px' }, // Adjust font size for input text
                                            // '& .MuiInputLabel-root': { fontSize: '12px' } // Adjust font size for the label


                                        }}
                                    />
                                </Grid>

                            </Grid>

                        </Card>

                        <Card sx={{ maxWidth: 'inherit', mx: 'auto', mt: '10px', mb: '20px' }}>
                            <CardHeader title={
                                <Typography variant="h6" gutterBottom sx={{ mb: 0, mt: 1 }}>
                                    Products
                                </Typography>}
                            />

                            <CardContent>


                                <TableContainer component={Paper}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>

                                                <TableCell align={"center"} sx={headerStyle}>No</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Product Name</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Description</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Qty</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Price</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Per</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Discount</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Amount</TableCell>
                                                <TableCell align={"center"} sx={headerStyle}>Action</TableCell>

                                            </TableRow>
                                        </TableHead>
                                        <TableBody>

                                            {formik.values.quotationProducts?.map((product, index) => (
                                                <TableRow>
                                                    <TableCell align={"center"}>{index + 1}</TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            fullWidth
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].productNameRequired`}
                                                            value={
                                                                formik.values.quotationProducts[index]?.inventoryItem?.name
                                                                || formik.values.quotationProducts[index]?.productNameRequired
                                                                || ''
                                                            }
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                            error={Boolean(
                                                                formik.touched.quotationProducts?.[index]?.productNameRequired &&
                                                                formik.errors.quotationProducts?.[index]?.productNameRequired
                                                            )}
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.productNameRequired &&
                                                                formik.errors.quotationProducts?.[index]?.productNameRequired
                                                            }
                                                            inputProps={{ inputMode: 'search' }}
                                                        />

                                                    </TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            style={{ "width": "100%", "font": '5px' }}
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].specialInstruction`} // Correct Formik field name
                                                            value={formik.values.quotationProducts[index]?.specialInstruction || ""} // Ensure controlled input
                                                            onChange={(event) => {

                                                                formik.handleChange(event);

                                                            }}
                                                            onBlur={formik.handleBlur}
                                                            error={
                                                                formik.touched.quotationProducts?.[index]?.specialInstruction &&
                                                                Boolean(formik.errors.quotationProducts?.[index]?.specialInstruction)
                                                            }
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.specialInstruction &&
                                                                formik.errors.quotationProducts?.[index]?.specialInstruction
                                                            }
                                                            inputProps={{
                                                                inputMode: "text", // Helps mobile users enter numbers easily

                                                            }}
                                                        />
                                                    </TableCell>

                                                    <TableCell align={"center"}>

                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].qty`} // Correct Formik field name
                                                            value={formik.values.quotationProducts[index]?.qty || 0} // Ensure controlled input
                                                            onChange={(event) => {
                                                                const { value } = event.target;
                                                                if (/^\d*\.?\d*$/.test(value)) { // Allow only numbers and decimals
                                                                    formik.handleChange(event);
                                                                }
                                                            }}
                                                            onBlur={formik.handleBlur}
                                                            error={
                                                                formik.touched.quotationProducts?.[index]?.qty &&
                                                                Boolean(formik.errors.quotationProducts?.[index]?.qty)
                                                            }
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.qty &&
                                                                formik.errors.quotationProducts?.[index]?.qty
                                                            }
                                                            inputProps={{
                                                                inputMode: "decimal", // Helps mobile users enter numbers easily
                                                                pattern: "[0-9]*\\.?[0-9]*", // Ensures numeric input
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].pricePerUnit`}
                                                            value={
                                                                // 1) if the user has typed in pricePerUnit (even if 0), use it
                                                                formik.values.quotationProducts[index]?.pricePerUnit
                                                                // 2) otherwise, fall back to sellingPrice (which might be null/undefined)
                                                                ?? formik.values.quotationProducts[index]?.inventoryItem?.sellingPrice
                                                                // 3) finally, default to empty string
                                                                ?? ''
                                                            }
                                                            onChange={(event) => {
                                                                const { value } = event.target;
                                                                if (/^\d*\.?\d*$/.test(value)) {
                                                                    formik.handleChange(event);

                                                                }
                                                            }}
                                                            onBlur={formik.handleBlur}
                                                            error={
                                                                formik.touched.quotationProducts?.[index]?.pricePerUnit &&
                                                                Boolean(formik.errors.quotationProducts?.[index]?.pricePerUnit)
                                                            }
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.pricePerUnit &&
                                                                formik.errors.quotationProducts?.[index]?.pricePerUnit
                                                            }
                                                            inputProps={{
                                                                inputMode: 'decimal',
                                                                pattern: '[0-9]*\\.?[0-9]*',
                                                            }}
                                                        />
                                                    </TableCell>


                                                    <TableCell align={"center"}>{"Each"}</TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].discountPercentage`}
                                                            value={
                                                                // if inventoryItem has a default discountPercentage, use it;
                                                                // otherwise use the Formik value (or empty string)
                                                                formik.values.quotationProducts[index]?.inventoryItem?.discountPercentage != null
                                                                    ? formik.values.quotationProducts[index].inventoryItem.discountPercentage
                                                                    : formik.values.quotationProducts[index]?.discountPercentage || ''
                                                            }
                                                            onChange={(event) => {
                                                                const { value } = event.target;
                                                                if (/^\d*\.?\d*$/.test(value)) {
                                                                    formik.handleChange(event);
                                                                }
                                                            }}
                                                            onBlur={formik.handleBlur}
                                                            error={
                                                                formik.touched.quotationProducts?.[index]?.discountPercentage &&
                                                                Boolean(formik.errors.quotationProducts?.[index]?.discountPercentage)
                                                            }
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.discountPercentage &&
                                                                formik.errors.quotationProducts?.[index]?.discountPercentage
                                                            }
                                                            inputProps={{
                                                                inputMode: 'decimal',
                                                                pattern: '[0-9]*\\.?[0-9]*',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {(() => {

                                                            const prod = formik.values.quotationProducts[index];
                                                            const qty = prod.qty || 0;
                                                            // fallback price: inventoryItem.sellingPrice or pricePerUnit
                                                            const unitPrice = prod.pricePerUnit ? prod.pricePerUnit : 0;
                                                            const discountPct = prod.discountPercentage ?? 0;
                                                            const netUnit = unitPrice * (1 - discountPct / 100);
                                                            return (qty * netUnit).toFixed(2);
                                                        })()}
                                                    </TableCell>
                                                    <TableCell style={{ "cursor": "pointer" }} align={"center"}><RemoveCircle color={"error"} onClick={() => removeProduct(index)} /></TableCell>

                                                </TableRow>

                                            ))}
                                        </TableBody>
                                    </Table>

                                </TableContainer>



                            </CardContent>

                        </Card>

                        <Card sx={{ p: 2, mt: 3 }}>
                            <CardHeader
                                title="Financial Details"
                                titleTypographyProps={{ variant: 'h6', gutterBottom: true }}
                                sx={{ pb: 0 }}
                            />
                            <CardContent sx={{ pt: 1 }}>
                                <Grid container spacing={2}>
                                    {/* Net Amount */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Net Amount"
                                            name="netAmount"
                                            value={formik.values.netAmount}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* Discount Percentage */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Discount %"
                                            name="discountPercentage"
                                            value={formik.values.discountPercentage}
                                            onChange={formik.handleChange}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* Discount Value */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Discount Value"
                                            name="discountAmount"
                                            value={formik.values.discountAmount}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* P & F Charges */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="P & F Charges %"
                                            name="packagingAndForwardingChargesPercentage"
                                            value={formik.values.packagingAndForwardingChargesPercentage}
                                            onChange={formik.handleChange}
                                            size="small"
                                        />
                                    </Grid>
                                    {/* P & F Charges */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="P & F Charges"
                                            name="packagingAndForwardingCharges"
                                            value={formik.values.packagingAndForwardingCharges}
                                            onChange={formik.handleChange}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* Taxable Amount */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Taxable Amount"
                                            name="taxableAmount"
                                            value={formik.values.taxableAmount}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            select
                                            label="GST %"
                                            name="gstPercentage"
                                            value={formik.values.gstPercentage}
                                            onChange={formik.handleChange}
                                            size="small"
                                        >
                                            {[0, 5, 12, 18, 28].map((pct) => (
                                                <MenuItem key={pct} value={pct}>
                                                    {pct}%
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>

                                    {/* GST Amount */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="GST Amount"
                                            name="gstAmount"
                                            value={formik.values.gstAmount}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* Round Off */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Round Off"
                                            name="roundOff"
                                            value={formik.values.roundOff}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>

                                    {/* Total Amount */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Total Amount"
                                            name="totalAmount"
                                            value={formik.values.totalAmount}
                                            InputProps={{ readOnly: true }}
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>


                        <Card sx={{ p: 2, mt: 3 }}>
                            <CardHeader
                                title="Quotation Terms"
                                titleTypographyProps={{ variant: 'h6', gutterBottom: true }}
                                sx={{ pb: 0 }}
                            />
                            <CardContent sx={{ pt: 1 }}>
                                <Grid container spacing={2}>
                                    {/* Valid Till (date) */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Valid Till"
                                            name="validTill"
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                            value={formik.values.validTill}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>

                                    {/* Payment Terms */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Payment Terms"
                                            name="paymentTerms"
                                            size="small"
                                            value={formik.values.paymentTerms}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>

                                    {/* Delivery Terms */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Delivery Terms"
                                            name="deliveryTerms"
                                            size="small"
                                            value={formik.values.deliveryTerms}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>

                                    {/* Inspection Terms */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Inspection Terms"
                                            name="inspectionTerms"
                                            size="small"
                                            value={formik.values.inspectionTerms}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>

                                    {/* Prices Terms */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Prices Terms"
                                            name="pricesTerms"
                                            size="small"
                                            value={formik.values.pricesTerms}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>

                                    {/* Notes (multiline) */}
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Additional Notes"
                                            name="notes"
                                            size="small"
                                            multiline
                                            rows={3}
                                            value={formik.values.notes}
                                            onChange={formik.handleChange}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>


                        <Box sx={{ mt: 5, ml: 5, mb: 5 }}>
                            <Button type="submit" disabled={!formik.isValid}>
                                Save
                            </Button>

                            <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} sx={{ ml: 2 }}>
                                Cancel
                            </Button>




                        </Box>

                    </CardContent>
                </Card>



            </form>



        </div>
    );
};

export default AddUpdateQuotation;
