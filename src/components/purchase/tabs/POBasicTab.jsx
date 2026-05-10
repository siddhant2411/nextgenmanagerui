import React, { useEffect, useState } from 'react';
import {
    Grid, TextField, MenuItem, Autocomplete, CircularProgress,
    Typography, Paper, Box, Stack, InputAdornment,
    RadioGroup, FormControlLabel, Radio,
} from '@mui/material';
import {
    Storefront, LocalShipping, Payment, NoteAlt,
    Business, Search, Verified,
} from '@mui/icons-material';
import apiService from '../../../services/apiService';
import { searchContacts } from '../../../services/commonAPI';

const BORDER = '#e2e8f0';
const PRIMARY = '#1565c0';
const HEADER_TEXT = '#075985';
const PO_TYPES = ['STANDARD', 'BLANKET', 'SUBCONTRACT', 'SERVICE', 'IMPORT'];

const SectionCard = ({ title, icon: Icon, children }) => (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: 'white' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
            {Icon && <Icon sx={{ fontSize: 18, color: PRIMARY }} />}
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: HEADER_TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>
                {title}
            </Typography>
        </Stack>
        {children}
    </Paper>
);

export default function POBasicTab({ formik, isEdit, readOnly }) {
    const [vendors, setVendors] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorAddresses, setVendorAddresses] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [companyDetails, setCompanyDetails] = useState(null);

    // Ship-To override (optional alternate location)
    const [shipToMode, setShipToMode] = useState(formik.values.shipToAddressId ? 'OTHER' : 'OWN');
    const [shipToContacts, setShipToContacts] = useState([]);
    const [shipToContactLoading, setShipToContactLoading] = useState(false);
    const [shipToContact, setShipToContact] = useState(null);
    const [shipToAddresses, setShipToAddresses] = useState([]);

    // Load vendor list
    useEffect(() => {
        setVendorLoading(true);
        apiService.get('/contact', { type: 'VENDOR', size: 200 })
            .then(r => setVendors(r?.content ?? r ?? []))
            .catch(() => {})
            .finally(() => setVendorLoading(false));
    }, []);

    // Load own company address — this is the default ship-to
    useEffect(() => {
        apiService.get('/company').then(r => setCompanyDetails(r)).catch(() => {});
    }, []);

    // When vendor changes, load their addresses for billing
    useEffect(() => {
        const vid = formik.values.vendorId;
        if (!vid) { setVendorAddresses([]); return; }
        setAddressLoading(true);
        apiService.get(`/contact/${vid}`)
            .then(r => setVendorAddresses(r?.addresses ?? []))
            .catch(() => setVendorAddresses([]))
            .finally(() => setAddressLoading(false));
    }, [formik.values.vendorId]);

    // Sync shipToMode when form data loads (existing PO with shipToAddressId)
    useEffect(() => {
        setShipToMode(formik.values.shipToAddressId ? 'OTHER' : 'OWN');
    }, [formik.values.shipToAddressId]);

    const handleShipToContactSearch = async (val) => {
        if (!val || val.length < 2) return;
        setShipToContactLoading(true);
        try {
            const data = await searchContacts(val);
            setShipToContacts(data ?? []);
        } finally {
            setShipToContactLoading(false);
        }
    };

    const handleShipToContactPick = (contact) => {
        setShipToContact(contact);
        if (!contact) {
            setShipToAddresses([]);
            formik.setFieldValue('shipToAddressId', null);
            return;
        }
        apiService.get(`/contact/${contact.id}`)
            .then(r => setShipToAddresses(r?.addresses ?? []))
            .catch(() => setShipToAddresses([]));
    };

    const handleShipToModeChange = (mode) => {
        setShipToMode(mode);
        if (mode === 'OWN') {
            // Clear other-contact selection; ship-to falls back to company address
            formik.setFieldValue('shipToAddressId', null);
            setShipToContact(null);
            setShipToAddresses([]);
        }
    };

    const set = (field, val) => formik.setFieldValue(field, val);
    const err = (field) => formik.touched[field] && formik.errors[field];

    const selectedVendor = vendors.find(v => v.id === formik.values.vendorId) ?? null;
    const selectedBillingAddr = vendorAddresses.find(a => a.id === formik.values.vendorBillingAddressId) ?? null;
    const selectedShipToAddr = shipToAddresses.find(a => a.id === formik.values.shipToAddressId) ?? null;

    const companyAddressLine = companyDetails
        ? [companyDetails.street1, companyDetails.street2, companyDetails.city, companyDetails.state, companyDetails.pinCode]
            .filter(Boolean).join(', ')
        : '';

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    {/* PO Header */}
                    <SectionCard title="PO Configuration" icon={Business}>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" label="PO Number"
                                    value={formik.values.purchaseOrderNumber ?? ''}
                                    InputProps={{ readOnly: true, sx: { bgcolor: '#f8fafc', borderRadius: 1.5 } }}
                                    helperText="Auto-assigned on save" />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField select fullWidth size="small" label="PO Type *"
                                    value={formik.values.poType ?? 'STANDARD'}
                                    onChange={e => set('poType', e.target.value)}
                                    error={!!err('poType')} helperText={err('poType')}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }}>
                                    {PO_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" label="Currency"
                                    value={formik.values.currency ?? 'INR'}
                                    onChange={e => set('currency', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" label="Order Date *" type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formik.values.orderDate ?? ''}
                                    onChange={e => set('orderDate', e.target.value)}
                                    error={!!err('orderDate')} helperText={err('orderDate')}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" label="Expected Delivery" type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formik.values.expectedDeliveryDate ?? ''}
                                    onChange={e => set('expectedDeliveryDate', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" label="Vendor Quotation No."
                                    placeholder="e.g. QT/2025/001"
                                    value={formik.values.quotationNumber ?? ''}
                                    onChange={e => set('quotationNumber', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }}
                                    helperText="Vendor's quotation / offer reference" />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" label="Quotation Date" type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formik.values.quotationDate ?? ''}
                                    onChange={e => set('quotationDate', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* Vendor Section */}
                    <SectionCard title="Vendor Information" icon={Storefront}>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <Autocomplete
                                    fullWidth size="small"
                                    options={vendors}
                                    loading={vendorLoading}
                                    getOptionLabel={v => `${v.companyName}${v.contactCode ? ` (${v.contactCode})` : ''}`}
                                    value={selectedVendor}
                                    onChange={(_, v) => {
                                        set('vendorId', v?.id ?? null);
                                        if (v) {
                                            if (v.defaultPaymentTerms && !formik.values.paymentTerms) set('paymentTerms', v.defaultPaymentTerms);
                                            if (v.creditDays && !formik.values.creditDays) set('creditDays', v.creditDays);
                                            if (v.stateCode) set('placeOfSupply', v.stateCode);
                                        }
                                    }}
                                    disabled={readOnly}
                                    renderInput={params => (
                                        <TextField {...params} label="Search Vendor *"
                                            error={!!err('vendorId')} helperText={err('vendorId')}
                                            InputProps={{
                                                ...params.InputProps,
                                                sx: { borderRadius: 1.5 },
                                                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment>
                                            }} />
                                    )} />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    fullWidth size="small"
                                    options={vendorAddresses}
                                    loading={addressLoading}
                                    getOptionLabel={a => `${a.addressType}: ${a.city}, ${a.state}${a.pinCode ? ` (${a.pinCode})` : ''}`}
                                    value={selectedBillingAddr}
                                    onChange={(_, a) => set('vendorBillingAddressId', a?.id ?? null)}
                                    disabled={readOnly || !formik.values.vendorId}
                                    renderInput={params => (
                                        <TextField {...params} label="Vendor Billing Address"
                                            placeholder={addressLoading ? 'Loading...' : !formik.values.vendorId ? 'Select vendor first' : 'Select billing address'}
                                            InputProps={{ ...params.InputProps, sx: { borderRadius: 1.5 } }} />
                                    )} />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" label="Place of Supply (State Code)"
                                    placeholder="e.g. 27"
                                    inputProps={{ maxLength: 2 }}
                                    value={formik.values.placeOfSupply ?? ''}
                                    onChange={e => set('placeOfSupply', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }}
                                    helperText="Auto-filled from vendor's state code" />
                            </Grid>

                            {selectedVendor && (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
                                        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>GSTIN</Typography>
                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedVendor.gstNumber ?? 'Not Provided'}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>GST Type</Typography>
                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedVendor.gstType ?? '—'}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>MSME</Typography>
                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                    {selectedVendor.msmeRegistered ? `Registered (${selectedVendor.msmeNumber ?? ''})` : 'Not Registered'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </SectionCard>
                </Grid>

                <Grid item xs={12} md={5}>
                    {/* Ship-To Section: defaults to own company; can override */}
                    <SectionCard title="Ship To (Receiving Address)" icon={LocalShipping}>
                        <RadioGroup
                            value={shipToMode}
                            onChange={(e) => handleShipToModeChange(e.target.value)}
                            sx={{ mb: 1 }}
                        >
                            <FormControlLabel
                                value="OWN"
                                disabled={readOnly}
                                control={<Radio size="small" />}
                                label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Own Company Address (default)</Typography>}
                            />
                            <FormControlLabel
                                value="OTHER"
                                disabled={readOnly}
                                control={<Radio size="small" />}
                                label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Different Location (drop-ship)</Typography>}
                            />
                        </RadioGroup>

                        {shipToMode === 'OWN' && (
                            companyDetails ? (
                                <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                        <Verified sx={{ fontSize: 16, color: '#16a34a' }} />
                                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Your Company — Receiving Warehouse
                                        </Typography>
                                    </Stack>
                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', mb: 0.3 }}>
                                        {companyDetails.companyName}
                                    </Typography>
                                    {companyAddressLine && (
                                        <Typography sx={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                                            {companyAddressLine}
                                        </Typography>
                                    )}
                                    {companyDetails.gstNumber && (
                                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                                            GSTIN: {companyDetails.gstNumber}
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
                                <Box sx={{ py: 2, textAlign: 'center' }}>
                                    <CircularProgress size={18} />
                                    <Typography sx={{ mt: 1, fontSize: '0.78rem', color: '#94a3b8' }}>Loading company address...</Typography>
                                </Box>
                            )
                        )}

                        {shipToMode === 'OTHER' && (
                            <Stack spacing={2}>
                                <Autocomplete
                                    fullWidth size="small"
                                    options={shipToContacts}
                                    loading={shipToContactLoading}
                                    getOptionLabel={c => c.companyName || ''}
                                    onInputChange={(_, val) => handleShipToContactSearch(val)}
                                    onChange={(_, c) => handleShipToContactPick(c)}
                                    value={shipToContact}
                                    disabled={readOnly}
                                    renderInput={params => (
                                        <TextField {...params} label="Search Recipient"
                                            placeholder="Type 2+ letters to search contacts..."
                                            InputProps={{
                                                ...params.InputProps,
                                                sx: { borderRadius: 1.5 },
                                                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment>
                                            }} />
                                    )} />
                                <Autocomplete
                                    fullWidth size="small"
                                    options={shipToAddresses}
                                    getOptionLabel={a => `${a.addressType}: ${a.city}, ${a.state}${a.pinCode ? ` (${a.pinCode})` : ''}`}
                                    value={selectedShipToAddr}
                                    onChange={(_, a) => set('shipToAddressId', a?.id ?? null)}
                                    disabled={readOnly || shipToAddresses.length === 0}
                                    renderInput={params => (
                                        <TextField {...params} label="Recipient Address"
                                            placeholder={shipToAddresses.length === 0 ? 'Pick a recipient first' : 'Select shipping address'}
                                            InputProps={{ ...params.InputProps, sx: { borderRadius: 1.5 } }} />
                                    )} />
                            </Stack>
                        )}

                        <TextField fullWidth size="small" label="Delivery Instructions (optional)"
                            placeholder="e.g. Gate 2, contact store-keeper"
                            value={formik.values.remarks ?? ''}
                            onChange={e => set('remarks', e.target.value)}
                            disabled={readOnly}
                            multiline rows={2}
                            sx={{ mt: 2 }}
                            InputProps={{ sx: { borderRadius: 1.5 } }} />
                    </SectionCard>

                    {/* Commercial Terms */}
                    <SectionCard title="Commercials" icon={Payment}>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField fullWidth size="small" label="Payment Terms"
                                    placeholder="e.g. 30 days net"
                                    value={formik.values.paymentTerms ?? ''}
                                    onChange={e => set('paymentTerms', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth size="small" label="Credit Days" type="number"
                                    value={formik.values.creditDays ?? ''}
                                    onChange={e => set('creditDays', e.target.value ? parseInt(e.target.value) : null)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth size="small" label="Ex. Rate" type="number"
                                    value={formik.values.exchangeRate ?? 1}
                                    onChange={e => set('exchangeRate', e.target.value)}
                                    disabled={readOnly}
                                    InputProps={{ sx: { borderRadius: 1.5 } }} />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* Notes */}
                    <SectionCard title="Internal Notes" icon={NoteAlt}>
                        <TextField fullWidth size="small" label="Internal Notes"
                            placeholder="Visible only to your team, not on the PO PDF"
                            multiline rows={3}
                            value={formik.values.internalNotes ?? ''}
                            onChange={e => set('internalNotes', e.target.value)}
                            disabled={readOnly}
                            InputProps={{ sx: { borderRadius: 1.5 } }} />
                    </SectionCard>
                </Grid>
            </Grid>
        </Box>
    );
}
