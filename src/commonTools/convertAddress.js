const has = (s) => s != null && String(s).trim() !== '';

// One line, missing parts left out: "street1, street2, city, state - pin".
// Matches the format the backend prints on sales documents (SalesParties.format).
const convertAddressToString = (addressObject) => {
    if (!addressObject) return '';
    const line = [addressObject.street1, addressObject.street2, addressObject.city, addressObject.state]
        .filter(has)
        .map((s) => String(s).trim())
        .join(', ');
    if (!has(addressObject.pinCode)) return line;
    return (line ? line + ' - ' : '') + String(addressObject.pinCode).trim();
};

const isBilling = (a) => !a.addressType || a.addressType === 'BILLING' || a.addressType === 'BOTH';
const isShipping = (a) => a.addressType === 'SHIPPING' || a.addressType === 'FACTORY' || a.addressType === 'BOTH';

// The address a party is billed at: a billing address before any other kind, the default one first.
export const pickBillingAddress = (addresses = []) =>
    addresses.find((a) => isBilling(a) && a.isDefault)
    ?? addresses.find(isBilling)
    ?? addresses.find((a) => a.isDefault)
    ?? addresses[0]
    ?? null;

// Where goods for a party are delivered: a shipping or factory address before a billing one.
export const pickShippingAddress = (addresses = []) =>
    addresses.find((a) => isShipping(a) && a.isDefault)
    ?? addresses.find(isShipping)
    ?? addresses.find((a) => a.isDefault)
    ?? addresses[0]
    ?? null;

export default convertAddressToString;
