'use client';

import React from 'react';

import {
  useIntegrationsData,
  useIntegrationsTesting,
} from '@/features/integrations/context/IntegrationsContext';
import { TestLogEntry } from '@/shared/contracts/integrations';
import { StatusBadge, FormSection, SimpleSettingsList } from '@/shared/ui';

export function ConnectionTestLog(): React.JSX.Element | null {
  const { activeIntegration } = useIntegrationsData();
  const { isTesting, testLog, setSelectedStep, setShowTestLogModal } = useIntegrationsTesting();

  if (!activeIntegration) return null;

  const integrationSlug = activeIntegration.slug;
  const isTradera = integrationSlug === 'tradera';
  const isTraderaApi = integrationSlug === 'tradera-api';
  const showPlaywright = isTradera && !isTraderaApi;

  if (!showPlaywright) return null;

  return (
    <FormSection title='Playwright live update' variant='subtle-compact' className='mt-4 p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-xs text-gray-500'>{isTesting ? 'Running...' : 'Idle'}</span>
      </div>

      <SimpleSettingsList
        items={testLog.map((entry, index) => ({
          id: `${entry.step}-${index}`,
          title: entry.step,
        }))}
        emptyMessage='Run a connection test to see live updates.'
        padding='sm'
        itemClassName='!bg-transparent border-none'
        renderActions={(entry) => {
          const logEntry = testLog.find((e, idx) => `${e.step}-${idx}` === entry.id);
          if (!logEntry || logEntry.status === 'pending') return null;
          return (
            <StatusBadge
              status={logEntry.status === 'ok' ? 'OK' : 'FAILED'}
              onClick={() => {
                setSelectedStep(logEntry as TestLogEntry & { status: 'ok' | 'failed' });
                setShowTestLogModal(true);
              }}
            />
          );
        }}
        className='mt-2 max-h-40 overflow-y-auto'
      />
    </FormSection>
  );
}
