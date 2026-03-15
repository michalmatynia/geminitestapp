'use client';

import React from 'react';

import { Textarea, CollapsibleSection, Hint } from '@/shared/ui';

import { usePromptEngineActions } from '../../context/prompt-engine/PromptEngineActionsContext';
import { useRuleItemContext } from '../context/RuleItemContext';

export function RuleItemRawEditor(): React.JSX.Element {
  const { draft } = useRuleItemContext();
  const { handleRuleTextChange } = usePromptEngineActions();

  return (
    <CollapsibleSection
      title={
        <Hint size='xs' uppercase={false} className='font-medium text-gray-200'>
          Raw JSON editor
        </Hint>
      }
      variant='subtle'
      className='mt-2'
    >
      <div className='mt-1 space-y-2'>
        <Textarea
          className='min-h-[180px] font-mono text-[12px]'
          value={draft.text}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleRuleTextChange(draft.uid, event.target.value)
          }
         aria-label='Textarea' title='Textarea'/>
        {draft.error ? <div className='text-xs text-red-300'>{draft.error}</div> : null}
      </div>
    </CollapsibleSection>
  );
}
