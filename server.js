const express = require('express');
const cors = require('cors');
const ApiClient = require('./apiClient');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize API client
const apiClient = new ApiClient();

// Routes

/**
 * Home route with API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Lawcus API Client',
        version: '1.0.0',
        description: 'Node.js client for Lawcus API with OAuth 2.0 authentication',
        endpoints: {
            auth: {
                'GET /auth/login': 'Get OAuth login URL',
                'GET /auth/callback': 'Handle OAuth callback',
                'GET /auth/status': 'Check authentication status',
                'POST /auth/logout': 'Clear authentication tokens'
            },
            leads: {
                'POST /api/leads': 'Create a new lead',
                'GET /api/leads': 'Get all leads',
                'GET /api/leads/:id': 'Get a specific lead',
                'PUT /api/leads/:id': 'Update a lead',
                'DELETE /api/leads/:id': 'Delete a lead'
            }
        }
    });
});

/**
 * OAuth Login - Get authorization URL
 */
app.get('/auth/login', (req, res) => {
    try {
        const authManager = apiClient.getAuthManager();
        const authUrl = authManager.getAuthorizationUrl();
        
        res.json({
            success: true,
            authUrl: authUrl,
            message: 'Visit this URL to authorize the application'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * OAuth Callback - Handle authorization code
 */
app.get('/auth/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code not provided'
            });
        }

        const authManager = apiClient.getAuthManager();
        const tokenData = await authManager.exchangeCodeForToken(code);
        
        res.json({
            success: true,
            message: 'Authentication successful',
            tokenData: {
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Manual token exchange - Paste authorization code manually
 */
app.post('/auth/exchange-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required in request body'
            });
        }

        const authManager = apiClient.getAuthManager();
        const tokenData = await authManager.exchangeCodeForToken(code);
        
        res.json({
            success: true,
            message: 'Authentication successful',
            tokenData: {
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Check authentication status
 */
app.get('/auth/status', (req, res) => {
    try {
        const authManager = apiClient.getAuthManager();
        const status = authManager.getTokenStatus();
        
        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Logout - Clear tokens
 */
app.post('/auth/logout', (req, res) => {
    try {
        const authManager = apiClient.getAuthManager();
        authManager.clearTokens();
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create a new lead
 */
app.post('/api/leads', async (req, res) => {
    try {
        const leadData = req.body;
        
        // Validate required fields
        if (!leadData.contact_first_name || !leadData.contact_last_name) {
            return res.status(400).json({
                success: false,
                error: 'contact_first_name and contact_last_name are required'
            });
        }

        const result = await apiClient.createLead(leadData);
        
        res.json({
            success: true,
            data: result,
            message: 'Lead created successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Get all leads
 */
app.get('/api/leads', async (req, res) => {
    try {
        const params = req.query;
        const result = await apiClient.getLeads(params);
        
        res.json({
            success: true,
            data: result,
            message: 'Leads retrieved successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Get a specific lead
 */
app.get('/api/leads/:id', async (req, res) => {
    try {
        const leadId = req.params.id;
        const result = await apiClient.getLead(leadId);
        
        res.json({
            success: true,
            data: result,
            message: 'Lead retrieved successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Update a lead
 */
app.put('/api/leads/:id', async (req, res) => {
    try {
        const leadId = req.params.id;
        const leadData = req.body;
        
        const result = await apiClient.updateLead(leadId, leadData);
        
        res.json({
            success: true,
            data: result,
            message: 'Lead updated successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Delete a lead
 */
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const leadId = req.params.id;
        const result = await apiClient.deleteLead(leadId);
        
        res.json({
            success: true,
            data: result,
            message: 'Lead deleted successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Test endpoint to create a sample lead
 */
app.post('/api/test/create-lead', async (req, res) => {
    try {
        const sampleLead = {
            contact_avatar: "rgb(38, 102, 132)",
            contact_first_name: "Bob",
            contact_last_name: "Smith",
            contact_addresses: "[{\"is_primary\":true,\"type\":\"WORK\"}]",
            contact_phones: "[{\"type\":\"WORK\",\"value\":\"\",\"is_primary\":true}]",
            contact_emails: "[{\"type\":\"WORK\",\"value\":\"bob.smith@lawcus.com\",\"is_primary\":true}]",
            contact_type: "Person",
            contact_email: "Bob Smith",
            matter_description: "<p style=\"margin-top:4px;margin-bottom:4px;min-height: 19px;\"></p>",
            matter_originating_timekeeper_id: 7579,
            matter_responsible_attorney_id: 7579,
            matter_custom_fields: "[]",
            matter_stage_id: 10304,
            matter_open_date: "2021-05-17 17:58:03"
        };

        const result = await apiClient.createLead(sampleLead);
        
        res.json({
            success: true,
            data: result,
            message: 'Sample lead created successfully'
        });
    } catch (error) {
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Lawcus API Client running on port ${port}`);
    console.log(`📖 Documentation available at http://localhost:${port}`);
    console.log(`🔐 Start authentication at http://localhost:${port}/auth/login`);
});

module.exports = app;