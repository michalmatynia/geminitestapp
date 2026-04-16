import { type NextRequest, NextResponse } from 'next/server';

import { handlers } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const AUTH_SESSION_UNAUTH_CACHE_TTL_MS = (() => {
  const raw = process.env['AUTH_SESSION_UNAUTH_CACHE_TTL_MS'];
  if (!raw) return 2_000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 2_000;
  return parsed;
})();

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const;

type AuthSessionMemoEntry = {
  status: number;
  body: string;
  ts: number;
};

type AuthSessionMemoState = {
  unauthSession: AuthSessionMemoEntry | null;
};

type AuthSessionGlobalState = {
  __authSessionMemoState?: AuthSessionMemoState;
};

const globalForAuthSessionMemo = globalThis as typeof globalThis & AuthSessionGlobalState;

const getAuthSessionMemoState = (): AuthSessionMemoState => {
  if (!globalForAuthSessionMemo.__authSessionMemoState) {
    globalForAuthSessionMemo.__authSessionMemoState = {
      unauthSession: null,
    };
  }
  return globalForAuthSessionMemo.__authSessionMemoState;
};

const buildServerTiming = (entries: Record<string, number | null | undefined>): string =>
  Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${(value as number).toFixed(2)}`)
    .join(', ');

const attachServerTiming = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (!value) return;
  response.headers.set('Server-Timing', value);
};

const hasSessionTokenCookie = (req: NextRequest): boolean => {
  const rawCookie = req.headers.get('cookie') ?? '';
  if (!rawCookie) return false;
  return SESSION_COOKIE_NAMES.some((cookieName) => rawCookie.includes(`${cookieName}=`));
};

const buildUnauthSessionResponse = (
  status: number,
  body: string,
  cacheHeader: string,
  requestStart: number,
  cacheDurationMs: number
): Response => {
  const response = new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Session-Cache': cacheHeader,
    },
  });
  attachServerTiming(response, {
    total: performance.now() - requestStart,
    cache: cacheDurationMs,
  });
  return response;
};

const logAuthEventInBackground = (input: Parameters<typeof logAuthEvent>[0]): void => {
  void logAuthEvent(input).catch(() => undefined);
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = performance.now();
  const isSessionRequest = req.nextUrl.pathname.endsWith('/session');
  if (isSessionRequest && !hasSessionTokenCookie(req)) {
    const cacheStart = performance.now();
    const state = getAuthSessionMemoState();
    const cached = state.unauthSession;
    const now = Date.now();
    if (cached && now - cached.ts <= AUTH_SESSION_UNAUTH_CACHE_TTL_MS) {
      return buildUnauthSessionResponse(
        cached.status,
        cached.body,
        'hit',
        requestStart,
        performance.now() - cacheStart
      );
    }
    const nextEntry: AuthSessionMemoEntry = {
      status: 200,
      body: 'null',
      ts: now,
    };
    state.unauthSession = nextEntry;
    return buildUnauthSessionResponse(
      nextEntry.status,
      nextEntry.body,
      'miss',
      requestStart,
      performance.now() - cacheStart
    );
  }

  logAuthEventInBackground({ req, action: 'auth.nextauth', stage: 'start' });
  const handlerStart = performance.now();
  try {
    const response = await handlers.GET(req);
    logAuthEventInBackground({
      req,
      action: 'auth.nextauth',
      stage: 'success',
      status: response.status,
    });
    if (isSessionRequest) {
      attachServerTiming(response, {
        total: performance.now() - requestStart,
        handler: performance.now() - handlerStart,
      });
    }
    return response;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (req.nextUrl.pathname.endsWith('/session')) {
      const response = NextResponse.json(null, { status: 200 });
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Session-Cache', 'fallback');
      attachServerTiming(response, {
        total: performance.now() - requestStart,
        handler: performance.now() - handlerStart,
      });
      logAuthEventInBackground({
        req,
        action: 'auth.nextauth',
        stage: 'failure',
        status: 200,
        outcome: 'session-fallback',
      });
      return response;
    }
    throw error;
  }
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  logAuthEventInBackground({ req, action: 'auth.nextauth', stage: 'start' });
  const response = await handlers.POST(req);
  logAuthEventInBackground({
    req,
    action: 'auth.nextauth',
    stage: 'success',
    status: response.status,
  });
  return response;
}
