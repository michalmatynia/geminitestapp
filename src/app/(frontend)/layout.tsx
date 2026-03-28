import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import {
  createFrontendLoadTimingRecorder,
  serializeInlineTimingPayload,
  shouldEnableFrontendLoadTiming,
  type FrontendLoadTimingPayload,
} from '@/app/(frontend)/frontend-load-timing';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import { getCmsThemeSettings } from '@/features/cms/server';
import { getKangurAuthBootstrapScript } from '@/features/kangur/server';
import { getKangurStorefrontInitialState } from '@/features/kangur/server';
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
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
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
  const shouldResolveFrontPageSelection =
    shouldUseFrontPageAppSelection && !isExplicitKangurAlias && !requestHeadersTimedOut;
  const frontPageSettingPromise = shouldResolveFrontPageSelection
    ? layoutTiming.withTiming('frontPageSetting', getFrontPageSetting)
    : Promise.resolve(null);
  const themePromise = getCmsThemeSettings();

  const frontPageSetting = await frontPageSettingPromise;
  const publicOwner = shouldResolveFrontPageSelection
    ? getFrontPagePublicOwner(frontPageSetting)
    : 'cms';
  const shouldRenderStandaloneKangurShell =
    publicOwner === 'kangur' && !isExplicitKangurAlias && !isCanonicalPublicLogin;
  const shouldInjectKangurAuthBootstrap =
    !requestHeadersTimedOut && (publicOwner === 'kangur' || isCanonicalPublicLogin);
  const shouldLoadKangurStorefrontBootstrap =
    publicOwner === 'kangur' && shouldRenderStandaloneKangurShell && isRootPublicRoute;
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
      : Promise.resolve(null)
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
    flags: {
      explicitKangurAlias: isExplicitKangurAlias,
      canonicalPublicLogin: isCanonicalPublicLogin,
      rootPublicRoute: isRootPublicRoute,
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

  // When Kangur is the public owner, inject a tiny blocking script that pre-applies
  // the kangur-surface-active class to html/body before React hydrates. This lets
  // KangurAppLoader's MutationObserver fast-path fire immediately instead of waiting
  // up to 600ms for the client-side KangurSurfaceClassSync useEffect.
  const kangurSurfaceHintScript =
    publicOwner === 'kangur'
      ? 'document.documentElement.classList.add(\'kangur-surface-active\');document.body.classList.add(\'kangur-surface-active\');'
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
      {kangurSurfaceHintScript ? (
        <script dangerouslySetInnerHTML={{ __html: safeHtml(kangurSurfaceHintScript) }} />
      ) : null}
      {kangurAuthBootstrapScript ? (
        <script dangerouslySetInnerHTML={{ __html: safeHtml(kangurAuthBootstrapScript) }} />
      ) : null}
      <FrontendPublicOwnerProvider publicOwner={publicOwner}>
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
