import React from 'react';
import { Autocomplete, MenuItem, TextField } from '@mui/material';
import { stateLabel, useGstStates } from '../../services/gstStates';

/*
 * Picks a GST state by its 2-digit code. Use this wherever a state decides tax: place of supply,
 * ship-to state, an unregistered party's state. `onChange` receives the code ('' when cleared).
 */
export default function GstStateSelect({ value, onChange, label = 'State', emptyLabel = 'Not stated', ...rest }) {
    const states = useGstStates();
    return (
        <TextField select fullWidth label={label} {...rest}
            value={states.some((s) => s.code === value) ? value : ''}
            onChange={(e) => onChange(e.target.value)}>
            <MenuItem value=""><em>{emptyLabel}</em></MenuItem>
            {states.map((s) => <MenuItem key={s.code} value={s.code}>{s.name} ({s.code})</MenuItem>)}
        </TextField>
    );
}

/* A stored state code shown to a reader: "Gujarat (24)". */
export function GstStateLabel({ code, empty = '—' }) {
    return stateLabel(useGstStates(), code) || empty;
}

/* Superseded codes ("pre-2014") and the two jurisdiction codes are tax codes, not places to post to. */
const isPostalState = (s) => s.code < '90' && !s.name.includes('(');

/*
 * The state line of a postal address, stored as a name. It offers the same list so that an Indian
 * address is always spelt the way the tax code is looked up, and still takes a typed value for an
 * address abroad. `onChange` receives the name.
 */
export function StateNameField({ value, onChange, label = 'State', disabled, size, sx, ...rest }) {
    const states = useGstStates();
    return (
        <Autocomplete freeSolo fullWidth disabled={disabled} size={size}
            options={states.filter(isPostalState).map((s) => s.name)}
            value={value ?? ''}
            onChange={(_, picked) => onChange(picked ?? '')}
            onInputChange={(_, text, reason) => { if (reason === 'input') onChange(text); }}
            renderInput={(params) => <TextField {...params} label={label} sx={sx} {...rest} />}
        />
    );
}
