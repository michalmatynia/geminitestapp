'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui';

export type RightSidebarPromptControlHeaderRuntimeValue = {
  onClose: () => void;
  onOpenPromptExploder: () => void;
  onSave: () => void;
  projectId: string;
  promptSaveBusy: boolean;
  promptText: string;
};

const {
  Context: RightSidebarPromptControlHeaderRuntimeContext,
  useStrictContext: useRightSidebarPromptControlHeaderRuntime,
} = createStrictContext<RightSidebarPromptControlHeaderRuntimeValue>({
  hookName: 'useRightSidebarPromptControlHeaderRuntime',
  providerName: 'RightSidebarPromptControlHeaderRuntimeProvider',
  displayName: 'RightSidebarPromptControlHeaderRuntimeContext',
});

export { RightSidebarPromptControlHeaderRuntimeContext };

export function RightSidebarPromptControlHeader(): React.JSX.Element {
  const runtime = useRightSidebarPromptControlHeaderRuntime();

  return (
    <div className='flex items-center justify-between gap-3'>
      <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
        <Button
          type='button'
          onClick={runtime.onSave}
          disabled={runtime.promptSaveBusy || !runtime.projectId.trim()}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {runtime.promptSaveBusy ? 'Saving...' : 'Save'}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>Control Prompt</h2>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          size='xs'
          type='button'
          variant='outline'
          title='Open Prompt Exploder with current prompt'
          aria-label='Open Prompt Exploder with current prompt'
          disabled={!runtime.promptText.trim()}
          onClick={runtime.onOpenPromptExploder}
        >
          Prompt Exploder
        </Button>
        <Button
          type='button'
          onClick={runtime.onClose}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          Close
        </Button>
      </div>
    </div>
  );
}
