import type { JSX } from 'react';

import type { FrontendPublicOwnerShellProps } from '@/features/kangur/ui/FrontendPublicOwnerShellClient';
import FrontendPublicOwnerShellClient from '@/features/kangur/ui/FrontendPublicOwnerShellClient';

export type { FrontendPublicOwnerShellProps };

export default function FrontendPublicOwnerShell({
  publicOwner,
  kangurInitialMode,
  children,
}: FrontendPublicOwnerShellProps): JSX.Element {
  return (
    <FrontendPublicOwnerShellClient
      publicOwner={publicOwner}
      kangurInitialMode={kangurInitialMode}
    >
      {children}
    </FrontendPublicOwnerShellClient>
  );
}
