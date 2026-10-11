import React from 'react';

/*
 * Shared behaviour for every picker that offers inventory items from the server search.
 *
 * The search endpoint already matches the typed text against the item name, the item code and the
 * HSN code. A MUI Autocomplete then filters those results a second time in the browser, against
 * the option's *label* only. A picker labelled by name therefore threw away every result that
 * matched on the code, so typing "FG-0002" found nothing while typing "Wheel Hub" worked.
 *
 * Use `serverFiltered` as `filterOptions` so the server's answer is shown as it came back, and
 * `renderItemOption` so each result shows its code beside its name.
 */
export const serverFiltered = (options) => options;

export const renderItemOption = (props, option) => {
    const { key, ...rest } = props;
    return (
        <li key={key ?? option?.inventoryItemId} {...rest}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{option?.name || option?.itemName || option?.itemCode}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {option?.itemCode}{option?.hsnCode ? ` · HSN ${option.hsnCode}` : ''}
                </span>
            </div>
        </li>
    );
};

/* "FG-0002 — Wheel Hub Assembly - Front": code first, since that is what people type. */
export const itemLabel = (o) => {
    if (!o) return '';
    if (typeof o === 'string') return o;
    const name = o.name || o.itemName || o.productNameRequired || '';
    return o.itemCode ? `${o.itemCode} — ${name}` : name;
};
