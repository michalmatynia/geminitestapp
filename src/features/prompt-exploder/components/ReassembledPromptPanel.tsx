'use client';

import React from 'react';

import { Button, FormSection, Textarea } from '@/shared/ui';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';

export function ReassembledPromptPanel(): React.JSX.Element {
  const { documentState, returnTarget } = useDocumentState();
  const { handleApplyToImageStudio } = useDocumentActions();

  return (
    <FormSection
      title='Reassembled Prompt'
      description='Preview final output after include/omit and reorder edits.'
      variant='subtle'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          onClick={(): void => {
            void handleApplyToImageStudio();
          }}
        >
          {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
        </Button>
      }
    >
      <div className='mt-2'>
        <Textarea
          className='min-h-[420px] font-mono text-[11px]'
          value={documentState?.reassembledPrompt ?? ''}
          readOnly
        />
      </div>
    </FormSection>
  );
}
