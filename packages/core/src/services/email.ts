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

export function getOrchEmailTemplate(title: string, contentHtml: string): string {
  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827; min-height: 100vh;">
      <div style="max-w-xl: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">Orch <span style="color: #f97316;">Reviewer</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="margin-top: 0; font-size: 18px; color: #111827;">${title}</h2>
          <div style="font-size: 15px; line-height: 1.6; color: #4b5563;">
            ${contentHtml}
          </div>
        </div>
        <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center;">
          Powered by Orch AI &middot; Keep your codebase clean.
        </div>
      </div>
    </div>
  `;
}

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
  
  const content = `
    <p style="margin-top: 0;">Hello,</p>
    <p>Your team (ID: <strong>${teamId}</strong>) has exceeded its allocated AI token budget.</p>
    <p>To prevent runaway costs, we have automatically paused AI proxy access for developers on this team. Their IDE requests will be temporarily blocked.</p>
    <div style="background-color: #fffbeb; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #fef3c7;">
      <strong style="color: #92400e; display: block; margin-bottom: 8px;">Action Needed:</strong>
      <span style="color: #b45309;">Please log into the Orch Dashboard and increase your team's token budget to resume service.</span>
    </div>
  `;

  const html = getOrchEmailTemplate('Budget Alert', content);

  return sendEmail({ to: adminEmail, subject, html });
}
