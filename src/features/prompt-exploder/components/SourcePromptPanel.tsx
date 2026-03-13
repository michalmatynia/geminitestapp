'use client';

import React from 'react';

import { Button, FormSection, Textarea, Card, useToast } from '@/shared/ui';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import { useLibraryActions } from '../context/hooks/useLibrary';
import { useSettingsState } from '../context/hooks/useSettings';

export function SourcePromptPanel(): React.JSX.Element {
  const { promptText, returnTarget } = useDocumentState();
  const { setPromptText, handleExplode, handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { runtimeGuardrailIssue, promptExploderSettings } = useSettingsState();
  const { toast } = useToast();
  const caseResolverExtractionModeLabel =
    promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_with_heuristics'
      ? 'Rules + Heuristics'
      : 'Rules Only';

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
      title='Source Prompt'
      description='Paste a prompt and explode it into structured segments.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <Button type='button' onClick={handleExplode} disabled={Boolean(runtimeGuardrailIssue)}>
            Explode Prompt
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleApply();
            }}
          >
            {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
          </Button>
        </div>
      }
    >
      <div className='mt-3 space-y-2'>
        {runtimeGuardrailIssue ? (
          <Card variant='danger' padding='sm' className='border-rose-500/40 text-xs'>
            {runtimeGuardrailIssue}
          </Card>
        ) : null}
        {returnTarget === 'case-resolver' ? (
          <Card
            variant='info'
            padding='sm'
            className='border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-100'
          >
            Case Resolver extraction mode: {caseResolverExtractionModeLabel}
          </Card>
        ) : null}
        <Textarea
          className='min-h-[280px] font-mono text-[12px]'
          value={promptText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setPromptText(event.target.value);
          }}
          aria-label='Source prompt'
          placeholder='Paste prompt text...'
        />
      </div>
    </FormSection>
  );
}
