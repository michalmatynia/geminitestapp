'use client';

import React from 'react';

import { PlaywrightProgrammableIntegrationPageContent } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableIntegrationPageContent';
import { usePlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageModel';
import { Card } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

type AdminPlaywrightProgrammableIntegrationPageRuntimeProps = {
  focusSection?: 'script' | 'import' | null;
};

export function AdminPlaywrightProgrammableIntegrationPageRuntime({
  focusSection = null,
}: AdminPlaywrightProgrammableIntegrationPageRuntimeProps): React.JSX.Element {
  const model = usePlaywrightProgrammableIntegrationPageModel({ focusSection });
  const isConnectionsLoading =
    model.programmableIntegration !== null ? model.connectionsQuery.isLoading : false;

  if (model.integrationsQuery.isLoading || isConnectionsLoading) {
    return <LoadingState message='Loading Playwright programmable connections…' className='py-12' />;
  }

  if (model.programmableIntegration === null) {
    return (
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <div className='space-y-2'>
          <h2 className='text-base font-semibold text-white'>Programmable integration missing</h2>
          <p className='text-sm text-gray-400'>
            The <code>playwright-programmable</code> integration record does not exist in the
            current database yet. Create it from the integrations setup flow first.
          </p>
        </div>
      </Card>
    );
  }

  return <PlaywrightProgrammableIntegrationPageContent {...model} />;
}
