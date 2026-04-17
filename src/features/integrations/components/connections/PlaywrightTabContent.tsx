'use client';

import React from 'react';

import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { PlaywrightLegacyFallbackSection } from './PlaywrightLegacyFallbackSection';
import { PlaywrightManagedRuntimeActionsSection } from './PlaywrightManagedRuntimeActionsSection';
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

export function PlaywrightTabContent(): React.JSX.Element {
  const model = usePlaywrightTabContentModel();

  return (
    <>
      {model.usesSequencerManagedActions ? (
        <PlaywrightManagedRuntimeActionsSection
          description={resolveSequencerDescription(model.activeIntegrationSlug)}
          isLoading={model.managedActionsLoading}
          summaries={model.managedActionSummaries}
        />
      ) : null}

      <PlaywrightLegacyFallbackSection
        description={model.fallbackCopy.description}
        title={model.fallbackCopy.title}
        playwrightPersonaId={model.playwrightPersonaId}
        playwrightPersonas={model.playwrightPersonas}
        playwrightPersonasLoading={model.playwrightPersonasLoading}
        collapsible={model.collapsibleFallback}
        onSelectPersona={model.handlePersonaSelection}
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
