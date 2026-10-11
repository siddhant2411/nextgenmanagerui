import React, { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { listWarehouses } from '../../services/warehouseService';

/*
 * Picks a warehouse by its code. Use this wherever a document names the warehouse stock goes into
 * or comes out of: the backend takes the code, and a typed name ("Main Store") is refused.
 * `onChange` receives the code ('' for the default warehouse).
 *
 * Where leaving it blank means something other than the default warehouse, say what with
 * `emptyLabel` and turn `showDefaultCode` off so the default warehouse's code is not printed
 * beside it.
 */
/*
 * The code to print for a row's warehouse. Most responses carry the code as text, but the stock
 * ledger sends the whole warehouse record, and a record cannot be rendered as-is.
 */
export const warehouseCode = (warehouse) =>
    (warehouse && typeof warehouse === 'object' ? warehouse.code || warehouse.name : warehouse) || '';

export default function WarehouseSelect({ value, onChange, label = 'Warehouse', emptyLabel = 'Default warehouse', showDefaultCode = true, ...rest }) {
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => {
        let live = true;
        listWarehouses(true)
            .then((rows) => { if (live) setWarehouses(Array.isArray(rows) ? rows : []); })
            .catch(() => { if (live) setWarehouses([]); });
        return () => { live = false; };
    }, []);

    // A code already on the document stays selectable even if its warehouse has since been retired.
    const known = warehouses.some((w) => w.code === value);
    const def = warehouses.find((w) => w.isDefault);

    return (
        <TextField select label={label} {...rest}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            SelectProps={{ displayEmpty: true, ...(rest.SelectProps || {}) }}
            InputLabelProps={{ shrink: true, ...(rest.InputLabelProps || {}) }}>
            <MenuItem value="">
                <em>{def && showDefaultCode ? `${emptyLabel} (${def.code})` : emptyLabel}</em>
            </MenuItem>
            {value && !known && <MenuItem value={value}>{value}</MenuItem>}
            {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.code}>{w.code} — {w.name}</MenuItem>
            ))}
        </TextField>
    );
}
