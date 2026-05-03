import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

import type { ReactNode } from 'react';

export default function KangurLoadingFallback(): ReactNode {
  return <KangurServerShell />;
}
