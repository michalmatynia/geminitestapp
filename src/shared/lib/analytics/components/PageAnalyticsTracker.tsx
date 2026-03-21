'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import type { AnalyticsEventCreateInput, AnalyticsScope } from '@/shared/contracts';
import { useTrackEventMutation } from '@/shared/lib/analytics/hooks/useAnalyticsQueries';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


const VISITOR_COOKIE = 'pa_vid';
const SESSION_STORAGE_KEY = 'pa_sid';
const PAGEVIEW_DEDUPE_WINDOW_MS = 1500;
const ENABLE_PAGE_ANALYTICS_IN_DEV =
  process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS_IN_DEV'] === 'true';
const ENABLE_ADMIN_PAGE_ANALYTICS =
  process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] === 'true';
const ENABLE_PAGE_ANALYTICS =
  process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] === 'true' ||
  (process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] !== 'false' &&
    (process.env.NODE_ENV === 'production' || ENABLE_PAGE_ANALYTICS_IN_DEV));

let lastTrackedPageview: { key: string; ts: number } | null = null;
const inflightPageviews = new Set<string>();

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((part: string) => part.trim());
  const match = parts.find((part: string) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
};

const setCookie = (name: string, value: string, days: number): void => {
  if (typeof document === 'undefined') return;
  const maxAgeSeconds = Math.floor(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const getOrCreateVisitorId = (): string => {
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const created = generateId();
  setCookie(VISITOR_COOKIE, created, 180);
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

const getScopeFromPathname = (pathname: string): AnalyticsScope =>
  pathname.startsWith('/admin') ? 'admin' : 'public';

const getTimeZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch (error) {
    logClientCatch(error, {
      source: 'page-analytics-tracker',
      action: 'readTimeZone',
    });
    return null;
  }
};

const getConnectionInfo = (): AnalyticsEventCreateInput['connection'] => {
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

const getMediaPreference = (
  query: string,
  matchedValue: string | boolean,
  unmatchedValue: string | boolean | null = null
): string | boolean | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query).matches ? matchedValue : unmatchedValue;
};

const getPerformanceMeta = (): Record<string, unknown> | null => {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return null;
  }

  const navigationEntry = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (!navigationEntry) return null;

  return {
    navigationType: navigationEntry.type ?? null,
    redirectCount: navigationEntry.redirectCount ?? null,
    responseEndMs:
      typeof navigationEntry.responseEnd === 'number'
        ? Math.round(navigationEntry.responseEnd)
        : null,
    domContentLoadedMs:
      typeof navigationEntry.domContentLoadedEventEnd === 'number'
        ? Math.round(navigationEntry.domContentLoadedEventEnd)
        : null,
    loadEventMs:
      typeof navigationEntry.loadEventEnd === 'number'
        ? Math.round(navigationEntry.loadEventEnd)
        : null,
    durationMs:
      typeof navigationEntry.duration === 'number' ? Math.round(navigationEntry.duration) : null,
    transferSize:
      typeof navigationEntry.transferSize === 'number' ? navigationEntry.transferSize : null,
    encodedBodySize:
      typeof navigationEntry.encodedBodySize === 'number'
        ? navigationEntry.encodedBodySize
        : null,
    decodedBodySize:
      typeof navigationEntry.decodedBodySize === 'number'
        ? navigationEntry.decodedBodySize
        : null,
  };
};

const getClientMeta = (): AnalyticsEventCreateInput['meta'] => {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      saveData?: boolean;
    };
  };

  const meta = {
    client: {
      historyLength: typeof history !== 'undefined' ? history.length : null,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : null,
      cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : null,
      platform: typeof navigator !== 'undefined' ? navigator.platform ?? null : null,
      vendor: typeof navigator !== 'undefined' ? navigator.vendor ?? null : null,
      hardwareConcurrency:
        typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? null : null,
      deviceMemory:
        typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      maxTouchPoints:
        typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? null : null,
      doNotTrack:
        typeof navigator !== 'undefined' ? navigator.doNotTrack ?? null : null,
      webdriver:
        typeof navigator !== 'undefined' ? ('webdriver' in navigator ? navigator.webdriver : null) : null,
    },
    document: {
      visibilityState: typeof document !== 'undefined' ? document.visibilityState ?? null : null,
      readyState: typeof document !== 'undefined' ? document.readyState ?? null : null,
      hidden: typeof document !== 'undefined' ? document.hidden : null,
    },
    window: {
      outerWidth: typeof window !== 'undefined' ? window.outerWidth ?? null : null,
      outerHeight: typeof window !== 'undefined' ? window.outerHeight ?? null : null,
      screenOrientation:
        typeof window !== 'undefined' ? window.screen?.orientation?.type ?? null : null,
    },
    preferences: {
      colorScheme: getMediaPreference('(prefers-color-scheme: dark)', 'dark', 'light'),
      reducedMotion: getMediaPreference('(prefers-reduced-motion: reduce)', true, false),
      contrast: getMediaPreference('(prefers-contrast: more)', 'more', 'no-preference'),
      pointer: getMediaPreference('(pointer: coarse)', 'coarse', 'fine'),
    },
    performance: getPerformanceMeta(),
  } satisfies Record<string, unknown>;

  return meta;
};

const getUtm = (searchParams: URLSearchParams): AnalyticsEventCreateInput['utm'] => {
  const utm: Record<string, string> = {};
  const source = searchParams.get('utm_source');
  const medium = searchParams.get('utm_medium');
  const campaign = searchParams.get('utm_campaign');
  const term = searchParams.get('utm_term');
  const content = searchParams.get('utm_content');
  if (source) utm['source'] = source;
  if (medium) utm['medium'] = medium;
  if (campaign) utm['campaign'] = campaign;
  if (term) utm['term'] = term;
  if (content) utm['content'] = content;
  return Object.keys(utm).length > 0 ? (utm as AnalyticsEventCreateInput['utm']) : null;
};

export default function PageAnalyticsTracker(): null {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const search = useMemo(() => searchParams.toString(), [searchParams]);
  const trackEventMutation = useTrackEventMutation();

  useEffect(() => {
    if (!ENABLE_PAGE_ANALYTICS) return;
    if (!pathname) return;
    const scope = getScopeFromPathname(pathname);
    if (scope === 'admin' && !ENABLE_ADMIN_PAGE_ANALYTICS) return;

    const pageKey = `${pathname}?${search}`;
    const now = Date.now();
    const isDuplicatePageview =
      lastTrackedPageview?.key === pageKey &&
      now - (lastTrackedPageview?.ts ?? 0) < PAGEVIEW_DEDUPE_WINDOW_MS;
    if (isDuplicatePageview) {
      return;
    }
    if (inflightPageviews.has(pageKey)) {
      return;
    }
    lastTrackedPageview = { key: pageKey, ts: now };
    inflightPageviews.add(pageKey);

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();

    const url = typeof window !== 'undefined' ? window.location.href : null;
    const title = typeof document !== 'undefined' ? document.title : null;
    const referrer = typeof document !== 'undefined' ? document.referrer || null : null;
    const language = typeof navigator !== 'undefined' ? navigator.language || null : null;
    const languages =
      typeof navigator !== 'undefined' && navigator.languages ? [...navigator.languages] : null;
    const timeZone = getTimeZone();

    const viewport =
      typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : null;

    const screen =
      typeof window !== 'undefined'
        ? {
          width: window.screen?.width ?? 0,
          height: window.screen?.height ?? 0,
          dpr: window.devicePixelRatio ?? 1,
        }
        : null;

    const clientTs = new Date().toISOString();

    const queryString = search ? `?${search}` : null;
    const utm = getUtm(new URLSearchParams(search));
    const connection = getConnectionInfo();
    const meta = getClientMeta();

    const event: AnalyticsEventCreateInput = {
      type: 'pageview',
      scope,
      path: pathname,
      visitorId,
      sessionId,
      ...(queryString ? { search: queryString } : {}),
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(referrer ? { referrer } : {}),
      ...(utm ? { utm } : {}),
      ...(language ? { language } : {}),
      ...(languages ? { languages } : {}),
      ...(timeZone ? { timeZone } : {}),
      ...(viewport ? { viewport } : {}),
      ...(screen ? { screen } : {}),
      ...(connection ? { connection } : {}),
      ...(meta ? { meta } : {}),
      clientTs,
    };

    trackEventMutation.mutate(event as Record<string, unknown>, {
      onError: () => {
        // Intentionally swallow errors; analytics must never break UX.
      },
      onSettled: () => {
        inflightPageviews.delete(pageKey);
      },
    });
  }, [pathname, search]);

  return null;
}
