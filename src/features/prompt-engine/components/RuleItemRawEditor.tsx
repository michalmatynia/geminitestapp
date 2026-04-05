import React from 'react';

import { CollapsibleSection, Textarea } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';

import { useRuleItemContext } from './context/RuleItemContext';
import { usePromptEngineActions } from '../context/PromptEngineContext';

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
          aria-label='Textarea'
          title='Textarea'
        />
        {draft.error ? <div className='text-xs text-red-300'>{draft.error}</div> : null}
      </div>
    </CollapsibleSection>
  );
}
