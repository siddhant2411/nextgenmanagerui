import React from 'react';
import { MenuItem, TextField } from '@mui/material';
import { CURRENCIES } from './currency';

/*
 * Picks a currency from the common list. Use this wherever a document or a party has a currency.
 * `onChange` receives the code. A code saved before the list existed stays shown, so opening an
 * old record never changes it silently.
 */
/*
 * Rupees per one unit of a foreign currency, beside the currency on a quotation or sales order.
 * Renders nothing for rupees. The server refuses a foreign-currency document without a rate.
 */
export function ExchangeRateField({ currency, value, onChange, ...rest }) {
    const code = (currency || 'INR').toUpperCase();
    if (code === 'INR') return null;
    const missing = !(parseFloat(value) > 0);
    return (
        <TextField fullWidth type="number" label={`Rate (₹ per 1 ${code}) *`} {...rest}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            error={missing}
            helperText={missing ? `How many rupees one ${code} is worth` : 'Margin, books and GST returns are kept in rupees at this rate'}
            inputProps={{ min: 0, step: 'any' }} />
    );
}

export default function CurrencySelect({ value, onChange, label = 'Currency', ...rest }) {
    const code = (value || 'INR').toUpperCase();
    const known = CURRENCIES.some((c) => c.code === code);
    return (
        <TextField select fullWidth label={label} {...rest}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            SelectProps={{ renderValue: (v) => v, ...(rest.SelectProps || {}) }}>
            {!known && <MenuItem value={code}>{code}</MenuItem>}
            {CURRENCIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.sign} &nbsp;{c.code} · {c.name}</MenuItem>
            ))}
        </TextField>
    );
}
