'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  Button,
  CopyButton,
  TabsList,
  TabsTrigger,
  Tooltip,
} from '@/shared/ui';

import type { PreviewCanvasSize } from '../context/UiContext';
import { ToggleButtonGroup } from './ToggleButtonGroup';

const PREVIEW_CANVAS_SIZE_OPTIONS: Array<{ value: PreviewCanvasSize; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'XLarge' },
];

type ImageStudioWorkspaceHeaderProps = {
  activeTab: string;
  hideTopBar: boolean;
  returnToPath: string | null;
  onReturnToProductStudio: () => void;
  children?: React.ReactNode;
};

export function ImageStudioWorkspaceHeader({
  activeTab,
  hideTopBar,
  returnToPath,
  onReturnToProductStudio,
  children,
}: ImageStudioWorkspaceHeaderProps): React.JSX.Element {
  const handleReturnToProductStudio = onReturnToProductStudio;
  const tabsList = (
    <TabsList className='bg-card' aria-label='Image studio workspace tabs'>
      <TabsTrigger value='studio'>Studio</TabsTrigger>
      <TabsTrigger value='projects'>Projects</TabsTrigger>
      <TabsTrigger value='settings'>Settings</TabsTrigger>
      <TabsTrigger value='prompts'>Prompts</TabsTrigger>
      <TabsTrigger value='docs'>Docs</TabsTrigger>
    </TabsList>
  );
  const showReturnButton = activeTab === 'studio' && !!returnToPath;

  return (
    <div className={hideTopBar ? 'border-b bg-muted/40 px-1 py-1.5' : 'border-b bg-muted/40 px-1 py-2'}>
      <div className={hideTopBar ? 'flex items-center gap-2' : 'flex items-center gap-3'}>
        {tabsList}
        {showReturnButton ? (
          <Button
            type='button'
            size='xs'
            variant='outline'
            className='h-7'
            onClick={handleReturnToProductStudio}
          >
            Back To Product Studio
          </Button>
        ) : null}
        {hideTopBar ? null : (
          <div className='ml-auto flex min-w-0 flex-col items-end gap-1 text-right'>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageStudioWorkspaceStudioControls({
  previewCanvasSize,
  onPreviewCanvasSizeChange,
}: {
  previewCanvasSize: PreviewCanvasSize;
  onPreviewCanvasSizeChange: (value: PreviewCanvasSize) => void;
}): React.JSX.Element {
  return (
    <div className='flex min-w-0 items-center justify-end gap-2'>
      <div className='flex items-center gap-2'>
        <span className='text-[10px] uppercase tracking-wide text-muted-foreground'>Canvas</span>
        <ToggleButtonGroup
          value={previewCanvasSize}
          onChange={onPreviewCanvasSizeChange}
          options={PREVIEW_CANVAS_SIZE_OPTIONS}
          className='text-[11px] text-muted-foreground'
          size='xs'
        />
      </div>
      <span className='size-7 shrink-0 opacity-0 pointer-events-none' aria-hidden='true' />
    </div>
  );
}

export function ImageStudioWorkspaceSlotInfo({
  selectedSlot,
  copyCardNameTooltip,
  selectCardFirstTooltip,
}: {
  selectedSlot: ImageStudioSlotRecord | null;
  copyCardNameTooltip: string;
  selectCardFirstTooltip: string;
}): React.JSX.Element {
  const selectedSlotLabel = selectedSlot
    ? selectedSlot.name || selectedSlot.id
    : 'No active card selected. Pick a card from the tree.';

  return (
    <div className='flex min-w-0 items-center justify-end gap-2'>
      <span className='w-[280px] shrink-0 truncate text-left text-xs text-muted-foreground'>
        {selectedSlotLabel}
      </span>
      <Tooltip content={selectedSlot ? copyCardNameTooltip : selectCardFirstTooltip}>
        <CopyButton
          value={selectedSlot?.name?.trim() || selectedSlot?.id || ''}
          variant='ghost'
          size='sm'
          className='size-7 shrink-0'
          disabled={!selectedSlot?.id}
        />
      </Tooltip>
    </div>
  );
}
