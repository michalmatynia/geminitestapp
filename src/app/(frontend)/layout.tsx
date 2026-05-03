import { Suspense } from 'react';

import {
  createFrontendLoadTimingRecorder,
  shouldEnableFrontendLoadTiming,
} from '@/app/(frontend)/shell/frontend-load-timing';
import { CmsStorefrontAppearanceProvider } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { FrontendPublicOwnerProvider } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import {
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server';
import {
  buildRequestPathname,
  buildTimingPayload,
  FrontendLayoutFallback,
  FrontendLayoutMain,
  InlineSafeScript,
  InlineSafeStyle,
  KANGUR_SURFACE_BOOTSTRAP_ID,
  resolveRequestHeaders,
  serializeInlineTimingPayload,
} from '@/app/(frontend)/layout.shared';
import { resolveResolvedFrontendLayoutState } from '@/app/(frontend)/layout.state';
import {
  readServerRequestHeaders,
  readServerRequestPathname,
} from '@/shared/lib/request/server-request-context';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX, ReactNode } from 'react';

type ResolvedFrontendLayoutState = Awaited<
  ReturnType<typeof resolveResolvedFrontendLayoutState>
>;

const renderFrontendPublicOwnerContent = async ({
  children,
  layoutState,
}: {
  children: ReactNode;
  layoutState: ResolvedFrontendLayoutState;
}): Promise<JSX.Element> => {
  const content = (
    <CmsStorefrontAppearanceProvider
      initialMode={layoutState.themeSettings.darkMode === true ? 'dark' : 'default'}
    >
      {children as JSX.Element}
    </CmsStorefrontAppearanceProvider>
  );

  if (!layoutState.renderStandaloneKangurShell) {
    return content;
  }

  const { default: FrontendPublicOwnerShellClient } = await import(
    '@/features/kangur/ui/FrontendPublicOwnerShellClient'
  );

  return (
    <FrontendPublicOwnerShellClient
      publicOwner={layoutState.publicOwner}
      initialAppearance={layoutState.initialAppearance}
      renderStandaloneKangurShell={layoutState.renderStandaloneKangurShell}
    >
      {content}
    </FrontendPublicOwnerShellClient>
  );
};

function ResolvedFrontendLayoutContent({
  frontendPublicOwnerContent,
  inlinePayload,
  layoutState,
}: {
  frontendPublicOwnerContent: JSX.Element;
  inlinePayload:
    | ReturnType<typeof buildTimingPayload>
    | null;
  layoutState: ResolvedFrontendLayoutState;
}): JSX.Element {
  return (
    <FrontendLayoutMain routeFamily={layoutState.routeFamily}>
      {inlinePayload !== null && (
        <InlineSafeScript
          id='__FRONTEND_LAYOUT_TIMING__'
          code={serializeInlineTimingPayload(inlinePayload)}
        />
      )}
      {layoutState.shouldApplyKangurSurfaceBootstrap && (
        <InlineSafeStyle
          id={KANGUR_SURFACE_BOOTSTRAP_ID}
          css={getKangurSurfaceBootstrapStyle(layoutState.initialAppearance)}
        />
      )}
      {layoutState.shouldApplyKangurSurfaceBootstrap && (
        <InlineSafeScript code={KANGUR_SURFACE_HINT_SCRIPT} />
      )}
      {layoutState.kangurAuthBootstrapScript !== null && (
        <InlineSafeScript code={layoutState.kangurAuthBootstrapScript} />
      )}
      {layoutState.loadKangurStorefrontBootstrap ? <KangurServerShell /> : null}
      <FrontendPublicOwnerProvider
        publicOwner={layoutState.publicOwner}
        routeFamily={layoutState.routeFamily}
      >
        <QueryErrorBoundary>
          {frontendPublicOwnerContent}
        </QueryErrorBoundary>
      </FrontendPublicOwnerProvider>
    </FrontendLayoutMain>
  );
}

async function ResolvedFrontendLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const startedAt = performance.now();
  const requestContextHeaders = readServerRequestHeaders();
  const { headers: requestHeaders, timedOut: requestHeadersTimedOut } =
    requestContextHeaders === null
      ? await resolveRequestHeaders()
      : { headers: requestContextHeaders, timedOut: false };
  const readRequestHeadersMs = performance.now() - startedAt;
  const requestPathname = readServerRequestPathname() ?? buildRequestPathname(requestHeaders);
  const layoutTiming = createFrontendLoadTimingRecorder(
    shouldEnableFrontendLoadTiming(requestHeaders)
  );
  const layoutState = await resolveResolvedFrontendLayoutState({
    layoutTiming,
    requestHeaders,
    requestPathname,
  });
  const inlinePayload = buildTimingPayload({
    layoutTiming,
    requestPathname,
    publicOwner: layoutState.publicOwner,
    publicRouteFamily: layoutState.routeFamily,
    isRootPublicRoute: layoutState.isRootPublicRoute,
    requestHeadersTimedOut,
    frontPageSelection: layoutState.frontPageSelection,
    readRequestHeadersMs,
    explicitKangurAlias: layoutState.explicitKangurAlias,
    canonicalPublicLogin: layoutState.canonicalPublicLogin,
    expectsRootRedirectToKangur: layoutState.expectsRootRedirectToKangur,
    renderStandaloneKangurShell: layoutState.renderStandaloneKangurShell,
    injectKangurAuthBootstrap: layoutState.injectKangurAuthBootstrap,
    loadKangurStorefrontBootstrap: layoutState.loadKangurStorefrontBootstrap,
  });
  const frontendPublicOwnerContent = await renderFrontendPublicOwnerContent({
    children,
    layoutState,
  });

  return (
    <ResolvedFrontendLayoutContent
      frontendPublicOwnerContent={frontendPublicOwnerContent}
      inlinePayload={inlinePayload}
      layoutState={layoutState}
    />
  );
}

export default function FrontendLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const requestPathname =
    readServerRequestPathname() ?? buildRequestPathname(readServerRequestHeaders());

  return (
    <Suspense fallback={<FrontendLayoutFallback pathname={requestPathname} />}>
      <ResolvedFrontendLayout>{children}</ResolvedFrontendLayout>
    </Suspense>
  );
}
