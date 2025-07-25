const axios = require('axios');
const TokenStorage = require('./tokenStorage');
require('dotenv').config();

class AuthManager {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.tokenStorage = new TokenStorage();
        
        // OAuth 2.0 configuration
        this.config = {
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            authUrl: process.env.AUTH_URL,
            tokenUrl: process.env.TOKEN_URL,
            callbackUrl: process.env.CALLBACK_URL,
            apiBaseUrl: process.env.API_BASE_URL
        };

        // Initialize with saved tokens
        this.initializeFromStorage();
    }

    /**
     * Initialize tokens from storage
     */
    async initializeFromStorage() {
        try {
            const savedTokens = await this.tokenStorage.loadTokens();
            if (savedTokens) {
                this.setTokens(savedTokens);
                console.log('🔄 Initialized with saved tokens');
            }
        } catch (error) {
            console.error('❌ Failed to initialize from storage:', error.message);
        }
    }

    /**
     * Generate authorization URL for OAuth flow
     */
    getAuthorizationUrl(state = 'random-state') {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.callbackUrl,
            state: state,
            scope: 'read write' // Adjust scope based on your needs
        });

        return `${this.config.authUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(authorizationCode) {
        try {
            const response = await axios.post(this.config.tokenUrl, {
                grant_type: 'authorization_code',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code: authorizationCode,
                redirect_uri: this.config.callbackUrl
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = response.data;
            this.setTokens(data);
            
            console.log('✅ Token exchange successful');
            return data;
        } catch (error) {
            console.error('❌ Token exchange failed:', error.response?.data || error.message);
            throw new Error('Failed to exchange authorization code for token');
        }
    }

    /**
     * Set tokens and expiry time
     */
    async setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        
        // Set expiry time (subtract 5 minutes for safety buffer)
        const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
        this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);
        
        console.log(`🔑 Tokens set. Expires at: ${this.tokenExpiry.toISOString()}`);
        
        // Save tokens to storage
        await this.tokenStorage.saveTokens(tokenData);
    }

    /**
     * Check if token is expired or will expire soon
     */
    isTokenExpired() {
        if (!this.accessToken || !this.tokenExpiry) {
            return true;
        }
        return new Date() >= this.tokenExpiry;
    }

    /**
     * Refresh the access token
     */
    async refreshAccessToken() {
        if (this.isRefreshing) {
            // If already refreshing, wait for the existing refresh to complete
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._performTokenRefresh();

        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _performTokenRefresh() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            console.log('🔄 Refreshing access token...');
            
            const response = await axios.post(this.config.tokenUrl, {
                grant_type: 'refresh_token',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: this.refreshToken
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = response.data;
            this.setTokens(data);
            
            console.log('✅ Token refresh successful');
            return data;
        } catch (error) {
            console.error('❌ Token refresh failed:', error.response?.data || error.message);
            // Clear tokens on refresh failure
            this.clearTokens();
            throw new Error('Failed to refresh access token');
        }
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getValidAccessToken() {
        if (!this.accessToken) {
            throw new Error('No access token available. Please authenticate first.');
        }

        if (this.isTokenExpired()) {
            await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    /**
     * Clear all tokens
     */
    async clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        await this.tokenStorage.clearTokens();
        console.log('🗑️ Tokens cleared');
    }

    /**
     * Get token status
     */
    getTokenStatus() {
        return {
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
            isExpired: this.isTokenExpired(),
            expiresAt: this.tokenExpiry?.toISOString(),
            timeUntilExpiry: this.tokenExpiry ? Math.max(0, this.tokenExpiry - new Date()) : 0
        };
    }
}

module.exports = AuthManager;