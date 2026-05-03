'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';

import { useKangurDeferredHomeTutorContextReady } from '@/features/kangur/ui/hooks/useKangurDeferredHomeTutorContextReady';

import type { JSX } from 'react';

const KangurAiTutorWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget').then(
      (m) => ({ default: m.KangurAiTutorWidget })
    ),
  { ssr: false }
);

// Delay the heavy AI Tutor widget only when the app initially boots on the
// standalone home route. Once mounted, it stays available for the rest of the
// session so later navigations do not pay the delay again.
export const KangurDeferredAiTutorWidgetMount = memo(
  (): JSX.Element | null => {
  const isTutorContextReady = useKangurDeferredHomeTutorContextReady();

  if (!isTutorContextReady) {
    return null;
  }

  return <KangurAiTutorWidget />;
  }
);
