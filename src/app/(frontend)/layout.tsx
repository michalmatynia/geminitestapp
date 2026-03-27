import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { getCmsThemeSettings } from '@/features/cms/server';
import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';
import { FrontendPublicOwnerProvider } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

const DEFAULT_CMS_THEME_SETTINGS = {
  darkMode: false,
} as const;

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
  const requestHeaders = await readOptionalRequestHeaders();
  const requestPathname =
    resolveFrontendRequestPathname(requestHeaders?.get('next-url')) ??
    resolveFrontendRequestPathname(requestHeaders?.get('x-matched-path'));
  const isExplicitKangurAlias = isExplicitKangurAliasRequest(requestPathname);
  const isCanonicalPublicLogin = isCanonicalPublicLoginRequest(requestPathname);
  const isRootPublicRoute = isRootPublicRequest(requestPathname);
  const shouldUseFrontPageAppSelection = shouldApplyFrontPageAppSelection();
  const shouldResolveFrontPageSelection =
    shouldUseFrontPageAppSelection && !isExplicitKangurAlias;
  // Start all fetches speculatively in parallel — each has its own cache + inflight
  // dedup, so unused results just warm the cache for the next request.
  const frontPageSettingPromise = shouldResolveFrontPageSelection
    ? getFrontPageSetting()
    : Promise.resolve(null);
  const themePromise = getCmsThemeSettings();

  const frontPageSetting = await frontPageSettingPromise;
  const publicOwner = shouldResolveFrontPageSelection
    ? getFrontPagePublicOwner(frontPageSetting)
    : 'cms';
  const shouldRenderStandaloneKangurShell =
    publicOwner === 'kangur' && !isExplicitKangurAlias && !isCanonicalPublicLogin;
  const shouldInjectKangurAuthBootstrap =
    publicOwner === 'kangur' || isExplicitKangurAlias || isCanonicalPublicLogin;
  const shouldLoadKangurStorefrontBootstrap =
    publicOwner === 'kangur' && shouldRenderStandaloneKangurShell && isRootPublicRoute;
  const kangurStatePromise = shouldLoadKangurStorefrontBootstrap
    ? getKangurStorefrontInitialState()
    : Promise.resolve(null);
  const kangurAuthBootstrapScriptPromise = shouldInjectKangurAuthBootstrap
    ? requestHeaders
      ? getKangurAuthBootstrapScript(requestHeaders)
      : Promise.resolve(null)
    : Promise.resolve(null);
  const [themeSettings, kangurInitialState] = await Promise.all([
    publicOwner === 'cms' && !isExplicitKangurAlias
      ? themePromise
      : Promise.resolve(DEFAULT_CMS_THEME_SETTINGS),
    kangurStatePromise,
  ]);
  const kangurAuthBootstrapScript = await kangurAuthBootstrapScriptPromise;
  const storefrontAppearanceMode = themeSettings.darkMode ? 'dark' : 'default';
  const FrontendPublicOwnerKangurShell = shouldRenderStandaloneKangurShell
    ? (await import('@/features/kangur/ui/FrontendPublicOwnerKangurShell'))
        .FrontendPublicOwnerKangurShell
    : null;
  const KangurAuthWarmupClient =
    publicOwner === 'kangur' && !shouldRenderStandaloneKangurShell
      ? (await import('@/features/kangur/ui/KangurAuthWarmupClient')).KangurAuthWarmupClient
      : null;

  // When Kangur is the public owner, inject a tiny blocking script that pre-applies
  // the kangur-surface-active class to html/body before React hydrates. This lets
  // KangurAppLoader's MutationObserver fast-path fire immediately instead of waiting
  // up to 600ms for the client-side KangurSurfaceClassSync useEffect.
  const kangurSurfaceHintScript =
    publicOwner === 'kangur'
      ? 'document.documentElement.classList.add(\'kangur-surface-active\');document.body.classList.add(\'kangur-surface-active\');'
      : null;

  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
    >
      {kangurSurfaceHintScript ? (
        <script dangerouslySetInnerHTML={{ __html: kangurSurfaceHintScript }} />
      ) : null}
      {kangurAuthBootstrapScript ? (
        <script dangerouslySetInnerHTML={{ __html: kangurAuthBootstrapScript }} />
      ) : null}
      <FrontendPublicOwnerProvider publicOwner={publicOwner}>
        <QueryErrorBoundary>
          {shouldRenderStandaloneKangurShell && FrontendPublicOwnerKangurShell ? (
            <FrontendPublicOwnerKangurShell
              embeddedOverride={isRootPublicRoute}
              initialAppearance={{
                mode: kangurInitialState?.initialMode,
                themeSettings: kangurInitialState?.initialThemeSettings,
              }}
            />
          ) : (
            <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
              <>
                {KangurAuthWarmupClient ? <KangurAuthWarmupClient /> : null}
                {children}
              </>
            </CmsStorefrontAppearanceProvider>
          )}
        </QueryErrorBoundary>
      </FrontendPublicOwnerProvider>
    </main>
  );
}
