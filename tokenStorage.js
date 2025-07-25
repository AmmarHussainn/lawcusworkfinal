const fs = require('fs').promises;
const path = require('path');

class TokenStorage {
    constructor(filePath = './tokens.json') {
        this.filePath = path.resolve(filePath);
    }

    /**
     * Save tokens to file
     */
    async saveTokens(tokenData) {
        try {
            const data = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope,
                created_at: new Date().toISOString()
            };

            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
            console.log('💾 Tokens saved to file');
            return true;
        } catch (error) {
            console.error('❌ Failed to save tokens:', error.message);
            return false;
        }
    }

    /**
     * Load tokens from file
     */
    async loadTokens() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            const tokens = JSON.parse(data);
            console.log('📁 Tokens loaded from file');
            return tokens;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📁 No token file found');
            } else {
                console.error('❌ Failed to load tokens:', error.message);
            }
            return null;
        }
    }

    /**
     * Clear saved tokens
     */
    async clearTokens() {
        try {
            await fs.unlink(this.filePath);
            console.log('🗑️ Token file deleted');
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('🗑️ No token file to delete');
                return true;
            }
            console.error('❌ Failed to delete token file:', error.message);
            return false;
        }
    }

    /**
     * Check if tokens exist
     */
    async hasTokens() {
        try {
            await fs.access(this.filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = TokenStorage;