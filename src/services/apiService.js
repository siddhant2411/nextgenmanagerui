import axios from 'axios';

// Ensure the base URL includes the protocol
const API_BASE_URL =process.env.REACT_APP_API_URL; // Add 'http://' or 'https://'

// Create a reusable Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const apiClientFile = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': '',
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

    upload : async (endpoint, file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(API_BASE_URL + endpoint, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            return response.data;
        } catch (error) {
            console.error("File upload error:", error);
            throw error;
        }
        },

    download: async (endpoint, params, fileName = "downloaded_file") => {
        try {
            const queryParams = new URLSearchParams(params).toString();
            console.log(`Requesting file from: ${apiClient.defaults.baseURL + endpoint}?${queryParams}`);

            const response = await apiClient.get(endpoint, {
                params,
                responseType: 'blob', // Important: Ensures response is treated as binary data
            });

            console.log(response);

            // Extract filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = fileName; // Default filename
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+?)"/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            // Create a blob URL and trigger the download
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // Clean up
        } catch (error) {
            console.error('File download error:', error.response?.data || error.message);
            throw error;
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
