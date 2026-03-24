const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3800;
const ROOT = path.join(__dirname, 'site/www.pivotsglobal.com');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://cloudflareinsights.com; " +
    "frame-src 'self'"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const mailer = nodemailer.createTransport({ sendmail: true });

app.post('/contact', async (req, res) => {
  const { Name, Phone, Email, Message } = req.body;
  if (!Email || !Message) return res.status(400).json({ error: 'Missing required fields' });

  try {
    await mailer.sendMail({
      from: '"Pivots Global Contact" <contact@pivotsglobal.com>',
      to: 'ssergienko@pivotsdoo.com',
      replyTo: Email,
      subject: `Contact form: ${Name || Email}`,
      text: `Name: ${Name || '—'}\nPhone: ${Phone || '—'}\nEmail: ${Email}\n\n${Message}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
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
