'use client';

import React from 'react';
import { Textarea, CollapsibleSection, Hint } from '@/shared/ui';
import { useRuleItemContext } from '../context/RuleItemContext';
import { usePromptEngine } from '../../context/PromptEngineContext';

export function RuleItemRawEditor(): React.JSX.Element {
  const { draft } = useRuleItemContext();
  const { handleRuleTextChange } = usePromptEngine();

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
        />
        {draft.error ? <div className='text-xs text-red-300'>{draft.error}</div> : null}
      </div>
    </CollapsibleSection>
  );
}
