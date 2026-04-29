import React, { useCallback, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Grid,
    IconButton,
    MenuItem,
    Select,
    Snackbar,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { AddCircleOutline, Close, SaveOutlined } from '@mui/icons-material';
import apiService, { resolveApiErrorMessage } from '../../services/apiService';

/* ── Design tokens ── */
const T = {
    primary:       '#1565c0',
    primaryHover:  '#0d47a1',
    pageBg:        '#f4f6f9',
    surface:       '#ffffff',
    border:        '#e2e8f0',
    borderCard:    '#e5e7eb',
    textHead:      '#0f2744',
    textBody:      '#1a1a2e',
    textSecondary: '#64748b',
    textMuted:     '#94a3b8',
};

/* ── Shared field sx ── */
const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '6px',
        fontSize: '0.8125rem',
        '& fieldset': { borderColor: T.border },
        '&:hover fieldset': { borderColor: '#94a3b8' },
        '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 1, boxShadow: '0 0 0 2px rgba(21,101,192,.12)' },
    },
    '& .MuiInputLabel-root': { fontSize: '0.71875rem', fontWeight: 600, color: T.textSecondary },
    '& .MuiInputLabel-root.Mui-focused': { color: T.primary },
    '& .MuiFormHelperText-root': { fontSize: '0.65625rem', mt: '3px' },
};

/* ── Section card ── */
const SectionCard = ({ title, action, children, inset = false }) => (
    <Box sx={{
        bgcolor: inset ? T.pageBg : T.surface,
        border: `1px solid ${T.border}`, borderRadius: '8px',
        p: '18px 20px', mb: '14px',
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '12px' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                {title}
            </Typography>
            {action}
        </Box>
        {children}
    </Box>
);

/* ── Add button (section action) ── */
const AddBtn = ({ onClick, children }) => (
    <Button size="small" startIcon={<AddCircleOutline sx={{ fontSize: 14 }} />} onClick={onClick}
        sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: T.primary, p: '3px 10px', minWidth: 0 }}>
        {children}
    </Button>
);

/* ── Sub-item card (address / person) ── */
const SubCard = ({ children, onRemove, canRemove }) => (
    <Box sx={{ border: `1px solid ${T.border}`, borderRadius: '6px', p: '14px 16px', mb: '10px', bgcolor: '#fff', position: 'relative' }}>
        {canRemove && (
            <Tooltip title="Remove">
                <IconButton size="small" onClick={onRemove}
                    sx={{ position: 'absolute', top: 8, right: 8, color: '#b84040', '&:hover': { bgcolor: '#fff1f1' } }}>
                    <Close sx={{ fontSize: 14 }} />
                </IconButton>
            </Tooltip>
        )}
        {children}
    </Box>
);

/* ── Constants ── */
const CONTACT_TYPES  = [{ value: 'VENDOR', label: 'Vendor' }, { value: 'CUSTOMER', label: 'Customer' }, { value: 'BOTH', label: 'Both' }];
const GST_TYPES      = [{ value: 'REGULAR', label: 'Regular — ITC claimable' }, { value: 'COMPOSITION', label: 'Composition — No ITC' }, { value: 'UNREGISTERED', label: 'Unregistered' }, { value: 'SEZ', label: 'SEZ Unit' }, { value: 'EXPORT', label: 'Exporter (LUT/Bond)' }];
const ADDRESS_TYPES  = [{ value: 'BILLING', label: 'Billing' }, { value: 'SHIPPING', label: 'Shipping' }, { value: 'FACTORY', label: 'Factory' }, { value: 'BOTH', label: 'Both' }];
const BLANK_ADDRESS  = { addressType: 'BILLING', isDefault: false, street1: '', street2: '', city: '', state: '', pinCode: '', country: 'India' };
const BLANK_PERSON   = { personName: '', designation: '', department: '', emailId: '', phoneNumber: '', whatsappNumber: '', isPrimary: false };

/* ── Validation ── */
const validationSchema = Yup.object({
    companyName: Yup.string().required('Company name is required'),
    contactType: Yup.string().oneOf(['VENDOR', 'CUSTOMER', 'BOTH']).required('Contact type is required'),
    gstNumber:   Yup.string().nullable().matches(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)'),
    panNumber:   Yup.string().nullable().matches(/^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)'),
    creditDays:  Yup.number().nullable().typeError('Must be a number').positive('Must be positive').integer('Must be a whole number'),
    msmeNumber:  Yup.string().when('msmeRegistered', { is: true, then: s => s.required('Udyam number is required when MSME registered') }),
    personDetails: Yup.array().of(Yup.object({
        emailId:     Yup.string().nullable().email('Invalid email'),
        phoneNumber: Yup.string().nullable().test('phone-len', 'Must be 8–15 characters', v => !v || (v.length >= 8 && v.length <= 15)),
    })),
});

/* ── Main Component ── */
const AddUpdateContact = ({ onSave }) => {
    const { contactId } = useParams();
    const navigate      = useNavigate();
    const location      = useLocation();
    const isEditMode    = Boolean(contactId);

    const [initialData,   setInitialData]   = useState(null);
    const [fetchLoading,  setFetchLoading]  = useState(isEditMode);
    const [snackbar,      setSnackbar]      = useState({ open: false, message: '', severity: 'error' });

    const showError = (msg) => setSnackbar({ open: true, message: msg, severity: 'error' });

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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            id:                  initialData?.id                  ?? 0,
            companyName:         initialData?.companyName         ?? '',
            tradeName:           initialData?.tradeName           ?? '',
            contactType:         initialData?.contactType         ?? 'VENDOR',
            gstNumber:           initialData?.gstNumber           ?? '',
            gstType:             initialData?.gstType             ?? 'REGULAR',
            panNumber:           initialData?.panNumber           ?? '',
            msmeRegistered:      initialData?.msmeRegistered      ?? false,
            msmeNumber:          initialData?.msmeNumber          ?? '',
            defaultPaymentTerms: initialData?.defaultPaymentTerms ?? '',
            creditDays:          initialData?.creditDays          ?? '',
            currency:            initialData?.currency            ?? 'INR',
            website:             initialData?.website             ?? '',
            phone:               initialData?.phone               ?? '',
            email:               initialData?.email               ?? '',
            notes:               initialData?.notes               ?? '',
            addresses:           initialData?.addresses?.length ? initialData.addresses : [{ ...BLANK_ADDRESS, isDefault: true }],
            personDetails:       initialData?.personDetails?.length ? initialData.personDetails : [{ ...BLANK_PERSON, isPrimary: true }],
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
                // handled by onSave
            } finally {
                setSubmitting(false);
            }
        },
    });

    const addAddress    = () => formik.setFieldValue('addresses',     [...formik.values.addresses,     { ...BLANK_ADDRESS }]);
    const removeAddress = (i) => formik.setFieldValue('addresses',     formik.values.addresses.filter((_, idx) => idx !== i));
    const setDefaultAddress = (i) => formik.setFieldValue('addresses', formik.values.addresses.map((a, idx) => ({ ...a, isDefault: idx === i })));

    const addPerson      = () => formik.setFieldValue('personDetails', [...formik.values.personDetails, { ...BLANK_PERSON }]);
    const removePerson   = (i) => formik.setFieldValue('personDetails', formik.values.personDetails.filter((_, idx) => idx !== i));
    const setPrimaryPerson = (i, checked) => formik.setFieldValue('personDetails',
        formik.values.personDetails.map((p, idx) => ({ ...p, isPrimary: checked ? idx === i : false }))
    );

    if (fetchLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

    const { values, errors, touched, handleChange, handleBlur, isSubmitting } = formik;

    return (
        <Box sx={{ p: { xs: 2, md: '24px 28px' }, bgcolor: T.pageBg, minHeight: '100%' }}>
            <Snackbar open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* ── Breadcrumb ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', fontSize: '0.8125rem' }}>
                <Box component="button" onClick={() => navigate(-1)}
                    sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', color: T.primary, fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', p: 0, fontWeight: 500 }}>
                    ← Contacts
                </Box>
                <Typography sx={{ color: '#cbd5e1' }}>/</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: T.textBody, fontWeight: 500 }}>
                    {isEditMode ? (initialData?.companyName || 'Edit Contact') : 'Add Contact'}
                </Typography>
            </Box>

            {/* ── Main card ── */}
            <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.borderCard}`, borderRadius: '8px', boxShadow: '0 4px 16px rgba(2,12,27,.06)' }}>

                {/* Card header */}
                <Box sx={{ p: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: T.textHead }}>
                            {isEditMode ? `Edit: ${initialData?.companyName || ''}` : 'Add Vendor / Customer'}
                        </Typography>
                        {isEditMode && initialData?.contactCode && (
                            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: T.textMuted, mt: '2px' }}>
                                {initialData.contactCode}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outlined" onClick={() => navigate(-1)} disabled={isSubmitting}
                            sx={{ textTransform: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8125rem', borderColor: T.border, color: '#374151', '&:hover': { borderColor: '#94a3b8' } }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="contact-form" variant="contained" disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={14} /> : <SaveOutlined sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8125rem', bgcolor: T.primary, boxShadow: '0 2px 6px rgba(21,101,192,.2)', '&:hover': { bgcolor: T.primaryHover } }}>
                            {isSubmitting ? 'Saving…' : isEditMode ? 'Update' : 'Create Contact'}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ p: '20px 24px' }}>
                    <form id="contact-form" onSubmit={formik.handleSubmit}>

                        {/* ── Section 1: Basic Information ── */}
                        <SectionCard title="Basic Information">
                            <Grid container spacing={1.75}>
                                <Grid item xs={12} sm={8}>
                                    <TextField fullWidth size="small" label="Company Name *"
                                        name="companyName" value={values.companyName}
                                        onChange={handleChange} onBlur={handleBlur}
                                        error={touched.companyName && Boolean(errors.companyName)}
                                        helperText={touched.companyName && errors.companyName}
                                        sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" select label="Contact Type *"
                                        name="contactType" value={values.contactType}
                                        onChange={handleChange}
                                        sx={fieldSx}>
                                        {CONTACT_TYPES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Trade Name"
                                        name="tradeName" value={values.tradeName}
                                        onChange={handleChange}
                                        helperText="If different from company name"
                                        sx={fieldSx} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth size="small" label="Currency"
                                        name="currency" value={values.currency}
                                        onChange={e => formik.setFieldValue('currency', e.target.value.toUpperCase().slice(0, 3))}
                                        inputProps={{ maxLength: 3 }} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth size="small" label="Credit Days" type="number"
                                        name="creditDays" value={values.creditDays}
                                        onChange={handleChange} onBlur={handleBlur}
                                        error={touched.creditDays && Boolean(errors.creditDays)}
                                        helperText={touched.creditDays && errors.creditDays}
                                        inputProps={{ min: 0 }} sx={fieldSx} />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* ── Section 2: Tax & Compliance ── */}
                        <SectionCard title="Tax & Compliance" inset>
                            <Grid container spacing={1.75} alignItems="flex-start">
                                <Grid item xs={12} sm={5}>
                                    <TextField fullWidth size="small" label="GST Number (GSTIN)"
                                        name="gstNumber" value={values.gstNumber}
                                        onChange={e => formik.setFieldValue('gstNumber', e.target.value.toUpperCase().slice(0, 15))}
                                        onBlur={handleBlur}
                                        error={touched.gstNumber && Boolean(errors.gstNumber)}
                                        helperText={(touched.gstNumber && errors.gstNumber) || '15-digit · e.g. 27ABCDE1234F1Z5'}
                                        inputProps={{ maxLength: 15, style: { fontFamily: "'IBM Plex Mono', monospace" } }}
                                        sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" select label="GST Type"
                                        name="gstType" value={values.gstType}
                                        onChange={handleChange} sx={fieldSx}>
                                        {GST_TYPES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField fullWidth size="small" label="PAN Number"
                                        name="panNumber" value={values.panNumber}
                                        onChange={e => formik.setFieldValue('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                                        onBlur={handleBlur}
                                        error={touched.panNumber && Boolean(errors.panNumber)}
                                        helperText={(touched.panNumber && errors.panNumber) || '10-digit · e.g. ABCDE1234F'}
                                        inputProps={{ maxLength: 10, style: { fontFamily: "'IBM Plex Mono', monospace" } }}
                                        sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={values.msmeRegistered}
                                            onChange={e => formik.setFieldValue('msmeRegistered', e.target.checked)}
                                            sx={{ '&.Mui-checked': { color: '#475569' } }} />}
                                        label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: T.textBody }}>MSME / Udyam Registered</Typography>}
                                    />
                                </Grid>
                                {values.msmeRegistered && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Udyam Registration Number"
                                            name="msmeNumber" value={values.msmeNumber}
                                            onChange={handleChange} onBlur={handleBlur}
                                            error={touched.msmeNumber && Boolean(errors.msmeNumber)}
                                            helperText={(touched.msmeNumber && errors.msmeNumber) || 'Format: UDYAM-XX-00-0000000'}
                                            inputProps={{ style: { fontFamily: "'IBM Plex Mono', monospace" } }}
                                            sx={fieldSx} />
                                    </Grid>
                                )}
                            </Grid>
                        </SectionCard>

                        {/* ── Section 3: Contact Info ── */}
                        <SectionCard title="Contact Info">
                            <Grid container spacing={1.75}>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" label="Phone" name="phone"
                                        value={values.phone} onChange={handleChange}
                                        inputProps={{ maxLength: 20 }} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" label="Email" name="email" type="email"
                                        value={values.email} onChange={handleChange} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth size="small" label="Website" name="website"
                                        value={values.website} onChange={handleChange} sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Default Payment Terms" name="defaultPaymentTerms"
                                        value={values.defaultPaymentTerms} onChange={handleChange}
                                        placeholder="e.g. 30 days net, Advance, LC 60 days" sx={fieldSx} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Notes" name="notes"
                                        value={values.notes} onChange={handleChange}
                                        multiline rows={2} sx={fieldSx} />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* ── Section 4: Addresses ── */}
                        <SectionCard title="Addresses" action={<AddBtn onClick={addAddress}>Add Address</AddBtn>}>
                            {values.addresses.map((addr, i) => (
                                <SubCard key={i} canRemove={values.addresses.length > 1} onRemove={() => removeAddress(i)}>
                                    <Grid container spacing={1.75} alignItems="center">
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" select label="Address Type"
                                                name={`addresses[${i}].addressType`} value={addr.addressType}
                                                onChange={handleChange} sx={fieldSx}>
                                                {ADDRESS_TYPES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <FormControlLabel
                                                control={<Checkbox size="small" checked={addr.isDefault}
                                                    onChange={e => e.target.checked && setDefaultAddress(i)}
                                                    sx={{ '&.Mui-checked': { color: T.primary } }} />}
                                                label={<Typography sx={{ fontSize: '0.8125rem', color: T.textBody }}>Default address</Typography>}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth size="small" label="Street Line 1"
                                                name={`addresses[${i}].street1`} value={addr.street1}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth size="small" label="Street Line 2"
                                                name={`addresses[${i}].street2`} value={addr.street2}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="City"
                                                name={`addresses[${i}].city`} value={addr.city}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="State"
                                                name={`addresses[${i}].state`} value={addr.state}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="PIN Code"
                                                name={`addresses[${i}].pinCode`} value={addr.pinCode}
                                                onChange={handleChange} inputProps={{ maxLength: 10 }} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField fullWidth size="small" label="Country"
                                                name={`addresses[${i}].country`} value={addr.country}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                    </Grid>
                                </SubCard>
                            ))}
                        </SectionCard>

                        {/* ── Section 5: Contact Persons ── */}
                        <SectionCard title="Contact Persons" action={<AddBtn onClick={addPerson}>Add Person</AddBtn>}>
                            {values.personDetails.map((person, i) => (
                                <SubCard key={i} canRemove={values.personDetails.length > 1} onRemove={() => removePerson(i)}>
                                    <Grid container spacing={1.75} alignItems="center">
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" label="Person Name"
                                                name={`personDetails[${i}].personName`} value={person.personName}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" label="Designation"
                                                name={`personDetails[${i}].designation`} value={person.designation}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" label="Department"
                                                name={`personDetails[${i}].department`} value={person.department}
                                                onChange={handleChange} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth size="small" label="Email" type="email"
                                                name={`personDetails[${i}].emailId`} value={person.emailId}
                                                onChange={handleChange} onBlur={handleBlur}
                                                error={touched.personDetails?.[i]?.emailId && Boolean(errors.personDetails?.[i]?.emailId)}
                                                helperText={touched.personDetails?.[i]?.emailId && errors.personDetails?.[i]?.emailId}
                                                sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={4}>
                                            <TextField fullWidth size="small" label="Phone Number"
                                                name={`personDetails[${i}].phoneNumber`} value={person.phoneNumber}
                                                onChange={handleChange} onBlur={handleBlur}
                                                error={touched.personDetails?.[i]?.phoneNumber && Boolean(errors.personDetails?.[i]?.phoneNumber)}
                                                helperText={touched.personDetails?.[i]?.phoneNumber && errors.personDetails?.[i]?.phoneNumber}
                                                inputProps={{ maxLength: 15 }} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={6} sm={4}>
                                            <TextField fullWidth size="small" label="WhatsApp Number"
                                                name={`personDetails[${i}].whatsappNumber`} value={person.whatsappNumber}
                                                onChange={handleChange} inputProps={{ maxLength: 15 }} sx={fieldSx} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={<Switch size="small" checked={person.isPrimary}
                                                    onChange={e => setPrimaryPerson(i, e.target.checked)}
                                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary } }} />}
                                                label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: T.textBody }}>Primary Contact</Typography>}
                                            />
                                        </Grid>
                                    </Grid>
                                </SubCard>
                            ))}
                        </SectionCard>

                    </form>
                </Box>
            </Box>
        </Box>
    );
};

export default AddUpdateContact;
