import React from 'react';

import type { ImageRetryPresetDto as ImageRetryPreset } from '@/shared/contracts/integrations';
import { useListingSettingsContext } from '@/features/integrations/context/ListingSettingsContext';
import { ActionMenu, DropdownMenuItem } from '@/shared/ui';

import { useImageRetryPresets } from '../useImageRetryPresets';
import { useListProductModalFormContext } from './context/ListProductModalFormContext';

const isImageExportError = (error: string): boolean => {
  return error.toLowerCase().includes('image') && error.toLowerCase().includes('export');
};

export function ListProductErrorPanel(): React.JSX.Element {
  const { isBaseComIntegration } = useListingSettingsContext();
  const { error, submitting, onRetryImageExport } = useListProductModalFormContext();
  const imageRetryPresets = useImageRetryPresets();

  if (!error) {
    return <></>;
  }

  return (
    <div className='rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200'>
      <div className='flex flex-col gap-3'>
        <span>{error}</span>
        {isBaseComIntegration && isImageExportError(error) ? (
          <div className='flex flex-wrap items-center gap-2'>
            <ActionMenu
              trigger='Retry image export'
              variant='secondary'
              size='sm'
              triggerClassName='bg-red-500/20 text-red-100 hover:bg-red-500/30 px-3 py-1.5 h-auto w-auto'
              disabled={submitting}
              align='start'
            >
              {imageRetryPresets.map((preset: ImageRetryPreset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onSelect={() => onRetryImageExport(preset)}
                  className='text-gray-200 focus:bg-gray-800/70'
                >
                  <div className='flex flex-col'>
                    <span className='text-sm'>{preset.label}</span>
                    <span className='text-xs text-gray-400'>{preset.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </ActionMenu>
            <span className='text-xs text-red-200/80'>
              Applies JPEG resize/compression and retries automatically.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
