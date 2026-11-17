// Tiny static server for the tests. Behaves like GitHub Pages:
// folders serve index.html, and /about also finds about.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('.');
const port = Number(process.argv[2]) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf',
};

async function find(file) {
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return find(join(file, 'index.html'));
  if (info?.isFile()) return file;
  if (!extname(file)) return find(file + '.html');
  return null;
}

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  const file = join(root, path);
  const found = file === root || file.startsWith(root + sep) ? await find(file) : null;
  if (!found) return res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  res.writeHead(200, { 'Content-Type': types[extname(found).toLowerCase()] || 'application/octet-stream' });
  res.end(await readFile(found));
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
