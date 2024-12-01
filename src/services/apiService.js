import axios from 'axios';

// Ensure the base URL includes the protocol
const API_BASE_URL = 'http://localhost:8080/api'; // Add 'http://' or 'https://'

// Create a reusable Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Common CRUD service
const apiService = {
    // GET request
    get: async (endpoint, params = {}) => {
        try {
            // Log the full request URL including query parameters
            const queryParams = new URLSearchParams(params).toString();
            console.log(`Requesting: ${apiClient.defaults.baseURL + endpoint}?${queryParams}`);

            const response = await apiClient.get(endpoint, { params });
            return response.data; // Return only the data part of the response
        } catch (error) {
            console.error('GET request error:', error.response?.data || error.message);
            throw error; // Ensure error is rethrown for the caller to handle
        }
    },


    // POST request
    post: async (endpoint, data) => {
        try {
            const response = await apiClient.post(endpoint, data);
            return response.data;
        } catch (error) {
            console.error('POST request error:', error);
            throw error;
        }
    },

    // PUT request
    put: async (endpoint, data) => {
        try {
            const response = await apiClient.put(endpoint, data);
            console.log(`Requesting: ${apiClient.defaults.baseURL + endpoint}`);
            console.log(data);
            return response.data;
        } catch (error) {
            console.error('PUT request error:', error);
            throw error;
        }
    },

    // DELETE request
    delete: async (endpoint) => {
        try {
            const response = await apiClient.delete(endpoint);
            return response.data;
        } catch (error) {
            console.error('DELETE request error:', error);
            throw error;
        }
    },
};

export default apiService;
