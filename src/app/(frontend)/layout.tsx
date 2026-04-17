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

const isRootPublicRequest = (pathname: string | null): boolean => {
  if (pathname === null || pathname === '') return true;
  return pathname === '/';
};

async function resolveRequestHeaders(): Promise<{ headers: Headers | null; timedOut: boolean }> {
  const requestContextHeaders = readServerRequestHeaders();
  if (requestContextHeaders !== null) {
    return { headers: requestContextHeaders, timedOut: false };
  }
  return readOptionalRequestHeadersResult({
    timeoutMs: FRONTEND_LAYOUT_REQUEST_HEADERS_TIMEOUT_MS,
  });
}

function buildRequestPathname(headers: Headers | null): string | null {
  const contextPathname = readServerRequestPathname();
  if (contextPathname !== null) return contextPathname;

  const keys = ['x-app-request-pathname', 'x-app-request-url', 'next-url', 'x-matched-path'];
  for (const key of keys) {
    const val = resolveFrontendRequestPathname(headers?.get(key));
    if (val !== null) return val;
  }
  return null;
}

type TimingPayloadOptions = {
  layoutTiming: ReturnType<typeof createFrontendLoadTimingRecorder>;
  requestPathname: string | null;
  publicOwner: FrontendPublicOwner;
  publicRouteFamily: FrontendPublicRouteFamily;
  isRootPublicRoute: boolean;
  requestHeadersTimedOut: boolean;
  frontPageSelection: Awaited<ReturnType<typeof resolveFrontPageSelection>> | null;
  readRequestHeadersMs: number;
};

function buildTimingPayload(options: TimingPayloadOptions): FrontendLoadTimingPayload | null {
  const { layoutTiming, requestPathname, publicOwner, publicRouteFamily, isRootPublicRoute, requestHeadersTimedOut, frontPageSelection, readRequestHeadersMs } = options;
  const payload = layoutTiming.buildPayload({
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
  if (payload === null) return null;
  return {
    ...payload,
    timingsMs: {
      readRequestHeaders: Math.round(readRequestHeadersMs * 10) / 10,
      ...payload.timingsMs,
    },
  };
}

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const start = performance.now();
  const { headers, timedOut } = await resolveRequestHeaders();
  const headersMs = performance.now() - start;
  const layoutTiming = createFrontendLoadTimingRecorder(shouldEnableFrontendLoadTiming(headers));
  const pathname = buildRequestPathname(headers);
  const isRoot = isRootPublicRequest(pathname);
  const selection = shouldApplyFrontPageAppSelection() ? await layoutTiming.withTiming('frontPageSelection', resolveFrontPageSelection) : null;
  const publicOwner: FrontendPublicOwner = 'cms';
  const routeFamily = resolveFrontendPublicRouteFamily({ pathname, publicOwner });
  const themeSettings = await layoutTiming.withTiming('cmsThemeSettings', getCmsThemeSettings);
  const inlinePayload = buildTimingPayload({ layoutTiming, requestPathname: pathname, publicOwner, publicRouteFamily: routeFamily, isRootPublicRoute: isRoot, requestHeadersTimedOut: timedOut, frontPageSelection: selection, readRequestHeadersMs: headersMs });

  return (
    <main
      id='main-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      data-frontend-public-route-family={routeFamily}
    >
      {inlinePayload !== null && (
        <script
          id='__FRONTEND_LAYOUT_TIMING__'
          type='application/json'
          dangerouslySetInnerHTML={{ __html: safeHtml(serializeInlineTimingPayload(inlinePayload)) }}
        />
      )}
      <FrontendPublicOwnerProvider publicOwner={publicOwner} routeFamily={routeFamily}>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShellClient publicOwner={publicOwner}>
            <CmsStorefrontAppearanceProvider initialMode={themeSettings.darkMode === true ? 'dark' : 'default'}>
              {children}
            </CmsStorefrontAppearanceProvider>
          </FrontendPublicOwnerShellClient>
        </QueryErrorBoundary>
      </FrontendPublicOwnerProvider>
    </main>
  );
}
