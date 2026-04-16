'use client';

import { Eye, EyeOff } from 'lucide-react';
import { memo } from 'react';
import { useProductListHeaderActionsContext } from '@/features/products/context/ProductListContext';
import { Button } from '@/shared/ui/button';

const NOOP_SET_SHOW_TRIGGER_RUN_FEEDBACK = (_nextValue: boolean): void => {};

const FALLBACK_HEADER_ACTIONS_CONTEXT = {
  showTriggerRunFeedback: false,
  setShowTriggerRunFeedback: NOOP_SET_SHOW_TRIGGER_RUN_FEEDBACK,
} as const;

export const TriggerRunFeedbackHeader: React.FC = memo(() => {
  let showTriggerRunFeedback: boolean = FALLBACK_HEADER_ACTIONS_CONTEXT.showTriggerRunFeedback;
  let setShowTriggerRunFeedback = FALLBACK_HEADER_ACTIONS_CONTEXT.setShowTriggerRunFeedback;
  let isContextAvailable = true;

  try {
    const context = useProductListHeaderActionsContext();
    showTriggerRunFeedback = context.showTriggerRunFeedback;
    setShowTriggerRunFeedback = context.setShowTriggerRunFeedback;
  } catch {
    isContextAvailable = false;
  }

  return (
    <div className='flex justify-center'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        disabled={!isContextAvailable}
        onClick={() => setShowTriggerRunFeedback(!showTriggerRunFeedback)}
        aria-label={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
        title={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
        className='h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground'
      >
        {showTriggerRunFeedback ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
        <span>{showTriggerRunFeedback ? 'Hide Statuses' : 'Show Statuses'}</span>
      </Button>
    </div>
  );
});

TriggerRunFeedbackHeader.displayName = 'TriggerRunFeedbackHeader';
