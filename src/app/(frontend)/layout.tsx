import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import FrontendPublicOwnerShell from '@/app/(frontend)/FrontendPublicOwnerShell';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { getCmsThemeSettings } from '@/features/cms/server';
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

  return (
    <main id='app-content' tabIndex={-1} className='min-h-screen bg-background focus:outline-none'>
      <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShell publicOwner={publicOwner}>{children}</FrontendPublicOwnerShell>
        </QueryErrorBoundary>
      </CmsStorefrontAppearanceProvider>
    </main>
  );
}
