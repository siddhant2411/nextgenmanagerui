import apiClient from "./apiService";
import apiService from "./apiService";

export const searchContacts = async (search='') => {
    try {
        const params = {
            page: 0,
            size: 10,
            sortBy: "companyName",
            sortDir: "asc",
            companyName:search,
            gstNumber:'',
            state:''
        };
        const response = await apiClient.get('/contact',params);
        return response.content;
    } catch (error) {
        console.error('Error fetching contacts:', error);
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
        const response = await apiClient.get('/inventory_item/search',params);
        return response.content;
    } catch (error) {
        console.error('Error fetching contacts:', error);
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
            enqNo:search
        };
        const response = await apiService.get('/enquiry', params);
        return response.content;
    } catch (error) {
        console.error('Error fetching Enquiry:', error);
        throw error;
    }
};