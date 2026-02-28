'use client';

import React from 'react';

import { FormField, FormSection, SelectSimple, Textarea, ToggleRow } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useImageStudioSettingsContext } from '../../context/ImageStudioSettingsContext';

export function ValidationSettingsTab(): React.JSX.Element {
  const {
    studioSettings,
    setStudioSettings,
    promptValidationEnabled,
    setPromptValidationEnabled,
    promptValidationRulesText,
    promptValidationRulesError,
    handlePromptValidationRulesChange,
  } = useImageStudioSettingsContext();

  const handleModerationChange = (val: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      targetAi: {
        ...prev.targetAi,
        openai: {
          ...prev.targetAi.openai,
          image: {
            ...prev.targetAi.openai.image,
            moderation: val === '__null__' ? null : (val as 'auto' | 'low'),
          },
        },
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <FormSection
        title='Prompt Validation'
        description='Enforce safety and relevance rules before generation.'
      >
        <div className='space-y-4'>
          <ToggleRow
            label='Enable Validation'
            type='switch'
            checked={promptValidationEnabled}
            onCheckedChange={setPromptValidationEnabled}
          />
          <FormField label='Validation Rules (JSON)'>
            <Textarea
              className={cn(
                'min-h-[240px] font-mono text-xs',
                promptValidationRulesError && 'border-rose-500/60 focus:border-rose-500'
              )}
              value={promptValidationRulesText}
              onChange={(e) => handlePromptValidationRulesChange(e.target.value)}
              spellCheck={false}
            />
            {promptValidationRulesError && (
              <p className='text-xs font-medium text-rose-400'>
                {String(promptValidationRulesError)}
              </p>
            )}
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title='Image Generation Moderation'
        description='Configure built-in safety filters for generated content.'
      >
        <div className='space-y-4'>
          <FormField
            label='Moderation Level'
            description='Controls the strictness of the generation safety filter.'
          >
            <SelectSimple
              value={studioSettings.targetAi.openai.image.moderation ?? '__null__'}
              onValueChange={handleModerationChange}
              options={[
                { value: '__null__', label: 'Default' },
                { value: 'auto', label: 'Auto' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}
