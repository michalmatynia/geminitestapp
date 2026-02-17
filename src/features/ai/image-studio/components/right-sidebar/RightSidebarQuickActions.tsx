import { Eye, Loader2, Play, SlidersHorizontal, Sparkles, Workflow } from 'lucide-react';
import React from 'react';

import { Button, SelectSimple } from '@/shared/ui';

type RightSidebarQuickActionsProps = {
  estimatedGenerationCost: number;
  estimatedPromptTokens: number;
  generationBusy: boolean;
  generationLabel: string;
  hasExtractedControls: boolean;
  modelSupportsSequenceGeneration: boolean;
  modelValue: string;
  onModelChange: (value: string) => void;
  onOpenControls: () => void;
  onOpenPromptControl: () => void;
  onOpenRequestPreview: () => void;
  onRunGeneration: () => void;
  onRunSequenceGeneration: () => void;
  quickModelOptions: Array<{ value: string; label: string }>;
  selectedModelId: string;
  sequenceRunBusy: boolean;
};

export function RightSidebarQuickActions({
  estimatedGenerationCost,
  estimatedPromptTokens,
  generationBusy,
  generationLabel,
  hasExtractedControls,
  modelSupportsSequenceGeneration,
  modelValue,
  onModelChange,
  onOpenControls,
  onOpenPromptControl,
  onOpenRequestPreview,
  onRunGeneration,
  onRunSequenceGeneration,
  quickModelOptions,
  selectedModelId,
  sequenceRunBusy,
}: RightSidebarQuickActionsProps): React.JSX.Element {
  return (
    <>
      <div className='rounded border border-border/60 bg-card/30 p-2'>
        <div className='space-y-2'>
          <SelectSimple size='sm'
            value={modelValue}
            onValueChange={onModelChange}
            options={quickModelOptions}
            placeholder='Select model'
            triggerClassName='h-8 text-xs'
            ariaLabel='Quick generation model'
          />
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <Button size='xs'
              onClick={onRunGeneration}
              disabled={generationBusy || sequenceRunBusy}
              className='sm:min-w-[140px]'
            >
              {generationBusy ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Play className='mr-2 size-4' />
              )}
              {generationLabel}
            </Button>
            {modelSupportsSequenceGeneration ? (
              <Button size='xs'
                variant='outline'
                onClick={onRunSequenceGeneration}
                disabled={generationBusy || sequenceRunBusy}
                className='sm:min-w-[160px]'
                title='Run enabled sequence steps in sequencer'
                aria-label='Generate sequence'
              >
                {sequenceRunBusy ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Workflow className='mr-2 size-4' />
                )}
                {sequenceRunBusy ? 'Starting...' : 'Generate Sequence'}
              </Button>
            ) : null}
          </div>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
          <span className='text-gray-300'>
            Tokens ~{estimatedPromptTokens.toLocaleString()}
          </span>
          <span
            className='max-w-full truncate text-gray-300'
            title={`Estimated generation cost for ${selectedModelId}`}
          >
            Est. Cost ({selectedModelId}) ${estimatedGenerationCost.toFixed(3)}
          </span>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-end gap-2'>
        <Button size='xs'
          variant='outline'
          title='Open prompt controls'
          aria-label='Open prompt controls'
          onClick={onOpenPromptControl}
        >
          <Sparkles className='mr-2 size-4' />
          Control Prompt
        </Button>
        <Button size='xs'
          variant='outline'
          title='Preview generation request payload and input images'
          aria-label='Preview generation request payload and input images'
          onClick={onOpenRequestPreview}
        >
          <Eye className='mr-2 size-4' />
          Preview Request
        </Button>
        <Button size='xs'
          variant='outline'
          title={hasExtractedControls ? 'Open extracted controls' : 'Extract controls first'}
          aria-label='Open extracted controls'
          disabled={!hasExtractedControls}
          onClick={onOpenControls}
        >
          <SlidersHorizontal className='mr-2 size-4' />
          Controls
        </Button>
      </div>
    </>
  );
}
