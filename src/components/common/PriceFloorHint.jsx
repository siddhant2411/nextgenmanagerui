import React from 'react';
import { Typography } from '@mui/material';

/*
 * The price floor a sales user works within: the item's Minimum Selling Price on the item master.
 *
 * The server is what enforces it (a quotation below the minimum is refused for a sales user, a
 * sales order line is flagged for its approver). These helpers only show the same figures while
 * the price is being typed, so nobody finds out at Save. An item with no minimum has no floor.
 */
const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const inr = (v) => `₹${num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const listPriceOf = (item) => num(item?.productFinanceSettings?.sellingPrice) || null;

export const floorOf = (item) => num(item?.productFinanceSettings?.minimumSellingPrice) || null;

/* What the customer pays per unit once the line and document discounts are taken off. */
export const effectiveUnitPrice = (price, lineDiscountPct = 0, documentDiscountPct = 0) =>
    Math.round(num(price) * (1 - num(lineDiscountPct) / 100) * (1 - num(documentDiscountPct) / 100) * 100) / 100;

export const isBelowFloor = (floor, price, lineDiscountPct = 0, documentDiscountPct = 0) =>
    floor != null && num(floor) > 0 && effectiveUnitPrice(price, lineDiscountPct, documentDiscountPct) < num(floor);

/*
 * "List ₹300.00 · Min ₹270.00 (max 10% off)" under a price box; turns red once the price, after
 * discounts, is under the minimum. `floor` overrides the item's own figure where the server has
 * already sent one for the line.
 */
const PriceFloorHint = ({ item, floor, price, lineDiscountPct = 0, documentDiscountPct = 0, align = 'right' }) => {
    const list = listPriceOf(item);
    const min = floor != null ? num(floor) || null : floorOf(item);
    if (list == null && min == null) return null;

    const below = isBelowFloor(min, price, lineDiscountPct, documentDiscountPct);
    const maxOff = list && min && min <= list ? Math.round(((list - min) / list) * 1000) / 10 : null;

    const parts = [];
    if (list != null) parts.push(`List ${inr(list)}`);
    if (min != null) parts.push(`Min ${inr(min)}${maxOff != null ? ` (max ${maxOff}% off)` : ''}`);

    return (
        <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.5, textAlign: align, whiteSpace: 'nowrap', fontWeight: below ? 700 : 500, color: below ? '#dc2626' : '#64748b' }}
        >
            {below
                ? `Below minimum ${inr(min)} — ${inr(effectiveUnitPrice(price, lineDiscountPct, documentDiscountPct))} after discount`
                : parts.join(' · ')}
        </Typography>
    );
};

export default PriceFloorHint;
