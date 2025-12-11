// Twitter API Test Script
// Run: node twitter-test.js
// Requires: .env file with Twitter credentials

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials from .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}

const env = loadEnv();
const credentials = {
    apiKey: env.TWITTER_API_KEY,
    apiSecret: env.TWITTER_API_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: env.TWITTER_ACCESS_TOKEN_SECRET
};

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
    const signatureBase = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&'))
    ].join('&');

    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
    return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

async function makeRequest(method, endpoint, body = null) {
    const url = `https://api.twitter.com${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const oauthParams = {
        oauth_consumer_key: credentials.apiKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_token: credentials.accessToken,
        oauth_version: '1.0'
    };

    const signature = generateOAuthSignature(
        method,
        url,
        oauthParams,
        credentials.apiSecret,
        credentials.accessTokenSecret
    );

    oauthParams.oauth_signature = encodeURIComponent(signature);

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
        .map(k => `${k}="${oauthParams[k]}"`)
        .join(', ');

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function test() {
    console.log('Testing Twitter API connection...\n');

    // Test 1: Get authenticated user info
    console.log('1. Getting user info (/2/users/me)...');
    try {
        const result = await makeRequest('GET', '/2/users/me');
        console.log('   Status:', result.status);
        console.log('   Response:', JSON.stringify(result.data, null, 2));

        if (result.data.data) {
            console.log('\n   ✓ SUCCESS! Connected as @' + result.data.data.username);
            console.log('   User ID:', result.data.data.id);
        }
    } catch (e) {
        console.log('   Error:', e.message);
    }
}

// Export for use in other scripts
module.exports = { makeRequest, credentials };

// Run test if called directly
if (require.main === module) {
    test();
}
