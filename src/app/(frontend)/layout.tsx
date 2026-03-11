import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import FrontendPublicOwnerShell from '@/app/(frontend)/FrontendPublicOwnerShell';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const publicOwner = shouldApplyFrontPageAppSelection()
    ? getFrontPagePublicOwner(await getFrontPageSetting())
    : 'cms';

  return (
    <main id='app-content' tabIndex={-1} className='min-h-screen bg-background focus:outline-none'>
      <CmsStorefrontAppearanceProvider>
        <QueryErrorBoundary>
          <FrontendPublicOwnerShell publicOwner={publicOwner}>{children}</FrontendPublicOwnerShell>
        </QueryErrorBoundary>
      </CmsStorefrontAppearanceProvider>
    </main>
  );
}
