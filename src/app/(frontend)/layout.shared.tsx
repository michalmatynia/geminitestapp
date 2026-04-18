import {
  serializeInlineTimingPayload,
  type FrontendLoadTimingPayload,
} from '@/app/(frontend)/shell/frontend-load-timing';
import type { FrontPageSelectionResolution } from '@/app/(frontend)/home/home-helpers';
import {
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server';
import { KangurSSRSkeleton, KangurServerShell } from '@/features/kangur/public';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { readOptionalRequestHeadersResult } from '@/shared/lib/request/optional-headers';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { getLiteSettingsCache } from '@/shared/lib/settings-lite-server-cache';
import type {
  FrontendPublicOwner,
  FrontendPublicRouteFamily,
} from '@/shared/lib/frontend-public-route-family';

import type { JSX, ReactNode } from 'react';

export const FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS = 1200;
const FRONTEND_MAIN_CLASSNAME =
  'min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const FRONT_PAGE_APP_SETTING_KEY = 'front_page_app';
const KANGUR_FRONT_PAGE_SETTING_VALUE = 'kangur';

export const KANGUR_SURFACE_BOOTSTRAP_ID = '__KANGUR_SURFACE_BOOTSTRAP__';
export const KANGUR_SURFACE_BOOTSTRAP_FALLBACK_ID =
  '__KANGUR_SURFACE_BOOTSTRAP_FALLBACK__';

const resolveFrontendRequestPathname = (headerValue: string | null | undefined): string | null => {
  if (typeof headerValue !== 'string') return null;

  const trimmed = headerValue.trim();
  if (trimmed === '') return null;

  const pathname = (() => {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        return new URL(trimmed).pathname;
      } catch {
        return trimmed;
      }
    }

    return trimmed.split('?')[0] ?? trimmed;
  })();

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const normalizeFrontendPathname = (pathname: string | null): string => {
  if (typeof pathname !== 'string') {
    return '/';
  }

  const trimmedPathname = pathname.trim();
  return stripSiteLocalePrefix(trimmedPathname === '' ? '/' : trimmedPathname);
};

export const isRootPublicRequest = (pathname: string | null): boolean =>
  normalizeFrontendPathname(pathname) === '/';

export const isExplicitKangurAliasRoute = (pathname: string | null): boolean => {
  const normalizedPathname = normalizeFrontendPathname(pathname);
  return (
    normalizedPathname === '/kangur' ||
    normalizedPathname.startsWith('/kangur/')
  );
};

export const isCanonicalPublicLoginRoute = (pathname: string | null): boolean =>
  normalizeFrontendPathname(pathname) === '/login';

export async function resolveRequestHeaders(): Promise<{
  headers: Headers | null;
  timedOut: boolean;
}> {
  return readOptionalRequestHeadersResult({
    timeoutMs: FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS,
  });
}

export function buildRequestPathname(headers: Headers | null): string | null {
  const keys = ['x-app-request-pathname', 'x-app-request-url', 'next-url', 'x-matched-path'];
  for (const key of keys) {
    const value = resolveFrontendRequestPathname(headers?.get(key));
    if (value !== null) {
      return value;
    }
  }

  return null;
}

const hasCachedKangurFrontPageSelection = (): boolean =>
  (getLiteSettingsCache()?.data ?? []).some(
    ({ key, value }) =>
      key === FRONT_PAGE_APP_SETTING_KEY &&
      value.trim().toLowerCase() === KANGUR_FRONT_PAGE_SETTING_VALUE
  );

const resolveFallbackRouteFamily = (
  pathname: string | null
): 'pending' | FrontendPublicRouteFamily => {
  if (isExplicitKangurAliasRoute(pathname)) {
    return 'studiq';
  }

  if (isRootPublicRequest(pathname) && hasCachedKangurFrontPageSelection()) {
    return 'studiq';
  }

  return 'pending';
};

export function InlineSafeScript({
  id,
  code,
}: {
  id?: string;
  code: string;
}): JSX.Element {
  const idProps = typeof id === 'string' ? { id } : {};

  return (
    <script
      {...idProps}
      dangerouslySetInnerHTML={{
        __html: safeHtml(code),
      }}
    />
  );
}

export function InlineSafeStyle({
  id,
  css,
}: {
  id: string;
  css: string;
}): JSX.Element {
  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{
        __html: safeHtml(css),
      }}
    />
  );
}

export function FrontendLayoutMain({
  children,
  routeFamily,
  ariaBusy = false,
}: {
  children: ReactNode;
  routeFamily: 'pending' | FrontendPublicRouteFamily;
  ariaBusy?: boolean;
}): JSX.Element {
  const ariaBusyProps = ariaBusy ? { 'aria-busy': 'true' } : {};

  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className={FRONTEND_MAIN_CLASSNAME}
      data-frontend-public-route-family={routeFamily}
      {...ariaBusyProps}
    >
      {children}
    </main>
  );
}

export function FrontendLayoutFallback({
  pathname,
}: {
  pathname: string | null;
}): JSX.Element {
  const routeFamily = resolveFallbackRouteFamily(pathname);
  const shouldRenderKangurAliasFallback = isExplicitKangurAliasRoute(pathname);
  const shouldRenderKangurRootFallback =
    routeFamily === 'studiq' &&
    isRootPublicRequest(pathname) &&
    !shouldRenderKangurAliasFallback;

  return (
    <FrontendLayoutMain ariaBusy routeFamily={routeFamily}>
      {routeFamily === 'studiq' && (
        <InlineSafeStyle
          id={KANGUR_SURFACE_BOOTSTRAP_FALLBACK_ID}
          css={getKangurSurfaceBootstrapStyle()}
        />
      )}
      {routeFamily === 'studiq' && (
        <InlineSafeScript code={KANGUR_SURFACE_HINT_SCRIPT} />
      )}
      {shouldRenderKangurAliasFallback ? <KangurServerShell /> : null}
      {shouldRenderKangurRootFallback ? <KangurSSRSkeleton /> : null}
    </FrontendLayoutMain>
  );
}

type TimingPayloadOptions = {
  layoutTiming: {
    buildPayload: (
      payload: Omit<FrontendLoadTimingPayload, 'source' | 'timingsMs'>
    ) => FrontendLoadTimingPayload | null;
  };
  requestPathname: string | null;
  publicOwner: FrontendPublicOwner;
  publicRouteFamily: FrontendPublicRouteFamily;
  isRootPublicRoute: boolean;
  requestHeadersTimedOut: boolean;
  frontPageSelection: FrontPageSelectionResolution | null;
  readRequestHeadersMs: number;
  explicitKangurAlias: boolean;
  canonicalPublicLogin: boolean;
  expectsRootRedirectToKangur: boolean;
  renderStandaloneKangurShell: boolean;
  injectKangurAuthBootstrap: boolean;
  loadKangurStorefrontBootstrap: boolean;
};

export function buildTimingPayload(
  options: TimingPayloadOptions
): FrontendLoadTimingPayload | null {
  const {
    layoutTiming,
    requestPathname,
    publicOwner,
    publicRouteFamily,
    isRootPublicRoute,
    requestHeadersTimedOut,
    frontPageSelection,
    readRequestHeadersMs,
    explicitKangurAlias,
    canonicalPublicLogin,
    expectsRootRedirectToKangur,
    renderStandaloneKangurShell,
    injectKangurAuthBootstrap,
    loadKangurStorefrontBootstrap,
  } = options;

  const payload = layoutTiming.buildPayload({
    pathname: requestPathname,
    publicOwner,
    routeFamily: publicRouteFamily,
    flags: {
      explicitKangurAlias,
      canonicalPublicLogin,
      rootPublicRoute: isRootPublicRoute,
      requestHeadersTimedOut,
      frontPageSelectionSource: frontPageSelection?.source ?? null,
      frontPageSelectionFallbackReason: frontPageSelection?.fallbackReason ?? null,
      expectsRootRedirectToKangur,
      renderStandaloneKangurShell,
      injectKangurAuthBootstrap,
      loadKangurStorefrontBootstrap,
    },
  });

  if (payload === null) {
    return null;
  }

  return {
    ...payload,
    timingsMs: {
      readRequestHeaders: Math.round(readRequestHeadersMs * 10) / 10,
      ...payload.timingsMs,
    },
  };
}

export { serializeInlineTimingPayload };
