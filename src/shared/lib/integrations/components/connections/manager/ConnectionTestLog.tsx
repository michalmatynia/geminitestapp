'use client';

import React from 'react';
import { useIntegrationsContext } from '@/shared/lib/integrations/context/IntegrationsContext';
import { TestLogEntry } from '@/shared/contracts/integrations';
import { StatusBadge, FormSection } from '@/shared/ui';

export function ConnectionTestLog(): React.JSX.Element | null {
  const { activeIntegration, isTesting, testLog, setSelectedStep, setShowTestLogModal } =
    useIntegrationsContext();

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

      {testLog.length === 0 ? (
        <p className='mt-2 text-xs text-gray-500'>Run a connection test to see live updates.</p>
      ) : (
        <div className='mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-gray-400'>
          {testLog.map((entry: TestLogEntry, index: number) => (
            <div key={`${entry.step}-${index}`} className='flex items-center justify-between gap-3'>
              <p>{entry.step}</p>
              {entry.status !== 'pending' && (
                <StatusBadge
                  status={entry.status === 'ok' ? 'OK' : 'FAILED'}
                  onClick={(): void => {
                    setSelectedStep(
                      entry.status !== 'pending'
                        ? (entry as TestLogEntry & { status: 'ok' | 'failed' })
                        : null
                    );
                    setShowTestLogModal(true);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
