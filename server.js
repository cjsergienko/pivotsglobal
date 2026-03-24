const express = require('express');
const path = require('path');
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

// Silence Webflow report-uri POSTs
app.post('/{*path}', (req, res) => res.sendStatus(204));

app.use(express.static(ROOT, { extensions: ['html'] }));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => console.log(`pivotsglobal serving on :${PORT}`));
