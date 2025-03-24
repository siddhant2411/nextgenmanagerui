import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFormik} from "formik";
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
    Typography
} from "@mui/material";
import {inventoryItemSearch, searchContacts, searchEnquiry} from "../../services/commonAPI";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import apiService from "../../services/apiService";
import {Remove, RemoveCircle} from "@mui/icons-material";
import enquiry from "../enquiry/Enquiry";

const AddUpdateQuotation = ({onSave}) => {

    const [initialData,setInitialData] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedItem,setSelectedItem] = useState('');
    const [error, setError] = useState(null);
    const [enquiryList, setEnquiryList]=useState([]);
    const [productList,setProductList]=useState([]);
    const {quotationId} =useParams();

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
            quotationProducts: initialData.quotationProducts? initialData.quotationProducts: initialData.enquiry?.enquiredProducts || [],
            netAmount:initialData.netAmount? initialData.netAmount :0,
            gstPercentage:initialData.gstPercentage? initialData.gstPercentage :0,
            gstAmount:initialData.gstAmount? initialData.gstAmount :0,
            discountPercentage:initialData.discountPercentage? initialData.discountPercentage :0,
            discountAmount:initialData.discountAmount? initialData.discountAmount :0,
            roundOff:initialData.roundOff? initialData.roundOff :0,
            totalAmount:initialData.totalAmount? initialData.totalAmount :0,
            pandfcharges:initialData.pandfcharges? initialData.pandfcharges :0,
            taxableAmount:initialData.discountAmount? initialData.pandfcharges+initialData.netAmount-initialData.discountAmount:0,



        },
        validationSchema: Yup.object({
            quotationProducts: Yup.array().of(
                Yup.object().shape({
                    pricePerUnit: Yup.number()
                        .typeError("Price must be a number")
                        .min(0, "Price cannot be negative") // Allows 0 but prevents negative values
                        .required("Price is required"),

                })
            ),
        }),
        onSubmit: (values) => {
            const updatedValues = { ...values };

            if (values.id === 0) {
                console.log("INSIDE");


                delete updatedValues.enqNo;
                delete updatedValues.id;
                console.log(updatedValues);

            }



            onSave(updatedValues)
        },
    });

    const fetchQuotationDetails =useCallback(async () => {
        console.log("Enquiry"+quotationId)
        if (!quotationId) return;

        try {
            setLoading(true);
            const data = await apiService.get(`/quotation/${quotationId}`);
            setInitialData(data)
            console.log(data)
        } catch (err) {
            setError("Failed to fetch Enquiry Details");
        } finally {
            setLoading(false);
        }
    },[quotationId])

    useEffect(() => {
        if (location.pathname.includes('/quotation/edit')) {
            fetchQuotationDetails();
        }
    }, [location]);

    const handleEnquiryChange = async (enquiry)=>{

        const response = await apiService.get('/enquiry/'+enquiry.id);
        formik.setFieldValue("enquiry",response);
    }

    const [searchQuery, setSearchQuery] = useState(formik.values.enquiry?.enqNo || '');
    const handleSearchChange = async (event, value) => {
        if(value==='undefined'){
            // setSearchQuery('')
            return
        }
        setSearchQuery(value);
        setLoading(true)
        const data =await searchEnquiry(value);
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

    const cellTextInputStyle ={
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
        formik.setFieldValue("quotationProducts",formik.values.enquiry?.enquiredProducts);
    }, [formik.values.enquiry]);



    const debounceTimeout = useRef(null);
    const handleSearchChangeProduct = async (event, value,index) => {
        if(event?.target?.value==='undefined'){
            // setSearchQuery('')
            return
        }
        console.log(index)
        // formik.setFieldValue(`enquiredProducts[${index}].searchQuery`, value);

        setLoading(true)
        // console.log("query",value)
        debounceTimeout.current = setTimeout(async () => {
            const data = await inventoryItemSearch(event?.target?.value);
            setProductList(data);
            setLoading(false)
        },1500)
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

    useEffect(()=>{
        let amount_total = 0;

        // Ensure quotationProducts is an array before using forEach
        const products = formik.values.quotationProducts || [];

        products.forEach((product) => {
            const amount = parseFloat(
                (product.qty * (
                    ((product?.pricePerUnit || 0)) -
                    ((product?.discountPercentage || 0) * (product?.pricePerUnit || 0) / 100)
                )).toFixed(2)
            );

            amount_total += amount;
        });

       formik.setFieldValue("netAmount",amount_total);


    },[formik.values.quotationProducts,])


    useEffect(() => {
        const discountPercentage = Number(formik.values.discountPercentage || 0);
        const netAmount = Number(formik.values.netAmount || 0);
        const pandfcharges = Number(formik.values.pandfcharges || 0); // Ensure it's a number

        const discountAmount = (discountPercentage * netAmount * 0.01).toFixed(2);
        const taxableAmount = (netAmount - discountAmount + pandfcharges).toFixed(2);

        formik.setValues({
            ...formik.values,
            discountAmount,
            taxableAmount
        });

        console.log("HELLO");
    }, [formik.values.netAmount, formik.values.discountPercentage, formik.values.pandfcharges]);


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

    const printDocument = async ()=>{
        await apiService.download(`/quotation/pdf/${quotationId}`)
    }

    return (
        <div>
            <form  onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader
                        title={
                            <Typography variant="h4" gutterBottom>
                                {initialData.id ? 'Update Quotation' : 'Add Quotation'}
                            </Typography>
                        }
                        action={
                            quotationId && (
                                <Button
                                    variant="contained"
                                    color="info"
                                    onClick={printDocument}
                                >
                                    Print
                                </Button>
                            )
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
                                        inputProps={{readOnly: true}}
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

                        <Card sx={{maxWidth: 'inherit', mx: 'auto', mt: '10px', mb: '10px'}}>
                            <CardHeader title={
                                <Typography variant="h6" gutterBottom sx={{mb: 0, mt: 1}}>
                                    Enquiry Details
                                </Typography>}/>
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
                                        sx={{ml: 2, mt: 2}}
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
                                        sx={{ml: 2, mt: 2 }}
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
                                        sx={{ml: 2, mt: 2 }}
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
                                        sx={{ mt: 2, ml: -2,
                                            '& .MuiInputBase-input': { fontSize: '14px' }, // Adjust font size for input text
                                            // '& .MuiInputLabel-root': { fontSize: '12px' } // Adjust font size for the label


                                    }}
                                    />
                                </Grid>

                            </Grid>

                        </Card>

                        <Card sx={{maxWidth: 'inherit', mx: 'auto', mt: '10px', mb: '20px'}}>
                            <CardHeader title={
                                <Typography variant="h6" gutterBottom sx={{mb: 0, mt: 1}}>
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
                                                    <TableCell align={"center"}>{index+1}</TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            style={{"width":"100%","font": '5px'}}
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].productNameRequired`} // Correct Formik field name
                                                            value={formik.values.quotationProducts[index]?.productNameRequired || ""} // Ensure controlled input
                                                            onChange={(event) => {

                                                                formik.handleChange(event);

                                                            }}
                                                            onBlur={formik.handleBlur}
                                                            error={
                                                                formik.touched.quotationProducts?.[index]?.productNameRequired &&
                                                                Boolean(formik.errors.quotationProducts?.[index]?.productNameRequired)
                                                            }
                                                            helperText={
                                                                formik.touched.quotationProducts?.[index]?.productNameRequired &&
                                                                formik.errors.quotationProducts?.[index]?.productNameRequired
                                                            }
                                                            inputProps={{
                                                                inputMode: "search", // Helps mobile users enter numbers easily

                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            style={{"width":"100%","font": '5px'}}
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
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].pricePerUnit`} // Correct Formik field name
                                                            value={formik.values.quotationProducts[index]?.pricePerUnit || 0} // Ensure controlled input
                                                            onChange={(event) => {
                                                                const { value } = event.target;
                                                                if (/^\d*\.?\d*$/.test(value)) { // Allow only numbers and decimals
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
                                                                inputMode: "decimal", // Helps mobile users enter numbers easily
                                                                pattern: "[0-9]*\\.?[0-9]*", // Ensures numeric input
                                                            }}
                                                        />


                                                    </TableCell>

                                                    <TableCell align={"center"}>{"Each"}</TableCell>
                                                    <TableCell align={"center"}>
                                                        <TextField
                                                            size="small"
                                                            variant="standard"
                                                            sx={cellTextInputStyle}
                                                            name={`quotationProducts[${index}].discountPercentage`} // Correct Formik field name
                                                            value={formik.values.quotationProducts[index]?.discountPercentage || 0} // Ensure controlled input
                                                            onChange={(event) => {
                                                                const { value } = event.target;
                                                                if (/^\d*\.?\d*$/.test(value)) { // Allow only numbers and decimals
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
                                                                inputMode: "decimal", // Helps mobile users enter numbers easily
                                                                pattern: "[0-9]*\\.?[0-9]*", // Ensures numeric input
                                                            }}
                                                        />


                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {
                                                            Number(
                                                                (product.qty * (
                                                                    ((formik.values.quotationProducts[index]?.pricePerUnit || 0)) -
                                                                    ((formik.values.quotationProducts[index]?.discountPercentage || 0) *
                                                                        (formik.values.quotationProducts[index]?.pricePerUnit || 0) / 100)
                                                                ))
                                                                    .toFixed(2)
                                                            )
                                                        }
                                                    </TableCell>
                                                    <TableCell  style={{"cursor":"pointer"}} align={"center"}><RemoveCircle color={"error"} onClick={()=>removeProduct(index)}/></TableCell>

                                                </TableRow>

                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/*TODO: Add this button latter if required*/}
                                    {/*<Button  variant="contained"*/}
                                    {/*         color="primary"*/}
                                    {/*         style={{ float: "right", margin:"15px" }}*/}
                                    {/*         onClick={() => addProduct()}*/}

                                    {/*>*/}

                                    {/*    Add Product*/}
                                    {/*</Button>*/}
                                </TableContainer>



                            </CardContent>

                        </Card>

                        <Card>


                            <Grid >

                                    <TextField
                                        fullWidth
                                        label="Net Amount"
                                        margin="normal"
                                        readOnly
                                        name="netAmount"
                                        value={formik.values.netAmount}
                                        size="small"
                                        sx={{ml: 2, mt: 2, width:"250px" }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Discount Percentage"
                                        margin="normal"
                                        // readOnly
                                        onChange={formik.handleChange}
                                        name="discountPercentage"
                                        value={formik.values.discountPercentage}
                                        size="small"
                                        sx={{ mt: 2,ml: 3,width:"250px" }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Discount Value "
                                        margin="normal"
                                        readOnly

                                        name="discountAmount"
                                        value={formik.values.discountAmount}
                                        size="small"
                                        sx={{ mt: 2,ml: 3,width:"250px" }}
                                    />


                                    <TextField
                                        fullWidth
                                        label="P & F charges"
                                        margin="normal"
                                        // readOnly
                                        onChange={formik.handleChange}
                                        name="pandfcharges"
                                        value={formik.values.pandfcharges}
                                        size="small"
                                        sx={{ mt: 2,ml: 3,width:"250px" }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Texable Amount"
                                        margin="normal"
                                        // readOnly
                                        onChange={formik.handleChange}
                                        name="texableAmount"
                                        value={formik.values.taxableAmount}
                                        size="small"
                                        sx={{ mt: 2,ml: 3,width:"250px" }}
                                    />




                            </Grid>

                            <Grid>

                                    <TextField
                                        fullWidth
                                        label="GST Pecentage"
                                        margin="normal"
                                        // readOnly
                                        onChange={formik.handleChange}
                                        name="gstPercentage"
                                        value={formik.values.gstPercentage}
                                        size="small"
                                        sx={{ mt: 2,ml: 3,width:"250px" }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="GST Amount"
                                        margin="normal"
                                        // readOnly
                                        onChange={formik.handleChange}
                                        name="gstAmount"
                                        value={formik.values.gstAmount}
                                        size="small"
                                        sx={{ mt: 2,ml: 2,width:"250px" }}
                                    />




                                <TextField
                                    fullWidth
                                    label="Round Off"
                                    margin="normal"
                                    // readOnly
                                    onChange={formik.handleChange}
                                    name="totalAmount"
                                    value={
                                        (Math.round(formik.values.totalAmount) - formik.values.totalAmount)
                                            .toFixed(2)
                                            .replace(/^(-)?/, (sign) => (sign === "-" ? "-" : "+"))
                                    }
                                    size="small"
                                    sx={{ mt: 2,ml: 3,width:"250px" }}
                                />

                                <TextField
                                    fullWidth
                                    label="Total Amount"
                                    margin="normal"
                                    // readOnly
                                    onChange={formik.handleChange}
                                    name="totalAmount"
                                    value={Math.round(formik.values.totalAmount)}
                                    size="small"
                                    sx={{ mt: 2,ml: 3,width:"250px" }}
                                />
                            </Grid>

                        </Card>


                        <Box sx={{mt: 5, ml: 5, mb: 5}}>
                            <Button type="submit" variant="contained" color="primary" >
                                Save
                            </Button>

                            <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} sx={{ml: 2}}>
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
