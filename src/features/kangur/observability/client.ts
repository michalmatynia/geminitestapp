import { readClientCookie, setClientCookie } from '@/shared/lib/browser/client-cookies';
import {
  logClientError,
  setClientErrorBaseContext,
} from '@/features/kangur/shared/utils/observability/client-error-logger';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

type KangurClientErrorContext = Record<string, unknown>;
type KangurClientEventContext = Record<string, unknown>;
export type KangurClientErrorReport = {
  source: string;
  action: string;
  description: string;
  context?: KangurClientErrorContext;
};

type KangurClientErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

const KANGUR_CLIENT_CONTEXT = Object.freeze({
  feature: 'kangur',
  service: 'kangur.client',
});

const VISITOR_COOKIE = 'pa_vid';
const SESSION_STORAGE_KEY = 'pa_sid';
const ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV =
  process.env['NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV'] === 'true';
const ENABLE_KANGUR_EVENT_ANALYTICS =
  process.env['NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS'] === 'true' ||
  (process.env['NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS'] !== 'false' &&
    (process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'test' ||
      ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV));

let currentKangurContext: {
  pageKey: string | null;
  requestedPath: string;
} = {
  pageKey: null,
  requestedPath: '',
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const getOrCreateVisitorId = (): string => {
  const existing = readClientCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const created = generateId();
  setClientCookie(VISITOR_COOKIE, created, { maxAgeSeconds: 180 * 24 * 60 * 60 });
  return created;
};

const getOrCreateSessionId = (): string => {
  if (typeof sessionStorage === 'undefined') return generateId();
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const created = generateId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
};

const getTimeZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    logClientError(error);
    return null;
  }
};

const getConnectionInfo = (): Record<string, unknown> | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };

  if (!nav.connection) return null;

  return {
    effectiveType: nav.connection.effectiveType ?? null,
    downlink: typeof nav.connection.downlink === 'number' ? nav.connection.downlink : null,
    rtt: typeof nav.connection.rtt === 'number' ? nav.connection.rtt : null,
    saveData: typeof nav.connection.saveData === 'boolean' ? nav.connection.saveData : null,
  };
};

export const logKangurClientError = (
  error: unknown,
  context: KangurClientErrorContext = {}
): void => {
  logClientError(error, {
    context: {
      ...KANGUR_CLIENT_CONTEXT,
      ...context,
    },
  });
};

export const reportKangurClientError = (
  error: unknown,
  report: KangurClientErrorReport
): void => {
  logKangurClientError(error, {
    source: report.source,
    action: report.action,
    description: report.description,
    ...(report.context ?? {}),
  });
};

export const withKangurClientError = async <T>(
  report: KangurClientErrorReport | ((error: unknown) => KangurClientErrorReport),
  task: () => Promise<T>,
  options: KangurClientErrorHandlingOptions<T>
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    void ErrorSystem.captureException(error);
    const resolvedReport = typeof report === 'function' ? report(error) : report;
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurClientError(error, resolvedReport);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

export const withKangurClientErrorSync = <T>(
  report: KangurClientErrorReport | ((error: unknown) => KangurClientErrorReport),
  task: () => T,
  options: KangurClientErrorHandlingOptions<T>
): T => {
  try {
    return task();
  } catch (error) {
    void ErrorSystem.captureException(error);
    const resolvedReport = typeof report === 'function' ? report(error) : report;
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurClientError(error, resolvedReport);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

export const setKangurClientObservabilityContext = (context: {
  pageKey: string | null;
  requestedPath: string;
}): void => {
  currentKangurContext = {
    pageKey: context.pageKey,
    requestedPath: context.requestedPath,
  };
  setClientErrorBaseContext({
    feature: 'kangur',
    kangur: {
      pageKey: context.pageKey,
      requestedPath: context.requestedPath,
    },
  });
};

export const clearKangurClientObservabilityContext = (): void => {
  currentKangurContext = {
    pageKey: null,
    requestedPath: '',
  };
  setClientErrorBaseContext({
    kangur: null,
  });
};

export const trackKangurClientEvent = (
  name: string,
  context: KangurClientEventContext = {}
): void => {
  if (!ENABLE_KANGUR_EVENT_ANALYTICS || typeof window === 'undefined') {
    return;
  }

  const eventName = name.trim();
  if (!eventName) {
    return;
  }

  const path = window.location.pathname || currentKangurContext.requestedPath || '/';
  const search = window.location.search || '';
  const scope = path.startsWith('/admin') ? 'admin' : 'public';
  const navigatorLanguages =
    typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
      ? navigator.languages.reduce<string[]>((languages, language) => {
        if (typeof language === 'string') {
          languages.push(language);
        }
        return languages;
      }, [])
      : [];
  const payload = {
    type: 'event',
    name: eventName,
    scope,
    path,
    ...(search ? { search } : {}),
    url: window.location.href,
    title: document.title || null,
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(),
    language: typeof navigator !== 'undefined' ? navigator.language || null : null,
    languages: navigatorLanguages.length > 0 ? navigatorLanguages : null,
    timeZone: getTimeZone(),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen: {
      width: window.screen?.width ?? 0,
      height: window.screen?.height ?? 0,
      dpr: window.devicePixelRatio ?? 1,
    },
    connection: getConnectionInfo(),
    clientTs: new Date().toISOString(),
    meta: {
      ...KANGUR_CLIENT_CONTEXT,
      pageKey: currentKangurContext.pageKey,
      requestedPath: currentKangurContext.requestedPath || path,
      ...context,
    },
  };
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/analytics/events', blob);
      if (ok) {
        return;
      }
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    logClientError(error);
  
    // Fall back to fetch when sendBeacon is unavailable or fails.
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'include',
    keepalive: true,
  }).catch((error) => {
    void ErrorSystem.captureException(error);
    // Keep analytics non-blocking for the learner experience.
  });
};
