import type { ReactNode } from 'react';

import { RootProvidersClient } from '@/shared/providers/RootProvidersClient';

export function RootClientShell({ children }: { children: ReactNode }): React.JSX.Element {
  return <RootProvidersClient>{children}</RootProvidersClient>;
}
