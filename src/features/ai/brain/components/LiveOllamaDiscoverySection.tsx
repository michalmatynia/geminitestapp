'use client';

import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

interface LiveOllamaDiscoverySectionProps {
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  liveOllamaModels: string[];
  warningMessage?: string;
  onRefetch: () => void;
  onAddToCatalog: () => void;
}

function getStatusMessage(
  isLoading: boolean,
  error: unknown,
  liveOllamaModels: string[]
): string {
  if (isLoading) {
    return 'Loading live models from Ollama...';
  }

  if (error !== null && error !== undefined) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load Ollama models.';
  }

  return `${liveOllamaModels.length} live model(s) available for Brain routing.`;
}

export function LiveOllamaDiscoverySection({
  isLoading,
  isFetching,
  error,
  liveOllamaModels,
  warningMessage,
  onRefetch,
  onAddToCatalog,
}: LiveOllamaDiscoverySectionProps): React.JSX.Element {
  const statusMessage = getStatusMessage(isLoading, error, liveOllamaModels);

  return (
    <FormSection
      title='Live Ollama discovery'
      description='Load live models from Ollama to see what is available.'
      variant='subtle'
      actions={
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onRefetch}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing...' : 'Refresh Ollama'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onAddToCatalog}
            disabled={liveOllamaModels.length === 0}
          >
            Add Live to Catalog
          </Button>
        </div>
      }
    >
      <div className='mt-2 text-xs text-gray-300'>{statusMessage}</div>
      {warningMessage !== undefined && warningMessage !== '' ? (
        <div className='mt-1 text-[11px] text-amber-300'>{warningMessage}</div>
      ) : null}
    </FormSection>
  );
}
