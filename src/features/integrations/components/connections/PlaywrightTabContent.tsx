'use client';

import Link from 'next/link';
import React from 'react';

import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { PlaywrightManagedRuntimeActionsSection } from '@/features/playwright/components/PlaywrightManagedRuntimeActionsSection';

import { usePlaywrightTabContentModel } from './usePlaywrightTabContentModel';

const resolveSequencerDescription = (integrationSlug: string | null | undefined): string =>
  (() => {
    if (isTraderaBrowserIntegrationSlug(integrationSlug)) {
      return 'These Tradera runtime actions now own headless or headed mode, browser preference, and browser_preparation step settings.';
    }

    if (isPlaywrightProgrammableSlug(integrationSlug)) {
      return 'These programmable runtime actions now own headless or headed mode, browser preference, and browser_preparation step settings for programmable listing and import runs.';
    }

    return 'These Vinted runtime actions now own headless or headed mode, browser preference, and browser_preparation step settings.';
  })();

const resolveOwnershipCopy = (
  usesSequencerManagedActions: boolean
): {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string | null;
  secondaryLabel: string | null;
} => {
  if (usesSequencerManagedActions) {
    return {
      title: 'Playwright settings moved to Step Sequencer',
      description:
        'Integration connections no longer own Playwright browser settings. Configure browser mode, persona, environment defaults, and runtime-step overrides in the selected Step Sequencer actions.',
      primaryHref: '/admin/playwright/step-sequencer',
      primaryLabel: 'Open Step Sequencer',
      secondaryHref: '/admin/settings/playwright',
      secondaryLabel: 'Manage personas',
    };
  }

  return {
    title: 'Browser automation settings moved out of Integrations',
    description:
      'Connection-level Playwright settings are no longer edited here. Manage scanner automation from the dedicated scanner settings page.',
    primaryHref: '/admin/settings/scanner',
    primaryLabel: 'Open Scanner Settings',
    secondaryHref: null,
    secondaryLabel: null,
  };
};

export function PlaywrightTabContent(): React.JSX.Element {
  const model = usePlaywrightTabContentModel();
  const ownershipCopy = resolveOwnershipCopy(model.usesSequencerManagedActions);

  return (
    <>
      {model.usesSequencerManagedActions ? (
        <PlaywrightManagedRuntimeActionsSection
          description={resolveSequencerDescription(model.activeIntegrationSlug)}
          isLoading={model.managedActionsLoading}
          summaries={model.managedActionSummaries}
        />
      ) : null}

      <FormSection
        title={ownershipCopy.title}
        description={ownershipCopy.description}
        className='p-4'
        actions={
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link href={ownershipCopy.primaryHref}>{ownershipCopy.primaryLabel}</Link>
            </Button>
            {ownershipCopy.secondaryHref !== null && ownershipCopy.secondaryLabel !== null ? (
              <Button variant='outline' size='sm' asChild>
                <Link href={ownershipCopy.secondaryHref}>{ownershipCopy.secondaryLabel}</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {model.showListingScriptReset ? (
        <FormSection
          title='Listing script'
          description='Reset the custom listing script so this connection uses the latest managed default.'
          className='p-4'
        >
          <div className='mt-4'>
            <Button variant='outline' size='sm' onClick={model.handleResetListingScript}>
              Reset to managed default
            </Button>
          </div>
        </FormSection>
      ) : null}
    </>
  );
}
