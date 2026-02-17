import React from 'react';

import { Button } from '@/shared/ui';

type RightSidebarPromptControlHeaderProps = {
  onClose: () => void;
  onOpenPromptExploder: () => void;
  onSave: () => void;
  projectId: string;
  promptSaveBusy: boolean;
  promptText: string;
};

export function RightSidebarPromptControlHeader({
  onClose,
  onOpenPromptExploder,
  onSave,
  projectId,
  promptSaveBusy,
  promptText,
}: RightSidebarPromptControlHeaderProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-4'>
        <Button
          type='button'
          onClick={onSave}
          disabled={promptSaveBusy || !projectId.trim()}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {promptSaveBusy ? 'Saving...' : 'Save'}
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
          disabled={!promptText.trim()}
          onClick={onOpenPromptExploder}
        >
          Prompt Exploder
        </Button>
        <Button
          type='button'
          onClick={onClose}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          Close
        </Button>
      </div>
    </div>
  );
}
