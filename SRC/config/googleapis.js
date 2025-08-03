import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import { createTransport } from 'nodemailer';
const OAuth2 = google.auth.OAuth2;

const { GMAIL_NAME, REDIRECT_URI, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, accessToken } = process.env;

console.log({
    GMAIL_NAME,
    CLIENT_ID,
    CLIENT_SECRET,
    REFRESH_TOKEN,
    REDIRECT_URI
});

const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const smtpTransport = createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: GMAIL_NAME,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const mailTransport = async (to, subject, html, attachments) => {
    const from = GMAIL_NAME;
    console.log(`Sending mail to user: [${to}]`);

    const mailOptions = { from, to, subject, html, attachments };

    return new Promise((resolve, reject) => {
        smtpTransport.sendMail(mailOptions, (err, info) => {
            if (err) {
                return reject(err);
            }
            console.log(`Mail sent to [${to}] with response: ${info.response}`);
            resolve(info);
        });
    });
};