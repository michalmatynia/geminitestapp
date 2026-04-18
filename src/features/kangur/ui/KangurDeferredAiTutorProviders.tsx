'use client';

import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { KangurAiTutorContentProvider } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorDeferredProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';

import type { JSX, ReactNode } from 'react';

// Keep the lightweight tutor providers mounted from the first client render so
// consumers such as the floating avatar never mount outside their context. The
// heavy tutor runtime still activates lazily through the deferred provider and
// dynamically-loaded widget bridge.
export function KangurDeferredAiTutorProviders({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <KangurAiTutorContentProvider>
      <KangurAiTutorDeferredProvider>
        <KangurTutorAnchorProvider>{children}</KangurTutorAnchorProvider>
      </KangurAiTutorDeferredProvider>
    </KangurAiTutorContentProvider>
  );
}
