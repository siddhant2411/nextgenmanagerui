import React, { useCallback, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { AddCircleOutline, Close } from '@mui/icons-material';
import apiService, { resolveApiErrorMessage } from '../../services/apiService';

// ── Constants ──────────────────────────────────────────────────────────────

const CONTACT_TYPES = [
    { value: 'VENDOR',   label: 'Vendor'   },
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'BOTH',     label: 'Both'     },
];

const GST_TYPES = [
    { value: 'REGULAR',      label: 'Regular — ITC claimable'  },
    { value: 'COMPOSITION',  label: 'Composition — No ITC'     },
    { value: 'UNREGISTERED', label: 'Unregistered'             },
    { value: 'SEZ',          label: 'SEZ Unit'                 },
    { value: 'EXPORT',       label: 'Exporter (LUT/Bond)'      },
];

const ADDRESS_TYPES = [
    { value: 'BILLING',  label: 'Billing'  },
    { value: 'SHIPPING', label: 'Shipping' },
    { value: 'FACTORY',  label: 'Factory'  },
    { value: 'BOTH',     label: 'Both'     },
];

const BLANK_ADDRESS = {
    addressType: 'BILLING',
    isDefault: false,
    street1: '', street2: '', city: '', state: '', pinCode: '', country: 'India',
};

const BLANK_PERSON = {
    personName: '', designation: '', department: '',
    emailId: '', phoneNumber: '', whatsappNumber: '', isPrimary: false,
};

// ── Validation ─────────────────────────────────────────────────────────────

const validationSchema = Yup.object({
    companyName: Yup.string().required('Company name is required'),
    contactType: Yup.string()
        .oneOf(['VENDOR', 'CUSTOMER', 'BOTH'])
        .required('Contact type is required'),
    gstNumber: Yup.string()
        .nullable()
        .matches(
            /^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)'
        ),
    panNumber: Yup.string()
        .nullable()
        .matches(/^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)'),
    creditDays: Yup.number()
        .nullable()
        .typeError('Must be a number')
        .positive('Must be positive')
        .integer('Must be a whole number'),
    msmeNumber: Yup.string().when('msmeRegistered', {
        is: true,
        then: schema => schema.required('Udyam number is required when MSME registered'),
    }),
    personDetails: Yup.array().of(
        Yup.object({
            emailId: Yup.string().nullable().email('Invalid email'),
            phoneNumber: Yup.string()
                .nullable()
                .test('phone-len', 'Must be 8–15 characters', v => !v || (v.length >= 8 && v.length <= 15)),
        })
    ),
});

// ── Section Card ───────────────────────────────────────────────────────────

const Section = ({ title, action, children }) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                {action}
            </Box>
            <Divider sx={{ mb: 2 }} />
            {children}
        </CardContent>
    </Card>
);

// ── Main Component ─────────────────────────────────────────────────────────

const AddUpdateContact = ({ onSave }) => {
    const { contactId } = useParams();
    const navigate      = useNavigate();
    const location      = useLocation();

    const isEditMode = Boolean(contactId);
    const [initialData, setInitialData] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

    const showError = (msg) => setSnackbar({ open: true, message: msg, severity: 'error' });

    // ── Fetch existing contact ─────────────────────────────────────────────
    const fetchContact = useCallback(async () => {
        if (!contactId) return;
        setFetchLoading(true);
        try {
            const data = await apiService.get(`/contact/${contactId}`);
            setInitialData(data);
        } catch (err) {
            showError(resolveApiErrorMessage(err, 'Failed to load contact.'));
        } finally {
            setFetchLoading(false);
        }
    }, [contactId]);

    useEffect(() => {
        if (location.pathname.includes('/contact/edit')) fetchContact();
    }, [location.pathname]);

    // ── Formik ─────────────────────────────────────────────────────────────
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id:                   initialData?.id          ?? 0,
            companyName:          initialData?.companyName ?? '',
            tradeName:            initialData?.tradeName   ?? '',
            contactType:          initialData?.contactType ?? 'VENDOR',
            gstNumber:            initialData?.gstNumber   ?? '',
            gstType:              initialData?.gstType     ?? 'REGULAR',
            panNumber:            initialData?.panNumber   ?? '',
            msmeRegistered:       initialData?.msmeRegistered ?? false,
            msmeNumber:           initialData?.msmeNumber  ?? '',
            defaultPaymentTerms:  initialData?.defaultPaymentTerms ?? '',
            creditDays:           initialData?.creditDays  ?? '',
            currency:             initialData?.currency    ?? 'INR',
            website:              initialData?.website     ?? '',
            phone:                initialData?.phone       ?? '',
            email:                initialData?.email       ?? '',
            notes:                initialData?.notes       ?? '',
            addresses:            initialData?.addresses?.length
                ? initialData.addresses
                : [{ ...BLANK_ADDRESS, isDefault: true }],
            personDetails:        initialData?.personDetails?.length
                ? initialData.personDetails
                : [{ ...BLANK_PERSON, isPrimary: true }],
        },
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const payload = { ...values };
                payload.creditDays = payload.creditDays !== '' ? parseInt(payload.creditDays) : null;
                payload.gstNumber  = payload.gstNumber  || null;
                payload.panNumber  = payload.panNumber  || null;

                if (!isEditMode) {
                    delete payload.id;
                    payload.addresses     = payload.addresses.map(({ id, ...a }) => a);
                    payload.personDetails = payload.personDetails.map(({ id, ...p }) => p);
                }

                await onSave(payload);
            } catch {
                // onSave handles its own snackbar
            } finally {
                setSubmitting(false);
            }
        },
    });

    // ── Address helpers ────────────────────────────────────────────────────
    const addAddress = () =>
        formik.setFieldValue('addresses', [...formik.values.addresses, { ...BLANK_ADDRESS }]);

    const removeAddress = (i) =>
        formik.setFieldValue('addresses', formik.values.addresses.filter((_, idx) => idx !== i));

    const setDefaultAddress = (i) => {
        const updated = formik.values.addresses.map((a, idx) => ({ ...a, isDefault: idx === i }));
        formik.setFieldValue('addresses', updated);
    };

    // ── Person helpers ─────────────────────────────────────────────────────
    const addPerson = () =>
        formik.setFieldValue('personDetails', [...formik.values.personDetails, { ...BLANK_PERSON }]);

    const removePerson = (i) =>
        formik.setFieldValue('personDetails', formik.values.personDetails.filter((_, idx) => idx !== i));

    const setPrimaryPerson = (i, checked) => {
        const updated = formik.values.personDetails.map((p, idx) =>
            ({ ...p, isPrimary: checked ? idx === i : false })
        );
        formik.setFieldValue('personDetails', updated);
    };

    // ── Loading ─────────────────────────────────────────────────────────────
    if (fetchLoading) {
        return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
    }

    const { values, errors, touched, handleChange, handleBlur, isSubmitting } = formik;

    return (
        <Box p={3} sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* ── Page title ── */}
            <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    {isEditMode ? `Edit: ${initialData?.companyName || ''}` : 'Add Vendor / Customer'}
                </Typography>
                {isEditMode && initialData?.contactCode && (
                    <Chip label={initialData.contactCode} size="small" variant="outlined" />
                )}
            </Box>

            <form onSubmit={formik.handleSubmit}>

                {/* ── Section 1: Basic Information ── */}
                <Section title="Basic Information">
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth label="Company Name *"
                                name="companyName"
                                value={values.companyName}
                                onChange={handleChange} onBlur={handleBlur}
                                error={touched.companyName && Boolean(errors.companyName)}
                                helperText={touched.companyName && errors.companyName}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth error={touched.contactType && Boolean(errors.contactType)}>
                                <InputLabel>Contact Type *</InputLabel>
                                <Select
                                    name="contactType" label="Contact Type *"
                                    value={values.contactType}
                                    onChange={handleChange} onBlur={handleBlur}
                                >
                                    {CONTACT_TYPES.map(o => (
                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </Select>
                                {touched.contactType && errors.contactType && (
                                    <FormHelperText>{errors.contactType}</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Trade Name"
                                name="tradeName"
                                value={values.tradeName}
                                onChange={handleChange}
                                helperText="If different from company name"
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth label="Currency"
                                name="currency"
                                value={values.currency}
                                onChange={e => formik.setFieldValue('currency', e.target.value.toUpperCase().slice(0, 3))}
                                inputProps={{ maxLength: 3 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth label="Credit Days"
                                name="creditDays"
                                type="number"
                                value={values.creditDays}
                                onChange={handleChange} onBlur={handleBlur}
                                error={touched.creditDays && Boolean(errors.creditDays)}
                                helperText={touched.creditDays && errors.creditDays}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                    </Grid>
                </Section>

                {/* ── Section 2: Tax & Compliance ── */}
                <Section title="Tax & Compliance">
                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid item xs={12} sm={5}>
                            <TextField
                                fullWidth label="GST Number (GSTIN)"
                                name="gstNumber"
                                value={values.gstNumber}
                                onChange={e => formik.setFieldValue('gstNumber', e.target.value.toUpperCase().slice(0, 15))}
                                onBlur={handleBlur}
                                error={touched.gstNumber && Boolean(errors.gstNumber)}
                                helperText={(touched.gstNumber && errors.gstNumber) || '15-digit GSTIN'}
                                inputProps={{ maxLength: 15 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>GST Type</InputLabel>
                                <Select
                                    name="gstType" label="GST Type"
                                    value={values.gstType}
                                    onChange={handleChange}
                                >
                                    {GST_TYPES.map(o => (
                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth label="PAN Number"
                                name="panNumber"
                                value={values.panNumber}
                                onChange={e => formik.setFieldValue('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                                onBlur={handleBlur}
                                error={touched.panNumber && Boolean(errors.panNumber)}
                                helperText={(touched.panNumber && errors.panNumber) || '10-digit PAN'}
                                inputProps={{ maxLength: 10 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={values.msmeRegistered}
                                        onChange={e => formik.setFieldValue('msmeRegistered', e.target.checked)}
                                    />
                                }
                                label="MSME / Udyam Registered"
                            />
                        </Grid>
                        {values.msmeRegistered && (
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth label="Udyam Registration Number"
                                    name="msmeNumber"
                                    value={values.msmeNumber}
                                    onChange={handleChange} onBlur={handleBlur}
                                    error={touched.msmeNumber && Boolean(errors.msmeNumber)}
                                    helperText={(touched.msmeNumber && errors.msmeNumber) || 'Format: UDYAM-XX-00-0000000'}
                                />
                            </Grid>
                        )}
                    </Grid>
                </Section>

                {/* ── Section 3: Contact Info ── */}
                <Section title="Contact Info">
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Phone"
                                name="phone"
                                value={values.phone}
                                onChange={handleChange}
                                inputProps={{ maxLength: 20 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Email"
                                name="email"
                                type="email"
                                value={values.email}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Website"
                                name="website"
                                value={values.website}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Default Payment Terms"
                                name="defaultPaymentTerms"
                                value={values.defaultPaymentTerms}
                                onChange={handleChange}
                                placeholder="e.g. 30 days net, Advance, LC 60 days"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Notes"
                                name="notes"
                                value={values.notes}
                                onChange={handleChange}
                                multiline rows={2}
                            />
                        </Grid>
                    </Grid>
                </Section>

                {/* ── Section 4: Addresses ── */}
                <Section
                    title="Addresses"
                    action={
                        <Button size="small" startIcon={<AddCircleOutline />} onClick={addAddress}>
                            Add Address
                        </Button>
                    }
                >
                    {values.addresses.map((addr, i) => (
                        <Box
                            key={i}
                            sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Address Type</InputLabel>
                                        <Select
                                            name={`addresses[${i}].addressType`}
                                            label="Address Type"
                                            value={addr.addressType}
                                            onChange={handleChange}
                                        >
                                            {ADDRESS_TYPES.map(o => (
                                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={addr.isDefault}
                                                onChange={e => e.target.checked && setDefaultAddress(i)}
                                                size="small"
                                            />
                                        }
                                        label="Default address"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                                    {values.addresses.length > 1 && (
                                        <Tooltip title="Remove address">
                                            <IconButton size="small" color="error" onClick={() => removeAddress(i)}>
                                                <Close fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth size="small" label="Street Line 1"
                                        name={`addresses[${i}].street1`}
                                        value={addr.street1}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth size="small" label="Street Line 2"
                                        name={`addresses[${i}].street2`}
                                        value={addr.street2}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth size="small" label="City"
                                        name={`addresses[${i}].city`}
                                        value={addr.city}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth size="small" label="State"
                                        name={`addresses[${i}].state`}
                                        value={addr.state}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth size="small" label="PIN Code"
                                        name={`addresses[${i}].pinCode`}
                                        value={addr.pinCode}
                                        onChange={handleChange}
                                        inputProps={{ maxLength: 10 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth size="small" label="Country"
                                        name={`addresses[${i}].country`}
                                        value={addr.country}
                                        onChange={handleChange}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    ))}
                </Section>

                {/* ── Section 5: Contact Persons ── */}
                <Section
                    title="Contact Persons"
                    action={
                        <Button size="small" startIcon={<AddCircleOutline />} onClick={addPerson}>
                            Add Person
                        </Button>
                    }
                >
                    {values.personDetails.map((person, i) => (
                        <Box
                            key={i}
                            sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="Person Name"
                                        name={`personDetails[${i}].personName`}
                                        value={person.personName}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="Designation"
                                        name={`personDetails[${i}].designation`}
                                        value={person.designation}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="Department"
                                        name={`personDetails[${i}].department`}
                                        value={person.department}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="Email"
                                        name={`personDetails[${i}].emailId`}
                                        type="email"
                                        value={person.emailId}
                                        onChange={handleChange} onBlur={handleBlur}
                                        error={
                                            touched.personDetails?.[i]?.emailId &&
                                            Boolean(errors.personDetails?.[i]?.emailId)
                                        }
                                        helperText={
                                            touched.personDetails?.[i]?.emailId &&
                                            errors.personDetails?.[i]?.emailId
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="Phone Number"
                                        name={`personDetails[${i}].phoneNumber`}
                                        value={person.phoneNumber}
                                        onChange={handleChange} onBlur={handleBlur}
                                        error={
                                            touched.personDetails?.[i]?.phoneNumber &&
                                            Boolean(errors.personDetails?.[i]?.phoneNumber)
                                        }
                                        helperText={
                                            touched.personDetails?.[i]?.phoneNumber &&
                                            errors.personDetails?.[i]?.phoneNumber
                                        }
                                        inputProps={{ maxLength: 15 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth size="small" label="WhatsApp Number"
                                        name={`personDetails[${i}].whatsappNumber`}
                                        value={person.whatsappNumber}
                                        onChange={handleChange}
                                        inputProps={{ maxLength: 15 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={person.isPrimary}
                                                onChange={e => setPrimaryPerson(i, e.target.checked)}
                                            />
                                        }
                                        label="Primary Contact"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                                    {values.personDetails.length > 1 && (
                                        <Tooltip title="Remove person">
                                            <IconButton size="small" color="error" onClick={() => removePerson(i)}>
                                                <Close fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    ))}
                </Section>

                {/* ── Footer ── */}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button variant="outlined" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                    >
                        {isSubmitting ? 'Saving…' : isEditMode ? 'Update Contact' : 'Create Contact'}
                    </Button>
                </Box>

            </form>
        </Box>
    );
};

export default AddUpdateContact;
