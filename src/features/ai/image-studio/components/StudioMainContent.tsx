'use client';

import { cn } from '@/shared/utils';

import { CenterPreview } from './CenterPreview';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useUiState } from '../context/UiContext';

export function StudioMainContent(): React.JSX.Element {
  const { isFocusMode } = useUiState();

  return (
    <div className='relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
      <div
        className={cn(
          'grid h-full min-h-0 min-w-0 flex-1 items-stretch overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out',
          isFocusMode
            ? 'grid-cols-[0px_minmax(0,1fr)_0px] gap-0'
            : 'grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,420px)] gap-4'
        )}
      >
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <LeftSidebar />
        </div>
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <CenterPreview />
        </div>
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
