const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3800;
const ROOT = path.join(__dirname, 'site/www.pivotsglobal.com');

const CREDENTIALS_PATH = path.join(__dirname, 'config/gmail-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'config/gmail-token-finance.json');
const SEND_TO = 'ssergienko@pivotsglobal.com';

async function getAccessToken() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8')).installed;
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

  const expiryTime = token.expiry_date || (token.obtained_at && token.expires_in
    ? new Date(token.obtained_at).getTime() + token.expires_in * 1000
    : 0);

  if (!expiryTime || Date.now() >= expiryTime - 60000) {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await r.json();
    if (!refreshed.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(refreshed));
    token.access_token = refreshed.access_token;
    token.expiry_date = Date.now() + refreshed.expires_in * 1000;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    return refreshed.access_token;
  }
  return token.access_token;
}

function makeRawEmail({ to, replyTo, subject, text }) {
  const lines = [
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    text,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; " +
    "frame-src 'self'"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/contact', async (req, res) => {
  const { Name, Phone, Email, Message } = req.body;
  if (!Email || !Message) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const accessToken = await getAccessToken();
    const raw = makeRawEmail({
      to: SEND_TO,
      replyTo: Email,
      subject: `Contact form: ${Name || Email}`,
      text: `Name: ${Name || '—'}\nPhone: ${Phone || '—'}\nEmail: ${Email}\n\n${Message}`,
    });
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error?.message || 'Gmail API error');
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err.message);
    res.status(500).json({ error: 'Failed to send' });
  }
});

// Silence Webflow report-uri POSTs
app.post('/{*path}', (req, res) => res.sendStatus(204));

app.use(express.static(ROOT, { extensions: ['html'] }));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => console.log(`pivotsglobal serving on :${PORT}`));
