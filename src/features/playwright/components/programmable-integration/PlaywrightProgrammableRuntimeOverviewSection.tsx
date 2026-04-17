'use client';

import Link from 'next/link';
import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { PlaywrightManagedRuntimeActionsSection } from '@/features/playwright/components/PlaywrightManagedRuntimeActionsSection';
import { Card, Button } from '@/shared/ui/primitives.public';

type PlaywrightProgrammableRuntimeOverviewSectionProps = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  'managedActionSummaries' | 'playwrightActionsQuery'
>;

export function PlaywrightProgrammableRuntimeOverviewSection({
  managedActionSummaries,
  playwrightActionsQuery,
}: PlaywrightProgrammableRuntimeOverviewSectionProps): React.JSX.Element {
  return (
    <>
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='space-y-2'>
            <h2 className='text-base font-semibold text-white'>Runtime Ownership</h2>
            <p className='text-sm text-gray-400'>
              The Step Sequencer owns marketplace-native runtime actions like Tradera and Vinted
              browser flows, including headless or headed mode and
              <code className='mx-1'>browser_preparation</code> step settings.
            </p>
            <p className='text-sm text-gray-400'>
              This programmable page owns connection-scoped scripts, import routing, field mapping,
              and the selected listing or import session action. The Step Sequencer now owns
              browser mode and browser_preparation for programmable runs too.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/playwright/step-sequencer'>Open Step Sequencer</Link>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/settings/playwright'>Manage Personas</Link>
            </Button>
          </div>
        </div>
      </Card>

      <PlaywrightManagedRuntimeActionsSection
        description='Programmable listing and import runs now resolve headless or headed mode, browser preference, and browser_preparation step overrides from these Step Sequencer runtime actions.'
        isLoading={playwrightActionsQuery.isPending}
        summaries={managedActionSummaries}
      />
    </>
  );
}
