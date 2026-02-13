import React from 'react';

import { Button } from '@/shared/ui';

import { AllegroSettings } from '../AllegroSettings';
import { BaselinkerSettings } from '../BaselinkerSettings';

type IntegrationSettingsContentProps = {
  isAllegro: boolean;
  isBaselinker: boolean;
  isTradera: boolean;
  activeConnection: unknown;
  onOpenSessionModal: () => void;
};

export function IntegrationSettingsContent({
  isAllegro,
  isBaselinker,
  isTradera,
  activeConnection,
  onOpenSessionModal,
}: IntegrationSettingsContentProps): React.JSX.Element {
  return (
    <div>
      {isAllegro ? (
        <AllegroSettings />
      ) : isBaselinker ? (
        <BaselinkerSettings />
      ) : (
        <div className='min-h-[220px]' />
      )}

      {isTradera && Boolean(activeConnection) && (
        <div className='mt-4 rounded-md border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
          <div className='flex items-center justify-between gap-3'>
            <p>
              <span className='text-gray-400'>Session cookie:</span>{' '}
              {(activeConnection as any).hasPlaywrightStorageState ? 'Retained' : 'Not stored'}
            </p>
            <Button
              type='button'
              onClick={onOpenSessionModal}
              disabled={!(activeConnection as any).hasPlaywrightStorageState}
              className='text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600'
            >
              View details
            </Button>
          </div>
          <p className='mt-1'>
            <span className='text-gray-400'>Obtained:</span>{' '}
            {(activeConnection as any).playwrightStorageStateUpdatedAt
              ? new Date((activeConnection as any).playwrightStorageStateUpdatedAt).toLocaleString()
              : '—'}
          </p>
        </div>
      )}
    </div>
  );
}
