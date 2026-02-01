const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname);
const PORT = 3000;
const HOST = '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
};

const server = http.createServer((req, res) => {
  let filePath = url.parse(req.url).pathname;
  if (filePath === '/' || filePath === '/MAINPRO-MAIN' || filePath === '/MAINPRO-MAIN/') {
    filePath = '/MAINPRO-MAIN.html';
  }
  const fullPath = path.join(ROOT, filePath.replace(/^\//, ''));

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404</h1><p>Not found: ${filePath}</p><p>Root: ${ROOT}</p>`, 'utf-8');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ct = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
    res.end(content);
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('MainPro server: http://' + HOST + ':' + PORT + '/MAINPRO-MAIN.html');
  console.log('Root: ' + ROOT);
  console.log('');
});
