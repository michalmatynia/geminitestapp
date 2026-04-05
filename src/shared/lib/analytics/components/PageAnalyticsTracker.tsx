'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import type { AnalyticsEventCreateInput, AnalyticsScope } from '@/shared/contracts/analytics';
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

type AnalyticsNavigator = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  webdriver?: boolean;
};

const getAnalyticsNavigator = (): AnalyticsNavigator | null =>
  typeof navigator !== 'undefined' ? (navigator as AnalyticsNavigator) : null;

const getOptionalNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const getOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const getOptionalString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const getNavigatorWebdriver = (nav: AnalyticsNavigator | null): boolean | null =>
  nav && 'webdriver' in nav ? getOptionalBoolean(nav.webdriver) : null;

const getConnectionInfo = (): AnalyticsEventCreateInput['connection'] => {
  const connection = getAnalyticsNavigator()?.connection;
  if (!connection) return null;
  return {
    effectiveType: getOptionalString(connection.effectiveType),
    downlink: getOptionalNumber(connection.downlink),
    rtt: getOptionalNumber(connection.rtt),
    saveData: getOptionalBoolean(connection.saveData),
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

const getClientEnvironmentMeta = (nav: AnalyticsNavigator | null): Record<string, unknown> => ({
  historyLength: typeof history !== 'undefined' ? history.length : null,
  onLine: nav?.onLine ?? null,
  cookieEnabled: nav?.cookieEnabled ?? null,
  platform: nav?.platform ?? null,
  vendor: nav?.vendor ?? null,
  hardwareConcurrency: nav?.hardwareConcurrency ?? null,
  deviceMemory: getOptionalNumber(nav?.deviceMemory),
  maxTouchPoints: nav?.maxTouchPoints ?? null,
  doNotTrack: nav?.doNotTrack ?? null,
  webdriver: getNavigatorWebdriver(nav),
});

const getDocumentMeta = (): Record<string, unknown> => ({
  visibilityState: typeof document !== 'undefined' ? document.visibilityState ?? null : null,
  readyState: typeof document !== 'undefined' ? document.readyState ?? null : null,
  hidden: typeof document !== 'undefined' ? document.hidden : null,
});

const getWindowMeta = (): Record<string, unknown> => ({
  outerWidth: typeof window !== 'undefined' ? window.outerWidth ?? null : null,
  outerHeight: typeof window !== 'undefined' ? window.outerHeight ?? null : null,
  screenOrientation: typeof window !== 'undefined' ? window.screen?.orientation?.type ?? null : null,
});

const getPreferencesMeta = (): Record<string, unknown> => ({
  colorScheme: getMediaPreference('(prefers-color-scheme: dark)', 'dark', 'light'),
  reducedMotion: getMediaPreference('(prefers-reduced-motion: reduce)', true, false),
  contrast: getMediaPreference('(prefers-contrast: more)', 'more', 'no-preference'),
  pointer: getMediaPreference('(pointer: coarse)', 'coarse', 'fine'),
});

const getClientMeta = (): AnalyticsEventCreateInput['meta'] => ({
  client: getClientEnvironmentMeta(getAnalyticsNavigator()),
  document: getDocumentMeta(),
  window: getWindowMeta(),
  preferences: getPreferencesMeta(),
  performance: getPerformanceMeta(),
});

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
