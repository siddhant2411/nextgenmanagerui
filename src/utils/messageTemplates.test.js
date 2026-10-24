import { enquiryValues, fillTemplate, purchaseOrderValues, quotationValues, templatesFor } from './messageTemplates';

jest.mock('../services/apiService', () => ({ __esModule: true, default: { get: jest.fn() } }));

// The seeded "Email - Enquiry Acknowledgment" template.
const ACK = `Dear {{contactPerson}},

Thank you for reaching out to us regarding {{opportunityName}}.

Your enquiry has been registered with reference number {{enqNo}}.

Best regards,
{{companyName}}`;

const company = { companyName: 'Vajra Auto Components Private Limited' };

const quotation = {
    id: 152, qtnNo: '2026-0152', qtnDate: '2026-10-24', currency: 'USD', totalAmount: 478,
    enquiry: {
        enqNo: 'ENQ/2026-27/0009', enqDate: '2026-10-20', opportunityName: 'M12 hex bolts',
        contactPersonName: 'Rahul Deshmukh',
        contact: { companyName: 'Precision Fasteners India', personDetails: [] },
    },
};

describe('fillTemplate', () => {
    it('fills an enquiry template picked on a quotation, and signs it as your own company', () => {
        const { text, missing } = fillTemplate(ACK, quotationValues(quotation, company));
        expect(missing).toEqual([]);
        expect(text).toContain('Dear Rahul Deshmukh,');
        expect(text).toContain('regarding M12 hex bolts.');
        expect(text).toContain('reference number ENQ/2026-27/0009.');
        expect(text).toMatch(/Best regards,\nVajra Auto Components Private Limited$/);
        expect(text).not.toContain('Precision Fasteners India');
    });

    it('leaves a placeholder with no value in the text and reports it', () => {
        const { text, missing } = fillTemplate('Ref {{enqNo}} / {{qtnNo}} / {{nonsense}}', enquiryValues({ enqNo: 'E-1' }, company));
        expect(text).toBe('Ref E-1 / {{qtnNo}} / {{nonsense}}');
        expect(missing).toEqual(['qtnNo', 'nonsense']);
    });

    it('fills a field however it is spaced, wherever it appears, as often as it appears', () => {
        expect(fillTemplate('{{ qtnNo }} and {{qtnNo}}', quotationValues(quotation, company)).text).toBe('2026-0152 and 2026-0152');
    });

    it('shows a quotation total with its own currency sign', () => {
        expect(fillTemplate('{{totalAmount}}', quotationValues(quotation, company)).text).toBe('$478.00');
    });

    it('signs a purchase order as your company and addresses the vendor\'s primary contact person', () => {
        const po = { purchaseOrderNumber: 'PO/1', vendorName: 'Steel Mart', grandTotal: 1180, currency: 'INR' };
        const vendor = { personDetails: [{ personName: 'Asha', isPrimary: false }, { personName: 'Vikram', isPrimary: true }] };
        const { text, missing } = fillTemplate('Dear {{contactPerson}}, PO {{poNumber}} {{currency}} {{grandTotal}}. {{companyName}}',
            purchaseOrderValues(po, company, vendor));
        expect(missing).toEqual([]);
        expect(text).toBe('Dear Vikram, PO PO/1 INR 1,180.00. Vajra Auto Components Private Limited');
    });

    it('reports your company as missing until it has loaded, rather than signing with a blank', () => {
        expect(fillTemplate('{{companyName}}', quotationValues(quotation, null)).missing).toEqual(['companyName']);
    });
});

describe('templatesFor', () => {
    const all = [{ category: 'ENQUIRY' }, { category: 'QUOTATION' }, { category: 'PURCHASE_ORDER' }, { category: 'GENERAL' }];
    it('keeps purchase-order templates off sales screens and sales templates off a purchase order', () => {
        expect(templatesFor('quotation', all).map((t) => t.category)).toEqual(['ENQUIRY', 'QUOTATION', 'GENERAL']);
        expect(templatesFor('purchaseOrder', all).map((t) => t.category)).toEqual(['PURCHASE_ORDER', 'GENERAL']);
    });
});
