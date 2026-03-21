import { createServer } from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { extname, normalize, resolve } from 'node:path';

const DEFAULT_PORT = 8081;
export const resolveMobileDistDir = (cwd: string = process.cwd()): string => {
  const distCandidate = resolve(cwd, 'dist');
  const appDistCandidate = resolve(cwd, 'apps/mobile/dist');
  const candidates = [distCandidate, appDistCandidate];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return appDistCandidate;
};

const DIST_DIR = resolveMobileDistDir();

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const NOT_FOUND_FILENAME = '+not-found.html';

export const sanitizeRequestPath = (pathname: string): string => {
  const normalized = normalize(pathname.replace(/^\/+/, ''));
  if (normalized === '.' || normalized === '') {
    return '';
  }

  return normalized
    .split(/[\\/]+/)
    .filter((segment) => segment !== '..')
    .join('/');
};

export const resolveExportFilePath = (
  pathname: string,
  distDir: string = DIST_DIR,
): { filePath: string; statusCode: number } | null => {
  const safePath = sanitizeRequestPath(pathname);
  const directCandidate = resolve(distDir, safePath);

  if (existsSync(directCandidate) && statSync(directCandidate).isFile()) {
    return { filePath: directCandidate, statusCode: 200 };
  }

  if (!extname(safePath)) {
    const htmlCandidate = resolve(distDir, `${safePath || 'index'}.html`);
    if (existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) {
      return { filePath: htmlCandidate, statusCode: 200 };
    }
  }

  const notFoundCandidate = resolve(distDir, NOT_FOUND_FILENAME);
  if (existsSync(notFoundCandidate) && statSync(notFoundCandidate).isFile()) {
    return { filePath: notFoundCandidate, statusCode: 404 };
  }

  return null;
};

export const getContentType = (filePath: string): string =>
  MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';

export const parsePort = (rawPort: string | undefined): number => {
  const trimmed = rawPort?.trim();
  if (!trimmed) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `[kangur-mobile-preview] Invalid port "${trimmed}". Expected an integer between 1 and 65535.`,
    );
  }

  return port;
};

const maybeStartServer = async (): Promise<void> => {
  if (!existsSync(DIST_DIR)) {
    console.error(
      `[kangur-mobile-preview] Missing export directory: ${DIST_DIR}\nRun "npm run export:mobile:web" first.`,
    );
    process.exit(1);
  }

  const port = parsePort(process.env['PORT'] ?? process.argv[2]);
  const host = process.env['HOST']?.trim() || '127.0.0.1';

  const server = createServer((request, response) => {
    const method = request.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405, {
        Allow: 'GET, HEAD',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end('Method Not Allowed');
      return;
    }

    const pathname = new URL(request.url ?? '/', `http://${host}`).pathname;
    const resolved = resolveExportFilePath(pathname);

    if (!resolved) {
      response.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end('Not Found');
      return;
    }

    response.writeHead(resolved.statusCode, {
      'Cache-Control': 'no-store',
      'Content-Type': getContentType(resolved.filePath),
    });

    if (method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(resolved.filePath).pipe(response);
  });

  server.listen(port, host, () => {
    console.log(
      `[kangur-mobile-preview] Serving ${DIST_DIR} at http://${host}:${port}`,
    );
  });
};

if (process.argv[1]?.includes('serve-kangur-mobile-export.ts')) {
  void maybeStartServer();
}
