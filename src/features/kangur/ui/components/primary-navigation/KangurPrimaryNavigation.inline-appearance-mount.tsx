'use client';

import React from 'react';

import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import { GAME_HOME_UTILITY_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

import {
  KangurPrimaryNavigationAppearanceControls,
  useKangurPrimaryNavigationHasAppearanceControls,
} from './KangurPrimaryNavigation.appearance-controls';

export function KangurPrimaryNavigationInlineAppearanceMount(): React.ReactNode {
  const hasAppearanceControls = useKangurPrimaryNavigationHasAppearanceControls();
  const kangurAppearance = useKangurStorefrontAppearance();
  const isStandaloneHomeUtilityReady = useKangurDeferredStandaloneHomeReady({
    minimumDelayMs: GAME_HOME_UTILITY_IDLE_DELAY_MS,
  });

  if (!hasAppearanceControls || !isStandaloneHomeUtilityReady) {
    return null;
  }

  return (
    <div className='flex shrink-0 items-center'>
      <KangurPrimaryNavigationAppearanceControls
        inline
        tone={kangurAppearance.tone}
      />
    </div>
  );
}
