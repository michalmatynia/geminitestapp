'use client';

import {
  PenLine,
  Trash2,
} from 'lucide-react';
import React, { useCallback } from 'react';

import type {
  TextEffect,
  DragAxis,
  VelocityEffect,
} from '@/features/gsap';
import {
  DEFAULT_ANIMATION_CONFIG,
  TEXT_EFFECTS,
  DRAG_AXES,
  VELOCITY_EFFECTS,
} from '@/features/gsap';
import {
  Button,
  Checkbox,
  Input,
  Tooltip,
  SelectSimple,
  FormSection,
  FormField,
  type VectorShape,
} from '@/shared/ui';

import { AdvancedObserverMagnetSection } from './AdvancedObserverMagnetSection';
import { useAnimationConfigContext } from './AnimationConfigContext';

import type { VectorOverlayResult } from '../../../hooks/usePageBuilderContext';


const EMPTY_SHAPES: VectorShape[] = [];

export function AdvancedSection(): React.ReactNode {
  const { config, onChange, openVectorOverlay } = useAnimationConfigContext();
  const motionPathEnabledValue = config.motionPathEnabled ?? DEFAULT_ANIMATION_CONFIG.motionPathEnabled ?? false;
  const motionPathPathValue = config.motionPathPath ?? DEFAULT_ANIMATION_CONFIG.motionPathPath ?? '';
  const motionPathAlignValue = config.motionPathAlign ?? DEFAULT_ANIMATION_CONFIG.motionPathAlign ?? true;
  const motionPathAutoRotateValue = config.motionPathAutoRotate ?? DEFAULT_ANIMATION_CONFIG.motionPathAutoRotate ?? true;
  const motionPathRotateOffsetValue = config.motionPathRotateOffset ?? DEFAULT_ANIMATION_CONFIG.motionPathRotateOffset ?? 0;
  const motionPathStartValue = config.motionPathStart ?? DEFAULT_ANIMATION_CONFIG.motionPathStart ?? 0;
  const motionPathEndValue = config.motionPathEnd ?? DEFAULT_ANIMATION_CONFIG.motionPathEnd ?? 1;
  const motionPathFollowValue = config.motionPathFollow ?? DEFAULT_ANIMATION_CONFIG.motionPathFollow ?? false;
  const motionPathSpacingValue = config.motionPathSpacing ?? DEFAULT_ANIMATION_CONFIG.motionPathSpacing ?? 0.08;
  const motionPathShapesValue = config.motionPathShapes ?? DEFAULT_ANIMATION_CONFIG.motionPathShapes ?? EMPTY_SHAPES;
  const svgDrawEnabledValue = config.svgDrawEnabled ?? DEFAULT_ANIMATION_CONFIG.svgDrawEnabled ?? false;
  const svgDrawSelectorValue = config.svgDrawSelector ?? DEFAULT_ANIMATION_CONFIG.svgDrawSelector ?? 'path';
  const svgDrawFromValue = config.svgDrawFrom ?? DEFAULT_ANIMATION_CONFIG.svgDrawFrom ?? 0;
  const svgDrawToValue = config.svgDrawTo ?? DEFAULT_ANIMATION_CONFIG.svgDrawTo ?? 100;
  const svgDrawPathValue = config.svgDrawPath ?? DEFAULT_ANIMATION_CONFIG.svgDrawPath ?? '';
  const svgDrawShapesValue = config.svgDrawShapes ?? DEFAULT_ANIMATION_CONFIG.svgDrawShapes ?? EMPTY_SHAPES;
  const svgMorphEnabledValue = config.svgMorphEnabled ?? DEFAULT_ANIMATION_CONFIG.svgMorphEnabled ?? false;
  const svgMorphSelectorValue = config.svgMorphSelector ?? DEFAULT_ANIMATION_CONFIG.svgMorphSelector ?? 'path';
  const svgMorphToValue = config.svgMorphTo ?? DEFAULT_ANIMATION_CONFIG.svgMorphTo ?? '';
  const svgMorphShapesValue = config.svgMorphShapes ?? DEFAULT_ANIMATION_CONFIG.svgMorphShapes ?? EMPTY_SHAPES;
  const textEffectValue = config.textEffect ?? DEFAULT_ANIMATION_CONFIG.textEffect ?? 'none';
  const textStaggerValue = config.textStagger ?? DEFAULT_ANIMATION_CONFIG.textStagger ?? 0.05;
  const textScrambleCharsValue = config.textScrambleChars ?? DEFAULT_ANIMATION_CONFIG.textScrambleChars ?? '';
  const textTypingSpeedValue = config.textTypingSpeed ?? DEFAULT_ANIMATION_CONFIG.textTypingSpeed ?? 24;
  const textCursorValue = config.textCursor ?? DEFAULT_ANIMATION_CONFIG.textCursor ?? false;
  const textCountFromValue = config.textCountFrom ?? DEFAULT_ANIMATION_CONFIG.textCountFrom ?? 0;
  const textCountToValue = config.textCountTo ?? DEFAULT_ANIMATION_CONFIG.textCountTo ?? 100;
  const textCountDecimalsValue = config.textCountDecimals ?? DEFAULT_ANIMATION_CONFIG.textCountDecimals ?? 0;
  const draggableEnabledValue = config.draggableEnabled ?? DEFAULT_ANIMATION_CONFIG.draggableEnabled ?? false;
  const draggableTypeValue = config.draggableType ?? DEFAULT_ANIMATION_CONFIG.draggableType ?? 'x,y';
  const draggableBoundsValue = config.draggableBounds ?? DEFAULT_ANIMATION_CONFIG.draggableBounds ?? '';
  const draggableMomentumValue = config.draggableMomentum ?? DEFAULT_ANIMATION_CONFIG.draggableMomentum ?? false;
  const draggableMomentumFactorValue = config.draggableMomentumFactor ?? DEFAULT_ANIMATION_CONFIG.draggableMomentumFactor ?? 0.6;
  const draggableSnapValue = config.draggableSnap ?? DEFAULT_ANIMATION_CONFIG.draggableSnap ?? 0;
  const draggableCarouselValue = config.draggableCarousel ?? DEFAULT_ANIMATION_CONFIG.draggableCarousel ?? false;
  const draggableCarouselSelectorValue =
    config.draggableCarouselSelector ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSelector ?? '';
  const draggableCarouselSnapValue =
    config.draggableCarouselSnap ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSnap ?? true;
  const velocityEffectValue = config.velocityEffect ?? DEFAULT_ANIMATION_CONFIG.velocityEffect ?? 'none';
  const velocityStrengthValue = config.velocityStrength ?? DEFAULT_ANIMATION_CONFIG.velocityStrength ?? 0.15;
  const velocityMaxValue = config.velocityMax ?? DEFAULT_ANIMATION_CONFIG.velocityMax ?? 20;

  // Motion path handlers
  const handleMotionPathEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, motionPathEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, motionPathPath: e.target.value });
    },
    [config, onChange]
  );

  const handleMotionPathDraw = useCallback((): void => {
    openVectorOverlay({
      title: 'Motion Path',
      description: 'Draw the motion path directly on the preview canvas.',
      initialShapes: motionPathShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, motionPathEnabled: true, motionPathPath: path, motionPathShapes: shapes });
      },
    });
  }, [config, motionPathShapesValue, onChange, openVectorOverlay]);

  const handleMotionPathClear = useCallback((): void => {
    onChange({ ...config, motionPathPath: '', motionPathShapes: [] });
  }, [config, onChange]);

  const handleMotionPathAlignChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, motionPathAlign: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathAutoRotateChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, motionPathAutoRotate: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathRotateOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathRotateOffset: Math.max(-360, Math.min(360, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathStart: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathEnd: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathFollowChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, motionPathFollow: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathSpacingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathSpacing: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  // SVG Draw handlers
  const handleSvgDrawEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, svgDrawEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleSvgDrawSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgDrawSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgDrawFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, svgDrawFrom: Math.max(0, Math.min(100, val)) });
      }
    },
    [config, onChange]
  );

  const handleSvgDrawToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, svgDrawTo: Math.max(0, Math.min(100, val)) });
      }
    },
    [config, onChange]
  );

  const handleSvgDrawPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgDrawPath: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgDrawCanvas = useCallback((): void => {
    openVectorOverlay({
      title: 'SVG Draw Path',
      description: 'Draw a custom SVG path to animate stroke drawing.',
      initialShapes: svgDrawShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgDrawEnabled: true, svgDrawPath: path, svgDrawShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgDrawShapesValue]);

  const handleSvgDrawClear = useCallback((): void => {
    onChange({ ...config, svgDrawPath: '', svgDrawShapes: [] });
  }, [config, onChange]);

  // SVG Morph handlers
  const handleSvgMorphEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, svgMorphEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleSvgMorphSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgMorphSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgMorphToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgMorphTo: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgMorphDraw = useCallback((): void => {
    openVectorOverlay({
      title: 'SVG Morph Target',
      description: 'Draw the target path for morphing.',
      initialShapes: svgMorphShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgMorphEnabled: true, svgMorphTo: path, svgMorphShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgMorphShapesValue]);

  const handleSvgMorphClear = useCallback((): void => {
    onChange({ ...config, svgMorphTo: '', svgMorphShapes: [] });
  }, [config, onChange]);

  // Text effect handlers
  const handleTextEffectChange = useCallback(
    (value: string) => {
      onChange({ ...config, textEffect: value as TextEffect });
    },
    [config, onChange]
  );

  const handleTextStaggerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textStagger: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleTextScrambleCharsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, textScrambleChars: e.target.value });
    },
    [config, onChange]
  );

  const handleTextTypingSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textTypingSpeed: Math.max(4, Math.min(120, val)) });
      }
    },
    [config, onChange]
  );

  const handleTextCursorChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, textCursor: checked === true });
    },
    [config, onChange]
  );

  const handleTextCountFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountFrom: val });
      }
    },
    [config, onChange]
  );

  const handleTextCountToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountTo: val });
      }
    },
    [config, onChange]
  );

  const handleTextCountDecimalsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountDecimals: Math.max(0, Math.min(6, val)) });
      }
    },
    [config, onChange]
  );

  // Draggable handlers
  const handleDraggableEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, draggableEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableTypeChange = useCallback(
    (value: string) => {
      onChange({ ...config, draggableType: value as DragAxis });
    },
    [config, onChange]
  );

  const handleDraggableBoundsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, draggableBounds: e.target.value });
    },
    [config, onChange]
  );

  const handleDraggableMomentumChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, draggableMomentum: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableMomentumFactorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, draggableMomentumFactor: Math.max(0.1, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleDraggableSnapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, draggableSnap: Math.max(0, Math.min(200, val)) });
      }
    },
    [config, onChange]
  );

  const handleDraggableCarouselChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, draggableCarousel: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableCarouselSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, draggableCarouselSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleDraggableCarouselSnapChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, draggableCarouselSnap: checked === true });
    },
    [config, onChange]
  );

  // Velocity handlers
  const handleVelocityEffectChange = useCallback(
    (value: string) => {
      onChange({ ...config, velocityEffect: value as VelocityEffect });
    },
    [config, onChange]
  );

  const handleVelocityStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, velocityStrength: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleVelocityMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, velocityMax: Math.max(1, Math.min(60, val)) });
      }
    },
    [config, onChange]
  );

  return (
    <>
      {/* Motion Path */}
      <FormSection
        title='Motion Path'
        variant='subtle-compact'
        actions={<Checkbox checked={motionPathEnabledValue} onCheckedChange={handleMotionPathEnabledChange} />}
        className='p-3 space-y-4'
      >
        {motionPathEnabledValue && (
          <div className='mt-4 space-y-4'>
            <FormField label='Path / Selector'>
              <div className='flex items-center gap-2'>
                <Input
                  value={motionPathPathValue}
                  onChange={handleMotionPathPathChange}
                  placeholder='SVG path data or selector (#path)'
                  className='flex-1 text-xs font-mono h-9'
                />
                <Tooltip content='Draw path on canvas'>
                  <Button
                    type='button'
                    size='icon'
                    variant='outline'
                    onClick={handleMotionPathDraw}
                    className='h-9 w-9'
                  >
                    <PenLine className='size-4' />
                  </Button>
                </Tooltip>
                <Tooltip content='Clear path'>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={handleMotionPathClear}
                    disabled={!motionPathPathValue && motionPathShapesValue.length === 0}
                    className='h-9 w-9'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </Tooltip>
              </div>
            </FormField>

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Start (0-1)'>
                <Input
                  type='number'
                  min={0}
                  max={1}
                  step={0.01}
                  value={motionPathStartValue}
                  onChange={handleMotionPathStartChange}
                  className='h-9'
                />
              </FormField>
              <FormField label='End (0-1)'>
                <Input
                  type='number'
                  min={0}
                  max={1}
                  step={0.01}
                  value={motionPathEndValue}
                  onChange={handleMotionPathEndChange}
                  className='h-9'
                />
              </FormField>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='flex items-center gap-2'>
                <Checkbox checked={motionPathAlignValue} onCheckedChange={handleMotionPathAlignChange} />
                <span className='text-xs text-gray-300'>Align to path</span>
              </div>
              <div className='flex items-center gap-2'>
                <Checkbox checked={motionPathAutoRotateValue} onCheckedChange={handleMotionPathAutoRotateChange} />
                <span className='text-xs text-gray-300'>Auto rotate</span>
              </div>
            </div>

            {motionPathAutoRotateValue && (
              <FormField label='Rotate offset (deg)'>
                <Input
                  type='number'
                  min={-360}
                  max={360}
                  step={1}
                  value={motionPathRotateOffsetValue}
                  onChange={handleMotionPathRotateOffsetChange}
                  className='h-9'
                />
              </FormField>
            )}

            <div className='grid gap-3 sm:grid-cols-2 items-end'>
              <div className='flex items-center gap-2 mb-2'>
                <Checkbox checked={motionPathFollowValue} onCheckedChange={handleMotionPathFollowChange} />
                <span className='text-xs text-gray-300'>Follow path (multi)</span>
              </div>
              {motionPathFollowValue && (
                <FormField label='Spacing (0-1)'>
                  <Input
                    type='number'
                    min={0}
                    max={1}
                    step={0.01}
                    value={motionPathSpacingValue}
                    onChange={handleMotionPathSpacingChange}
                    className='h-9'
                  />
                </FormField>
              )}
            </div>
          </div>
        )}
      </FormSection>

      {/* SVG Effects */}
      <FormSection title='SVG Effects' variant='subtle-compact' className='p-3 space-y-4'>
        <div className='space-y-4 mt-4'>
          <div className='flex items-center gap-2'>
            <Checkbox checked={svgDrawEnabledValue} onCheckedChange={handleSvgDrawEnabledChange} />
            <span className='text-xs text-gray-300'>Draw SVG strokes</span>
          </div>
          {svgDrawEnabledValue && (
            <div className='space-y-4 pl-2 border-l border-border/40'>
              <FormField label='Target selector'>
                <Input
                  value={svgDrawSelectorValue}
                  onChange={handleSvgDrawSelectorChange}
                  placeholder='path, line, circle'
                  className='h-9'
                />
              </FormField>
              <FormField label='Custom path'>
                <div className='flex items-center gap-2'>
                  <Input
                    value={svgDrawPathValue}
                    onChange={handleSvgDrawPathChange}
                    placeholder='Draw or paste SVG path'
                    className='flex-1 text-xs font-mono h-9'
                  />
                  <Tooltip content='Draw path on canvas'>
                    <Button type='button' size='icon' variant='outline' onClick={handleSvgDrawCanvas} className='h-9 w-9'>
                      <PenLine className='size-4' />
                    </Button>
                  </Tooltip>
                  <Tooltip content='Clear path'>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      onClick={handleSvgDrawClear}
                      disabled={!svgDrawPathValue && svgDrawShapesValue.length === 0}
                      className='h-9 w-9'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </Tooltip>
                </div>
              </FormField>
              <div className='grid gap-3 sm:grid-cols-2'>
                <FormField label='From %'>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    step={1}
                    value={svgDrawFromValue}
                    onChange={handleSvgDrawFromChange}
                    className='h-9'
                  />
                </FormField>
                <FormField label='To %'>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    step={1}
                    value={svgDrawToValue}
                    onChange={handleSvgDrawToChange}
                    className='h-9'
                  />
                </FormField>
              </div>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <Checkbox checked={svgMorphEnabledValue} onCheckedChange={handleSvgMorphEnabledChange} />
            <span className='text-xs text-gray-300'>Morph SVG path (basic)</span>
          </div>
          {svgMorphEnabledValue && (
            <div className='space-y-4 pl-2 border-l border-border/40'>
              <FormField label='Target selector'>
                <Input
                  value={svgMorphSelectorValue}
                  onChange={handleSvgMorphSelectorChange}
                  placeholder='path'
                  className='h-9'
                />
              </FormField>
              <FormField label='Target path'>
                <div className='flex items-center gap-2'>
                  <Input
                    value={svgMorphToValue}
                    onChange={handleSvgMorphToChange}
                    placeholder='Target path data or selector (#path)'
                    className='flex-1 text-xs font-mono h-9'
                  />
                  <Tooltip content='Draw path on canvas'>
                    <Button type='button' size='icon' variant='outline' onClick={handleSvgMorphDraw} className='h-9 w-9'>
                      <PenLine className='size-4' />
                    </Button>
                  </Tooltip>
                  <Tooltip content='Clear path'>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      onClick={handleSvgMorphClear}
                      disabled={!svgMorphToValue && svgMorphShapesValue.length === 0}
                      className='h-9 w-9'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </Tooltip>
                </div>
              </FormField>
            </div>
          )}
        </div>
      </FormSection>

      {/* Text Effects */}
      <FormSection title='Text Effects' variant='subtle-compact' className='p-3 space-y-4'>
        <FormField label='Mode'>
          <SelectSimple size='sm'
            value={textEffectValue}
            onValueChange={handleTextEffectChange}
            options={TEXT_EFFECTS}
          />
        </FormField>

        {textEffectValue !== 'none' && (
          <div className='mt-4 space-y-4'>
            {(textEffectValue === 'splitChars' ||
              textEffectValue === 'splitWords' ||
              textEffectValue === 'splitLines') && (
              <FormField label='Stagger (seconds)'>
                <Input
                  type='number'
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={textStaggerValue}
                  onChange={handleTextStaggerChange}
                  className='h-9'
                />
              </FormField>
            )}

            {textEffectValue === 'scramble' && (
              <FormField label='Scramble chars'>
                <Input
                  value={textScrambleCharsValue}
                  onChange={handleTextScrambleCharsChange}
                  className='h-9'
                />
              </FormField>
            )}

            {textEffectValue === 'typing' && (
              <>
                <FormField label='Typing speed (chars/sec)'>
                  <Input
                    type='number'
                    min={4}
                    max={120}
                    step={1}
                    value={textTypingSpeedValue}
                    onChange={handleTextTypingSpeedChange}
                    className='h-9'
                  />
                </FormField>
                <div className='flex items-center gap-2'>
                  <Checkbox checked={textCursorValue} onCheckedChange={handleTextCursorChange} />
                  <span className='text-xs text-gray-300'>Show cursor</span>
                </div>
              </>
            )}

            {textEffectValue === 'countUp' && (
              <div className='grid gap-3 sm:grid-cols-2'>
                <FormField label='From'>
                  <Input
                    type='number'
                    value={textCountFromValue}
                    onChange={handleTextCountFromChange}
                    className='h-9'
                  />
                </FormField>
                <FormField label='To'>
                  <Input
                    type='number'
                    value={textCountToValue}
                    onChange={handleTextCountToChange}
                    className='h-9'
                  />
                </FormField>
                <FormField label='Decimals'>
                  <Input
                    type='number'
                    min={0}
                    max={6}
                    step={1}
                    value={textCountDecimalsValue}
                    onChange={handleTextCountDecimalsChange}
                    className='h-9'
                  />
                </FormField>
              </div>
            )}
          </div>
        )}
      </FormSection>

      {/* Velocity-based FX */}
      <FormSection title='Velocity FX' variant='subtle-compact' className='p-3 space-y-4'>
        <FormField label='Effect'>
          <SelectSimple size='sm'
            value={velocityEffectValue}
            onValueChange={handleVelocityEffectChange}
            options={VELOCITY_EFFECTS}
          />
        </FormField>
        {velocityEffectValue !== 'none' && (
          <div className='grid gap-3 sm:grid-cols-2 mt-4'>
            <FormField label='Strength'>
              <Input
                type='number'
                min={0.01}
                max={2}
                step={0.01}
                value={velocityStrengthValue}
                onChange={handleVelocityStrengthChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Max limit'>
              <Input
                type='number'
                min={1}
                max={60}
                step={1}
                value={velocityMaxValue}
                onChange={handleVelocityMaxChange}
                className='h-9'
              />
            </FormField>
          </div>
        )}
      </FormSection>

      {/* Draggable */}
      <FormSection
        title='Draggable'
        variant='subtle-compact'
        actions={<Checkbox checked={draggableEnabledValue} onCheckedChange={handleDraggableEnabledChange} />}
        className='p-3 space-y-4'
      >
        {draggableEnabledValue && (
          <div className='mt-4 space-y-4'>
            <FormField label='Axis'>
              <SelectSimple size='sm'
                value={draggableTypeValue}
                onValueChange={handleDraggableTypeChange}
                options={DRAG_AXES}
              />
            </FormField>

            <FormField label='Bounds selector'>
              <Input
                value={draggableBoundsValue}
                onChange={handleDraggableBoundsChange}
                placeholder='e.g. .container'
                className='h-9'
              />
            </FormField>

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Snap (px)'>
                <Input
                  type='number'
                  min={0}
                  max={200}
                  step={1}
                  value={draggableSnapValue}
                  onChange={handleDraggableSnapChange}
                  className='h-9'
                />
              </FormField>
              <FormField label='Momentum factor'>
                <Input
                  type='number'
                  min={0.1}
                  max={2}
                  step={0.05}
                  value={draggableMomentumFactorValue}
                  onChange={handleDraggableMomentumFactorChange}
                  className='h-9'
                />
              </FormField>
            </div>

            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <Checkbox checked={draggableMomentumValue} onCheckedChange={handleDraggableMomentumChange} />
                <span className='text-xs text-gray-300'>Enable momentum</span>
              </div>
              <div className='flex items-center gap-2'>
                <Checkbox checked={draggableCarouselValue} onCheckedChange={handleDraggableCarouselChange} />
                <span className='text-xs text-gray-300'>Carousel mode</span>
              </div>
            </div>

            {draggableCarouselValue && (
              <div className='space-y-4 pl-2 border-l border-border/40'>
                <FormField label='Track selector'>
                  <Input
                    value={draggableCarouselSelectorValue}
                    onChange={handleDraggableCarouselSelectorChange}
                    placeholder='e.g. .track'
                    className='h-9'
                  />
                </FormField>
                <div className='flex items-center gap-2'>
                  <Checkbox checked={draggableCarouselSnapValue} onCheckedChange={handleDraggableCarouselSnapChange} />
                  <span className='text-xs text-gray-300'>Snap to items</span>
                </div>
              </div>
            )}
          </div>
        )}
      </FormSection>

      <AdvancedObserverMagnetSection config={config} onChange={onChange} />
    </>
  );
}
