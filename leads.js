const axios = require('axios');
const { getAccessToken } = require('./auth');

async function createLead(leadData) {
    try {
        const accessToken = await getAccessToken();
        const response = await axios.post(process.env.LEADS_API_URL, leadData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Lead created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating lead:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { createLead };