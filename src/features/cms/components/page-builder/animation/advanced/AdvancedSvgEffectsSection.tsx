/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  Tooltip,
  FormSection,
  FormField,
} from '@/shared/ui';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap';
import { useAnimationConfigContext } from '../AnimationConfigContext';
import type { VectorOverlayResult } from '../../../hooks/usePageBuilderContext';

const EMPTY_SHAPES: any[] = [];

export function AdvancedSvgEffectsSection(): React.JSX.Element {
  const { config, onChange, openVectorOverlay } = useAnimationConfigContext();
  
  const drawPathTooltip = getDocumentationTooltip(
    DOCUMENTATION_MODULE_IDS.cms,
    'animation_draw_path_canvas'
  ) ?? 'Draw path on canvas';
  const clearPathTooltip = getDocumentationTooltip(
    DOCUMENTATION_MODULE_IDS.cms,
    'animation_clear_path_canvas'
  ) ?? 'Clear path';

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

  const handleSvgDrawCanvas = (): void => {
    openVectorOverlay({
      title: 'SVG Draw Path',
      description: 'Draw a custom SVG path to animate stroke drawing.',
      initialShapes: svgDrawShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgDrawEnabled: true, svgDrawPath: path, svgDrawShapes: shapes });
      },
    });
  };

  const handleSvgMorphDraw = (): void => {
    openVectorOverlay({
      title: 'SVG Morph Target',
      description: 'Draw the target path for morphing.',
      initialShapes: svgMorphShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgMorphEnabled: true, svgMorphTo: path, svgMorphShapes: shapes });
      },
    });
  };

  return (
    <FormSection title='SVG Effects' variant='subtle-compact' className='p-3 space-y-4'>
      <div className='space-y-4 mt-4'>
        <div className='flex items-center gap-2'>
          <Checkbox checked={svgDrawEnabledValue} onCheckedChange={(v) => onChange({ ...config, svgDrawEnabled: v === true })} />
          <span className='text-xs text-gray-300'>Draw SVG strokes</span>
        </div>
        {svgDrawEnabledValue && (
          <div className='space-y-4 pl-2 border-l border-border/40'>
            <FormField label='Target selector'>
              <Input
                value={svgDrawSelectorValue}
                onChange={(e) => onChange({ ...config, svgDrawSelector: e.target.value })}
                placeholder='path, line, circle'
                className='h-9'
              />
            </FormField>
            <FormField label='Custom path'>
              <div className='flex items-center gap-2'>
                <Input
                  value={svgDrawPathValue}
                  onChange={(e) => onChange({ ...config, svgDrawPath: e.target.value })}
                  placeholder='Draw or paste SVG path'
                  className='flex-1 text-xs font-mono h-9'
                />
                <Tooltip content={drawPathTooltip}>
                  <Button type='button' size='icon' variant='outline' onClick={handleSvgDrawCanvas} className='h-9 w-9'>
                    <PenLine className='size-4' />
                  </Button>
                </Tooltip>
                <Tooltip content={clearPathTooltip}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => onChange({ ...config, svgDrawPath: '', svgDrawShapes: [] })}
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
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, svgDrawFrom: Math.max(0, Math.min(100, val)) });
                  }}
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
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, svgDrawTo: Math.max(0, Math.min(100, val)) });
                  }}
                  className='h-9'
                />
              </FormField>
            </div>
          </div>
        )}

        <div className='flex items-center gap-2'>
          <Checkbox checked={svgMorphEnabledValue} onCheckedChange={(v) => onChange({ ...config, svgMorphEnabled: v === true })} />
          <span className='text-xs text-gray-300'>Morph SVG path (basic)</span>
        </div>
        {svgMorphEnabledValue && (
          <div className='space-y-4 pl-2 border-l border-border/40'>
            <FormField label='Target selector'>
              <Input
                value={svgMorphSelectorValue}
                onChange={(e) => onChange({ ...config, svgMorphSelector: e.target.value })}
                placeholder='path'
                className='h-9'
              />
            </FormField>
            <FormField label='Target path'>
              <div className='flex items-center gap-2'>
                <Input
                  value={svgMorphToValue}
                  onChange={(e) => onChange({ ...config, svgMorphTo: e.target.value })}
                  placeholder='Target path data or selector (#path)'
                  className='flex-1 text-xs font-mono h-9'
                />
                <Tooltip content={drawPathTooltip}>
                  <Button type='button' size='icon' variant='outline' onClick={handleSvgMorphDraw} className='h-9 w-9'>
                    <PenLine className='size-4' />
                  </Button>
                </Tooltip>
                <Tooltip content={clearPathTooltip}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => onChange({ ...config, svgMorphTo: '', svgMorphShapes: [] })}
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
  );
}
