const { createServer } = require('http');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const dev = process.env.NODE_ENV !== 'production';
const nodeVersion = process.versions.node || '';
const nodeMajor = Number((nodeVersion.split('.')[0] || '').trim());

if (!Number.isFinite(nodeMajor)) {
  console.error(`[runtime] Unable to parse Node version: "${nodeVersion}"`);
  process.exit(1);
}

if (nodeMajor < 20) {
  console.error(
    `[runtime] Node ${process.version} is too old. Use Node 20.9+ (recommended: Node 22 LTS).`
  );
  process.exit(1);
}

if (dev && nodeMajor >= 24) {
  console.error(
    `[runtime] Node ${process.version} is not supported for dev mode (Next/SWC/Turbopack instability). ` +
    'Use Node 22 LTS: `nvm use 22`.'
  );
  process.exit(1);
}

// Dynamic import for ESM modules from src/features
let loggingToolsCache = null;
async function getLoggingTools() {
  if (loggingToolsCache) return loggingToolsCache;
  const fallback = {
    ErrorSystem: { captureException: console.error, logWarning: console.warn, logInfo: console.log },
    logSystemEvent: (params) => console.log(params.message, params.context),
  };

  const moduleCandidates = [
    path.resolve(__dirname, 'src/features/observability/server.js'),
    path.resolve(__dirname, 'src/features/observability/server.ts'),
  ];

  for (const candidatePath of moduleCandidates) {
    if (!fs.existsSync(candidatePath)) continue;
    try {
      const moduleUrl = pathToFileURL(candidatePath).href;
      const { ErrorSystem, logSystemEvent } = await import(moduleUrl);
      loggingToolsCache = { ErrorSystem, logSystemEvent };
      return loggingToolsCache;
    } catch (e) {
      const message = e && typeof e.message === 'string' ? e.message : String(e);
      const code = e && typeof e === 'object' ? e.code : undefined;
      const expectedDevError =
        code === 'ERR_UNKNOWN_FILE_EXTENSION' ||
        code === 'ERR_MODULE_NOT_FOUND' ||
        code === 'MODULE_NOT_FOUND' ||
        message.includes('Unknown file extension ".ts"');
      if (!expectedDevError) {
        console.error('Failed to load logging modules:', e);
      }
    }
  }

  loggingToolsCache = fallback;
  return loggingToolsCache;
}

const next = require('next');
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || '::';

const SCRAPER_GUARD = createScraperGuard({
  enabled: process.env.SCRAPER_GUARD_ENABLED
    ? process.env.SCRAPER_GUARD_ENABLED !== 'false'
    : !dev,
  windowMs: parseEnvNumber('SCRAPER_GUARD_WINDOW_MS', 60 * 1000),
  pageMax: parseEnvNumber('SCRAPER_GUARD_PAGE_MAX', 120),
  apiMax: parseEnvNumber('SCRAPER_GUARD_API_MAX', 300),
  strictPageMax: parseEnvNumber('SCRAPER_GUARD_STRICT_PAGE_MAX', 60),
  strictApiMax: parseEnvNumber('SCRAPER_GUARD_STRICT_API_MAX', 120),
  blockMs: parseEnvNumber('SCRAPER_GUARD_BLOCK_MS', 10 * 60 * 1000),
  strictBlockMs: parseEnvNumber('SCRAPER_GUARD_STRICT_BLOCK_MS', 30 * 60 * 1000),
  allowlistIps: parseEnvList('SCRAPER_GUARD_ALLOWLIST_IPS'),
  allowlistUserAgents: parseEnvList('SCRAPER_GUARD_ALLOWLIST_UA'),
  blocklistIps: parseEnvList('SCRAPER_GUARD_BLOCKLIST_IPS'),
  logBlocked: process.env.SCRAPER_GUARD_LOG_BLOCKED
    ? process.env.SCRAPER_GUARD_LOG_BLOCKED !== 'false'
    : true,
});

app.prepare().then(async () => {
  const { ErrorSystem, logSystemEvent } = await getLoggingTools();
  const server = createServer((req, res) => {
    const debugResponseHeaders = process.env.DEBUG_RESPONSE_HEADERS === 'true';
    const debugUrlNormalize = process.env.DEBUG_URL_NORMALIZE === 'true';
    const originalSetHeader = res.setHeader.bind(res);
    const normalizeRedirectHeader = (value) => {
      if (value && typeof value === 'object' && typeof value.toString === 'function') {
        value = value.toString();
      }
      if (typeof value !== 'string') return value;
      if (value.startsWith('http:/') && !value.startsWith('http://')) {
        return value.replace('http:/', 'http://');
      }
      if (value.startsWith('https:/') && !value.startsWith('https://')) {
        return value.replace('https:/', 'https://');
      }
      return value;
    };
    res.setHeader = (name, value) => {
      if (typeof name === 'string') {
        const key = name.toLowerCase();
        if (key === 'location' || key === 'refresh') {
          if (debugResponseHeaders) {
            logSystemEvent({ level: 'warn', message: '[response-header]', source: 'server', context: { name, value, stack: new Error().stack } });
          }
          if (key === 'refresh') {
            return;
          }
          if (Array.isArray(value)) {
            return originalSetHeader(name, value.map(normalizeRedirectHeader));
          }
          return originalSetHeader(name, normalizeRedirectHeader(value));
        }
      }
      return originalSetHeader(name, value);
    };
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = (statusCode, statusMessage, headers) => {
      let nextStatusMessage = statusMessage;
      let nextHeaders = headers;
      if (
        nextHeaders === undefined &&
        nextStatusMessage &&
        typeof nextStatusMessage === 'object'
      ) {
        nextHeaders = nextStatusMessage;
        nextStatusMessage = undefined;
      }
      if (nextHeaders && typeof nextHeaders === 'object') {
        if (nextHeaders.Location) nextHeaders.Location = normalizeRedirectHeader(nextHeaders.Location);
        if (nextHeaders.location) nextHeaders.location = normalizeRedirectHeader(nextHeaders.location);
        if (nextHeaders.Refresh) delete nextHeaders.Refresh;
        if (nextHeaders.refresh) delete nextHeaders.refresh;
      }
      if (
        debugResponseHeaders &&
        typeof statusCode === 'number' &&
        statusCode >= 300 &&
        statusCode < 400 &&
        statusCode !== 304
      ) {
        logSystemEvent({ level: 'warn', message: '[response-writeHead]', source: 'server', context: { statusCode, headers: nextHeaders, stack: new Error().stack } });
      }
      return originalWriteHead(statusCode, nextStatusMessage, nextHeaders);
    };
    const host = req.headers.host || 'localhost';
    const baseUrl = `http://${host}`;
    const originalRawUrl = req.url || '/';
    let rawUrl = originalRawUrl;
    if (/^https?:\/\//i.test(rawUrl)) {
      try {
        const absoluteUrl = new URL(rawUrl);
        rawUrl = `${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`;
      } catch {
        rawUrl = '/';
      }
    }
    const hostPrefix = `/${host}`;
    while (rawUrl.startsWith(hostPrefix)) {
      rawUrl = rawUrl.slice(hostPrefix.length) || '/';
    }
    if (rawUrl.startsWith(host)) {
      rawUrl = rawUrl.slice(host.length) || '/';
    }
    while (rawUrl.startsWith(`//${host}`)) {
      rawUrl = rawUrl.slice(`//${host}`.length) || '/';
    }
    const normalizedUrl = rawUrl || '/';
    const shouldNormalize =
      originalRawUrl.startsWith(hostPrefix) ||
      originalRawUrl.startsWith(`//${host}`) ||
      originalRawUrl === host ||
      originalRawUrl.startsWith(`${host}/`);
    if (shouldNormalize && normalizedUrl !== originalRawUrl) {
      if (debugUrlNormalize) {
        logSystemEvent({ level: 'warn', message: '[url-normalize] rewrite', source: 'server', context: { original: originalRawUrl, normalized: normalizedUrl, host, referer: req.headers.referer, userAgent: req.headers['user-agent'] } });
      }
      res.statusCode = 307;
      res.setHeader('Location', normalizedUrl);
      res.end();
      return;
    }
    if (normalizedUrl !== originalRawUrl) {
      req.url = normalizedUrl;
    }
    if (debugUrlNormalize && (originalRawUrl.includes(hostPrefix) || originalRawUrl.includes(`//${host}`))) {
      logSystemEvent({ level: 'warn', message: '[url-normalize] received', source: 'server', context: { original: originalRawUrl, host, referer: req.headers.referer, userAgent: req.headers['user-agent'] } });
    }
    if (debugUrlNormalize && normalizedUrl === '/' && originalRawUrl !== '/') {
      logSystemEvent({ level: 'warn', message: '[root-request]', source: 'server', context: { url: originalRawUrl, normalized: normalizedUrl, host, referer: req.headers.referer, userAgent: req.headers['user-agent'] } });
    }
    const url = new URL(normalizedUrl, baseUrl);
    // Next custom server expects a path-focused parsedUrl (like url.parse(req.url, true)).
    // Passing host/protocol fields can cause absolute-url redirects in router normalization.
    const parsedUrl = {
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      search: url.search,
      hash: url.hash,
    };
    const remoteAddress = req.socket?.remoteAddress;
    if (remoteAddress) {
      if (!req.headers['x-forwarded-for']) {
        req.headers['x-forwarded-for'] = remoteAddress;
      }
      if (!req.headers['x-real-ip']) {
        req.headers['x-real-ip'] = remoteAddress;
      }
    }
    const guardResult = SCRAPER_GUARD.check(req, parsedUrl.pathname || '/');
    if (!guardResult.allowed) {
      res.statusCode = guardResult.statusCode;
      if (guardResult.retryAfterSec) {
        res.setHeader('Retry-After', guardResult.retryAfterSec);
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(guardResult.message);
      return;
    }
    Promise.resolve(handle(req, res, parsedUrl)).catch((error) => {
      ErrorSystem.captureException(error, {
        source: 'server',
        context: { action: 'request-handler-failed', pathname: parsedUrl.pathname },
      });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  });

  const isExpectedMissingCleanupModuleError = (error) => {
    if (!error) return false;
    const code = typeof error === 'object' ? error.code : undefined;
    const message = typeof error === 'object' && typeof error.message === 'string' ? error.message : String(error);
    return (
      code === 'ERR_MODULE_NOT_FOUND' ||
      code === 'MODULE_NOT_FOUND' ||
      code === 'ERR_UNKNOWN_FILE_EXTENSION' ||
      message.includes('Cannot find module') ||
      message.includes('Unknown file extension')
    );
  };

  const importCleanupModule = async (specifier) => {
    try {
      return await import(specifier);
    } catch (error) {
      if (isExpectedMissingCleanupModuleError(error)) {
        if (process.env.DEBUG_SHUTDOWN_CLEANUP === 'true') {
          console.info(`[server] Cleanup module unavailable, skipping: ${specifier}`);
        }
        return null;
      }
      throw error;
    }
  };

  // Graceful shutdown: drain BullMQ workers and close all Redis connections before exit
  const gracefulShutdown = async (signal) => {
    logSystemEvent({ level: 'info', message: `Received ${signal}, shutting down gracefully...`, source: 'server', context: { signal } });
    try {
      const queueModule = await importCleanupModule('./src/shared/lib/queue/index.js');
      if (queueModule?.stopAllWorkers) {
        await queueModule.stopAllWorkers();
      }
      if (queueModule?.closeRedisConnection) {
        await queueModule.closeRedisConnection();
      }
    } catch (err) {
      logSystemEvent({ level: 'warn', message: `Queue cleanup error: ${err.message}`, source: 'server', context: { error: err.message, module: 'queue' } });
    }
    try {
      const redisPubSubModule = await importCleanupModule('./src/shared/lib/redis-pubsub.js');
      if (redisPubSubModule?.closeSubscriber) {
        await redisPubSubModule.closeSubscriber();
      }
    } catch (err) {
      logSystemEvent({ level: 'warn', message: `Redis subscriber cleanup error: ${err.message}`, source: 'server', context: { error: err.message, module: 'redis-pubsub' } });
    }
    try {
      const redisModule = await importCleanupModule('./src/shared/lib/redis.js');
      if (redisModule?.closeRedisClient) {
        await redisModule.closeRedisClient();
      }
    } catch (err) {
      logSystemEvent({ level: 'warn', message: `Redis client cleanup error: ${err.message}`, source: 'server', context: { error: err.message, module: 'redis' } });
    }
    server.close(() => {
      logSystemEvent({ level: 'info', message: 'Server closed', source: 'server' });
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
      logSystemEvent({ level: 'warn', message: 'Forced exit after timeout', source: 'server', context: { timeoutMs: 10000 } });
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  const listenWithOptions = (options) =>
    new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(options);
    });

  const startServer = async () => {
    try {
      await listenWithOptions({
        port,
        host,
        ipv6Only: false,
      });
    } catch (error) {
      if (host === '0.0.0.0') {
        throw error;
      }
      await listenWithOptions({ port, host: '0.0.0.0' });
    }
    logSystemEvent({ level: 'info', message: `Ready on http://localhost:${port}`, source: 'server', context: { port, host } });
  };

  startServer().catch((error) => {
    throw error;
  });
});

function parseEnvNumber(key, fallback) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEnvList(key) {
  const raw = process.env[key];
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function createScraperGuard(config) {
  const state = {
    buckets: new Map(),
    blocked: new Map(),
    lastCleanupAt: 0,
  };

  const staticPrefixes = ['/_next/', '/favicon', '/robots.txt', '/sitemap', '/assets/', '/fonts/', '/uploads/'];
  const staticExtensions = new Set([
    '.css',
    '.js',
    '.mjs',
    '.map',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
    '.mp4',
    '.mp3',
    '.pdf',
    '.zip',
    '.gz',
    '.br',
  ]);

  const allowlistBots = [
    /googlebot/i,
    /bingbot/i,
    /duckduckbot/i,
    /yandexbot/i,
    /baiduspider/i,
    /slurp/i,
    /facebot/i,
    /twitterbot/i,
    /linkedinbot/i,
    /slackbot/i,
    /discordbot/i,
    /whatsapp/i,
    /telegrambot/i,
  ];

  const denylistBots = [
    /python-requests/i,
    /curl/i,
    /wget/i,
    /httpclient/i,
    /scrapy/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /headless/i,
    /phantomjs/i,
    /go-http-client/i,
    /axios/i,
    /node-fetch/i,
    /libwww-perl/i,
  ];

  const allowlistIpSet = new Set([...
    config.allowlistIps,
    '127.0.0.1',
    '::1',
  ]);
  const blocklistIpSet = new Set(config.blocklistIps);

  function shouldBypass(pathname) {
    if (!pathname) return true;
    if (staticPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;
    const dot = pathname.lastIndexOf('.');
    if (dot > -1) {
      const ext = pathname.slice(dot).toLowerCase();
      if (staticExtensions.has(ext)) return true;
    }
    return false;
  }

  function normalizeIp(rawIp) {
    if (!rawIp) return '';
    if (rawIp.startsWith('::ffff:')) return rawIp.slice(7);
    if (rawIp === '::1') return '127.0.0.1';
    return rawIp;
  }

  function getClientIp(req) {
    const headerCandidates = [
      'cf-connecting-ip',
      'x-vercel-forwarded-for',
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
    ];

    for (const headerName of headerCandidates) {
      const value = req.headers[headerName];
      if (typeof value === 'string' && value.length > 0) {
        return normalizeIp(value.split(',')[0].trim());
      }
    }

    return normalizeIp(req.socket?.remoteAddress || '');
  }

  function buildKey(scope, ip, userAgent) {
    const uaHash = userAgent
      ? createHash('sha1').update(userAgent).digest('hex').slice(0, 12)
      : 'no-ua';
    return `${scope}:${ip || 'unknown'}:${uaHash}`;
  }

  function cleanup(now) {
    if (now - state.lastCleanupAt < 30 * 1000) return;
    state.lastCleanupAt = now;

    for (const [key, bucket] of state.buckets.entries()) {
      if (bucket.resetAt <= now) state.buckets.delete(key);
    }
    for (const [key, until] of state.blocked.entries()) {
      if (until <= now) state.blocked.delete(key);
    }
  }

  function check(req, pathname) {
    if (!config.enabled) return { allowed: true };

    const method = (req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS' || method === 'HEAD') return { allowed: true };

    const path = pathname || '/';
    if (shouldBypass(path)) return { allowed: true };

    const ip = getClientIp(req);
    if (ip && allowlistIpSet.has(ip)) return { allowed: true };
    if (ip && blocklistIpSet.has(ip)) {
      return {
        allowed: false,
        statusCode: 403,
        message: 'Access denied.',
      };
    }

    const userAgent = typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent']
      : '';
    const isAllowlistedUa =
      allowlistBots.some((pattern) => pattern.test(userAgent)) ||
      config.allowlistUserAgents.some((value) => userAgent.includes(value));
    const isDeniedUa = denylistBots.some((pattern) => pattern.test(userAgent));

    const accept = typeof req.headers['accept'] === 'string'
      ? req.headers['accept'].toLowerCase()
      : '';
    const secFetchSite = typeof req.headers['sec-fetch-site'] === 'string'
      ? req.headers['sec-fetch-site']
      : '';

    const isApi = path.startsWith('/api/');
    const isHtmlAccept = accept.includes('text/html') || accept.includes('application/xhtml+xml');
    const missingBrowserHints = !secFetchSite && !isApi;
    const suspicious = !isAllowlistedUa && (isDeniedUa || !userAgent || (!isApi && !isHtmlAccept) || missingBrowserHints);

    const scope = isApi ? 'api' : 'page';
    const limit = suspicious
      ? (scope === 'api' ? config.strictApiMax : config.strictPageMax)
      : (scope === 'api' ? config.apiMax : config.pageMax);
    const blockMs = suspicious ? config.strictBlockMs : config.blockMs;

    const now = Date.now();
    cleanup(now);

    const key = buildKey(scope, ip, userAgent);
    const blockedUntil = state.blocked.get(key);
    if (blockedUntil && blockedUntil > now) {
      if (config.logBlocked) {
        logSystemEvent({ level: 'warn', message: '[SCRAPER_GUARD] blocked request', source: 'scraper-guard', context: { ip, path, scope, blockedUntil: new Date(blockedUntil).toISOString() } });
      }
      const retryAfterSec = Math.ceil((blockedUntil - now) / 1000);
      return {
        allowed: false,
        statusCode: 429,
        retryAfterSec,
        message: 'Too many requests. Please slow down.',
      };
    }

    let bucket = state.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + config.windowMs };
    }
    bucket.count += 1;
    state.buckets.set(key, bucket);

    if (bucket.count > limit) {
      const until = now + blockMs;
      state.blocked.set(key, until);
      if (config.logBlocked) {
        logSystemEvent({ level: 'warn', message: '[SCRAPER_GUARD] rate limit exceeded', source: 'scraper-guard', context: { ip, path, scope, limit, blockedUntil: new Date(until).toISOString(), suspicious } });
      }
      return {
        allowed: false,
        statusCode: 429,
        retryAfterSec: Math.ceil(blockMs / 1000),
        message: 'Too many requests. Please slow down.',
      };
    }

    return { allowed: true };
  }

  return { check };
}
