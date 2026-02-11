'use client';

import { cn } from '@/shared/utils';

import { CenterPreview } from './CenterPreview';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

interface StudioMainContentProps {
  isFocusMode: boolean;
  onFocusModeChange: (value: boolean) => void;
  maskPreviewEnabled: boolean;
  onMaskPreviewChange: (value: boolean) => void;
}

export function StudioMainContent({
  isFocusMode,
  onFocusModeChange,
  maskPreviewEnabled,
  onMaskPreviewChange,
}: StudioMainContentProps): React.JSX.Element {

  return (
    <div className='relative flex h-full min-h-0 flex-1'>
      <div
        className={cn(
          'grid h-full min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-in-out',
          isFocusMode ? 'grid-cols-[0px_1fr_0px] gap-0' : 'grid-cols-[300px_1fr_420px] gap-4'
        )}
      >
        <LeftSidebar isFocusMode={isFocusMode} />
        <CenterPreview
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => onFocusModeChange(!isFocusMode)}
          maskPreviewEnabled={maskPreviewEnabled}
          onMaskPreviewChange={onMaskPreviewChange}
        />
        <RightSidebar
          isFocusMode={isFocusMode}
          maskPreviewEnabled={maskPreviewEnabled}
        />
      </div>
    </div>
  );
}
