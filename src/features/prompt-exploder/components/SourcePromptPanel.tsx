'use client';

import React from 'react';

import { Button, FormSection, Textarea } from '@/shared/ui';

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
          <Button
            type='button'
            onClick={handleExplode}
            disabled={Boolean(runtimeGuardrailIssue)}
          >
            Explode Prompt
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleApplyToImageStudio();
            }}
          >
            {returnTarget === 'case-resolver'
              ? 'Apply to Case Resolver'
              : 'Apply to Image Studio'}
          </Button>
        </div>
      }
    >
      <div className='mt-3 space-y-2'>
        {runtimeGuardrailIssue ? (
          <div className='rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100'>
            {runtimeGuardrailIssue}
          </div>
        ) : null}
        {returnTarget === 'case-resolver' ? (
          <div className='rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100'>
            Case Resolver capture mode: {caseResolverCaptureModeLabel}
          </div>
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
