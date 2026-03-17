import React from 'react';

import { Button } from '@/shared/ui';

import { AllegroSettings } from '../AllegroSettings';
import { BaselinkerSettings } from '../BaselinkerSettings';
import { LinkedInSettings } from '../LinkedInSettings';
import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

type SessionMeta = {
  hasPlaywrightStorageState: boolean;
  playwrightStorageStateUpdatedAt: string | number | Date | null;
};

const resolveSessionMeta = (connection: unknown): SessionMeta => {
  if (!connection || typeof connection !== 'object') {
    return {
      hasPlaywrightStorageState: false,
      playwrightStorageStateUpdatedAt: null,
    };
  }

  const record = connection as Record<string, unknown>;
  const hasPlaywrightStorageState = record['hasPlaywrightStorageState'] === true;
  const updatedAtValue = record['playwrightStorageStateUpdatedAt'];
  const playwrightStorageStateUpdatedAt =
    typeof updatedAtValue === 'string' ||
    typeof updatedAtValue === 'number' ||
    updatedAtValue instanceof Date
      ? updatedAtValue
      : null;

  return {
    hasPlaywrightStorageState,
    playwrightStorageStateUpdatedAt,
  };
};

export function IntegrationSettingsContent(): React.JSX.Element {
  const {
    isAllegro,
    isLinkedIn,
    isBaselinker,
    isTradera,
    showPlaywright,
    activeConnection,
    onOpenSessionModal,
  } = useIntegrationModalViewContext();
  const sessionMeta = resolveSessionMeta(activeConnection);

  return (
    <div>
      {isAllegro ? (
        <AllegroSettings />
      ) : isLinkedIn ? (
        <LinkedInSettings />
      ) : isBaselinker ? (
        <BaselinkerSettings />
      ) : (
        <div className='min-h-[220px]' />
      )}

      {isTradera && showPlaywright && Boolean(activeConnection) && (
        <div className='mt-4 rounded-md border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
          <div className='flex items-center justify-between gap-3'>
            <p>
              <span className='text-gray-400'>Session cookie:</span>{' '}
              {sessionMeta.hasPlaywrightStorageState ? 'Retained' : 'Not stored'}
            </p>
            <Button
              type='button'
              onClick={onOpenSessionModal}
              disabled={!sessionMeta.hasPlaywrightStorageState}
              className='text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600'
            >
              View details
            </Button>
          </div>
          <p className='mt-1'>
            <span className='text-gray-400'>Obtained:</span>{' '}
            {sessionMeta.playwrightStorageStateUpdatedAt
              ? new Date(sessionMeta.playwrightStorageStateUpdatedAt).toLocaleString()
              : '—'}
          </p>
        </div>
      )}
    </div>
  );
}
