import { createFilterOptions } from '@mui/material/Autocomplete';

// How a vendor / customer reads in a picker: "Company Name (CODE)". Contacts loaded without a code show the name alone.
export const contactLabel = (contact) => {
    const name = contact?.companyName || '';
    return contact?.contactCode ? `${name} (${contact.contactCode})` : name;
};

// For pickers whose input must stay the bare name (free-typed parties): still match on the code.
export const filterContactOptions = createFilterOptions({
    stringify: (o) => (typeof o === 'string' ? o : contactLabel(o)),
});
