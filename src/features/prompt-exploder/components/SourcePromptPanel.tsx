'use client';

import React from 'react';

import { Button, FormSection, Textarea } from '@/shared/ui';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';

export function SourcePromptPanel(): React.JSX.Element {
  const { promptText, documentState, returnTarget } = useDocumentState();
  const { setPromptText, handleExplode, handleApplyToImageStudio } = useDocumentActions();

  return (
    <FormSection
      title='Source Prompt'
      description='Paste a prompt and explode it into structured segments.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <Button type='button' onClick={handleExplode}>
            Explode Prompt
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={handleApplyToImageStudio}
            disabled={!documentState}
          >
            {returnTarget === 'case-resolver'
              ? 'Apply to Case Resolver'
              : 'Apply to Image Studio'}
          </Button>
        </div>
      }
    >
      <div className='mt-3 space-y-2'>
        <Textarea
          className='min-h-[280px] font-mono text-[12px]'
          value={promptText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setPromptText(event.target.value);
          }}
          placeholder='Paste prompt text...'
        />
      </div>
    </FormSection>
  );
}
