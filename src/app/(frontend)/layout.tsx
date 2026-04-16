import {
  resolveFrontPageSelection,
  shouldApplyFrontPageAppSelection,
} from '@/app/(frontend)/home/home-helpers';
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
import { safeHtml } from '@/shared/lib/security/safe-html';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

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

const isRootPublicRequest = (pathname: string | null): boolean => {
  if (!pathname) {
    return true;
  }

  return pathname === '/';
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
  const isRootPublicRoute = isRootPublicRequest(requestPathname);
  const shouldUseFrontPageAppSelection = shouldApplyFrontPageAppSelection();
  const frontPageSelectionPromise = shouldUseFrontPageAppSelection
    ? layoutTiming.withTiming('frontPageSelection', resolveFrontPageSelection)
    : Promise.resolve(null);
  const themePromise = getCmsThemeSettings();

  const frontPageSelection = await frontPageSelectionPromise;
  const publicOwner: FrontendPublicOwner = 'cms';
  const publicRouteFamily: FrontendPublicRouteFamily = resolveFrontendPublicRouteFamily({
    pathname: requestPathname,
    publicOwner,
  });
  const themeSettings = await layoutTiming.withTiming('cmsThemeSettings', () => themePromise);
  const storefrontAppearanceMode = themeSettings.darkMode ? 'dark' : 'default';
  const frontendLoadTimingPayload = layoutTiming.buildPayload({
    pathname: requestPathname,
    publicOwner,
    routeFamily: publicRouteFamily,
      flags: {
        explicitKangurAlias: false,
        canonicalPublicLogin: false,
        rootPublicRoute: isRootPublicRoute,
        requestHeadersTimedOut,
        frontPageSelectionSource: frontPageSelection?.source ?? null,
        frontPageSelectionFallbackReason: frontPageSelection?.fallbackReason ?? null,
        expectsRootRedirectToKangur: false,
        renderStandaloneKangurShell: false,
        injectKangurAuthBootstrap: false,
        loadKangurStorefrontBootstrap: false,
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

  const frontendShellChildren = (
    <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
      <>{children}</>
    </CmsStorefrontAppearanceProvider>
  );

  return (
    <main
      id='main-content'
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
      <FrontendPublicOwnerProvider publicOwner={publicOwner} routeFamily={publicRouteFamily}>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShellClient
            publicOwner={publicOwner}
          >
            {frontendShellChildren}
          </FrontendPublicOwnerShellClient>
        </QueryErrorBoundary>
      </FrontendPublicOwnerProvider>
    </main>
  );
}
