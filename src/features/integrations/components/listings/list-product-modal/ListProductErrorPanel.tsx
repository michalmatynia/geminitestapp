import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { DropdownMenuItem, Alert } from '@/shared/ui/primitives.public';

import { useImageRetryPresets } from '../useImageRetryPresets';
import { useListProductModalFormContext } from './context/ListProductModalFormContext';

const isImageExportError = (error: string): boolean => {
  return error.toLowerCase().includes('image') && error.toLowerCase().includes('export');
};

export function ListProductErrorPanel(): React.JSX.Element {
  const { isBaseComIntegration } = useListingSelection();
  const { error, submitting, onRetryImageExport } = useListProductModalFormContext();
  const imageRetryPresets = useImageRetryPresets();

  if (!error) {
    return <></>;
  }

  return (
    <Alert variant='error' className='p-3'>
      <div className='flex flex-col gap-3'>
        <span>{error}</span>
        {isBaseComIntegration && isImageExportError(error) ? (
          <div className='flex flex-wrap items-center gap-2'>
            <ActionMenu
              trigger='Retry image export'
              variant='destructive'
              size='sm'
              triggerClassName='px-3 py-1.5 h-auto w-auto'
              disabled={submitting}
              align='start'
            >
              {imageRetryPresets.map((preset: ImageRetryPreset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onSelect={() => onRetryImageExport(preset)}
                  className='text-gray-200 focus:bg-card/60'
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
    </Alert>
  );
}
