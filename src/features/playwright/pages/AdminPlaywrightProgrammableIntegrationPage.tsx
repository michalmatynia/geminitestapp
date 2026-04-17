'use client';

import React from 'react';

import { PlaywrightProgrammableIntegrationPageContent } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableIntegrationPageContent';
import { usePlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageModel';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
import { Card } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

type AdminPlaywrightProgrammableIntegrationPageProps = {
  focusSection?: 'script' | 'import' | null;
};

export default function AdminPlaywrightProgrammableIntegrationPage({
  focusSection = null,
}: AdminPlaywrightProgrammableIntegrationPageProps): React.JSX.Element {
  const model = usePlaywrightProgrammableIntegrationPageModel({ focusSection });
  const isConnectionsLoading =
    model.programmableIntegration !== null ? model.connectionsQuery.isLoading : false;
  let content: React.JSX.Element;

  if (model.integrationsQuery.isLoading || isConnectionsLoading) {
    content = <LoadingState message='Loading marketplace integrations…' className='py-12' />;
  } else if (model.programmableIntegration === null) {
    content = (
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <div className='space-y-2'>
          <h2 className='text-base font-semibold text-white'>Integration not initialized</h2>
          <p className='text-sm text-gray-400'>
            The <code>playwright-programmable</code> integration does not exist in the current
            database yet. Add it from the integrations setup flow first.
          </p>
        </div>
      </Card>
    );
  } else {
    content = <PlaywrightProgrammableIntegrationPageContent {...model} />;
  }

  return (
    <AdminIntegrationsPageLayout
      title='Playwright (Programmable)'
      current='Playwright (Programmable)'
      parent={{ label: 'Marketplaces', href: '/admin/integrations/marketplaces' }}
      description='Configure programmable marketplace scripts, capture routes, field mapping, and the selected Step Sequencer session actions that own browser behavior.'
    >
      {content}
    </AdminIntegrationsPageLayout>
  );
}
