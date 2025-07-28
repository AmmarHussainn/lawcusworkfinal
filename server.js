require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

const app = express();
app.use(express.json());

// Configuration
const CLIENT_ID = process.env.CLIENT_ID || '2f1bcd7be1aa4038b844eab6efeb2f57';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'b10899444e3b43908c302972e82bd56827967c0e123043afac85af43961757bb';
const REGISTERED_REDIRECT_URI = 'https://api.goodtogoapps.com/'; // Must match EXACTLY what's registered with Lawcus
const PREFERRED_REDIRECT_PATH = '/oauth'; // Your preferred endpoint
const TOKEN_FILE = path.join(__dirname, 'tokens.json');
const PORT = process.env.PORT || 3000;

// Enhanced token management with error handling
const getTokens = () => {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE));
      console.log('Loaded existing tokens');
      return tokens;
    }
  } catch (error) {
    console.error('Error reading token file:', error.message);
  }
  return { accessToken: null, refreshToken: null, expiresAt: null };
};

const saveTokens = (tokens) => {
  try {
    tokens.expiresAt = Date.now() + 3500 * 1000; // 58 minutes expiration
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log('Tokens saved to', TOKEN_FILE);
    console.log('Token expires at:', new Date(tokens.expiresAt).toISOString());
  } catch (error) {
    console.error('Error saving tokens:', error);
    // Attempt to create directory if it doesn't exist
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  }
};

// Token refresh with retry logic
const refreshAccessToken = async (attempt = 1) => {
  const tokens = getTokens();
  try {
    console.log(`Refreshing token (attempt ${attempt})...`);
    const response = await axios.post('https://auth.lawcus.com/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const newTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || tokens.refreshToken,
    };
    saveTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return refreshAccessToken(attempt + 1);
    }
    throw new Error('Failed to refresh token after 3 attempts');
  }
};

// Get valid access token with automatic refresh
const getValidAccessToken = async () => {
  let tokens = getTokens();
  
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('No tokens available. Initiate OAuth flow first.');
  }

  if (Date.now() >= (tokens.expiresAt || 0)) {
    return await refreshAccessToken();
  }
  return tokens.accessToken;
};

// Handle OAuth callback at both root and /oauth
const handleOAuthCallback = async (req, res) => {
  console.log('Received OAuth callback with query:', req.query);
  
  try {
    const { code, error: errorParam } = req.query;
    
    if (errorParam) {
      throw new Error(`OAuth error: ${errorParam}`);
    }
    
    if (!code) {
      throw new Error('Authorization code missing');
    }

    console.log('Exchanging code for tokens...');
    const response = await axios.post('https://auth.lawcus.com/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REGISTERED_REDIRECT_URI // Must match registered URI exactly
    });

    console.log('Token exchange response received');
    saveTokens({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token
    });

    res.send(`
      <html>
        <body>
          <h1>OAuth Completed Successfully!</h1>
          <p>Tokens stored in ${TOKEN_FILE}</p>
          <p>You can now submit leads to /leads endpoint</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth processing error:', error.message);
    res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Failed</h1>
          <p>${error.message}</p>
          <p>Check server logs for details</p>
        </body>
      </html>
    `);
  }
};

// Register handlers for both possible callback URLs
app.get('/', (req, res) => {
  if (req.query.code) {
    return handleOAuthCallback(req, res);
  }
  res.send(`
    <html>
      <body>
        <h1>Lawcus Integration API</h1>
        <p>Start OAuth flow: <a href="/initiate-oauth">Initiate Authorization</a></p>
      </body>
    </html>
  `);
});

app.get(PREFERRED_REDIRECT_PATH, handleOAuthCallback);

// Convenience endpoint to start OAuth flow
app.get('/initiate-oauth', (req, res) => {
  const authUrl = `https://auth.lawcus.com/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REGISTERED_REDIRECT_URI)}`;
  console.log('Initiating OAuth with URL:', authUrl);
  res.redirect(authUrl);
});

// Lead submission endpoint with enhanced error handling
app.post('/leads', async (req, res) => {
  try {
    console.log('Received lead submission:', req.body);
    const accessToken = await getValidAccessToken();
    
    const response = await axios.post('https://api.lawcus.com/leads', req.body, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('Lead submitted successfully:', response.data);
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Lead submission failed:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Token status endpoint for debugging
app.get('/token-status', (req, res) => {
  const tokens = getTokens();
  res.json({
    hasTokens: !!tokens.accessToken,
    expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
    expiresIn: tokens.expiresAt ? Math.max(0, Math.round((tokens.expiresAt - Date.now()) / 1000)) : null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Server configuration:');
  console.log({
    CLIENT_ID,
    CLIENT_SECRET: CLIENT_SECRET ? '***redacted***' : 'MISSING',
    REGISTERED_REDIRECT_URI,
    PREFERRED_REDIRECT_PATH,
    TOKEN_FILE,
    PORT
  });
  console.log(`Server running on port ${PORT}`);
  console.log(`You can initiate OAuth by visiting: http://localhost:${PORT}/initiate-oauth`);
});