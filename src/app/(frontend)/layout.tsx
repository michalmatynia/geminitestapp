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
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { getLiteSettingsCache } from '@/shared/lib/settings-lite-server-cache';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';
import { Suspense } from 'react';

import './kangur/kangur.css';

const DEFAULT_CMS_THEME_SETTINGS = {
  darkMode: false,
} as const;

const FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS = 1200;
const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const KANGUR_FALLBACK_BACKGROUND =
  'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))';
const FRONTEND_REQUEST_PATHNAME_HEADER_KEYS = [
  'x-app-request-pathname',
  'x-app-request-url',
  'next-url',
  'x-matched-path',
] as const;

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
  if (pathname === null || pathname.length === 0) {
    return false;
  }

  const normalizedPathname = stripSiteLocalePrefix(pathname);
  return normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');
};

const isCanonicalPublicLoginRequest = (pathname: string | null): boolean => {
  if (pathname === null || pathname.length === 0) {
    return false;
  }

  return stripSiteLocalePrefix(pathname) === '/login';
};

const isRootPublicRequest = (pathname: string | null): boolean => {
  if (pathname === null || pathname.length === 0) {
    return true;
  }

  return stripSiteLocalePrefix(pathname) === '/';
};

const resolveFrontendFallbackRequestPathname = (): string | null => {
  const requestContextPathname = readServerRequestPathname();
  if (requestContextPathname !== null) {
    return requestContextPathname;
  }

  const requestHeaders = readServerRequestHeaders();
  for (const headerKey of FRONTEND_REQUEST_PATHNAME_HEADER_KEYS) {
    const resolvedPathname = resolveFrontendRequestPathname(requestHeaders?.get(headerKey));
    if (resolvedPathname !== null) {
      return resolvedPathname;
    }
  }

  return null;
};

const resolveFrontendFallbackPublicOwner = (
  pathname: string | null
): FrontendPublicOwner | null => {
  if (isExplicitKangurAliasRequest(pathname)) {
    return 'kangur';
  }

  if (!shouldApplyFrontPageAppSelection()) {
    return null;
  }

  const cachedLiteSettings = getLiteSettingsCache()?.data;
  if (!cachedLiteSettings || cachedLiteSettings.length === 0) {
    return null;
  }

  const frontPageSetting = cachedLiteSettings.find((setting) => setting.key === FRONT_PAGE_SETTING_KEY);
  return getFrontPagePublicOwner(frontPageSetting?.value);
};

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Suspense fallback={<FrontendLayoutFallback />}>
      <FrontendLayoutRuntime>{children}</FrontendLayoutRuntime>
    </Suspense>
  );
}

function FrontendLayoutFallback(): JSX.Element {
  const fallbackPathname = resolveFrontendFallbackRequestPathname();
  const fallbackPublicOwner = resolveFrontendFallbackPublicOwner(fallbackPathname);
  const shouldRenderKangurFallback = fallbackPublicOwner === 'kangur';

  if (shouldRenderKangurFallback) {
    const fallbackRouteFamily = resolveFrontendPublicRouteFamily({
      pathname: fallbackPathname,
      publicOwner: fallbackPublicOwner,
    });
    const isRootFallbackRoute = isRootPublicRequest(fallbackPathname);

    return (
      <main
        id='kangur-main-content'
        tabIndex={-1}
        className='min-h-screen focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        data-frontend-public-route-family={fallbackRouteFamily}
        aria-busy='true'
        style={{ background: KANGUR_FALLBACK_BACKGROUND }}
      >
        <script dangerouslySetInnerHTML={{ __html: safeHtml(KANGUR_SURFACE_HINT_SCRIPT) }} />
        <style
          id='__KANGUR_SURFACE_BOOTSTRAP_FALLBACK__'
          dangerouslySetInnerHTML={{
            __html: safeHtml(getKangurSurfaceBootstrapStyle()),
          }}
        />
        {isRootFallbackRoute ? <KangurSSRSkeleton /> : <KangurServerShell />}
      </main>
    );
  }

  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      data-frontend-public-route-family='pending'
      aria-busy='true'
    >
      <div className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12'>
        <div className='h-11 w-40 animate-pulse rounded-2xl bg-foreground/[0.06]' />
        <div className='grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
          <div className='flex flex-col gap-4'>
            <div className='h-16 w-3/4 animate-pulse rounded-3xl bg-foreground/[0.05]' />
            <div className='h-64 animate-pulse rounded-[2rem] bg-foreground/[0.04]' />
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='h-28 animate-pulse rounded-3xl bg-foreground/[0.04]' />
              <div className='h-28 animate-pulse rounded-3xl bg-foreground/[0.04]' />
            </div>
          </div>
          <div className='hidden gap-4 rounded-[2rem] border border-foreground/[0.06] bg-background/80 p-6 lg:flex lg:flex-col'>
            <div className='h-5 w-28 animate-pulse rounded-full bg-foreground/[0.06]' />
            <div className='h-12 animate-pulse rounded-2xl bg-foreground/[0.05]' />
            <div className='h-12 animate-pulse rounded-2xl bg-foreground/[0.05]' />
            <div className='h-24 animate-pulse rounded-3xl bg-foreground/[0.04]' />
          </div>
        </div>
      </div>
    </main>
  );
}

async function FrontendLayoutRuntime({
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
  let kangurAuthBootstrapScriptPromise: Promise<string | null> = Promise.resolve(null);
  if (shouldInjectKangurAuthBootstrap) {
    kangurAuthBootstrapScriptPromise =
      requestHeaders !== null
        ? layoutTiming.withTiming('kangurAuthBootstrapScript', () =>
          getKangurAuthBootstrapScript(requestHeaders)
        )
        : Promise.resolve('window.__KANGUR_AUTH_BOOTSTRAP__=null;');
  }
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
  const shouldInjectKangurSurfaceHint =
    publicOwner === 'kangur' || publicRouteFamily === 'studiq';
  const resolvedKangurSurfaceBootstrapStyle =
    kangurSurfaceBootstrapStyle ??
    (publicOwner !== 'kangur' && publicRouteFamily === 'studiq'
      ? getKangurSurfaceBootstrapStyle()
      : null);

  let frontendShellChildren: React.ReactNode;
  if (shouldRenderStandaloneKangurShell) {
    frontendShellChildren = isRootPublicRoute ? <KangurSSRSkeleton /> : <KangurServerShell />;
  } else {
    frontendShellChildren = (
      <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
        <>{children}</>
      </CmsStorefrontAppearanceProvider>
    );
  }

  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      data-frontend-public-route-family={publicRouteFamily}
      style={publicRouteFamily === 'studiq' ? { background: KANGUR_FALLBACK_BACKGROUND } : undefined}
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
      {shouldInjectKangurSurfaceHint ? (
        <script dangerouslySetInnerHTML={{ __html: safeHtml(KANGUR_SURFACE_HINT_SCRIPT) }} />
      ) : null}
      {resolvedKangurSurfaceBootstrapStyle !== null ? (
        <style
          id='__KANGUR_SURFACE_BOOTSTRAP__'
          dangerouslySetInnerHTML={{ __html: safeHtml(resolvedKangurSurfaceBootstrapStyle) }}
        />
      ) : null}
      {kangurAuthBootstrapScript !== null ? (
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
