'use client';

import React from 'react';
import { Input, Checkbox, SelectSimple, FormSection, FormField } from '@/shared/ui';
import { DEFAULT_ANIMATION_CONFIG, DRAG_AXES, type DragAxis } from '@/shared/lib/gsap';
import { useAnimationConfigContext } from '../AnimationConfigContext';

export function AdvancedDraggableSection(): React.JSX.Element {
  const { config, onChange } = useAnimationConfigContext();

  const draggableEnabledValue =
    config.draggableEnabled ?? DEFAULT_ANIMATION_CONFIG.draggableEnabled ?? false;
  const draggableTypeValue =
    config.draggableType ?? DEFAULT_ANIMATION_CONFIG.draggableType ?? 'x,y';
  const draggableBoundsValue =
    config.draggableBounds ?? DEFAULT_ANIMATION_CONFIG.draggableBounds ?? '';
  const draggableMomentumValue =
    config.draggableMomentum ?? DEFAULT_ANIMATION_CONFIG.draggableMomentum ?? false;
  const draggableMomentumFactorValue =
    config.draggableMomentumFactor ?? DEFAULT_ANIMATION_CONFIG.draggableMomentumFactor ?? 0.6;
  const draggableSnapValue = config.draggableSnap ?? DEFAULT_ANIMATION_CONFIG.draggableSnap ?? 0;
  const draggableCarouselValue =
    config.draggableCarousel ?? DEFAULT_ANIMATION_CONFIG.draggableCarousel ?? false;
  const draggableCarouselSelectorValue =
    config.draggableCarouselSelector ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSelector ?? '';
  const draggableCarouselSnapValue =
    config.draggableCarouselSnap ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSnap ?? true;

  return (
    <FormSection
      title='Draggable'
      variant='subtle-compact'
      actions={
        <Checkbox
          checked={draggableEnabledValue}
          onCheckedChange={(v) => onChange({ ...config, draggableEnabled: v === true })}
        />
      }
      className='p-3 space-y-4'
    >
      {draggableEnabledValue && (
        <div className='mt-4 space-y-4'>
          <FormField label='Axis'>
            <SelectSimple
              size='sm'
              value={draggableTypeValue}
              onValueChange={(v) => onChange({ ...config, draggableType: v as DragAxis })}
              options={DRAG_AXES}
            />
          </FormField>

          <FormField label='Bounds selector'>
            <Input
              value={draggableBoundsValue}
              onChange={(e) => onChange({ ...config, draggableBounds: e.target.value })}
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
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val))
                    onChange({ ...config, draggableSnap: Math.max(0, Math.min(200, val)) });
                }}
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
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val))
                    onChange({
                      ...config,
                      draggableMomentumFactor: Math.max(0.1, Math.min(2, val)),
                    });
                }}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Checkbox
                checked={draggableMomentumValue}
                onCheckedChange={(v) => onChange({ ...config, draggableMomentum: v === true })}
              />
              <span className='text-xs text-gray-300'>Enable momentum</span>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                checked={draggableCarouselValue}
                onCheckedChange={(v) => onChange({ ...config, draggableCarousel: v === true })}
              />
              <span className='text-xs text-gray-300'>Carousel mode</span>
            </div>
          </div>

          {draggableCarouselValue && (
            <div className='space-y-4 pl-2 border-l border-border/40'>
              <FormField label='Track selector'>
                <Input
                  value={draggableCarouselSelectorValue}
                  onChange={(e) =>
                    onChange({ ...config, draggableCarouselSelector: e.target.value })
                  }
                  placeholder='e.g. .track'
                  className='h-9'
                />
              </FormField>
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={draggableCarouselSnapValue}
                  onCheckedChange={(v) =>
                    onChange({ ...config, draggableCarouselSnap: v === true })
                  }
                />
                <span className='text-xs text-gray-300'>Snap to items</span>
              </div>
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}
