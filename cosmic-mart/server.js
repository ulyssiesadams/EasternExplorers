// Cosmic Mart dev server.
//
// Serves the static site AND proxies model calls, because the Vocareum key
// is rejected when a browser Origin header is present. Keeping the call
// server-side also keeps the key out of the browser entirely.
//
//   node server.js      ->  http://localhost:8080
//
// Requires a .env file next to this one containing VOCAREUM_API_KEY=...
// Node built-ins only - nothing to npm install.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const UPSTREAM = 'https://openai.vocareum.com/v1/chat/completions';
const MODEL = 'claude-sonnet-4-6';

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const API_KEY = (loadEnv().VOCAREUM_API_KEY || process.env.VOCAREUM_API_KEY || '').trim();
if (!API_KEY) {
  console.error('\n  ERROR: VOCAREUM_API_KEY not found.');
  console.error('  Copy .env.example to .env and paste your key into it.\n');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

// Request log. Named with a leading dot so the static handler refuses to
// serve it, and so *.log in .gitignore keeps it out of the repo.
const LOG_FILE = path.join(ROOT, '.server.log');
function log(line) {
  const msg = '  ' + new Date().toISOString().slice(11, 19) + '  ' + line;
  console.log(msg);
  try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { /* logging must never break a request */ }
}

function askModel(system, messages, maxTokens) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: (system ? [{ role: 'system', content: system }] : []).concat(messages)
    });
    const url = new URL(UPSTREAM);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bearer ' + API_KEY
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error('upstream ' + res.statusCode + ': ' + body.slice(0, 300)));
        }
        try {
          resolve(JSON.parse(body).choices[0].message.content);
        } catch (e) {
          reject(new Error('could not parse upstream response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => req.destroy(new Error('upstream timed out')));
    req.write(payload);
    req.end();
  });
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const route = req.url.split('?')[0];

  if (route === '/api/chat') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });

    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw || '{}'); }
      catch (e) { return sendJson(res, 400, { error: 'invalid JSON' }); }

      const messages = Array.isArray(body.messages) ? body.messages : null;
      if (!messages || messages.length === 0) {
        return sendJson(res, 400, { error: 'messages[] is required' });
      }
      const maxTokens = Math.min(Number(body.maxTokens) || 1024, 8192);

      askModel(body.system || '', messages, maxTokens)
        .then((text) => sendJson(res, 200, { text: text }))
        .catch((err) => {
          console.error('  [api/chat] ' + err.message);
          sendJson(res, 502, { error: err.message });
        });
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    log(req.method + ' ' + req.url + '  -> 405');
    res.writeHead(405); return res.end('Method Not Allowed');
  }

  const rel = decodeURIComponent(route === '/' ? '/index.html' : route);
  const filePath = path.resolve(ROOT, '.' + rel);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    log('GET ' + req.url + '  -> 403 outside-root');
    res.writeHead(403); return res.end('Forbidden');
  }

  // Never serve dotfiles (.env, .git, .claude, .server.log) or the server
  // itself - the root check above does not cover secrets living inside ROOT.
  const segments = path.relative(ROOT, filePath).split(path.sep).filter(Boolean);
  if (segments.some(function (s) { return s.startsWith('.'); }) || segments[segments.length - 1] === 'server.js') {
    log('GET ' + req.url + '  -> 404 protected');
    return notFound(res);
  }

  // Try the exact path, then extensionless -> .html, then dir/index.html
  const tries = [filePath];
  if (!path.extname(filePath)) {
    tries.push(filePath + '.html');
    tries.push(path.join(filePath, 'index.html'));
  }

  (function attempt(i) {
    if (i >= tries.length) {
      log('GET ' + req.url + '  -> 404  tried: ' + tries.map(function (f) { return path.relative(ROOT, f) || '/'; }).join(' | '));
      return notFound(res);
    }
    fs.readFile(tries[i], function (err, data) {
      if (err) return attempt(i + 1);
      log('GET ' + req.url + '  -> 200  ' + (path.relative(ROOT, tries[i]) || 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME[path.extname(tries[i]).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  })(0);
});

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 - not found</h1><p>Cosmic Mart dev server</p>');
}

server.listen(PORT, () => {
  console.log('');
  console.log('  Cosmic Mart   http://localhost:' + PORT);
  console.log('  API proxy     POST /api/chat -> ' + MODEL);
  console.log('  Key loaded    ' + API_KEY.slice(0, 8) + '... (' + API_KEY.length + ' chars)');
  console.log('');
});
