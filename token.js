import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import readline from 'readline';

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Step 1: Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly'
    ],
});

console.log('\n🔐 Gmail OAuth2 Token Refresh\n');
console.log('1. Visit this URL in your browser:');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log('\n2. Complete the authorization process');
console.log('3. Copy the authorization code from the redirect URL\n');

rl.question('Enter the authorization code: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('\n✅ Tokens retrieved successfully!\n');
        console.log('Add these to your .env file:');
        console.log('\x1b[32m%s\x1b[0m', `REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\x1b[32m%s\x1b[0m', `ACCESS_TOKEN=${tokens.access_token}`);
        
        if (tokens.refresh_token) {
            console.log('\n📝 Your refresh token is ready to use!');
        } else {
            console.log('\n⚠️  No refresh token received. Make sure to include access_type=offline and prompt=consent');
        }
        
    } catch (error) {
        console.error('\n❌ Error retrieving tokens:', error.message);
    }
    
    rl.close();
});

rl.on('close', () => {
    console.log('\nGoodbye! 👋');
    process.exit(0);
});