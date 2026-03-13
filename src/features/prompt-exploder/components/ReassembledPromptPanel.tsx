'use client';

import React from 'react';

import { Button, FormSection, Textarea, useToast } from '@/shared/ui';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import { useLibraryActions } from '../context/hooks/useLibrary';

export function ReassembledPromptPanel(): React.JSX.Element {
  const { documentState, returnTarget } = useDocumentState();
  const { handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { toast } = useToast();

  const handleApply = async (): Promise<void> => {
    const captureResult = await captureSegmentationRecordOnApply();
    if (!captureResult.captured) {
      toast('Segmentation context capture skipped (missing prompt or document).', {
        variant: 'warning',
      });
    }
    await handleApplyToImageStudio();
  };

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
            void handleApply();
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
          aria-label='Reassembled prompt'
        />
      </div>
    </FormSection>
  );
}
