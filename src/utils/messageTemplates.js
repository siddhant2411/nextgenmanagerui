import apiService from '../services/apiService';
import { formatMoney } from '../components/common/currency';

/*
 * The one place a message template's {{placeholders}} are filled, for every screen that sends one
 * (enquiry, quotation, purchase order) by WhatsApp or email.
 *
 * Every screen fills the same names, so a template works wherever it is picked:
 *   {{companyName}}  is always your own company: the templates sign off with it.
 *   {{customerName}} / {{vendorName}} is the other party; {{contactPerson}} the person addressed.
 * Each screen used to fill only its own handful of names, and filled {{companyName}} with the
 * customer, so a template picked on another screen went out with "{{enqNo}}" in it and signed in
 * the customer's name.
 *
 * A placeholder with nothing to fill it is left in the text and reported, so it is seen in the
 * preview instead of going out unnoticed. The text is filled again when it is sent, so a field
 * inserted while editing is filled too.
 */

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

const LABELS = {
    contactPerson: 'Contact person', customerName: 'Customer', vendorName: 'Vendor', companyName: 'Your company',
    phone: 'Phone', email: 'Email', city: 'City', state: 'State',
    enqNo: 'Enquiry no.', enqDate: 'Enquiry date', opportunityName: 'Opportunity',
    qtnNo: 'Quotation no.', qtnDate: 'Quotation date', totalAmount: 'Quotation total', currency: 'Currency',
    poNumber: 'PO number', quotationNumber: 'Their quotation no.', quotationDate: 'Their quotation date',
    orderDate: 'Order date', expectedDeliveryDate: 'Delivery date', grandTotal: 'PO total',
};

const ENQUIRY_FIELDS = ['contactPerson', 'customerName', 'companyName', 'enqNo', 'enqDate', 'opportunityName',
    'phone', 'email', 'city', 'state'];

const FIELDS = {
    enquiry: ENQUIRY_FIELDS,
    quotation: [...ENQUIRY_FIELDS, 'qtnNo', 'qtnDate', 'totalAmount', 'currency'],
    purchaseOrder: ['contactPerson', 'vendorName', 'companyName', 'poNumber', 'quotationNumber', 'quotationDate',
        'orderDate', 'expectedDeliveryDate', 'currency', 'grandTotal', 'phone', 'email'],
};

/* The fields a screen can fill, for its insert-a-field chips: [{ key: '{{enqNo}}', label: 'Enquiry no.' }]. */
export const mergeFieldsFor = (kind) => (FIELDS[kind] || []).map((k) => ({ key: `{{${k}}}`, label: LABELS[k] || k }));

/* The template categories that make sense to send from a screen. */
const CATEGORIES = {
    enquiry: ['ENQUIRY', 'FOLLOW_UP', 'GENERAL', 'QUOTATION'],
    quotation: ['QUOTATION', 'FOLLOW_UP', 'GENERAL', 'ENQUIRY'],
    purchaseOrder: ['PURCHASE_ORDER', 'GENERAL'],
};
export const templatesFor = (kind, templates) =>
    (templates || []).filter((t) => !t.category || (CATEGORIES[kind] || []).includes(t.category));

const present = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/* { text, missing }: the text with every placeholder that has a value filled, and the names of those that had none. */
export const fillTemplate = (text, values) => {
    const missing = new Set();
    const out = (text || '').replace(PLACEHOLDER, (whole, key) => {
        if (!present(values?.[key])) {
            missing.add(key);
            return whole;
        }
        return String(values[key]);
    });
    return { text: out, missing: [...missing] };
};

/* Your own company, fetched once per page load. */
let ownCompany = null;
export const loadOwnCompany = () => {
    if (!ownCompany) {
        ownCompany = apiService.get('/company').catch(() => {
            ownCompany = null;
            return null;
        });
    }
    return ownCompany;
};

const date = (d) => {
    if (!d) return '';
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? String(d)
        : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* The person a party's messages go to: their primary contact person, else the first one named. */
const personOf = (contact) => {
    const people = (contact?.personDetails || []).filter((p) => p.personName?.trim());
    return people.find((p) => p.isPrimary) || people[0] || null;
};

/*
 * An enquiry, as the enquiry list row or the full record (with its contact). The person addressed
 * is the one the enquiry names, else the customer's primary contact person, as on the quotation PDF.
 */
export const enquiryValues = (enq, company) => {
    const customer = enq?.contact?.companyName || enq?.companyName || enq?.manualCompanyName;
    const person = personOf(enq?.contact);
    return {
        companyName: company?.companyName,
        customerName: customer,
        contactPerson: enq?.contactPersonName || person?.personName || customer || 'Sir/Madam',
        phone: enq?.contactPersonPhone || enq?.phone || person?.phoneNumber || enq?.contact?.phone,
        email: enq?.contactPersonEmail || enq?.email || person?.emailId || enq?.contact?.email,
        city: enq?.city,
        state: enq?.state,
        enqNo: enq?.enqNo,
        enqDate: date(enq?.enqDate),
        opportunityName: enq?.opportunityName || 'your requirement',
    };
};

/* A quotation: the full record where there is one, the list row's fields otherwise. */
export const quotationValues = (q, company) => {
    const enq = q?.enquiry || { enqNo: q?.enqNo, enqDate: q?.enqDate, companyName: q?.companyName, phone: q?.phone, email: q?.email };
    return {
        ...enquiryValues(enq, company),
        qtnNo: q?.qtnNo,
        qtnDate: date(q?.qtnDate),
        currency: q?.currency || 'INR',
        totalAmount: q?.totalAmount != null ? formatMoney(q.totalAmount, q.currency) : undefined,
    };
};

/* A purchase order, with the vendor's contact record where it has been fetched. */
export const purchaseOrderValues = (po, company, vendorContact) => {
    const person = personOf(vendorContact);
    return {
        companyName: company?.companyName,
        vendorName: po?.vendorName,
        contactPerson: po?.vendorContactPerson || person?.personName || po?.vendorName || 'Sir/Madam',
        phone: po?.vendorPhone || person?.phoneNumber,
        email: po?.vendorEmail || person?.emailId,
        poNumber: po?.purchaseOrderNumber,
        quotationNumber: po?.quotationNumber || '—',
        quotationDate: date(po?.quotationDate) || '—',
        orderDate: date(po?.orderDate),
        expectedDeliveryDate: date(po?.expectedDeliveryDate),
        currency: po?.currency || 'INR',
        grandTotal: po?.grandTotal != null
            ? Number(po.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : undefined,
    };
};

/* "No value for {{enqNo}}, {{qtnNo}}": shown in a picker's preview while anything is left unfilled. */
export const missingNote = (missing) =>
    missing?.length ? `No value for ${missing.map((k) => `{{${k}}}`).join(', ')}. Edit the text before sending, or it goes out as written.` : '';
