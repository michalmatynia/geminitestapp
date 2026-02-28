'use client';

import React from 'react';

import { Button, FormSection, Textarea, Card } from '@/shared/ui';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import { useSettingsState } from '../context/hooks/useSettings';

export function SourcePromptPanel(): React.JSX.Element {
  const { promptText, returnTarget } = useDocumentState();
  const { setPromptText, handleExplode, handleApplyToImageStudio } = useDocumentActions();
  const { runtimeGuardrailIssue, promptExploderSettings } = useSettingsState();
  const caseResolverCaptureModeLabel =
    promptExploderSettings.runtime.caseResolverCaptureMode === 'rules_with_heuristics'
      ? 'Rules + Heuristics'
      : 'Rules Only';

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
              void handleApplyToImageStudio();
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
            Case Resolver capture mode: {caseResolverCaptureModeLabel}
          </Card>
        ) : null}
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
