'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, FormSection } from '@/shared/ui';

import { useSettingsState, useSettingsActions } from '../context/hooks/useSettings';
import { PromptExploderParserTuningProvider } from './PromptExploderParserTuningContext';
import { PromptExploderParserTuningPanel } from './PromptExploderParserTuningPanel';

export function ParserTuningSection(): React.JSX.Element {
  const router = useRouter();
  const { parserTuningDrafts, isParserTuningOpen, isBusy } = useSettingsState();
  const {
    setIsParserTuningOpen,
    patchParserTuningDraft,
    handleSaveParserTuningRules,
    handleResetParserTuningDrafts,
  } = useSettingsActions();

  return (
    <FormSection
      title='Parser Tuning'
      description='Quick-edit boundary and subsection parser rules directly from Prompt Exploder (stored as Validation Patterns).'
      variant='subtle'
      className='p-4'
      actions={(
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setIsParserTuningOpen((previous) => !previous);
          }}
        >
          {isParserTuningOpen ? 'Collapse' : 'Expand'}
        </Button>
      )}
    >
      {isParserTuningOpen ? (
        <PromptExploderParserTuningProvider
          value={{
            drafts: parserTuningDrafts,
            onPatchDraft: patchParserTuningDraft,
            onSave: () => {
              void handleSaveParserTuningRules();
            },
            onResetToPackDefaults: handleResetParserTuningDrafts,
            onOpenValidationPatterns: () => {
              router.push('/admin/validator?scope=prompt-exploder');
            },
            isBusy,
          }}
        >
          <PromptExploderParserTuningPanel />
        </PromptExploderParserTuningProvider>
      ) : (
        <div className='text-xs text-gray-500'>Parser tuning is collapsed.</div>
      )}
    </FormSection>
  );
}
