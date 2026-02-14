'use client';

import React from 'react';

import type { ColorSchemeColors } from '@/features/cms/types/theme-settings';
import {
  Button,
  Label,
  Textarea,
  SelectSimple,
} from '@/shared/ui';

import { useThemeColors } from './ThemeColorsContext';

export function ThemeAiSection(): React.JSX.Element {
  const {
    schemeAiProvider,
    setSchemeAiProvider,
    schemeProviderOptions,
    schemeAiModelId,
    setSchemeAiModelId,
    modelOptions,
    schemeAiAgentId,
    setSchemeAiAgentId,
    agentOptions,
    schemeAiPrompt,
    setSchemeAiPrompt,
    schemeAiLoading,
    schemeAiError,
    schemeAiOutput,
    schemeAiPreview,
    newSchemeColors,
    handleGenerateScheme,
    handleCancelSchemeAi,
  } = useThemeColors();

  return (
    <div className='rounded border border-border/40 bg-gray-900/40 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500'>
          AI scheme generator
        </Label>
        <span className='text-[10px] text-gray-500'>On demand</span>
      </div>
      <div className='space-y-1.5'>
        <Label className='text-xs text-gray-400'>Provider</Label>
        <SelectSimple size='sm'
          value={schemeAiProvider}
          onValueChange={(value: string): void => setSchemeAiProvider(value as 'model' | 'agent')}
          options={schemeProviderOptions}
          placeholder='Select provider'
        />
      </div>
      {schemeAiProvider !== 'agent' ? (
        <div className='space-y-1.5'>
          <Label className='text-xs text-gray-400'>Model</Label>
          <SelectSimple size='sm'
            value={schemeAiModelId}
            onValueChange={(value: string): void => setSchemeAiModelId(value)}
            options={modelOptions.map((model: string) => ({ value: model, label: model }))}
            placeholder={modelOptions.length ? 'Select model' : 'No models available'}
          />
        </div>
      ) : (
        <div className='space-y-1.5'>
          <Label className='text-xs text-gray-400'>Deepthinking agent</Label>
          <SelectSimple size='sm'
            value={schemeAiAgentId}
            onValueChange={(value: string): void => setSchemeAiAgentId(value)}
            options={agentOptions.length ? agentOptions : [{ label: 'No agents configured', value: '' }]}
            placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
          />
        </div>
      )}
      <div className='space-y-1.5'>
        <Label className='text-xs text-gray-400'>Prompt</Label>
        <Textarea
          value={schemeAiPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setSchemeAiPrompt(e.target.value)}
          placeholder='Describe the theme you want (e.g. cinematic dark with neon accents).'
          className='min-h-[90px] text-xs'
          spellCheck={false}
        />
      </div>
      <div className='text-[11px] text-gray-500'>
        Use <span className='font-mono text-gray-300'>{'{{theme_context}}'}</span> to inject current theme context.
      </div>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={(): void => void handleGenerateScheme()}
          disabled={schemeAiLoading}
        >
          {schemeAiLoading ? 'Generating\u2026' : 'Generate scheme'}
        </Button>
        {schemeAiLoading && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={handleCancelSchemeAi}
          >
            Cancel
          </Button>
        )}
      </div>
      {schemeAiError && (
        <div className='text-xs text-red-400'>{schemeAiError}</div>
      )}
      {schemeAiOutput && (
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>AI output</Label>
          <Textarea
            value={schemeAiOutput}
            readOnly
            className='min-h-[90px] text-xs font-mono text-gray-300'
          />
        </div>
      )}
      {schemeAiPreview && (
        <div className='rounded border border-border/40 bg-gray-950/40 p-2'>
          <div className='flex items-center justify-between text-[11px] text-gray-400'>
            <span>Preview</span>
            {schemeAiPreview.name ? (
              <span className='text-gray-300'>{schemeAiPreview.name}</span>
            ) : null}
          </div>
          <div className='mt-2 grid grid-cols-5 gap-2'>
            {(['background', 'surface', 'text', 'accent', 'border'] as Array<keyof ColorSchemeColors>).map((key: keyof ColorSchemeColors) => {
              const value =
                schemeAiPreview.colors[key] ??
                newSchemeColors[key];
              return (
                <div key={key} className='space-y-1 text-[10px] text-gray-500'>
                  <div
                    className='h-6 rounded border border-border/60'
                    style={{ backgroundColor: value }}
                  />
                  <span className='block truncate'>{key}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
