const express = require('express');
const { createLead } = require('./leads');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/project5/', async (req, res) => {
    try {
        const leadData = {
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
        const result = await createLead(leadData);
        res.status(200).json({ message: 'Lead created successfully', data: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create lead', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));