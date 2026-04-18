import {
  resolveFrontPageSelection,
  shouldApplyFrontPageAppSelection,
  type FrontPageSelectionResolution,
} from '@/app/(frontend)/home/home-helpers';
import { getCmsThemeSettings } from '@/features/cms/server';
import {
  getKangurAuthBootstrapScript,
  getKangurStorefrontInitialState,
} from '@/features/kangur/server';
import {
  resolveFrontendPublicRouteFamily,
  type FrontendPublicOwner,
  type FrontendPublicRouteFamily,
} from '@/shared/lib/frontend-public-route-family';

import {
  isCanonicalPublicLoginRoute,
  isExplicitKangurAliasRoute,
  isRootPublicRequest,
} from '@/app/(frontend)/layout.shared';

type LayoutTimingRecorder = {
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
};

type KangurInitialAppearance =
  | {
      mode: Awaited<ReturnType<typeof getKangurStorefrontInitialState>>['initialMode'];
      themeSettings: Awaited<
        ReturnType<typeof getKangurStorefrontInitialState>
      >['initialThemeSettings'];
    }
  | undefined;

type KangurBootstrapState = {
  initialAppearance: KangurInitialAppearance;
  injectKangurAuthBootstrap: boolean;
  kangurAuthBootstrapScript: string | null;
  loadKangurStorefrontBootstrap: boolean;
  renderStandaloneKangurShell: boolean;
  shouldApplyKangurSurfaceBootstrap: boolean;
};

const resolvePublicOwner = ({
  explicitKangurAlias,
  frontPageSelection,
}: {
  explicitKangurAlias: boolean;
  frontPageSelection: FrontPageSelectionResolution | null;
}): FrontendPublicOwner =>
  explicitKangurAlias ? 'cms' : (frontPageSelection?.publicOwner ?? 'cms');

const resolveFrontPageSelectionForLayout = async ({
  explicitKangurAlias,
  layoutTiming,
}: {
  explicitKangurAlias: boolean;
  layoutTiming: LayoutTimingRecorder;
}): Promise<FrontPageSelectionResolution | null> => {
  if (explicitKangurAlias || !shouldApplyFrontPageAppSelection()) {
    return null;
  }

  return layoutTiming.withTiming('frontPageSelection', resolveFrontPageSelection);
};

const shouldRenderStandaloneKangurShell = ({
  canonicalPublicLogin,
  expectsRootRedirectToKangur,
  explicitKangurAlias,
  publicOwner,
}: {
  canonicalPublicLogin: boolean;
  expectsRootRedirectToKangur: boolean;
  explicitKangurAlias: boolean;
  publicOwner: FrontendPublicOwner;
}): boolean =>
  publicOwner === 'kangur' &&
  !explicitKangurAlias &&
  !canonicalPublicLogin &&
  !expectsRootRedirectToKangur;

const resolveKangurInitialAppearance = (
  kangurInitialState: Awaited<ReturnType<typeof getKangurStorefrontInitialState>> | null
): KangurInitialAppearance =>
  kangurInitialState === null
    ? undefined
    : {
        mode: kangurInitialState.initialMode,
        themeSettings: kangurInitialState.initialThemeSettings,
      };

const loadKangurStorefrontState = async ({
  layoutTiming,
  loadKangurStorefrontBootstrap,
}: {
  layoutTiming: LayoutTimingRecorder;
  loadKangurStorefrontBootstrap: boolean;
}): Promise<
  Awaited<ReturnType<typeof getKangurStorefrontInitialState>> | null
> =>
  loadKangurStorefrontBootstrap
    ? layoutTiming.withTiming(
        'kangurStorefrontInitialState',
        getKangurStorefrontInitialState
      )
    : null;

const resolveKangurAuthBootstrapScript = async ({
  injectKangurAuthBootstrap,
  layoutTiming,
  requestHeaders,
}: {
  injectKangurAuthBootstrap: boolean;
  layoutTiming: LayoutTimingRecorder;
  requestHeaders: Headers | null;
}): Promise<string | null> => {
  if (!injectKangurAuthBootstrap || requestHeaders === null) {
    return null;
  }

  return layoutTiming.withTiming('kangurAuthBootstrapScript', () =>
    getKangurAuthBootstrapScript(requestHeaders)
  );
};

const resolveKangurBootstrapState = async ({
  canonicalPublicLogin,
  explicitKangurAlias,
  isRootPublicRoute,
  layoutTiming,
  publicOwner,
  requestHeaders,
}: {
  canonicalPublicLogin: boolean;
  explicitKangurAlias: boolean;
  isRootPublicRoute: boolean;
  layoutTiming: LayoutTimingRecorder;
  publicOwner: FrontendPublicOwner;
  requestHeaders: Headers | null;
}): Promise<KangurBootstrapState> => {
  const expectsRootRedirectToKangur =
    publicOwner === 'kangur' && isRootPublicRoute;
  const renderStandaloneKangurShell = shouldRenderStandaloneKangurShell({
    canonicalPublicLogin,
    expectsRootRedirectToKangur,
    explicitKangurAlias,
    publicOwner,
  });
  const loadKangurStorefrontBootstrap = renderStandaloneKangurShell;
  const kangurInitialState = await loadKangurStorefrontState({
    layoutTiming,
    loadKangurStorefrontBootstrap,
  });
  const initialAppearance = resolveKangurInitialAppearance(kangurInitialState);
  const injectKangurAuthBootstrap =
    loadKangurStorefrontBootstrap && requestHeaders !== null;
  const kangurAuthBootstrapScript = await resolveKangurAuthBootstrapScript({
    injectKangurAuthBootstrap,
    layoutTiming,
    requestHeaders,
  });

  return {
    initialAppearance,
    injectKangurAuthBootstrap,
    kangurAuthBootstrapScript,
    loadKangurStorefrontBootstrap,
    renderStandaloneKangurShell,
    shouldApplyKangurSurfaceBootstrap:
      explicitKangurAlias || loadKangurStorefrontBootstrap,
  };
};

export type ResolvedFrontendLayoutState = {
  canonicalPublicLogin: boolean;
  explicitKangurAlias: boolean;
  expectsRootRedirectToKangur: boolean;
  frontPageSelection: FrontPageSelectionResolution | null;
  initialAppearance: KangurInitialAppearance;
  injectKangurAuthBootstrap: boolean;
  isRootPublicRoute: boolean;
  kangurAuthBootstrapScript: string | null;
  loadKangurStorefrontBootstrap: boolean;
  publicOwner: FrontendPublicOwner;
  renderStandaloneKangurShell: boolean;
  routeFamily: FrontendPublicRouteFamily;
  shouldApplyKangurSurfaceBootstrap: boolean;
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>;
};

export async function resolveResolvedFrontendLayoutState({
  layoutTiming,
  requestHeaders,
  requestPathname,
}: {
  layoutTiming: LayoutTimingRecorder;
  requestHeaders: Headers | null;
  requestPathname: string | null;
}): Promise<ResolvedFrontendLayoutState> {
  const isRootPublicRoute = isRootPublicRequest(requestPathname);
  const explicitKangurAlias = isExplicitKangurAliasRoute(requestPathname);
  const canonicalPublicLogin = isCanonicalPublicLoginRoute(requestPathname);
  const themeSettingsPromise = layoutTiming.withTiming(
    'cmsThemeSettings',
    getCmsThemeSettings
  );
  const frontPageSelection = await resolveFrontPageSelectionForLayout({
    explicitKangurAlias,
    layoutTiming,
  });
  const publicOwner = resolvePublicOwner({
    explicitKangurAlias,
    frontPageSelection,
  });
  const routeFamily = resolveFrontendPublicRouteFamily({
    pathname: requestPathname,
    publicOwner,
  });
  const expectsRootRedirectToKangur =
    publicOwner === 'kangur' && isRootPublicRoute;
  const kangurBootstrapState = await resolveKangurBootstrapState({
    canonicalPublicLogin,
    explicitKangurAlias,
    isRootPublicRoute,
    layoutTiming,
    publicOwner,
    requestHeaders,
  });

  return {
    canonicalPublicLogin,
    explicitKangurAlias,
    expectsRootRedirectToKangur,
    frontPageSelection,
    isRootPublicRoute,
    publicOwner,
    routeFamily,
    themeSettings: await themeSettingsPromise,
    ...kangurBootstrapState,
  };
}
