import axios from 'axios';

// Ensure the base URL includes the protocol
const API_BASE_URL = process.env.REACT_APP_API_URL; // Add 'http://' or 'https://'

// Create a reusable Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

const apiClientFile = axios.create({
    baseURL: API_BASE_URL,
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

    download: async (endpoint, params, fileName = "downloaded_file") => {
        try {
            const queryParams = new URLSearchParams(params).toString();
    

            const response = await apiClient.get(endpoint, {
                params,
                responseType: 'blob', // Important: Ensures response is treated as binary data
            });


            // Extract filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = fileName; // Default filename
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+?)"/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }
            filename = filename.replace(/^\d+_/, "");

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



    upload: async (url, file, config = {}) => {
        const formData = new FormData();

        // IMPORTANT: append File directly
        formData.append("file", file);

        return apiClientFile.post(url, formData, {
            headers: {
                // DO NOT set Content-Type manually
                Accept: "application/json",
            },
            ...config,
        });
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


    patch: async (endpoint, data = null, config = {}) => {
        try {

            const response = await apiClient.patch(endpoint, data, config);

            return response.data;
        } catch (error) {
            console.error('PATCH request error:', error);
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



export const postFile = async (endpoint, inventoryItem, attachments = []) => {
    const formData = new FormData();

    // Append the JSON object as a string
    formData.append(
        "inventoryItem",
        new Blob([JSON.stringify(inventoryItem)], { type: "application/json" })
    );

    // Append each file
    attachments.forEach(file => {
        formData.append("attachments", file.file);
    });

    try {
        const response = await apiClientFile.post(endpoint, formData, {
            headers: {
                "Accept": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        console.error("POST request error:", error);
        throw error;
    }
};



export const putWithFile = async (endpoint, inventoryItem, attachments = []) => {
    const formData = new FormData();

    // Add JSON data as a Blob (important for Spring to deserialize correctly)
    formData.append(
        "inventoryItem",
        new Blob([JSON.stringify(inventoryItem)], { type: "application/json" })
    );

    // Append file(s) if present
    attachments.forEach(file => {
        formData.append("attachments", file.file);
    });

    try {
        const response = await apiClientFile.put(endpoint, formData, {
            headers: {
                "Accept": "application/json",
                // ❌ DO NOT set Content-Type manually (axios sets boundary automatically)
            },
        });

        return response.data;
    } catch (error) {
        console.error("PUT request error:", error);
        throw error;
    }
};


export default apiService;
