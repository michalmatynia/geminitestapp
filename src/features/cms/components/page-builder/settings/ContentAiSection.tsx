'use client';

import React from 'react';

import { Button, Textarea, Input, FormSection, FormField } from '@/shared/ui';

import { useComponentSettingsState } from '../context/ComponentSettingsContext';
import { useInspectorAiActions, useInspectorAiState } from '../context/InspectorAiContext';

function ContentAiSection(): React.JSX.Element {
  const { selectedLabel } = useComponentSettingsState();
  const {
    contentAiPrompt,
    contentAiLoading,
    contentAiError,
    contentAiOutput,
    contentAiAllowedKeys,
    contentAiPlaceholder,
    brainAiProvider,
    brainAiModelId,
    brainAiAgentId,
  } = useInspectorAiState();
  const { setContentAiPrompt, generateContent, cancelContent, applyContent } =
    useInspectorAiActions();

  return (
    <div className='space-y-3'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        AI content for <span className='text-gray-200'>{selectedLabel}</span>
      </div>
      <FormSection
        title='Content AI'
        actions={<span className='text-[10px] text-gray-500'>JSON output</span>}
        variant='subtle-compact'
        className='p-3 space-y-4'
      >
        <div className='space-y-4 mt-4'>
          <FormField label='Provider' description='Brain-managed via CMS CSS Stream capability.'>
            <Input
              value={brainAiProvider === 'agent' ? 'Deepthinking agent' : 'AI model'}
              readOnly
              disabled
              className='cursor-not-allowed'
            />
          </FormField>
          <FormField label={brainAiProvider === 'agent' ? 'Deepthinking agent' : 'Model'}>
            <Input
              value={
                brainAiProvider === 'agent'
                  ? brainAiAgentId || 'Not configured in AI Brain'
                  : brainAiModelId || 'Not configured in AI Brain'
              }
              readOnly
              disabled
              className='cursor-not-allowed'
            />
          </FormField>
          <FormField
            label='Prompt'
            description={`Context: ${contentAiPlaceholder.slice(0, 40)}...`}
          >
            <Textarea
              value={contentAiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setContentAiPrompt(e.target.value)
              }
              placeholder={`Describe the content you want.\n\nContext:\n${contentAiPlaceholder}`}
              className='min-h-[120px] text-xs'
              spellCheck={false}
            />
          </FormField>
          <div className='flex items-center justify-between'>
            <div className='text-[11px] text-gray-500'>Context placeholders</div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(): void => {
                const current = contentAiPrompt.trim();
                const nextPrompt = current.length
                  ? `${current}\n\n${contentAiPlaceholder}`
                  : contentAiPlaceholder;
                setContentAiPrompt(nextPrompt);
              }}
            >
              Insert placeholders
            </Button>
          </div>
          <Textarea
            value={contentAiPlaceholder}
            readOnly
            className='min-h-[64px] text-xs font-mono text-gray-300'
          />
          <div className='text-[11px] text-gray-500'>
            <span className='font-mono text-gray-300'>allowed_keys</span> ={' '}
            {contentAiAllowedKeys.length ? contentAiAllowedKeys.join(', ') : 'No keys available.'}
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={(): void => void generateContent()}
              disabled={contentAiLoading}
            >
              {contentAiLoading ? 'Generating\u2026' : 'Generate JSON'}
            </Button>
            {contentAiLoading && (
              <Button type='button' size='sm' variant='outline' onClick={cancelContent}>
                Cancel
              </Button>
            )}
          </div>
          {contentAiError && <div className='text-xs text-red-400'>{contentAiError}</div>}
          {contentAiOutput && (
            <FormSection title='AI output' variant='subtle' className='p-3 space-y-3 mt-4'>
              <div className='flex items-center justify-between mt-2'>
                <span className='text-xs text-gray-400'>Generated JSON</span>
                <Button type='button' size='sm' variant='outline' onClick={applyContent}>
                  Apply to settings
                </Button>
              </div>
              <Textarea
                value={contentAiOutput}
                readOnly
                className='min-h-[140px] text-xs font-mono text-gray-300'
              />
            </FormSection>
          )}
        </div>
      </FormSection>
    </div>
  );
}

export { ContentAiSection };
