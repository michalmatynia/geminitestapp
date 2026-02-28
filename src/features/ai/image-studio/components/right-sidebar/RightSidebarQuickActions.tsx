import { Eye, Play, SlidersHorizontal, Sparkles, Workflow } from 'lucide-react';
import React from 'react';

import { Button, Input } from '@/shared/ui';

import { useRightSidebarContext } from '../RightSidebarContext';

export function RightSidebarQuickActions(): React.JSX.Element {
  const {
    estimatedGenerationCost,
    estimatedPromptTokens,
    generationBusy,
    generationLabel,
    hasExtractedControls,
    modelSupportsSequenceGeneration,
    onOpenControls,
    onOpenPromptControl,
    onOpenRequestPreview,
    onRunGeneration,
    onRunSequenceGeneration,
    selectedModelId,
    sequenceRunBusy,
  } = useRightSidebarContext();
  const displayedModelId = selectedModelId || 'Not configured in AI Brain';

  return (
    <>
      <div className='rounded border border-border/60 bg-card/30 p-2'>
        <div className='space-y-2'>
          <Input
            value={displayedModelId}
            readOnly
            disabled
            size='sm'
            className='h-8 text-xs cursor-not-allowed'
            aria-label='Brain-managed generation model'
          />
          <div className='text-[11px] text-gray-400'>
            Generation routing is managed in AI Brain. Local Image Studio model presets are kept
            only as compatibility snapshots.
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <Button
              size='xs'
              onClick={onRunGeneration}
              disabled={generationBusy || sequenceRunBusy}
              className='sm:min-w-[140px]'
              loading={generationBusy}
            >
              {!generationBusy && <Play className='mr-2 size-4' />}
              {generationLabel}
            </Button>
            {modelSupportsSequenceGeneration ? (
              <Button
                size='xs'
                variant='outline'
                onClick={onRunSequenceGeneration}
                disabled={generationBusy || sequenceRunBusy}
                className='sm:min-w-[160px]'
                title='Run enabled sequence steps in sequencer'
                aria-label='Generate sequence'
                loading={sequenceRunBusy}
                loadingText='Starting...'
              >
                {!sequenceRunBusy && <Workflow className='mr-2 size-4' />}
                Generate Sequence
              </Button>
            ) : null}
          </div>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
          <span className='text-gray-300'>Tokens ~{estimatedPromptTokens.toLocaleString()}</span>
          <span
            className='max-w-full truncate text-gray-300'
            title={`Estimated generation cost for ${displayedModelId}`}
          >
            Est. Cost ({displayedModelId}) ${estimatedGenerationCost.toFixed(3)}
          </span>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-end gap-2'>
        <Button
          size='xs'
          variant='outline'
          title='Open prompt controls'
          aria-label='Open prompt controls'
          onClick={onOpenPromptControl}
        >
          <Sparkles className='mr-2 size-4' />
          Control Prompt
        </Button>
        <Button
          size='xs'
          variant='outline'
          title='Preview generation request payload and input images'
          aria-label='Preview generation request payload and input images'
          onClick={onOpenRequestPreview}
        >
          <Eye className='mr-2 size-4' />
          Preview Request
        </Button>
        <Button
          size='xs'
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
