'use client';

import React from 'react';

import { Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useCompositeFieldContext } from '../CompositeFieldContext';
import { BORDER_STYLE_OPTIONS } from '../settings-field-constants';

export function BorderField(): React.ReactNode {
  const { value, onChange, buildAriaLabel, buildControlId } = useCompositeFieldContext();
  const border = (value as Record<string, unknown>) ?? {
    width: 0,
    style: 'solid',
    color: '#4b5563',
    radius: 0,
  };
  const update = (key: string, v: unknown): void => {
    onChange({ ...border, [key]: v });
  };
  const widthId = buildControlId('width');
  const radiusId = buildControlId('radius');
  const styleId = buildControlId('style');
  const colorValueId = buildControlId('color-value');
  const colorPickerId = buildControlId('color-picker');
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={widthId}>
            Width
          </label>
          <Input
            id={widthId}
            type='number'
            value={(border['width'] as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('width', Number(e.target.value))
            }
            className='text-xs h-7'
            min={0}
            aria-label={buildAriaLabel('width')}
           title={widthId}/>
        </div>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={radiusId}>
            Radius
          </label>
          <Input
            id={radiusId}
            type='number'
            value={(border['radius'] as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('radius', Number(e.target.value))
            }
            className='text-xs h-7'
            min={0}
            aria-label={buildAriaLabel('radius')}
           title={radiusId}/>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={styleId}>
            Style
          </label>
          <SelectSimple
            size='sm'
            value={(border['style'] as string) ?? 'solid'}
            onValueChange={(v: string): void => update('style', v)}
            options={BORDER_STYLE_OPTIONS}
            triggerClassName='text-xs h-7'
            ariaLabel={buildAriaLabel('style')}
            id={styleId}
           title={styleId}/>
        </div>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={colorValueId}>
            Color
          </label>
          <div className='flex items-center gap-1'>
            <input
              type='color'
              id={colorPickerId}
              value={(border['color'] as string) ?? '#4b5563'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('color', e.target.value)
              }
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
              aria-label={buildAriaLabel('color picker')}
            />
            <Input
              id={colorValueId}
              value={(border['color'] as string) ?? '#4b5563'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('color', e.target.value)
              }
              className='text-xs h-7 font-mono flex-1'
              maxLength={7}
              aria-label={buildAriaLabel('color value')}
             title={colorValueId}/>
          </div>
        </div>
      </div>
    </div>
  );
}
