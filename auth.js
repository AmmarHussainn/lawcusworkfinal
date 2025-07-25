const axios = require('axios');
const qs = require('querystring');
require('dotenv').config();

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken; // Use cached token if not expired
    }

    try {
        const response = await axios.post(process.env.TOKEN_URL, qs.stringify({
            grant_type: 'refresh_token',
            refresh_token: process.env.REFRESH_TOKEN,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Subtract 60s for safety
        console.log('New Access Token:', accessToken);
        return accessToken;
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getAccessToken };