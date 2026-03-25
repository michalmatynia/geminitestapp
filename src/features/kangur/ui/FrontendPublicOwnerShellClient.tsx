'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const FrontendPublicOwnerKangurShell = dynamic(
  () =>
    import('@/features/kangur/ui/FrontendPublicOwnerKangurShell').then((m) => ({
      default: m.FrontendPublicOwnerKangurShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className='pointer-events-none fixed inset-0 z-[90] flex items-center justify-center'
        style={{
          background:
            'radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%)',
        }}
      />
    ),
  }
);

import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';

import type { JSX, ReactNode } from 'react';

export type FrontendPublicOwnerShellProps = {
  publicOwner: 'cms' | 'kangur';
  children: ReactNode;
  kangurInitialMode?: KangurStorefrontAppearanceMode;
  kangurInitialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
};

export default function FrontendPublicOwnerShellClient({
  publicOwner,
  children,
  kangurInitialMode,
  kangurInitialThemeSettings,
}: FrontendPublicOwnerShellProps): JSX.Element {
  const pathname = usePathname();
  const normalizedPathname = stripSiteLocalePrefix(pathname?.trim() || '/');
  const isHomeRoute = normalizedPathname === '/';
  const isKangurAliasRoute =
    normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');

  // Preload the KangurFeatureApp chunk and start the auth check in parallel
  // with the shell chunk to eliminate waterfall delays:
  // - App chunk preload: shell → app becomes shell + app
  // - Auth prefetch: auth.me() starts ~100-200ms earlier than waiting for
  //   KangurAuthProvider to mount deep in the tree. resolveSessionUser()
  //   has built-in deduplication so the provider reuses the result.
  useEffect(() => {
    if (publicOwner === 'kangur') {
      void import('@/features/kangur/ui/KangurFeatureApp');
      void import('@/features/kangur/services/kangur-auth-prefetch').then((m) =>
        m.prefetchKangurAuth()
      );
      // Preload the main landing page chunk (Game) so it's ready by the time
      // KangurFeatureApp resolves the route and renders the page component.
      void import('@/features/kangur/ui/pages/Game');
    }
  }, [publicOwner]);

  if (publicOwner === 'kangur' && !isKangurAliasRoute) {
    return (
      <FrontendPublicOwnerKangurShell
        embedded={isHomeRoute}
        initialMode={kangurInitialMode}
        initialThemeSettings={kangurInitialThemeSettings}
      />
    );
  }

  return <>{children}</>;
}
