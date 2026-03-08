'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/shared/ui';
import { ToggleButtonGroup } from '../../ToggleButtonGroup';
import { useSlotsState, useSlotsActions } from '@/features/ai/image-studio/context/SlotsContext';
import { useCenterPreviewContext } from '../CenterPreviewContext';
import { useCenterPreviewHeaderContext } from './CenterPreviewHeaderContext';

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;

export function CenterPreviewHeader(): React.JSX.Element {
  const { workingSlot, previewMode } = useSlotsState();
  const { setPreviewMode } = useSlotsActions();
  const { screenshotBusy } = useCenterPreviewContext();
  const { onSaveScreenshot } = useCenterPreviewHeaderContext();

  return (
    <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2'>
      <div className='flex items-center gap-2'>
        {workingSlot?.asset3dId ? (
          <ToggleButtonGroup
            value={previewMode}
            onChange={setPreviewMode}
            options={PREVIEW_MODE_OPTIONS}
            className='text-[11px] text-gray-300'
          />
        ) : null}
        {previewMode === '3d' && workingSlot ? (
          <Button
            size='xs'
            variant='outline'
            onClick={onSaveScreenshot}
            disabled={screenshotBusy}
            title='Capture current 3D frame and attach it to this slot'
            loading={screenshotBusy}
          >
            <Camera className='mr-2 size-4' />
            Save Shot
          </Button>
        ) : null}
      </div>
      <div />
      <div />
    </div>
  );
}
