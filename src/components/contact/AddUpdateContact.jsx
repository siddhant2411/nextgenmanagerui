import React, {useCallback, useEffect, useState} from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button, TextField, Box, Typography, Grid } from '@mui/material';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import apiService from "../../services/apiService";
import contact from "./Contact";

const AddOrUpdateContact = ({onSave }) => {
    const [initialData,setInitialData] = useState([]);
    const navigate = useNavigate();
    const isEditMode = Boolean(initialData.id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const {contactId} =useParams();
    const location = useLocation();
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id:initialData.id||0,
            companyName: initialData.companyName || '',
            gstNumber: initialData.gstNumber || '',
            notes: initialData.notes || '',
            addresses: initialData.addresses || [
                {
                    street1: '',
                    street2: '',
                    state: '',
                    country: ''
                },
            ],
            personDetails: initialData.personDetails || [
                {
                    personName: '',
                    emailId: '',
                    phoneNumber: ''
                },
            ],
        },
        validationSchema: Yup.object({
            companyName: Yup.string().required('Company Name is required'),
            gstNumber: Yup.string().required('GST Number is required'),
            addresses: Yup.array().of(
                Yup.object({
                    street1: Yup.string().required('Street 1 is required'),
                    state: Yup.string().required('State is required'),
                    country: Yup.string().required('Country is required'),
                })
            ),
            personDetails: Yup.array().of(
                Yup.object({
                    personName: Yup.string().required('Person Name is required'),
                    emailId: Yup.string().email('Invalid email').required('Email is required'),
                    phoneNumber: Yup.string().required('Phone Number is required'),
                })
            ),
        }),
        onSubmit: (values) => {
            const sanitizedValues = { ...values };
            if (!isEditMode) {

                delete sanitizedValues.id;
                sanitizedValues.addresses = sanitizedValues.addresses.map(({ id, ...address }) => address);
                sanitizedValues.personDetails = sanitizedValues.personDetails.map(({ id, ...person }) => person);
            }
            onSave(sanitizedValues);
        },
    });

    const fetchContactDetails = useCallback(async () => {
        if (!contactId) return;

        try {
            setLoading(true);
            const data = await apiService.get(`/contact/${contactId}`);
            setInitialData(data)
        } catch (err) {
            setError("Failed to fetch BOM details");
        } finally {
            setLoading(false);
        }
    }, [contactId]);


    const handleAddAddress = () => {
        formik.setFieldValue('addresses', [
            ...formik.values.addresses,
            { id: 0, street1: '', street2: '', state: '', country: '', contact: '' },
        ]);
    };

    const handleAddPerson = () => {
        formik.setFieldValue('personDetails', [
            ...formik.values.personDetails,
            { id: 0, personName: '', emailId: '', phoneNumber: '', contact: '' },
        ]);
    };

    useEffect(() => {
        if (location.pathname.includes('/contact/edit')) {
            fetchContactDetails();
        }
    }, [location]);
    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                {initialData.id ? 'Update Company' : 'Add Company'}
            </Typography>
            <form onSubmit={formik.handleSubmit}>
                <TextField
                    fullWidth
                    margin="normal"
                    label="Company Name"
                    name="companyName"
                    value={formik.values.companyName}
                    onChange={formik.handleChange}
                    error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                    helperText={formik.touched.companyName && formik.errors.companyName}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="GST Number"
                    name="gstNumber"
                    value={formik.values.gstNumber}
                    onChange={formik.handleChange}
                    error={formik.touched.gstNumber && Boolean(formik.errors.gstNumber)}
                    helperText={formik.touched.gstNumber && formik.errors.gstNumber}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Notes"
                    name="notes"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                />

                <Typography variant="h6" gutterBottom>
                    Addresses
                </Typography>
                {formik.values.addresses.map((address, index) => (
                    <Box key={index} mb={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Street 1"
                                    name={`addresses[${index}].street1`}
                                    value={address.street1}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.addresses?.[index]?.street1 &&
                                        Boolean(formik.errors.addresses?.[index]?.street1)
                                    }
                                    helperText={formik.touched.addresses?.[index]?.street1 && formik.errors.addresses?.[index]?.street1}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Street 2"
                                    name={`addresses[${index}].street2`}
                                    value={address.street2}
                                    onChange={formik.handleChange}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    fullWidth
                                    label="State"
                                    name={`addresses[${index}].state`}
                                    value={address.state}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.addresses?.[index]?.state &&
                                        Boolean(formik.errors.addresses?.[index]?.state)
                                    }
                                    helperText={formik.touched.addresses?.[index]?.state && formik.errors.addresses?.[index]?.state}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    name={`addresses[${index}].country`}
                                    value={address.country}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.addresses?.[index]?.country &&
                                        Boolean(formik.errors.addresses?.[index]?.country)
                                    }
                                    helperText={formik.touched.addresses?.[index]?.country && formik.errors.addresses?.[index]?.country}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
                <Button variant="outlined" onClick={handleAddAddress}>
                    Add Address
                </Button>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Person Details
                </Typography>
                {formik.values.personDetails.map((person, index) => (
                    <Box key={index} mb={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <TextField
                                    fullWidth
                                    label="Person Name"
                                    name={`personDetails[${index}].personName`}
                                    value={person.personName}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.personDetails?.[index]?.personName &&
                                        Boolean(formik.errors.personDetails?.[index]?.personName)
                                    }
                                    helperText={
                                        formik.touched.personDetails?.[index]?.personName && formik.errors.personDetails?.[index]?.personName
                                    }
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    fullWidth
                                    label="Email ID"
                                    name={`personDetails[${index}].emailId`}
                                    value={person.emailId}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.personDetails?.[index]?.emailId &&
                                        Boolean(formik.errors.personDetails?.[index]?.emailId)
                                    }
                                    helperText={
                                        formik.touched.personDetails?.[index]?.emailId && formik.errors.personDetails?.[index]?.emailId
                                    }
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    name={`personDetails[${index}].phoneNumber`}
                                    value={person.phoneNumber}
                                    onChange={formik.handleChange}
                                    error={
                                        formik.touched.personDetails?.[index]?.phoneNumber &&
                                        Boolean(formik.errors.personDetails?.[index]?.phoneNumber)
                                    }
                                    helperText={
                                        formik.touched.personDetails?.[index]?.phoneNumber &&
                                        formik.errors.personDetails?.[index]?.phoneNumber
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Box>
                ))}
                <Button variant="outlined" onClick={handleAddPerson}>
                    Add Person
                </Button>

                <Box sx={{ mt: 3 }}>
                    <Button type="submit" variant="contained" color="primary">
                        Save
                    </Button>
                    <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} sx={{ ml: 2 }}>
                        Cancel
                    </Button>
                </Box>
            </form>
        </Box>
    );
};

export default AddOrUpdateContact;
