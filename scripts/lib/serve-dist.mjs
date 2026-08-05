/*
  A static server over dist for the gates that need a real browser pointed at real files.

  `astro preview` would also work, but it starts the Netlify adapter's function runtime,
  which means the gates would be measuring a server we do not run in production. Every
  page these gates visit is prerendered, so plain files are both faster and more honest.
*/

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
};

export async function serveDist() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(DIST, url));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      let body = await readFile(file);
      const type = TYPES[extname(file)] ?? 'application/octet-stream';
      const headers = {
        'content-type': type,
        /* Netlify serves fingerprinted assets with a one year immutable lifetime, so a
           gate that measures caching has to do the same or it reports a problem that
           only exists in the test harness. */
        'cache-control': /^\/(_astro|pagefind|fonts|images)\//.test(url)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate'
      };

      /* Same reasoning. Netlify compresses text responses, and a performance gate that
         does not will report tens of kilobytes of savings that are already being made in
         production, which trains everyone to ignore it. */
      const compressible = /text|javascript|json|xml|svg/.test(type);
      if (compressible && (req.headers['accept-encoding'] ?? '').includes('gzip')) {
        body = gzipSync(body);
        headers['content-encoding'] = 'gzip';
      }
      headers['content-length'] = body.length;

      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return { server, port, base: `http://127.0.0.1:${port}` };
}
