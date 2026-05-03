import type { FrontendPublicOwner, FrontendPublicRouteFamily } from '@/shared/lib/frontend-public-route-family';

export type FrontendLoadTimingPayload = {
  source: 'frontend-layout';
  pathname: string | null;
  publicOwner: FrontendPublicOwner;
  routeFamily: FrontendPublicRouteFamily;
  flags: {
    explicitKangurAlias: boolean;
    canonicalPublicLogin: boolean;
    rootPublicRoute: boolean;
    requestHeadersTimedOut: boolean;
    frontPageSelectionSource: string | null;
    frontPageSelectionFallbackReason: string | null;
    expectsRootRedirectToKangur: boolean;
    renderStandaloneKangurShell: boolean;
    injectKangurAuthBootstrap: boolean;
    loadKangurStorefrontBootstrap: boolean;
  };
  timingsMs: Record<string, number>;
};

type FrontendLoadTimingRecorder = {
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  buildPayload: (
    payload: Omit<FrontendLoadTimingPayload, 'source' | 'timingsMs'>
  ) => FrontendLoadTimingPayload | null;
};

const DEBUG_FRONTEND_TIMING_HEADERS = [
  'x-debug-frontend-timing',
  'x-debug-kangur-timing',
] as const;

const isTruthyDebugValue = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const roundTimingRecord = (timings: Record<string, number>): Record<string, number> =>
  Object.fromEntries(
    Object.entries(timings)
      .filter(([, value]) => Number.isFinite(value))
      .map(([key, value]) => [key, Math.round(value * 10) / 10])
  );

export const serializeInlineTimingPayload = (payload: FrontendLoadTimingPayload): string =>
  JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export const shouldEnableFrontendLoadTiming = (requestHeaders: Headers | null): boolean => {
  if (process.env['DEBUG_FRONTEND_TIMING'] === 'true') {
    return true;
  }

  return DEBUG_FRONTEND_TIMING_HEADERS.some((headerName) =>
    isTruthyDebugValue(requestHeaders?.get(headerName))
  );
};

export const createFrontendLoadTimingRecorder = (
  enabled: boolean
): FrontendLoadTimingRecorder => {
  const timingsMs: Record<string, number> = {};
  const totalStartedAt = performance.now();

  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (!enabled) {
      return fn();
    }

    const startedAt = performance.now();

    try {
      return await fn();
    } finally {
      timingsMs[label] = performance.now() - startedAt;
    }
  };

  const buildPayload = (
    payload: Omit<FrontendLoadTimingPayload, 'source' | 'timingsMs'>
  ): FrontendLoadTimingPayload | null => {
    if (!enabled) {
      return null;
    }

    return {
      source: 'frontend-layout',
      ...payload,
      timingsMs: roundTimingRecord({
        ...timingsMs,
        total: performance.now() - totalStartedAt,
      }),
    };
  };

  return {
    withTiming,
    buildPayload,
  };
};
