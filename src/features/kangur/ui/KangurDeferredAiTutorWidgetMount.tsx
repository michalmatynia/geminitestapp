'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';

import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

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
export function KangurDeferredAiTutorWidgetMount(): JSX.Element | null {
  const { pageKey, embedded } = useKangurRouting();
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const shouldDelayInitialMountRef = useRef<boolean | null>(null);

  shouldDelayInitialMountRef.current ??= !embedded && resolvedPageKey === 'Game';
  const shouldDelayInitialMount = shouldDelayInitialMountRef.current;
  const isIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayInitialMount ? GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS : 0,
  });

  if (shouldDelayInitialMount && !isIdleReady) {
    return null;
  }

  return <KangurAiTutorWidget />;
}
