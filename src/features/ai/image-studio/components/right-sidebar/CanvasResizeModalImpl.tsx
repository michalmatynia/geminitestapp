'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';

import { type CanvasResizeDirection } from '@/features/ai/image-studio/utils/canvas-resize';
import { Button, FormActions, Input, Label } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';
import { cn } from '@/shared/utils';

import {
  CANVAS_RESIZE_DIRECTION_OPTIONS,
  CANVAS_RESIZE_MIN_PX,
  CANVAS_RESIZE_MAX_PX,
  parseCanvasDimensionInput,
} from './right-sidebar-utils';
import { useRightSidebarCanvasResize } from './useRightSidebarCanvasResize';
import { useRightSidebarContext } from '../RightSidebarContext';

export function CanvasResizeModal(): React.JSX.Element {
  const {
    applyCanvasResize,
    canResizeCanvas,
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    resizeCanvasBusy,
  } = useRightSidebarCanvasResize();
  const { canvasSizeLabel, canvasSizePresetValue, resizeCanvasOpen, closeResizeCanvasModal } =
    useRightSidebarContext();

  const [widthDraft, setWidthDraft] = useState('');
  const [heightDraft, setHeightDraft] = useState('');
  const [direction, setDirection] = useState<CanvasResizeDirection>('down-right');

  useEffect(() => {
    if (resizeCanvasOpen) {
      const [w, h] = canvasSizePresetValue.split('x');
      setWidthDraft(w || String(fallbackCanvasWidthPx));
      setHeightDraft(h || String(fallbackCanvasHeightPx));
      setDirection('down-right');
    }
  }, [resizeCanvasOpen, canvasSizePresetValue, fallbackCanvasWidthPx, fallbackCanvasHeightPx]);

  const widthValue = useMemo(() => parseCanvasDimensionInput(widthDraft), [widthDraft]);
  const heightValue = useMemo(() => parseCanvasDimensionInput(heightDraft), [heightDraft]);

  const directionMeta = useMemo(
    () =>
      CANVAS_RESIZE_DIRECTION_OPTIONS.find((d) => d.value === direction) ??
      CANVAS_RESIZE_DIRECTION_OPTIONS[8]!,
    [direction]
  );

  const canSubmit = useMemo(() => {
    if (!canResizeCanvas) return false;
    if (resizeCanvasBusy) return false;
    if (widthValue === null || heightValue === null) return false;
    return true;
  }, [canResizeCanvas, resizeCanvasBusy, widthValue, heightValue]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit || widthValue === null || heightValue === null) return;
    await applyCanvasResize({
      direction,
      height: heightValue,
      onSuccess: closeResizeCanvasModal,
      width: widthValue,
    });
  }, [
    canSubmit,
    widthValue,
    heightValue,
    direction,
    applyCanvasResize,
    closeResizeCanvasModal,
  ]);

  return (
    <DetailModal
      isOpen={resizeCanvasOpen}
      onClose={closeResizeCanvasModal}
      title='Resize Canvas'
      size='md'
      footer={
        <FormActions
          size='xs'
          onCancel={closeResizeCanvasModal}
          onSave={() => {
            void handleSubmit();
          }}
          cancelText='Cancel'
          saveText='Apply Resize'
          isSaving={resizeCanvasBusy}
          isDisabled={!canSubmit}
          saveLoadingText='Applying...'
        />
      }
    >
      <div className='space-y-4 text-sm text-gray-200'>
        <div className='text-xs text-gray-400'>Current canvas: {canvasSizeLabel}</div>

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
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
                    selected &&
                      'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                  )}
                  title={opt.label}
                  aria-label={opt.label}
                >
                  {opt.arrow}
                </Button>
              );
            })}
          </div>
          <div className='text-[11px] text-gray-500'>{directionMeta.description}</div>
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-400'>
          <div>
            New canvas:{' '}
            {widthValue !== null && heightValue !== null
              ? `${widthValue} x ${heightValue}`
              : 'Invalid dimensions'}
          </div>
          <div className='mt-1'>Direction: {directionMeta.label}</div>
        </div>
      </div>
    </DetailModal>
  );
}
