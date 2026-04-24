'use client';

import React from 'react';

import { Hint } from '@/shared/ui/forms-and-actions.public';

export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const resolved = value !== '' ? value : '#ffffff';
  return (
    <div className='space-y-1'>
      <Hint size='xxs' uppercase className='text-gray-500'>
        {label}
      </Hint>
      <div className='flex items-center gap-2'>
        <div className='relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50'>
          <input
            type='color'
            aria-label={label}
            value={resolved}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
          />
          <div className='size-full rounded' style={{ backgroundColor: resolved }} />
        </div>
        <div className='text-xs text-gray-400'>{resolved}</div>
      </div>
    </div>
  );
}
