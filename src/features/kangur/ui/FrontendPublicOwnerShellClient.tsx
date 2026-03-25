'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const FrontendPublicOwnerKangurShell = dynamic(
  () =>
    import('@/features/kangur/ui/FrontendPublicOwnerKangurShell').then((m) => ({
      default: m.FrontendPublicOwnerKangurShell,
    })),
  { ssr: false }
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
