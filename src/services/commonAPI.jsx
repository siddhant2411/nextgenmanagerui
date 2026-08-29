import apiClient from "./apiService";
import apiService from "./apiService";
import { searchInventoryItems } from "./inventoryService";

export const searchContacts = async (search='') => {
    try {
        const response = await apiService.get('/contact', {
            page: 0,
            size: 10,
            sortBy: "companyName",
            sortDir: "asc",
            query: search,
        });
        return response?.content ?? [];
    } catch (error) {
        throw error;
    }
};

export const inventoryItemSearch = async (search='') => {
    try {
        const params = {
            page: 0,
            size: 10,
            sortBy: "itemCode",
            sortDir: "asc",
            query: search
        };
        const response = await searchInventoryItems(params);
        return response.content;
    } catch (error) {
        throw error;
    }
};

export const searchEnquiry = async (search='') => {
    try {
        const params = {
            page:0,
            size: 10,
            sortBy: 'enqNo',
            sortDir: 'asc',
            // enqNo is an exact match on the API; a type-ahead wants the substring variant.
            // Sending a partial number as enqNo would now return nothing at all.
            enqNoContains:search
        };
        const response = await apiService.get('/enquiry', params);
        return response.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Enquiry lookup for the AI Lead Review merge picker, where a reviewer might search by the
 * customer's name (all they have from the extracted mail) or by an enquiry number they already
 * know. Two independent calls, not one request with both filters set — the backend ANDs every
 * filter it's given, so companyName + enqNoContains together would only return rows matching
 * both at once, which is wrong for "either of these might be what they typed". Results are
 * merged and de-duplicated by id, most recent first: a merge target is almost always a
 * recently-opened enquiry, not an old closed one.
 */
export const searchEnquiryForMerge = async (search = '') => {
    try {
        const params = { page: 0, size: 10, sortBy: 'enqDate', sortDir: 'desc' };
        const [byCompany, byNumber] = await Promise.all([
            apiService.get('/enquiry', { ...params, companyName: search }),
            apiService.get('/enquiry', { ...params, enqNoContains: search }),
        ]);
        const merged = new Map();
        for (const row of [...(byCompany?.content ?? []), ...(byNumber?.content ?? [])]) {
            merged.set(row.id, row);
        }
        return Array.from(merged.values());
    } catch (error) {
        throw error;
    }
};


export const searchQuotations = async (search='') => {
    try {
        const params = {
            page: 0,
            size: 10,
            sortBy: "qtnNo",
            sortDir: "asc",
            qtnNo:search,
        };
        const response = await apiClient.get('/quotation',params);
        return response.content;
    } catch (error) {
        throw error;
    }
};


export const searchJobs = async (search='') => {
    try {
        const params = {
            page: 0,
            size: 10,
            sortBy: "jobName",
            sortDir: "asc",
            search:search,
        };
        const response = await apiClient.get('/production/production-job',params);
        return response.content;
    } catch (error) {
        throw error;
    }
};

export const searchLaborRoles = async (search='') => {
    try {
        const params = {
            page: 0,
            size: 100,
            sortBy: "roleName",
            sortDir: "asc",
            search: search,
        };
        const response = await apiClient.get('/production/labor-role', params);
        return response.content;
    } catch (error) {
        throw error;
    }
};

export const searchMachines = async (search='') => {
    try {
        const response = await apiClient.get('/machine-details');
        return response;
    } catch (error) {
        throw error;
    }
};

export const searchUsers = async (search='') => {
    try {
        const response = await apiService.get('/auth/users');
        if (search && Array.isArray(response)) {
            return response.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
        }
        return response;
    } catch (error) {
        throw error;
    }
};
