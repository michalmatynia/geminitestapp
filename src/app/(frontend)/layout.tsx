import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { getCmsThemeSettings } from '@/features/cms/server';
import { getKangurStorefrontDefaultMode } from '@/features/kangur/server/storefront-appearance';
import FrontendPublicOwnerShellClient from '@/features/kangur/ui/FrontendPublicOwnerShellClient';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const shouldUseFrontPageAppSelection = shouldApplyFrontPageAppSelection();
  const [frontPageSetting, themeSettings] = await Promise.all([
    shouldUseFrontPageAppSelection ? getFrontPageSetting() : Promise.resolve(null),
    getCmsThemeSettings(),
  ]);
  const publicOwner = shouldUseFrontPageAppSelection
    ? getFrontPagePublicOwner(frontPageSetting)
    : 'cms';
  const storefrontAppearanceMode = themeSettings.darkMode ? 'dark' : 'default';
  const kangurInitialMode =
    publicOwner === 'kangur' ? await getKangurStorefrontDefaultMode() : undefined;

  return (
    <main
      id='app-content'
      tabIndex={-1}
      className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
    >
      <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShellClient
            publicOwner={publicOwner}
            kangurInitialMode={kangurInitialMode}
          >
            {children}
          </FrontendPublicOwnerShellClient>
        </QueryErrorBoundary>
      </CmsStorefrontAppearanceProvider>
    </main>
  );
}
