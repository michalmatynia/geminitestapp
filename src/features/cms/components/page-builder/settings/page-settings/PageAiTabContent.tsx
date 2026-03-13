'use client';

import React, { useMemo } from 'react';

import { Button, Input, Label, Textarea, SelectSimple } from '@/shared/ui';

import { usePageAiAssistant } from './usePageAiAssistant';

export function PageAiTabContent({
  activeTab: _activeTab,
}: {
  activeTab: string;
}): React.JSX.Element {
  const ai = usePageAiAssistant();

  const pageAiTaskOptions = useMemo(
    () => [
      { label: 'Layout plan', value: 'layout' },
      { label: 'SEO metadata', value: 'seo' },
    ],
    []
  );

  const pageAiPlaceholder = '{{page_context}}\\n{{available_templates}}';
  const providerLabel = ai.pageAiProvider === 'agent' ? 'Deepthinking agent' : 'AI model';
  const targetValue =
    ai.pageAiProvider === 'agent'
      ? ai.pageAiAgentId.trim() || 'Not configured in AI Brain'
      : ai.pageAiModelId.trim() || 'Not configured in AI Brain';

  return (
    <div className='space-y-4'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        AI page assistant
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Task</Label>
        <SelectSimple
          size='sm'
          value={ai.pageAiTask}
          onValueChange={(value: string): void => ai.setPageAiTask(value as 'layout' | 'seo')}
          options={pageAiTaskOptions}
          placeholder='Select task'
          ariaLabel='Task'
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Provider</Label>
        <Input
          size='sm'
          value={providerLabel}
          readOnly
          disabled
          aria-label='Provider'
          className='cursor-not-allowed'
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>
          {ai.pageAiProvider === 'agent' ? 'Deepthinking agent' : 'Model'}
        </Label>
        <Input
          size='sm'
          value={targetValue}
          readOnly
          disabled
          aria-label={ai.pageAiProvider === 'agent' ? 'Deepthinking agent' : 'Model'}
          className='cursor-not-allowed'
        />
      </div>
      <div className='rounded border border-border/40 bg-gray-800/20 px-3 py-2 text-[11px] text-gray-400'>
        Routing for this assistant is managed in AI Brain via the CMS CSS Stream capability. Local
        provider and model selection is no longer used for execution.
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Prompt</Label>
        <Textarea
          value={ai.pageAiPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
            ai.setPageAiPrompt(e.target.value)
          }
          aria-label='Prompt'
          placeholder={`Describe what you need.\n\nContext:\n${pageAiPlaceholder}`}
          className='min-h-[120px] text-xs'
          spellCheck={false}
        />
      </div>
      <div className='flex items-center justify-between'>
        <div className='text-[11px] text-gray-500'>Context placeholders</div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={(): void => {
            const current = ai.pageAiPrompt.trim();
            const nextPrompt = current.length
              ? `${current}\n\n${pageAiPlaceholder}`
              : pageAiPlaceholder;
            ai.setPageAiPrompt(nextPrompt);
          }}
        >
          Insert placeholders
        </Button>
      </div>
      <Textarea
        value={pageAiPlaceholder}
        readOnly
        aria-label='Context placeholders'
        className='min-h-[64px] text-xs font-mono text-gray-300'
      />
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={(): void => void ai.handleGeneratePageAi()}
          disabled={ai.generatePageAiMutation.isPending}
        >
          {ai.generatePageAiMutation.isPending ? 'Generating...' : 'Generate'}
        </Button>
        {ai.generatePageAiMutation.isPending && (
          <Button type='button' size='sm' variant='outline' onClick={ai.handleCancelPageAi}>
            Cancel
          </Button>
        )}
      </div>
      {ai.pageAiError && <div className='text-xs text-red-400'>{ai.pageAiError}</div>}
      {ai.pageAiOutput && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>AI output</Label>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={ai.handleApplyPageAi}
              disabled={ai.pageAiTask !== 'layout'}
              title={
                ai.pageAiTask === 'layout'
                  ? 'Apply generated sections'
                  : 'Apply is only available for layout output'
              }
            >
              Apply
            </Button>
          </div>
          <Textarea
            value={ai.pageAiOutput}
            readOnly
            aria-label='AI output'
            className='min-h-[140px] text-xs font-mono text-gray-300'
          />
        </div>
      )}
    </div>
  );
}
