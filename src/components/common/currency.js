import apiService from '../../services/apiService';

/*
 * The currencies a document can be raised in: the rupee and the ones India trades in most.
 * The server prints the same list on its PDFs (common/model/DocumentCurrency.java); keep the two alike.
 */
export const CURRENCIES = [
    { code: 'INR', sign: '₹',   name: 'Indian Rupee' },
    { code: 'USD', sign: '$',   name: 'US Dollar' },
    { code: 'EUR', sign: '€',   name: 'Euro' },
    { code: 'GBP', sign: '£',   name: 'British Pound' },
    { code: 'AED', sign: 'AED', name: 'UAE Dirham' },
    { code: 'SAR', sign: 'SAR', name: 'Saudi Riyal' },
    { code: 'CNY', sign: 'CN¥', name: 'Chinese Yuan' },
    { code: 'JPY', sign: 'JP¥', name: 'Japanese Yen' },
    { code: 'SGD', sign: 'S$',  name: 'Singapore Dollar' },
    { code: 'HKD', sign: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'AUD', sign: 'A$',  name: 'Australian Dollar' },
    { code: 'CAD', sign: 'C$',  name: 'Canadian Dollar' },
    { code: 'CHF', sign: 'CHF', name: 'Swiss Franc' },
    { code: 'RUB', sign: '₽',   name: 'Russian Ruble' },
];

const byCode = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

/* The sign printed before an amount: ₹ for blank (every document defaults to rupees), the code itself when it is not on the list. */
export const currencySign = (code) => {
    const c = (code || 'INR').trim().toUpperCase();
    return byCode[c]?.sign ?? c;
};

export const isRupee = (code) => (code || 'INR').trim().toUpperCase() === 'INR';

/*
 * The rate a new document in this currency starts with: the last one entered on a quotation or
 * sales order in it, or null when none has been. 1 for rupees. There is no live rate feed.
 */
export const latestRate = async (code) => {
    if (isRupee(code)) return 1;
    try {
        const res = await apiService.get('/exchange-rates/latest', { currency: code });
        return res?.rate != null ? Number(res.rate) : null;
    } catch {
        return null;
    }
};

/* An amount with its currency's sign: ₹1,50,500.00 in lakhs for rupees, $150,500.00 in thousands for anything else. */
export const formatMoney = (amount, code, { decimals = 2 } = {}) => {
    const c = (code || 'INR').trim().toUpperCase();
    const n = Number(amount) || 0;
    const sign = currencySign(c);
    const text = Math.abs(n).toLocaleString(c === 'INR' ? 'en-IN' : 'en-US',
        { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    // A sign that is letters ("AED") reads better with a space after it.
    return `${n < 0 ? '−' : ''}${sign}${/[A-Z]$/.test(sign) ? ' ' : ''}${text}`;
};
