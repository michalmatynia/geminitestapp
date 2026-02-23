'use client';

import React from 'react';

import { Button, Textarea, SelectSimple, FormSection, FormField } from '@/shared/ui';

import { useComponentSettingsContext } from '../context/ComponentSettingsContext';
import { useInspectorAi } from '../context/InspectorAiContext';

function ContentAiSection(): React.JSX.Element {
  const { selectedLabel } = useComponentSettingsContext();
  const {
    contentAiProvider,
    setContentAiProvider,
    contentAiModelId,
    setContentAiModelId,
    contentAiAgentId,
    setContentAiAgentId,
    contentAiPrompt,
    setContentAiPrompt,
    contentAiLoading,
    contentAiError,
    contentAiOutput,
    contentAiAllowedKeys,
    contentAiPlaceholder,
    providerOptions,
    modelOptions,
    agentOptions,
    generateContent,
    cancelContent,
    applyContent,
  } = useInspectorAi();

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
          <FormField label='Provider'>
            <SelectSimple size='sm'
              value={contentAiProvider}
              onValueChange={(value: string): void => setContentAiProvider(value as 'model' | 'agent')}
              options={providerOptions}
              placeholder='Select provider'
            />
          </FormField>
          {contentAiProvider !== 'agent' ? (
            <FormField label='Model'>
              <SelectSimple size='sm'
                value={contentAiModelId}
                onValueChange={(value: string): void => setContentAiModelId(value)}
                options={modelOptions.map((model: string) => ({ value: model, label: model }))}
                placeholder={modelOptions.length ? 'Select model' : 'No models available'}
              />
            </FormField>
          ) : (
            <FormField label='Deepthinking agent'>
              <SelectSimple size='sm'
                value={contentAiAgentId}
                onValueChange={(value: string): void => setContentAiAgentId(value)}
                options={agentOptions.length ? agentOptions : [{ label: 'No agents configured', value: '' }]}
                placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
              />
            </FormField>
          )}
          <FormField label='Prompt' description={`Context: ${contentAiPlaceholder.slice(0, 40)}...`}>
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
                const nextPrompt = current.length ? `${current}\n\n${contentAiPlaceholder}` : contentAiPlaceholder;
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
            <span className='font-mono text-gray-300'>allowed_keys</span> = {contentAiAllowedKeys.length ? contentAiAllowedKeys.join(', ') : 'No keys available.'}
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
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={cancelContent}
              >
                Cancel
              </Button>
            )}
          </div>
          {contentAiError && (
            <div className='text-xs text-red-400'>{contentAiError}</div>
          )}
          {contentAiOutput && (
            <FormSection title='AI output' variant='subtle' className='p-3 space-y-3 mt-4'>
              <div className='flex items-center justify-between mt-2'>
                <span className='text-xs text-gray-400'>Generated JSON</span>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={applyContent}
                >
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
