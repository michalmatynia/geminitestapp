'use client';

import React from 'react';
import { KeyRound } from 'lucide-react';
import { Input, Label } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

interface CredentialsSectionProps {
  openaiApiKey: string;
  setOpenaiApiKey: (value: string) => void;
  anthropicApiKey: string;
  setAnthropicApiKey: (value: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
}

export function CredentialsSection({
  openaiApiKey,
  setOpenaiApiKey,
  anthropicApiKey,
  setAnthropicApiKey,
  geminiApiKey,
  setGeminiApiKey,
}: CredentialsSectionProps): React.JSX.Element {
  return (
    <FormSection
      title='Global Provider Credentials'
      description='Brain-managed provider keys are shared across Brain-routed features, including Image Studio, StudiQ, and Case Resolver OCR.'
      titleIcon={<KeyRound className='size-4 text-emerald-300' />}
      className='p-4'
    >
      <div className='mt-3 grid gap-3 md:grid-cols-3'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>OpenAI API key</Label>
          <Input
            type='password'
            value={openaiApiKey}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setOpenaiApiKey(event.target.value)
            }
            placeholder='sk-...'
            aria-label='OpenAI API key'
            title='OpenAI API key'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Anthropic API key</Label>
          <Input
            type='password'
            value={anthropicApiKey}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setAnthropicApiKey(event.target.value)
            }
            placeholder='sk-ant-...'
            aria-label='Anthropic API key'
            title='Anthropic API key'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Gemini API key</Label>
          <Input
            type='password'
            value={geminiApiKey}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setGeminiApiKey(event.target.value)
            }
            placeholder='AIza...'
            aria-label='Gemini API key'
            title='Gemini API key'
          />
        </div>
      </div>
    </FormSection>
  );
}
