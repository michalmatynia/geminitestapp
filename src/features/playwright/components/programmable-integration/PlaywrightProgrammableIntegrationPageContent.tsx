'use client';

import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { PlaywrightProgrammableConnectionControlsSection } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionControlsSection';
import { PlaywrightProgrammableConnectionOwnershipSection } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionOwnershipSection';
import { PlaywrightProgrammableEditorsSection } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableEditorsSection';
import { PlaywrightProgrammableRuntimeOverviewSection } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableRuntimeOverviewSection';

export function PlaywrightProgrammableIntegrationPageContent(
  model: PlaywrightProgrammableIntegrationPageModel
): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <PlaywrightProgrammableRuntimeOverviewSection {...model} />
      <PlaywrightProgrammableConnectionControlsSection {...model} />
      <PlaywrightProgrammableConnectionOwnershipSection {...model} />
      <PlaywrightProgrammableEditorsSection {...model} />
    </div>
  );
}
