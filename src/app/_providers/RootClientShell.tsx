import type { ReactNode } from 'react';

import { RootProvidersClient } from '@/features/observability/client/public';

export function RootClientShell({ children }: { children: ReactNode }): React.JSX.Element {
  return <RootProvidersClient>{children}</RootProvidersClient>;
}
