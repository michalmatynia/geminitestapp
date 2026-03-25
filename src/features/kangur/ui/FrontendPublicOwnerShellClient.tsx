'use client';

import '@/app/(frontend)/kangur/kangur.css';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { FrontendPublicOwnerKangurShell } from '@/features/kangur/ui/FrontendPublicOwnerKangurShell';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

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
  const browserPathname =
    typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;
  const resolvedPathname = pathname?.trim() || browserPathname || '/';
  const normalizedPathname = stripSiteLocalePrefix(resolvedPathname);
  const isHomeRoute = normalizedPathname === '/';
  const isKangurAliasRoute =
    normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');

  useEffect(() => {
    if (process.env['NODE_ENV'] === 'test') {
      return;
    }

    if (publicOwner === 'kangur') {
      void import('@/features/kangur/ui/KangurFeatureApp').catch(() => {});
      void import('@/features/kangur/services/kangur-auth-prefetch')
        .then((m) => m.prefetchKangurAuth())
        .catch(() => {});
      void import('@/features/kangur/ui/pages/Game').catch(() => {});
      if (isHomeRoute || normalizedPathname === '/lessons') {
        void import('@/features/kangur/ui/pages/Lessons').catch(() => {});
      }
    }
  }, [isHomeRoute, normalizedPathname, publicOwner]);

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
