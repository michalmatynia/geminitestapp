/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button, Input, Label } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';
import { cn } from '@/shared/utils';
import { 
  CANVAS_RESIZE_DIRECTION_OPTIONS, 
  CANVAS_RESIZE_MIN_PX, 
  CANVAS_RESIZE_MAX_PX,
  parseCanvasDimensionInput
} from './right-sidebar-utils';
import { useRightSidebarContext } from '../RightSidebarContext';
import { useProjectsState, useProjectsActions } from '../../context/ProjectsContext';
import { useSlotsState } from '../../context/SlotsContext';
import { useUiState, useUiActions } from '../../context/UiContext';
import { useMaskingState, useMaskingActions } from '../../context/MaskingContext';
import { applyCanvasResizeLocalTransform, type CanvasResizeDirection } from '../../utils/canvas-resize';
import { useToast } from '@/shared/ui';

export function CanvasResizeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { projectId } = useProjectsState();
  const { handleResizeProjectCanvas, resizeProjectCanvasMutation } = useProjectsActions();
  const { workingSlot } = useSlotsState();
  const { maskShapes } = useMaskingState();
  const { setMaskShapes } = useMaskingActions();
  const { canvasImageOffset } = useUiState();
  const { setCanvasImageOffset, getPreviewCanvasImageFrame } = useUiActions();
  const { toast } = useToast();
  const { 
    canvasSizeLabel,
    canvasSizePresetValue,
  } = useRightSidebarContext();

  const [widthDraft, setWidthDraft] = useState('');
  const [heightDraft, setHeightDraft] = useState('');
  const [direction, setDirection] = useState<CanvasResizeDirection>('down-right');

  const fallbackCanvasWidthPx = useMemo(() => workingSlot?.imageFile?.width ?? 1024, [workingSlot]);
  const fallbackCanvasHeightPx = useMemo(() => workingSlot?.imageFile?.height ?? 1024, [workingSlot]);

  useEffect(() => {
    if (isOpen) {
      const [w, h] = canvasSizePresetValue.split('x');
      setWidthDraft(w || String(fallbackCanvasWidthPx));
      setHeightDraft(h || String(fallbackCanvasHeightPx));
      setDirection('down-right');
    }
  }, [isOpen, canvasSizePresetValue, fallbackCanvasWidthPx, fallbackCanvasHeightPx]);

  const widthValue = useMemo(() => parseCanvasDimensionInput(widthDraft), [widthDraft]);
  const heightValue = useMemo(() => parseCanvasDimensionInput(heightDraft), [heightDraft]);

  const directionMeta = useMemo(
    () => CANVAS_RESIZE_DIRECTION_OPTIONS.find(d => d.value === direction) ?? CANVAS_RESIZE_DIRECTION_OPTIONS[8]!,
    [direction]
  );

  const canSubmit = useMemo(() => {
    if (!projectId.trim()) return false;
    if (resizeProjectCanvasMutation.isPending) return false;
    if (widthValue === null || heightValue === null) return false;
    return true;
  }, [projectId, resizeProjectCanvasMutation.isPending, widthValue, heightValue]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit || widthValue === null || heightValue === null) return;

    const normalizedProjectId = projectId.trim();
    const transform = applyCanvasResizeLocalTransform({
      shapes: maskShapes,
      oldCanvasWidth: fallbackCanvasWidthPx,
      oldCanvasHeight: fallbackCanvasHeightPx,
      newCanvasWidth: widthValue,
      newCanvasHeight: heightValue,
      direction,
      currentImageOffset: canvasImageOffset,
      currentImageFrame: getPreviewCanvasImageFrame()?.frame,
      sourceAspectRatio: (workingSlot?.imageFile?.width && workingSlot?.imageFile?.height) 
        ? workingSlot.imageFile.width / workingSlot.imageFile.height 
        : null,
    });

    try {
      await handleResizeProjectCanvas({
        projectId: normalizedProjectId,
        canvasWidthPx: widthValue,
        canvasHeightPx: heightValue,
      });
      setMaskShapes(transform.shapes);
      setCanvasImageOffset(transform.imageOffset);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to resize canvas.', { variant: 'error' });
    }
  }, [canSubmit, widthValue, heightValue, projectId, maskShapes, fallbackCanvasWidthPx, fallbackCanvasHeightPx, direction, canvasImageOffset, getPreviewCanvasImageFrame, workingSlot, handleResizeProjectCanvas, setMaskShapes, setCanvasImageOffset, onClose, toast]);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Resize Canvas'
      size='md'
      footer={
        <div className='flex items-center justify-end gap-2'>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={resizeProjectCanvasMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size='xs'
            type='button'
            onClick={() => { void handleSubmit(); }}
            disabled={!canSubmit}
            loading={resizeProjectCanvasMutation.isPending}
            loadingText='Applying...'
          >
            Apply Resize
          </Button>
        </div>
      }
    >
      <div className='space-y-4 text-sm text-gray-200'>
        <div className='text-xs text-gray-400'>
          Current canvas: {canvasSizeLabel}
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Width (px)</Label>
            <Input
              size='sm'
              type='number'
              min={CANVAS_RESIZE_MIN_PX}
              max={CANVAS_RESIZE_MAX_PX}
              step={1}
              value={widthDraft}
              onChange={(e) => setWidthDraft(e.target.value)}
              className={cn('h-9', widthValue === null && 'border-red-400/60')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSubmit(); } }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Height (px)</Label>
            <Input
              size='sm'
              type='number'
              min={CANVAS_RESIZE_MIN_PX}
              max={CANVAS_RESIZE_MAX_PX}
              step={1}
              value={heightDraft}
              onChange={(e) => setHeightDraft(e.target.value)}
              className={cn('h-9', heightValue === null && 'border-red-400/60')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSubmit(); } }}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Extension Direction</Label>
          <div className='grid grid-cols-3 gap-2'>
            {CANVAS_RESIZE_DIRECTION_OPTIONS.map((opt) => {
              const selected = opt.value === direction;
              return (
                <Button
                  key={opt.value}
                  size='xs'
                  type='button'
                  variant={selected ? 'default' : 'outline'}
                  onClick={() => setDirection(opt.value)}
                  className={cn(
                    'h-10 px-2 text-xs',
                    selected && 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                  )}
                  title={opt.label}
                  aria-label={opt.label}
                >
                  {opt.arrow}
                </Button>
              );
            })}
          </div>
          <div className='text-[11px] text-gray-500'>
            {directionMeta.description}
          </div>
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-400'>
          <div>
            New canvas:{' '}
            {widthValue !== null && heightValue !== null
              ? `${widthValue} x ${heightValue}`
              : 'Invalid dimensions'}
          </div>
          <div className='mt-1'>
            Direction: {directionMeta.label}
          </div>
        </div>
      </div>
    </DetailModal>
  );
}
