import {
  resolveFrontPageSelection,
  shouldApplyFrontPageAppSelection,
} from '@/app/(frontend)/home/home-helpers';
import {
  getKangurAuthBootstrapScript,
  getKangurStorefrontInitialState,
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server';
import {
  createFrontendLoadTimingRecorder,
  serializeInlineTimingPayload,
  shouldEnableFrontendLoadTiming,
  type FrontendLoadTimingPayload,
} from '@/app/(frontend)/shell/frontend-load-timing';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import { getCmsThemeSettings } from '@/features/cms/server';
import {
  FrontendPublicOwnerProvider,
  FrontendPublicOwnerShellClient,
  KangurSSRSkeleton,
  KangurServerShell,
} from '@/features/kangur/public';
import { readOptionalRequestHeadersResult } from '@/shared/lib/request/optional-headers';
import {
  readServerRequestHeaders,
  readServerRequestPathname,
} from '@/shared/lib/request/server-request-context';
import {
  resolveFrontendPublicRouteFamily,
  type FrontendPublicOwner,
  type FrontendPublicRouteFamily,
} from '@/shared/lib/frontend-public-route-family';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

import './kangur/kangur.css';

const DEFAULT_CMS_THEME_SETTINGS = {
  darkMode: false,
} as const;

const FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS = 1200;

const resolveFrontendRequestPathname = (headerValue: string | null | undefined): string | null => {
  if (typeof headerValue !== 'string') {
    return null;
  }

  const trimmed = headerValue.trim();
  if (!trimmed) {
    return null;
  }

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

const isExplicitKangurAliasRequest = (pathname: string | null): boolean => {
  if (!pathname) {
    return false;
  }

  const normalizedPathname = stripSiteLocalePrefix(pathname);
  return normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');
};

const isCanonicalPublicLoginRequest = (pathname: string | null): boolean => {
  if (!pathname) {
    return false;
  }

  return stripSiteLocalePrefix(pathname) === '/login';
};

const isRootPublicRequest = (pathname: string | null): boolean => {
  if (!pathname) {
    return true;
  }

  return stripSiteLocalePrefix(pathname) === '/';
};

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const requestHeadersStartedAt = performance.now();
  const requestContextHeaders = readServerRequestHeaders();
  const requestContextPathname = readServerRequestPathname();
  const { headers: requestHeaders, timedOut: requestHeadersTimedOut } = requestContextHeaders
    ? {
        headers: requestContextHeaders,
        timedOut: false,
      }
    : await readOptionalRequestHeadersResult({
        timeoutMs: FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS,
      });
  const layoutTiming = createFrontendLoadTimingRecorder(
    shouldEnableFrontendLoadTiming(requestHeaders)
  );
  const readRequestHeadersMs = performance.now() - requestHeadersStartedAt;
  const requestPathname =
    requestContextPathname ??
    resolveFrontendRequestPathname(requestHeaders?.get('x-app-request-pathname')) ??
    resolveFrontendRequestPathname(requestHeaders?.get('x-app-request-url')) ??
    resolveFrontendRequestPathname(requestHeaders?.get('next-url')) ??
    resolveFrontendRequestPathname(requestHeaders?.get('x-matched-path'));
  const isExplicitKangurAlias = isExplicitKangurAliasRequest(requestPathname);
  const isCanonicalPublicLogin = isCanonicalPublicLoginRequest(requestPathname);
  const isRootPublicRoute = isRootPublicRequest(requestPathname);
  const shouldUseFrontPageAppSelection = shouldApplyFrontPageAppSelection();
  const shouldResolveFrontPageSelection = shouldUseFrontPageAppSelection && !isExplicitKangurAlias;
  const frontPageSelectionPromise = shouldResolveFrontPageSelection
    ? layoutTiming.withTiming('frontPageSelection', resolveFrontPageSelection)
    : Promise.resolve(null);
  const themePromise = getCmsThemeSettings();

  const frontPageSelection = await frontPageSelectionPromise;
  const publicOwner: FrontendPublicOwner =
    shouldResolveFrontPageSelection && frontPageSelection
      ? frontPageSelection.publicOwner
      : 'cms';
  const expectsRootRedirectToKangur =
    publicOwner === 'kangur' && isRootPublicRoute && !isExplicitKangurAlias && !isCanonicalPublicLogin;
  const shouldRenderStandaloneKangurShell =
    publicOwner === 'kangur' &&
    !isExplicitKangurAlias &&
    !isCanonicalPublicLogin &&
    !expectsRootRedirectToKangur;
  const shouldInjectKangurAuthBootstrap =
    (publicOwner === 'kangur' && !expectsRootRedirectToKangur) || isCanonicalPublicLogin;
  const shouldLoadKangurStorefrontBootstrap =
    publicOwner === 'kangur' && shouldRenderStandaloneKangurShell;
  const publicRouteFamily: FrontendPublicRouteFamily = resolveFrontendPublicRouteFamily({
    pathname: requestPathname,
    publicOwner,
  });
  const kangurStatePromise = shouldLoadKangurStorefrontBootstrap
    ? layoutTiming.withTiming(
      'kangurStorefrontInitialState',
      getKangurStorefrontInitialState
    )
    : Promise.resolve(null);
  const kangurAuthBootstrapScriptPromise = shouldInjectKangurAuthBootstrap
    ? requestHeaders
      ? layoutTiming.withTiming('kangurAuthBootstrapScript', () =>
        getKangurAuthBootstrapScript(requestHeaders)
      )
      : Promise.resolve('window.__KANGUR_AUTH_BOOTSTRAP__=null;')
    : Promise.resolve(null);
  const [themeSettings, kangurInitialState] = await Promise.all([
    publicOwner === 'cms' && !isExplicitKangurAlias
      ? layoutTiming.withTiming('cmsThemeSettings', () => themePromise)
      : Promise.resolve(DEFAULT_CMS_THEME_SETTINGS),
    kangurStatePromise,
  ]);
  const kangurAuthBootstrapScript = await kangurAuthBootstrapScriptPromise;
  const storefrontAppearanceMode = themeSettings.darkMode ? 'dark' : 'default';
  const frontendLoadTimingPayload = layoutTiming.buildPayload({
    pathname: requestPathname,
    publicOwner,
    routeFamily: publicRouteFamily,
      flags: {
        explicitKangurAlias: isExplicitKangurAlias,
        canonicalPublicLogin: isCanonicalPublicLogin,
        rootPublicRoute: isRootPublicRoute,
        requestHeadersTimedOut,
        frontPageSelectionSource: frontPageSelection?.source ?? null,
        frontPageSelectionFallbackReason: frontPageSelection?.fallbackReason ?? null,
        expectsRootRedirectToKangur,
        renderStandaloneKangurShell: shouldRenderStandaloneKangurShell,
        injectKangurAuthBootstrap: shouldInjectKangurAuthBootstrap,
        loadKangurStorefrontBootstrap: shouldLoadKangurStorefrontBootstrap,
      },
    });
  const inlineFrontendLoadTimingPayload: FrontendLoadTimingPayload | null =
    frontendLoadTimingPayload
      ? {
          ...frontendLoadTimingPayload,
          timingsMs: {
            readRequestHeaders: Math.round(readRequestHeadersMs * 10) / 10,
            ...frontendLoadTimingPayload.timingsMs,
          },
        }
      : null;
  const kangurSurfaceBootstrapStyle =
    publicOwner === 'kangur' && kangurInitialState
      ? getKangurSurfaceBootstrapStyle({
          mode: kangurInitialState.initialMode,
          themeSettings: kangurInitialState.initialThemeSettings,
        })
      : null;

  const frontendShellChildren = shouldRenderStandaloneKangurShell ? (
    isRootPublicRoute ? (
      <KangurSSRSkeleton />
    ) : (
      <KangurServerShell />
    )
  ) : (
    <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
      <>{children}</>
    </CmsStorefrontAppearanceProvider>
  );

  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      data-frontend-public-route-family={publicRouteFamily}
    >
      {inlineFrontendLoadTimingPayload ? (
        <script
          id='__FRONTEND_LAYOUT_TIMING__'
          type='application/json'
          dangerouslySetInnerHTML={{
            __html: safeHtml(serializeInlineTimingPayload(inlineFrontendLoadTimingPayload)),
          }}
        />
      ) : null}
      {publicOwner === 'kangur' ? (
        <script dangerouslySetInnerHTML={{ __html: safeHtml(KANGUR_SURFACE_HINT_SCRIPT) }} />
      ) : null}
      {kangurSurfaceBootstrapStyle ? (
        <style
          id='__KANGUR_SURFACE_BOOTSTRAP__'
          dangerouslySetInnerHTML={{ __html: safeHtml(kangurSurfaceBootstrapStyle) }}
        />
      ) : null}
      {kangurAuthBootstrapScript ? (
        <script dangerouslySetInnerHTML={{ __html: safeHtml(kangurAuthBootstrapScript) }} />
      ) : null}
      <FrontendPublicOwnerProvider publicOwner={publicOwner} routeFamily={publicRouteFamily}>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShellClient
            publicOwner={publicOwner}
            initialAppearance={
              shouldRenderStandaloneKangurShell
                ? {
                    mode: kangurInitialState?.initialMode,
                    themeSettings: kangurInitialState?.initialThemeSettings,
                  }
                : undefined
            }
          >
            {frontendShellChildren}
          </FrontendPublicOwnerShellClient>
        </QueryErrorBoundary>
      </FrontendPublicOwnerProvider>
    </main>
  );
}
