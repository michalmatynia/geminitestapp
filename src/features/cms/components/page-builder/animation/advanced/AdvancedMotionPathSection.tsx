'use client';

import { PenLine, Trash2 } from 'lucide-react';
import React from 'react';

import type { VectorOverlayResult } from '@/features/cms/hooks/usePageBuilderContext';
import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap/public';
import { type VectorShape } from '@/shared/contracts/vector';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { Button, Checkbox, Input, Tooltip } from '@/shared/ui/primitives.public';
import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';

import { useAnimationConfigActions, useAnimationConfigState } from '../AnimationConfigContext';


const EMPTY_SHAPES: VectorShape[] = [];

export function AdvancedMotionPathSection(): React.JSX.Element {
  const { config } = useAnimationConfigState();
  const { onChange, openVectorOverlay } = useAnimationConfigActions();

  const drawPathTooltip =
    getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'animation_draw_path_canvas') ??
    'Draw path on canvas';
  const clearPathTooltip =
    getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'animation_clear_path_canvas') ??
    'Clear path';

  const motionPathEnabledValue =
    config.motionPathEnabled ?? DEFAULT_ANIMATION_CONFIG.motionPathEnabled ?? false;
  const motionPathPathValue =
    config.motionPathPath ?? DEFAULT_ANIMATION_CONFIG.motionPathPath ?? '';
  const motionPathAlignValue =
    config.motionPathAlign ?? DEFAULT_ANIMATION_CONFIG.motionPathAlign ?? true;
  const motionPathAutoRotateValue =
    config.motionPathAutoRotate ?? DEFAULT_ANIMATION_CONFIG.motionPathAutoRotate ?? true;
  const motionPathRotateOffsetValue =
    config.motionPathRotateOffset ?? DEFAULT_ANIMATION_CONFIG.motionPathRotateOffset ?? 0;
  const motionPathStartValue =
    config.motionPathStart ?? DEFAULT_ANIMATION_CONFIG.motionPathStart ?? 0;
  const motionPathEndValue = config.motionPathEnd ?? DEFAULT_ANIMATION_CONFIG.motionPathEnd ?? 1;
  const motionPathFollowValue =
    config.motionPathFollow ?? DEFAULT_ANIMATION_CONFIG.motionPathFollow ?? false;
  const motionPathSpacingValue =
    config.motionPathSpacing ?? DEFAULT_ANIMATION_CONFIG.motionPathSpacing ?? 0.08;
  const motionPathShapesValue =
    config.motionPathShapes ?? DEFAULT_ANIMATION_CONFIG.motionPathShapes ?? EMPTY_SHAPES;

  const handleEnabledChange = (checked: boolean | 'indeterminate') => {
    onChange({ ...config, motionPathEnabled: checked === true });
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, motionPathPath: e.target.value });
  };

  const handleDraw = (): void => {
    openVectorOverlay({
      title: 'Motion Path',
      description: 'Draw the motion path directly on the preview canvas.',
      initialShapes: motionPathShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({
          ...config,
          motionPathEnabled: true,
          motionPathPath: path,
          motionPathShapes: shapes,
        });
      },
    });
  };

  const handleClear = (): void => {
    onChange({ ...config, motionPathPath: '', motionPathShapes: [] });
  };

  return (
    <FormSection
      title='Motion Path'
      variant='subtle-compact'
      actions={<Checkbox checked={motionPathEnabledValue} onCheckedChange={handleEnabledChange} />}
      className='p-3 space-y-4'
    >
      {motionPathEnabledValue && (
        <div className='mt-4 space-y-4'>
          <FormField label='Path / Selector'>
            <div className='flex items-center gap-2'>
              <Input
                value={motionPathPathValue}
                onChange={handlePathChange}
                placeholder='SVG path data or selector (#path)'
                className='flex-1 text-xs font-mono h-9'
               aria-label='SVG path data or selector (#path)' title='SVG path data or selector (#path)'/>
              <Tooltip content={drawPathTooltip}>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  aria-label='Draw motion path'
                  onClick={handleDraw}
                  className='h-9 w-9'
                  title={'Draw motion path'}>
                  <PenLine className='size-4' />
                </Button>
              </Tooltip>
              <Tooltip content={clearPathTooltip}>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  aria-label='Clear motion path'
                  onClick={handleClear}
                  disabled={!motionPathPathValue && motionPathShapesValue.length === 0}
                  className='h-9 w-9'
                  title={'Clear motion path'}>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val))
                    onChange({ ...config, motionPathStart: Math.max(0, Math.min(1, val)) });
                }}
                className='h-9'
               aria-label='Start (0-1)' title='Start (0-1)'/>
            </FormField>
            <FormField label='End (0-1)'>
              <Input
                type='number'
                min={0}
                max={1}
                step={0.01}
                value={motionPathEndValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val))
                    onChange({ ...config, motionPathEnd: Math.max(0, Math.min(1, val)) });
                }}
                className='h-9'
               aria-label='End (0-1)' title='End (0-1)'/>
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='flex items-center gap-2'>
              <Checkbox
                checked={motionPathAlignValue}
                onCheckedChange={(checked: boolean) =>
                  onChange({ ...config, motionPathAlign: checked === true })
                }
              />
              <span className='text-xs text-gray-300'>Align to path</span>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                checked={motionPathAutoRotateValue}
                onCheckedChange={(checked: boolean) =>
                  onChange({ ...config, motionPathAutoRotate: checked === true })
                }
              />
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val))
                    onChange({
                      ...config,
                      motionPathRotateOffset: Math.max(-360, Math.min(360, val)),
                    });
                }}
                className='h-9'
               aria-label='Rotate offset (deg)' title='Rotate offset (deg)'/>
            </FormField>
          )}

          <div className='grid gap-3 sm:grid-cols-2 items-end'>
            <div className='flex items-center gap-2 mb-2'>
              <Checkbox
                checked={motionPathFollowValue}
                onCheckedChange={(checked: boolean) =>
                  onChange({ ...config, motionPathFollow: checked === true })
                }
              />
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val))
                      onChange({ ...config, motionPathSpacing: Math.max(0, Math.min(1, val)) });
                  }}
                  className='h-9'
                 aria-label='Spacing (0-1)' title='Spacing (0-1)'/>
              </FormField>
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
