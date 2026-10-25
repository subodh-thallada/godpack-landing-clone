// Local static server for the landing page and the app: node tools/serve.js [port]
// Applies the redirects and rewrites from vercel.json, so routes like
// /packs or /slab/:id behave the same here as on Vercel.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// vercel.json sources are path patterns: `:name` matches one segment, and
// plain parentheses / alternation are regular-expression groups.
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const compile = (source) => new RegExp('^' + source.replace(/:\w+\*/g, '(.*)').replace(/:\w+/g, '([^/]+)') + '$');
const redirects = (config.redirects || []).map((r) => ({ test: compile(r.source), to: r.destination }));
const rewrites = (config.rewrites || []).map((r) => ({ test: compile(r.source), to: r.destination }));

function send(res, file) {
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  });
}

http
  .createServer((req, res) => {
    const [rawPath, query] = req.url.split('?');
    let url = decodeURIComponent(rawPath);
    if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);

    const redirect = redirects.find((r) => r.test.test(url));
    if (redirect) {
      res.writeHead(307, { Location: redirect.to + (query ? '?' + query : '') });
      res.end();
      return;
    }
    const rewrite = rewrites.find((r) => r.test.test(url));
    if (rewrite) url = rewrite.to;

    let file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    // Clean URLs: /about -> about.html, and directories -> index.html.
    if (!path.extname(file)) {
      if (fs.existsSync(file + '.html')) file += '.html';
      else file = path.join(file, 'index.html');
    }
    send(res, file);
  })
  .listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}/ (app at /packs)`));
