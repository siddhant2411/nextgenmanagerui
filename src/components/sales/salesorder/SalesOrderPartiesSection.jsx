import React, { useEffect, useState } from 'react';
import {
    Autocomplete, Box, Chip, Grid, MenuItem, Stack, TextField,
    ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import apiService from '../../../services/apiService';
import { searchContacts } from '../../../services/commonAPI';
import convertAddressToString, { pickBillingAddress, pickShippingAddress } from '../../../commonTools/convertAddress';
import GstStateSelect from '../../common/GstStateSelect';
import { gstStatesNow, stateCodeForName, stateCodeFromGstin, useGstStates } from '../../../services/gstStates';

const C = { primary: '#2563eb', border: '#e2e8f0', bg: '#f8fafc', text: '#0f172a', textSec: '#64748b' };
const field = { '& .MuiOutlinedInput-root': { borderRadius: 3 } };

/*
 * Ship-to is one of three things, and the order stores them as blanks rather than a mode:
 *   SAME    — goods go to the bill-to address         (deliveryAddress blank, shipToName blank)
 *   ADDRESS — another site of the same customer       (deliveryAddress set,   shipToName blank)
 *   PARTY   — a different consignee altogether        (shipToName set)
 */
const modeOf = (v) => (v.shipToName ? 'PARTY' : v.deliveryAddress ? 'ADDRESS' : 'SAME');

/* A party's GST state: the one on its record, else its GSTIN's, else the state named on the address. */
const stateCodeOfParty = (states, contact, address) =>
    (states.some((s) => s.code === contact?.stateCode) ? contact.stateCode : '')
    || stateCodeFromGstin(states, contact?.gstNumber)
    || stateCodeForName(states, address?.state);

/*
 * What a freshly chosen customer puts on the order: their billing address, shipped to the same
 * place, and their state as the place of supply (the bill-to state decides it, wherever the goods go).
 */
export const partyDefaultsFor = (contact) => ({
    billToAddress: convertAddressToString(pickBillingAddress(contact?.addresses ?? [])),
    placeOfSupplyStateCode: stateCodeOfParty(gstStatesNow(), contact, pickBillingAddress(contact?.addresses ?? [])),
    placeOfSupply: '',
    deliveryAddress: '',
    shipToName: '',
    shipToGstin: '',
    shipToStateCode: '',
});

const addressLabel = (a) =>
    `${a.addressType ?? 'ADDRESS'} · ${[a.city, a.state].filter(Boolean).join(', ') || a.street1 || 'no city'}${a.isDefault ? ' (default)' : ''}`;

const PartyLabel = ({ children }) => (
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
        {children}
    </Typography>
);

/* Picks one of a party's saved addresses. Shows nothing selected once the text has been edited by hand. */
const AddressPicker = ({ label, addresses, value, onPick, disabled }) => {
    const selected = addresses.findIndex((a) => convertAddressToString(a) === (value ?? '').trim());
    return (
        <TextField select fullWidth size="small" label={label} disabled={disabled} sx={field}
            value={selected >= 0 ? selected : ''}
            onChange={(e) => onPick(addresses[e.target.value])}>
            {addresses.map((a, i) => <MenuItem key={a.id ?? i} value={i}>{addressLabel(a)}</MenuItem>)}
        </TextField>
    );
};

export default function SalesOrderPartiesSection({ formik, readOnly }) {
    const v = formik.values;
    const customerId = v.contact?.id ?? v.contact?.contactId ?? null;

    const [customer, setCustomer] = useState(null);
    const states = useGstStates();
    const [mode, setMode] = useState(modeOf(v));
    const [consigneeOptions, setConsigneeOptions] = useState([]);
    const [consigneeAddresses, setConsigneeAddresses] = useState([]);

    // An order opened for editing knows its customer only by id and name; the addresses are fetched.
    useEffect(() => {
        if (!customerId) { setCustomer(null); return undefined; }
        if (Array.isArray(v.contact?.addresses)) { setCustomer(v.contact); return undefined; }
        let live = true;
        apiService.get(`/contact/${customerId}`)
            .then((c) => { if (live) setCustomer(c); })
            .catch(() => { if (live) setCustomer(null); });
        return () => { live = false; };
    }, [customerId]);

    // A loaded order, or a change of customer, decides the mode afresh from what the order holds.
    useEffect(() => {
        setMode(modeOf(formik.values));
        setConsigneeAddresses([]);
    }, [v.id, customerId]);

    const set = (name, value) => formik.setFieldValue(name, value ?? '');
    const stateCodeFor = (name) => stateCodeForName(states, name);

    const changeMode = (_, next) => {
        if (!next) return;
        setMode(next);
        if (next === 'SAME') {
            set('deliveryAddress', '');
            set('shipToStateCode', '');
        }
        if (next !== 'PARTY') {
            set('shipToName', '');
            set('shipToGstin', '');
            setConsigneeAddresses([]);
        }
    };

    const pickShipAddress = (a) => {
        set('deliveryAddress', convertAddressToString(a));
        set('shipToStateCode', stateCodeFor(a?.state));
    };

    const pickConsignee = (contact) => {
        if (!contact || typeof contact === 'string') return;
        const addresses = contact.addresses ?? [];
        const first = pickShippingAddress(addresses);
        setConsigneeAddresses(addresses);
        set('shipToName', contact.companyName);
        set('shipToGstin', contact.gstNumber);
        set('deliveryAddress', convertAddressToString(first));
        set('shipToStateCode', stateCodeOfParty(states, contact, first));
    };

    const searchConsignees = (text) => {
        if (!text || text.length < 2) return;
        searchContacts(text).then((r) => setConsigneeOptions(r ?? [])).catch(() => {});
    };

    const addresses = customer?.addresses ?? [];
    const billToText = v.billToAddress || convertAddressToString(pickBillingAddress(addresses));
    const gstin = customer?.gstNumber ?? v.contact?.gstNumber;

    const stateSelect = (
        <GstStateSelect size="small" label="Ship-to State" disabled={readOnly} sx={field}
            value={v.shipToStateCode} onChange={(code) => set('shipToStateCode', code)} />
    );

    return (
        <Grid container spacing={5}>
            {/* ── Bill to ── */}
            <Grid item xs={12} md={6}>
                <PartyLabel>Bill To</PartyLabel>
                {!customerId ? (
                    <Typography sx={{ color: C.textSec, fontSize: '0.9rem' }}>Select a customer first.</Typography>
                ) : (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 900, color: C.text, fontSize: '1.05rem' }}>
                                {v.contact?.companyName}
                            </Typography>
                            <Chip size="small" variant="outlined" label={gstin ? `GSTIN ${gstin}` : 'Unregistered'}
                                sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                        </Stack>
                        {addresses.length > 1 && (
                            <AddressPicker label="Use a saved address" addresses={addresses} value={v.billToAddress}
                                onPick={(a) => set('billToAddress', convertAddressToString(a))} disabled={readOnly} />
                        )}
                        <TextField fullWidth multiline minRows={3} label="Billing Address" name="billToAddress"
                            value={v.billToAddress} onChange={formik.handleChange} disabled={readOnly} sx={field}
                            inputProps={{ maxLength: 500 }}
                            helperText={v.billToAddress ? ' ' : "Blank uses the customer's billing address on file"} />
                    </Stack>
                )}
            </Grid>

            {/* ── Ship to ── */}
            <Grid item xs={12} md={6}>
                <PartyLabel>Ship To</PartyLabel>
                <Stack spacing={2}>
                    <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={mode}
                        onChange={changeMode} disabled={readOnly || !customerId}
                        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 800, borderRadius: 3 } }}>
                        <ToggleButton value="SAME">Same as bill to</ToggleButton>
                        <ToggleButton value="ADDRESS">Customer&apos;s other site</ToggleButton>
                        <ToggleButton value="PARTY">Different party</ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'SAME' && (
                        <Box sx={{ p: 2, borderRadius: 3, bgcolor: C.bg, border: `1px dashed ${C.border}` }}>
                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: '0.9rem' }}>
                                {v.contact?.companyName ?? '—'}
                            </Typography>
                            <Typography sx={{ color: C.textSec, fontSize: '0.85rem', mt: 0.5 }}>
                                {billToText || 'No billing address on file for this customer.'}
                            </Typography>
                        </Box>
                    )}

                    {mode === 'PARTY' && (
                        <>
                            <Autocomplete freeSolo options={consigneeOptions} disabled={readOnly}
                                getOptionLabel={(o) => (typeof o === 'string' ? o : o?.companyName ?? '')}
                                inputValue={v.shipToName ?? ''}
                                onInputChange={(_, text, reason) => {
                                    if (reason === 'reset') return;
                                    set('shipToName', text);
                                    searchConsignees(text);
                                }}
                                onChange={(_, picked) => pickConsignee(picked)}
                                renderInput={(p) => (
                                    <TextField {...p} size="small" label="Consignee *" sx={field}
                                        error={!v.shipToName} inputProps={{ ...p.inputProps, maxLength: 255 }}
                                        helperText="Search your contacts, or type a name that is not one" />
                                )} />
                            <TextField fullWidth size="small" label="Consignee GSTIN" disabled={readOnly} sx={field}
                                value={v.shipToGstin ?? ''} inputProps={{ maxLength: 15 }}
                                onChange={(e) => {
                                    const g = e.target.value.toUpperCase();
                                    set('shipToGstin', g);
                                    if (g.length === 15 && stateCodeFromGstin(states, g)) {
                                        set('shipToStateCode', stateCodeFromGstin(states, g));
                                    }
                                }}
                                helperText="Leave blank if the consignee is unregistered" />
                        </>
                    )}

                    {mode !== 'SAME' && (
                        <>
                            {(mode === 'ADDRESS' ? addresses : consigneeAddresses).length > 0 && (
                                <AddressPicker label="Use a saved address" disabled={readOnly}
                                    addresses={mode === 'ADDRESS' ? addresses : consigneeAddresses}
                                    value={v.deliveryAddress} onPick={pickShipAddress} />
                            )}
                            <TextField fullWidth multiline minRows={3} label="Delivery Address *" name="deliveryAddress"
                                value={v.deliveryAddress} onChange={formik.handleChange} disabled={readOnly} sx={field}
                                error={!v.deliveryAddress} inputProps={{ maxLength: 500 }} />
                            {stateSelect}
                        </>
                    )}
                </Stack>
            </Grid>
        </Grid>
    );
}
