import { google } from 'googleapis';

// Configure OAuth2 Client for Gmail API v1
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

// In production, the refresh token should be stored securely in the DB or env
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

/**
 * Core function to send an email using Gmail API v1
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
    console.warn('⚠️ GMAIL OAuth credentials not set. Email not sent.');
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return;
  }

  // Construct raw email according to RFC 2822
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    html,
  ];
  
  // Gmail API requires base64url encoded string
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log(`✅ Email sent to ${to}: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error sending email via Gmail API v1:', error);
    throw error;
  }
}

/**
 * Template: Budget Exceeded Alert
 */
export async function sendBudgetExceededEmail(adminEmail: string, teamId: string) {
  const subject = 'Action Required: Orch AI Token Budget Exceeded';
  
  const html = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
      <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #ef4444; margin: 0;">Orch - Budget Alert</h2>
      </div>
      <p>Hello,</p>
      <p>Your team (ID: <strong>${teamId}</strong>) has exceeded its allocated AI token budget.</p>
      <p>To prevent runaway costs, we have automatically paused AI proxy access for developers on this team. Their IDE requests will be temporarily blocked.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Action Needed:</strong><br/>
        Please log into the Orch Dashboard and increase your team's token budget to resume service.
      </div>
      <p>Thank you,<br/>The Orch Team</p>
    </div>
  `;

  return sendEmail({ to: adminEmail, subject, html });
}
