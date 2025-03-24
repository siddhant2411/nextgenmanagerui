import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import {useFormik} from "formik";
import * as Yup from "yup";
import apiService from "../../services/apiService";
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
    TextField,
    Typography
} from "@mui/material";
import {inventoryItemSearch, searchContacts} from "../../services/commonAPI";
import {
    CreateNewFolder
} from "@mui/icons-material";
import {CardBody} from "react-bootstrap";

const AddUpdateEnquiry = ({onSave}) => {

    const [initialData,setInitialData] = useState([]);
    const navigate = useNavigate();
    const isEditMode = Boolean(initialData.id);
    const [loading, setLoading] = useState(false);
    const [selectedItem,setSelectedItem] = useState('');
    const [error, setError] = useState(null);
    const {enquiryId} =useParams();
    const location = useLocation();
    const [companyList, setCompanyList]=useState([]);
    const [productList,setProductList]=useState([]);
    const today = new Date()
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id: initialData.id || 0,
            enqNo: initialData.enqNo || null,
            enqDate: initialData.enqDate ||new Date().toISOString().split('T')[0],
            contact: {
                id: initialData.contact?.id || 0,
                companyName: initialData.contact?.companyName || '',
                gstNumber: initialData.contact?.gstNumber || '',
                notes: initialData.contact?.notes || '',
                addresses: initialData.contact?.addresses || [
                    {
                        id: 0,
                        street1: '',
                        street2: '',
                        state: '',
                        country: '',
                        contact: '',
                    },
                ],
                personDetails: initialData.contact?.personDetails || [
                    {
                        id: 0,
                        personName: '',
                        emailId: '',
                        phoneNumber: '',
                        contact: '',
                    },
                ],
            },
            lastContactedDate: initialData.lastContactedDate ,
            daysForNextFollowup: initialData.daysForNextFollowup || 30,
            enquireTrough: initialData.enquireTrough || '',
            enquiredProducts: initialData.enquiredProducts || [
                {
                    inventoryItem: {
                        itemCode: '',
                        name: '',
                        hsnCode: '',
                        uom: 'NOS',
                        itemType: 'RAW_MATERIAL',
                        dimension: '',
                        size1: '',
                        size2: '',
                        revision: '',
                        remarks: '',
                        basicMaterial: '',
                        inventoryItemId: 0,
                    },
                    productNameRequired: '--',
                    qty: 1,
                    specialInstruction: '',
                },
            ],
            enquiryConversationRecords: initialData.enquiryConversationRecords || [
                {
                    conversation: '',
                },
            ],
            closedDate: initialData.closedDate || '',
            closeReason: initialData.closeReason || '',
        },
        validationSchema: Yup.object({
            // enqNo: Yup.string().required('Enquiry Number is required'),
            enqDate: Yup.string().required('Enquiry Date is required'),
            contact: Yup.object().shape({
                companyName: Yup.string().required('Company Name is required')
            }),
            enquiredProducts: Yup.array().of(
                Yup.object({
                    qty: Yup.number()
                        .min(1, 'Quantity must be at least 1')
                        .required('Quantity is required'),

                    // specialInstruction: Yup.string(),
                    // inventoryItem: Yup.object({
                    //     name: Yup.string().required('Name is required'),
                    // }),
                    productNameRequired: Yup.string().required('Product Name is required'),
                })
            ),
            enquiryConversationRecords: Yup.array().of(
                Yup.object({
                    conversation: Yup.string().required('Conversation is required'),
                })
            ),
            daysForNextFollowup: Yup.number()
                .min(1, 'Days for next follow-up must be at least 1')
                .required('Days for Next Follow-up is required'),
            lastContactedDate : Yup.string().required('Last Contacted Date is required'),
            enquireTrough : Yup.string().required('Enquire Trough is required'),
        }),

        onSubmit: (values) => {
            const updatedValues = { ...values };

            if (Number(values.id) === 0) {  // Ensure `id` is treated as a number
                console.log("INSIDE");
                delete updatedValues.enqNo;
                delete updatedValues.id;
                console.log("Updated Values:", updatedValues);
            }

            onSave(updatedValues);  // Proceed with saving after modifications
        },
    });

    const [searchQuery, setSearchQuery] = useState(formik.values.contact?.companyName || '');
    const [searchQueryProduct, setSearchQueryProduct] = useState([]);

    const handleSearchChange = async (event, value) => {
        if(value==='undefined'){
            // setSearchQuery('')
            return
        }
        setSearchQuery(value);
        setLoading(true)
        const data =await searchContacts(value);
        // console.log(data)
        setCompanyList(data);
        setLoading(false)
    };

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

    const fetchEnquiryDetails =useCallback(async () => {
        console.log("Enquiry"+enquiryId)
        if (!enquiryId) return;

        try {
            setLoading(true);
            const data = await apiService.get(`/enquiry/${enquiryId}`);
            setInitialData(data)
            console.log(data)
        } catch (err) {
            setError("Failed to fetch Enquiry Details");
        } finally {
            setLoading(false);
        }
    },[enquiryId])

    useEffect(() => {
        if (location.pathname.includes('/enquiry/edit')) {
            fetchEnquiryDetails();
        }
    }, [location]);


    const handleProductChanges = (event)=>{
        formik.setFieldValue(event.target.name, event.target.value);

    }

    const handleProductRemove = (index) => {
        const updatedProducts = [...formik.values.enquiredProducts];
        updatedProducts.splice(index, 1);
        formik.setFieldValue('enquiredProducts', updatedProducts);
    };

    const handleConversationRemove = (index) => {
        const updatedConversation = [...formik.values.enquiryConversationRecords];
        updatedConversation.splice(index, 1);
        formik.setFieldValue('enquiryConversationRecords', updatedConversation);
    };

    const handleProductAdd = () => {
        formik.setFieldValue('enquiredProducts', [
            ...formik.values.enquiredProducts,
            {
                inventoryItem: {
                    itemCode: '',
                    name: '',
                    hsnCode: '',
                    uom: 'NOS',
                    itemType: 'RAW_MATERIAL',
                    dimension: '',
                    size1: '',
                    size2: '',
                    revision: '',
                    remarks: '',
                    basicMaterial: '',
                    inventoryItemId: '',
                },
                productNameRequired: '',
                qty: 1,
                specialInstruction: '',
                searchQuery: '', // Initialize search query for Autocomplete
            },
        ]);
    };

    const handleConversationAdd = () => {
        formik.setFieldValue('enquiryConversationRecords', [
            ...formik.values.enquiryConversationRecords,
            {
                conversation:''
            }
            ]
        )
    }

    const handleSubmit=()=>{
      formik.handleSubmit()
    }
    return (

        <div>
            <form onSubmit={formik.handleSubmit}>
                <Card sx={{maxWidth: 'inherit', mx: 'auto'}}>

                    <CardHeader titile={
                        <Typography variant="h4" gutterBottom>
                            {initialData.id ? 'Update Company' : 'Add Company'}
                        </Typography>
                    }/>
                    <CardContent>

                        <Typography variant="h4" gutterBottom>
                            {initialData.id ? 'Update Company' : 'Add Company'}
                        </Typography>

                        <Grid container spacing={2}>
                            {(initialData.id) &&
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        margin="normal"
                                        label="Enquiry No"
                                        name="enqNo"
                                        value={formik.values.enqNo}
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
                                    name="enqDate"
                                    value={formik.values.enqDate}
                                    onChange={formik.handleChange}
                                    error={formik.touched.enqDate && Boolean(formik.errors.enqDate)}
                                    helperText={formik.touched.enqDate && formik.errors.enqDate}
                                    size="small"
                                    InputLabelProps={{
                                        shrink: true
                                    }}
                                    label="Enquiry Date"
                                />
                            </Grid>
                        </Grid>

                        <Card sx={{maxWidth: 'inherit', mx: 'auto', mt: '30px', mb: '30px'}}>
                            <CardHeader title={
                                <Typography variant="h5" gutterBottom sx={{mb: 0, mt: 4}}>
                                    Company Details
                                </Typography>}/>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Autocomplete
                                            fullWidth
                                            margin={""}
                                            name="contact.companyName"
                                            onChange={(event, newValue) => {
                                                // Ensure newValue is not null/undefined
                                                formik.setFieldValue('contact', newValue);
                                            }}
                                            inputValue={searchQuery} // Controlled input value for the search query
                                            value={
                                                formik.values.contact?.companyName
                                                    ? {companyName: formik.values.contact.companyName}
                                                    : null
                                            } // Match Autocomplete value to the selected option
                                            onInputChange={(event, newInputValue) => {
                                                handleSearchChange(event, newInputValue);
                                            }}
                                            options={companyList} // List of available options
                                            getOptionLabel={(option) => option?.companyName || ''} // Ensure proper label for each option
                                            isOptionEqualToValue={(option, value) =>
                                                option?.companyName === value?.companyName
                                            }
                                            loading={loading}
                                            noOptionsText={loading ? 'Loading...' : 'No items found'}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Search and select a company"
                                                    variant="outlined"
                                                    fullWidth
                                                    error={
                                                        formik.touched.contact?.companyName &&
                                                        Boolean(formik.errors.contact?.companyName)
                                                    }
                                                    helperText={
                                                        formik.touched.contact?.companyName &&
                                                        formik.errors.contact?.companyName

                                                    }
                                                    size="small"
                                                />
                                            )}
                                            sx={{mb: 2, mt: 2}}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <div style={{"marginTop": "30px"}}>
                                            <Link to={{pathname: "/contact/add"}}
                                                  target="_blank" // Open in a new tab
                                                  rel="noopener noreferrer">
                                                <CreateNewFolder fontSize={"large"}/>
                                            </Link>
                                        </div>
                                    </Grid>

                                </Grid>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="GST No"
                                            margin="normal"
                                            readOnly
                                            name="gstNumber"
                                            value={formik.values.contact ? formik.values.contact.gstNumber : ''}
                                            // error={formik.touched.contact && Boolean(formik.errors.contact)}
                                            // helperText={formik.touched.contact && formik.errors.contact}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="State"
                                            margin="normal"
                                            readOnly
                                            name="state"
                                            value={formik.values.contact ? formik.values.contact.addresses[0].state : ''}
                                            // error={formik.touched.contact && Boolean(formik.errors.contact)}
                                            // helperText={formik.touched.contact && formik.errors.contact}
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Contact Person"
                                            margin="normal"
                                            readOnly
                                            name="contactPerson"
                                            value={formik.values.contact ? formik.values.contact.personDetails[0].personName : ''}
                                            // error={formik.touched.contact && Boolean(formik.errors.contact)}
                                            // helperText={formik.touched.contact && formik.errors.contact}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="GST No"
                                            margin="normal"
                                            name="gstNumber"
                                            readOnly
                                            value={formik.values.contact ? formik.values.contact.personDetails[0].phoneNumber : ''}
                                            // error={formik.touched.contact && Boolean(formik.errors.contact)}
                                            // helperText={formik.touched.contact && formik.errors.contact}
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader title={
                                <Typography variant="h5" gutterBottom sx={{mb: 0, mt: 4}}>
                                    Product Details
                                </Typography>

                            }/>

                            <CardContent>
                                {formik.values.enquiredProducts.map((item, index) => (
                                    <div key={index}>
                                        {/*{console.log(index)}*/}
                                        <Grid container spacing={6}>
                                            <Grid item xs={4}>
                                                <Autocomplete
                                                    fullWidth
                                                    name={`enquiredProducts[${index}].inventoryItem`}
                                                    onChange={(event, newValue) => {
                                                        // Update the selected value in Formik
                                                        formik.setFieldValue(`enquiredProducts[${index}].inventoryItem`, newValue || {});
                                                        formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, newValue.name || '')
                                                        setProductList([])
                                                    }}

                                                    value={formik.values.enquiredProducts[index]?.inventoryItem || null} // Controlled value for selected option
                                                    onInputChange={(event) =>

                                                        handleSearchChangeProduct(event)
                                                    }

                                                    options={productList} // List of available options
                                                    filterOptions={(options, state) =>
                                                        options.filter(
                                                            (option) =>
                                                                option.itemCode?.toLowerCase().includes(state.inputValue.toLowerCase()) ||
                                                                option.name?.toLowerCase().includes(state.inputValue.toLowerCase())
                                                        )
                                                    } // Custom filter logic to allow filtering by itemCode or name
                                                    getOptionLabel={(option) => `${option.itemCode || ''} - ${option.name || ''}`} // Display both itemCode and name
                                                    isOptionEqualToValue={(option, value) =>
                                                        option?.itemCode === value?.itemCode || option?.name === value?.name
                                                    } // Match options by itemCode or name
                                                    loading={loading}
                                                    noOptionsText={loading ? 'Loading...' : 'No items found'}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Search and select a product"
                                                            variant="outlined"
                                                            size="small"

                                                        />

                                                    )}
                                                    sx={{mb: 2, mt: 2}}
                                                />
                                            </Grid>

                                            <Grid item xs={4}>
                                                <TextField
                                                    fullWidth
                                                    label="Product Name"
                                                    margin="normal"
                                                    name={`enquiredProducts[${index}].productNameRequired`}
                                                    InputProps={{
                                                        readOnly: !!formik.values.enquiredProducts[index]?.inventoryItem?.name,
                                                    }}
                                                    value={
                                                        formik.values.enquiredProducts[index]?.inventoryItem?.name
                                                            ? formik.values.enquiredProducts[index]?.inventoryItem?.name
                                                            : formik.values.enquiredProducts[index]?.productNameRequired
                                                    }
                                                    onChange={(e) => handleProductChanges(e, index)}
                                                    size="small"
                                                    // error={
                                                    //     formik.touched.enquiredProducts?.[index]?.productNameRequired &&
                                                    //     Boolean(formik.errors.enquiredProducts?.[index]?.productNameRequired) &&
                                                    //     !formik.values.enquiredProducts[index]?.inventoryItem?.name // Show error only if inventoryItem.name is not present
                                                    // }
                                                    // helperText={
                                                    //     formik.touched.enquiredProducts?.[index]?.productNameRequired &&
                                                    //     formik.errors.enquiredProducts?.[index]?.productNameRequired &&
                                                    //     formik.values.enquiredProducts[index]?.inventoryItem?.name // Show error only if inventoryItem.name is not present
                                                    // }
                                                />

                                            </Grid>

                                            <Grid item xs={4}>
                                                {!!formik.values.enquiredProducts[index]?.inventoryItem?.name && (
                                                    <TextField
                                                        fullWidth
                                                        label="HSN Code"
                                                        margin="normal"
                                                        InputProps={{
                                                            readOnly: true,
                                                        }}
                                                        name={`enquiredProducts[${index}].hsnCode`}
                                                        value={formik.values.enquiredProducts[index]?.inventoryItem?.hsnCode || ''}
                                                        size="small"
                                                    />
                                                )}
                                            </Grid>
                                        </Grid>

                                        <Grid container spacing={2}>
                                            {!!formik.values.enquiredProducts[index]?.inventoryItem?.name && (
                                                <Grid item xs={3}>
                                                    <TextField
                                                        fullWidth
                                                        label="Dimension"
                                                        margin="normal"
                                                        InputProps={{
                                                            readOnly: true,
                                                        }}
                                                        name={`enquiredProducts[${index}].dimension`}
                                                        value={formik.values.enquiredProducts[index]?.inventoryItem?.dimension}
                                                        size="small"
                                                    />
                                                </Grid>
                                            )}
                                            {!!formik.values.enquiredProducts[index]?.inventoryItem?.name && (
                                                <Grid item xs={3}>
                                                    <TextField
                                                        fullWidth
                                                        label="Material"
                                                        margin="normal"
                                                        InputProps={{
                                                            readOnly: true,
                                                        }}
                                                        name={`enquiredProducts[${index}].material`}
                                                        value={formik.values.enquiredProducts[index]?.inventoryItem?.basicMaterial}
                                                        size="small"
                                                    />
                                                </Grid>
                                            )}

                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Quantity"
                                                    margin="normal"
                                                    name={`enquiredProducts[${index}].qty`}
                                                    value={formik.values.enquiredProducts[index]?.qty}
                                                    onChange={(e) => handleProductChanges(e, index)}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Special Instruction"
                                                    margin="normal"
                                                    name={`enquiredProducts[${index}].specialInstruction`}
                                                    value={formik.values.enquiredProducts[index]?.specialInstruction}
                                                    onChange={(e) => handleProductChanges(e, index)}
                                                    size="small"
                                                />
                                            </Grid>
                                        </Grid>

                                        {formik.values.enquiredProducts.length > 1 && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleProductRemove(index)}
                                                sx={{mt: 2}}
                                            >
                                                Remove
                                            </Button>
                                        )}

                                        <Divider sx={{my: 2}}/>
                                    </div>
                                ))}
                                <Button variant="outlined" onClick={handleProductAdd}>
                                    Add Enquiry
                                </Button>
                            </CardContent>

                        </Card>


                    </CardContent>

                    <Card>
                        <CardHeader title={<Typography variant="h5" gutterBottom sx={{mb: 0, mt: 4}}>
                            Conversation Record
                        </Typography>}/>
                        <CardContent>
                            {formik.values.enquiryConversationRecords.map((item, index) => (

                                <Grid container>
                                    <Grid xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Conversation Record"
                                            margin="normal"
                                            name={`enquiryConversationRecords[${index}].conversation`}
                                            value={formik.values.enquiryConversationRecords[index]?.conversation}
                                            onChange={(e) => handleProductChanges(e, index)}
                                            error={
                                                formik.touched.enquiryConversationRecords?.[index]?.conversation &&
                                                Boolean(formik.errors.enquiryConversationRecords?.[index]?.conversation)
                                            }
                                            helperText={
                                                formik.touched.enquiryConversationRecords?.[index]?.conversation &&
                                                formik.errors.enquiryConversationRecords?.[index]?.conversation
                                            }
                                            size="small"
                                        />
                                    </Grid>

                                    <Grid xs={6}>
                                        {formik.values.enquiryConversationRecords.length > 1 && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleConversationRemove(index)}
                                                sx={{mt: 2}}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </Grid>

                                </Grid>))}


                            <Button variant="outlined" onClick={handleConversationAdd}>
                                Add Conversation
                            </Button>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader title={<Typography variant="h5" gutterBottom sx={{mb: 0, mt: 4}}>
                            Actions
                        </Typography>}/>
                        <CardContent>
                            <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        name="lastContactedDate"
                                        value={formik.values.lastContactedDate}
                                        onChange={formik.handleChange}
                                        error={formik.touched.lastContactedDate && Boolean(formik.errors.lastContactedDate)}
                                        helperText={formik.touched.lastContactedDate && formik.errors.lastContactedDate}
                                        size="small"
                                        InputLabelProps={{
                                            shrink: true
                                        }}
                                        label="Last Contacted Date"
                                        sx={{mt: "10px"}}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Next Followup Day"
                                        margin="normal"
                                        name="daysForNextFollowup"
                                        value={formik.values.daysForNextFollowup}
                                        onChange={formik.handleChange}
                                        size="small"
                                        InputLabelProps={{
                                            shrink: true
                                        }}
                                        error={formik.touched.daysForNextFollowup && Boolean(formik.errors.daysForNextFollowup)}
                                        helperText={formik.touched.daysForNextFollowup && formik.errors.daysForNextFollowup}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Enquired Through"
                                        margin="normal"
                                        name="enquireTrough"
                                        value={formik.values.enquireTrough}
                                        onChange={formik.handleChange}
                                        size="small"
                                        InputLabelProps={{
                                            shrink: true,

                                        }}
                                        error={formik.touched.enquireTrough && Boolean(formik.errors.enquireTrough)}
                                        helperText={formik.touched.enquireTrough && formik.errors.enquireTrough}
                                    />
                                </Grid>
                            </Grid>


                        </CardContent>


                    </Card>


                    <Box sx={{mt: 5, ml: 5, mb: 5}}>
                        <Button type="submit" variant="contained" color="primary" onClick={()=>{console.log(formik.values)}}>
                            Save
                        </Button>

                        <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} sx={{ml: 2}}>
                            Cancel
                        </Button>
                    </Box>
                </Card>

            </form>
        </div>

    );
};

export default AddUpdateEnquiry;
