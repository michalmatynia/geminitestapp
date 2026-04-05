import { NextResponse, type NextRequest } from 'next/server';

type EdgeTrafficGuardOptions = {
  nowMs?: number;
  windowMs?: number;
  pageMax?: number;
  suspiciousPageMax?: number;
  blockMs?: number;
  suspiciousBlockMs?: number;
};

type GuardBucket = {
  count: number;
  resetAt: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_PAGE_MAX = 45;
const DEFAULT_SUSPICIOUS_PAGE_MAX = 8;
const DEFAULT_BLOCK_MS = 5 * 60_000;
const DEFAULT_SUSPICIOUS_BLOCK_MS = 15 * 60_000;
const CLEANUP_INTERVAL_MS = 30_000;

const SESSION_COOKIE_TOKENS = [
  'authjs.session-token=',
  '__Secure-authjs.session-token=',
  'next-auth.session-token=',
  '__Secure-next-auth.session-token=',
  'kangur.learner-session=',
] as const;

const ALLOWLIST_BOTS = [
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
] as const;

const SUSPICIOUS_USER_AGENTS = [
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
] as const;

const pageBuckets = new Map<string, GuardBucket>();
const blockedUntilMap = new Map<string, number>();
let lastCleanupAt = 0;

const readHeader = (request: Pick<NextRequest, 'headers'>, name: string): string =>
  request.headers.get(name)?.trim() ?? '';

const getClientIp = (request: Pick<NextRequest, 'headers'>): string => {
  const headerCandidates = [
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
  ] as const;

  for (const headerName of headerCandidates) {
    const value = readHeader(request, headerName);
    if (value.length > 0) {
      return value.split(',')[0]?.trim() || 'unknown';
    }
  }

  return 'unknown';
};

const isApiRequest = (pathname: string): boolean => pathname === '/api' || pathname.startsWith('/api/');

const isAdminRequest = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/');

const isAuthenticatedRequest = (request: Pick<NextRequest, 'headers'>): boolean => {
  const cookieHeader = readHeader(request, 'cookie');
  if (!cookieHeader) {
    return false;
  }

  return SESSION_COOKIE_TOKENS.some((token) => cookieHeader.includes(token));
};

const isAllowlistedBot = (userAgent: string): boolean =>
  ALLOWLIST_BOTS.some((pattern) => pattern.test(userAgent));

const isSuspiciousUserAgent = (userAgent: string): boolean =>
  userAgent.length === 0 || SUSPICIOUS_USER_AGENTS.some((pattern) => pattern.test(userAgent));

const cleanupState = (now: number): void => {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;

  for (const [key, bucket] of pageBuckets.entries()) {
    if (bucket.resetAt <= now) {
      pageBuckets.delete(key);
    }
  }

  for (const [key, blockedUntil] of blockedUntilMap.entries()) {
    if (blockedUntil <= now) {
      blockedUntilMap.delete(key);
    }
  }
};

const buildBucketKey = (request: Pick<NextRequest, 'headers' | 'nextUrl'>, userAgent: string): string => {
  const pathname = request.nextUrl.pathname || '/';
  return `${getClientIp(request)}:${pathname}:${userAgent.toLowerCase().slice(0, 96) || 'no-ua'}`;
};

const buildRateLimitResponse = (blockedUntil: number): NextResponse => {
  const retryAfterSec = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
  return new NextResponse('Too many requests. Please slow down.', {
    status: 429,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': String(retryAfterSec),
      'X-Traffic-Guard': 'public-page-burst',
    },
  });
};

export const resetEdgeTrafficGuardState = (): void => {
  pageBuckets.clear();
  blockedUntilMap.clear();
  lastCleanupAt = 0;
};

export const applyEdgeTrafficGuard = (
  request: Pick<NextRequest, 'headers' | 'method' | 'nextUrl'>,
  options?: EdgeTrafficGuardOptions
): NextResponse | null => {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return null;
  }

  const pathname = request.nextUrl.pathname;
  if (!pathname || isApiRequest(pathname) || isAdminRequest(pathname)) {
    return null;
  }

  if (isAuthenticatedRequest(request)) {
    return null;
  }

  const userAgent = readHeader(request, 'user-agent');
  if (isAllowlistedBot(userAgent)) {
    return null;
  }

  const now = options?.nowMs ?? Date.now();
  cleanupState(now);

  const bucketKey = buildBucketKey(request, userAgent);
  const activeBlock = blockedUntilMap.get(bucketKey);
  if (activeBlock && activeBlock > now) {
    return buildRateLimitResponse(activeBlock);
  }

  const suspicious = isSuspiciousUserAgent(userAgent);
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = suspicious
    ? (options?.suspiciousPageMax ?? DEFAULT_SUSPICIOUS_PAGE_MAX)
    : (options?.pageMax ?? DEFAULT_PAGE_MAX);
  const blockMs = suspicious
    ? (options?.suspiciousBlockMs ?? DEFAULT_SUSPICIOUS_BLOCK_MS)
    : (options?.blockMs ?? DEFAULT_BLOCK_MS);

  const bucket = pageBuckets.get(bucketKey);
  const nextBucket =
    !bucket || bucket.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: bucket.count + 1, resetAt: bucket.resetAt };

  pageBuckets.set(bucketKey, nextBucket);

  if (nextBucket.count <= maxRequests) {
    return null;
  }

  const blockedUntil = now + blockMs;
  blockedUntilMap.set(bucketKey, blockedUntil);
  return buildRateLimitResponse(blockedUntil);
};
