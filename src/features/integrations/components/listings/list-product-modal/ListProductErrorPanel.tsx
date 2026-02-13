import React from 'react';

import type { ImageRetryPreset } from '@/features/data-import-export';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui';

type ListProductErrorPanelProps = {
  error: string;
  isBaseComIntegration: boolean;
  imageRetryPresets: ImageRetryPreset[];
  submitting: boolean;
  onRetry: (preset: ImageRetryPreset) => void;
};

const isImageExportError = (error: string): boolean => {
  return error.toLowerCase().includes('image') && error.toLowerCase().includes('export');
};

export function ListProductErrorPanel({
  error,
  isBaseComIntegration,
  imageRetryPresets,
  submitting,
  onRetry,
}: ListProductErrorPanelProps): React.JSX.Element {
  return (
    <div className='rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200'>
      <div className='flex flex-col gap-3'>
        <span>{error}</span>
        {isBaseComIntegration && isImageExportError(error) ? (
          <div className='flex flex-wrap items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='secondary'
                  size='sm'
                  className='bg-red-500/20 text-red-100 hover:bg-red-500/30'
                  disabled={submitting}
                >
                  Retry image export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='bg-card border-border'>
                {imageRetryPresets.map((preset: ImageRetryPreset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onSelect={() => onRetry(preset)}
                    className='text-gray-200 focus:bg-gray-800/70'
                  >
                    <div className='flex flex-col'>
                      <span className='text-sm'>{preset.label}</span>
                      <span className='text-xs text-gray-400'>{preset.description}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className='text-xs text-red-200/80'>
              Applies JPEG resize/compression and retries automatically.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
