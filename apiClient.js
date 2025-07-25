const axios = require('axios');
const AuthManager = require('./authManager');

class ApiClient {
    constructor() {
        this.authManager = new AuthManager();
        this.baseURL = process.env.API_BASE_URL;
        
        // Create axios instance with interceptors
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000
        });

        this.setupInterceptors();
    }

    /**
     * Setup axios interceptors for automatic token handling
     */
    setupInterceptors() {
        // Request interceptor to add auth header
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                try {
                    const token = await this.authManager.getValidAccessToken();
                    config.headers.Authorization = `Bearer ${token}`;
                } catch (error) {
                    console.error('Failed to get valid access token:', error.message);
                    throw error;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor to handle 401 errors
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        console.log('🔄 Received 401, attempting token refresh...');
                        await this.authManager.refreshAccessToken();
                        
                        // Retry the original request with new token
                        const token = await this.authManager.getValidAccessToken();
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        
                        return this.axiosInstance(originalRequest);
                    } catch (refreshError) {
                        console.error('Failed to refresh token after 401:', refreshError.message);
                        throw refreshError;
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * Create a new lead
     */
    async createLead(leadData) {
        try {
            console.log('📝 Creating lead...');
            
            const response = await this.axiosInstance.post('/leads', leadData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Lead created successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Failed to create lead:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Get all leads
     */
    async getLeads(params = {}) {
        try {
            console.log('📋 Fetching leads...');
            
            const response = await this.axiosInstance.get('/leads', { params });
            
            console.log(`✅ Retrieved ${response.data?.length || 0} leads`);
            return response.data;
        } catch (error) {
            console.error('❌ Failed to get leads:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Get a specific lead by ID
     */
    async getLead(leadId) {
        try {
            console.log(`📄 Fetching lead ${leadId}...`);
            
            const response = await this.axiosInstance.get(`/leads/${leadId}`);
            
            console.log('✅ Lead retrieved successfully');
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to get lead ${leadId}:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Update a lead
     */
    async updateLead(leadId, leadData) {
        try {
            console.log(`📝 Updating lead ${leadId}...`);
            
            const response = await this.axiosInstance.put(`/leads/${leadId}`, leadData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Lead updated successfully');
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to update lead ${leadId}:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Delete a lead
     */
    async deleteLead(leadId) {
        try {
            console.log(`🗑️ Deleting lead ${leadId}...`);
            
            const response = await this.axiosInstance.delete(`/leads/${leadId}`);
            
            console.log('✅ Lead deleted successfully');
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to delete lead ${leadId}:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Make a generic API call
     */
    async makeRequest(method, endpoint, data = null, config = {}) {
        try {
            const response = await this.axiosInstance({
                method,
                url: endpoint,
                data,
                ...config
            });
            
            return response.data;
        } catch (error) {
            console.error(`❌ API request failed [${method.toUpperCase()} ${endpoint}]:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Get authentication manager instance
     */
    getAuthManager() {
        return this.authManager;
    }
}

module.exports = ApiClient;