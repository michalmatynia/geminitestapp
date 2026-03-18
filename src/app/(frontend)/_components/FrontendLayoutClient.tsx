import type { ReactNode } from 'react';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import FrontendPublicOwnerShell from './FrontendPublicOwnerShell';

type FrontendLayoutClientProps = {
  publicOwner: 'cms' | 'kangur';
  storefrontAppearanceMode: 'dark' | 'default';
  children: ReactNode;
};

export function FrontendLayoutClient({
  publicOwner,
  storefrontAppearanceMode,
  children,
}: FrontendLayoutClientProps): React.JSX.Element {
  return (
    <CmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
      <QueryErrorBoundary>
        <FrontendPublicOwnerShell publicOwner={publicOwner}>
          {children}
        </FrontendPublicOwnerShell>
      </QueryErrorBoundary>
    </CmsStorefrontAppearanceProvider>
  );
}
