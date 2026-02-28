'use client';

import React from 'react';

import { Button, FormSection } from '@/shared/ui';

import { PromptExploderParserTuningProvider } from './PromptExploderParserTuningContext';
import { PromptExploderParserTuningPanel } from './PromptExploderParserTuningPanel';
import { useSettingsState, useSettingsActions } from '../context/hooks/useSettings';

export function ParserTuningSection(): React.JSX.Element {
  const { isParserTuningOpen } = useSettingsState();
  const { setIsParserTuningOpen } = useSettingsActions();

  return (
    <FormSection
      title='Parser Tuning'
      description='Quick-edit boundary and subsection parser rules directly from Prompt Exploder (stored as Validation Patterns).'
      variant='subtle'
      className='p-4'
      actions={
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
      }
    >
      {isParserTuningOpen ? (
        <PromptExploderParserTuningProvider>
          <PromptExploderParserTuningPanel />
        </PromptExploderParserTuningProvider>
      ) : (
        <div className='text-xs text-gray-500'>Parser tuning is collapsed.</div>
      )}
    </FormSection>
  );
}
