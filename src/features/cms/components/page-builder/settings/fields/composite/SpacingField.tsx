'use client';

import React from 'react';

import { Input } from '@/shared/ui/primitives.public';

import { useCompositeFieldContext } from '../CompositeFieldContext';

export function SpacingField(): React.ReactNode {
  const { value, onChange, buildAriaLabel, buildControlId } = useCompositeFieldContext();
  const spacing = (value as Record<string, number>) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const update = (side: string, v: number): void => {
    onChange({ ...spacing, [side]: v });
  };
  return (
    <div className='grid grid-cols-4 gap-1.5'>
      {(['top', 'right', 'bottom', 'left'] as const).map((side: string) => {
        const controlId = buildControlId(side);
        return (
          <div key={side} className='space-y-0.5'>
            <label className='text-[10px] text-gray-500 uppercase' htmlFor={controlId}>
              {side[0]}
            </label>
          <Input
            id={controlId}
            type='number'
            value={spacing[side] ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update(side, Number(e.target.value))
            }
            className='text-xs h-7 px-1.5'
            aria-label={buildAriaLabel(side)}
           title={controlId}/>
          </div>
        );
      })}
    </div>
  );
}
