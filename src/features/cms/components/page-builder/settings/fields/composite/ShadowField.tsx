'use client';

import React from 'react';

import { Input } from '@/shared/ui/primitives.public';

import { useCompositeFieldContext } from '../CompositeFieldContext';

export function ShadowField(): React.ReactNode {
  const { value, onChange, buildAriaLabel, buildControlId } = useCompositeFieldContext();
  const shadow = (value as Record<string, unknown>) ?? {
    x: 0,
    y: 2,
    blur: 4,
    spread: 0,
    color: '#00000040',
  };
  const update = (key: string, v: unknown): void => {
    onChange({ ...shadow, [key]: v });
  };
  const colorValueId = buildControlId('color-value');
  const colorPickerId = buildControlId('color-picker');
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-4 gap-1.5'>
        {(['x', 'y', 'blur', 'spread'] as const).map((prop: string) => {
          const controlId = buildControlId(prop);
          return (
            <div key={prop} className='space-y-0.5'>
              <label className='text-[10px] text-gray-500 uppercase' htmlFor={controlId}>
                {prop}
              </label>
            <Input
              id={controlId}
              type='number'
              value={(shadow[prop] as number) ?? 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update(prop, Number(e.target.value))
              }
              className='text-xs h-7 px-1.5'
              aria-label={buildAriaLabel(prop)}
             title={controlId}/>
            </div>
          );
        })}
      </div>
      <div className='flex items-center gap-1'>
        <label className='text-[10px] text-gray-500 uppercase w-10' htmlFor={colorValueId}>
          Color
        </label>
        <input
          type='color'
          id={colorPickerId}
          value={(shadow['color'] as string)?.slice(0, 7) ?? '#000000'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            update('color', e.target.value)
          }
          className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
          aria-label={buildAriaLabel('color picker')}
        />
        <Input
          id={colorValueId}
          value={(shadow['color'] as string) ?? '#00000040'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            update('color', e.target.value)
          }
          className='text-xs h-7 font-mono flex-1'
          aria-label={buildAriaLabel('color value')}
         title={colorValueId}/>
      </div>
    </div>
  );
}
