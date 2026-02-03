const { createServer } = require('http');
const { parse } = require('url');
const { createHash } = require('crypto');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

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

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
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
    handle(req, res, parsedUrl);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
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
        console.warn('[SCRAPER_GUARD] blocked request', {
          ip,
          path,
          scope,
          blockedUntil: new Date(blockedUntil).toISOString(),
        });
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
        console.warn('[SCRAPER_GUARD] rate limit exceeded', {
          ip,
          path,
          scope,
          limit,
          blockedUntil: new Date(until).toISOString(),
          suspicious,
        });
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
