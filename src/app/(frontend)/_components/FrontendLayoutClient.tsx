import type { ReactNode } from 'react';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import FrontendPublicOwnerShell from './FrontendPublicOwnerShell';

type FrontendLayoutClientProps = {
  publicOwner: 'cms' | 'kangur';
  storefrontAppearanceMode: 'dark' | 'default';
  kangurInitialMode?: KangurStorefrontAppearanceMode;
  children: ReactNode;
};

export function FrontendLayoutClient({
  publicOwner,
  storefrontAppearanceMode,
  kangurInitialMode,
  children,
}: FrontendLayoutClientProps): React.JSX.Element {
  return (
    <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
      <QueryErrorBoundary>
        <FrontendPublicOwnerShell publicOwner={publicOwner} kangurInitialMode={kangurInitialMode}>
          {children}
        </FrontendPublicOwnerShell>
      </QueryErrorBoundary>
    </CmsStorefrontAppearanceProvider>
  );
}
