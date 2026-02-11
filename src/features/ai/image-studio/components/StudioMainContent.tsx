'use client';

import { cn } from '@/shared/utils';

import { CenterPreview } from './CenterPreview';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useUiState } from '../context/UiContext';

export function StudioMainContent(): React.JSX.Element {
  const { isFocusMode } = useUiState();

  return (
    <div className='relative flex h-full min-h-0 flex-1'>
      <div
        className={cn(
          'grid h-full min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-in-out',
          isFocusMode ? 'grid-cols-[0px_1fr_0px] gap-0' : 'grid-cols-[300px_1fr_420px] gap-4'
        )}
      >
        <LeftSidebar />
        <CenterPreview />
        <RightSidebar />
      </div>
    </div>
  );
}
