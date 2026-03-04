'use client';

import React from 'react';

import { Input, Label } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface LabeledSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  disabled?: boolean | undefined;
  fallbackValue?: number | undefined;
  className?: string | undefined;
}

export function LabeledSlider(props: LabeledSliderProps): React.JSX.Element {
  const {
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled,
    fallbackValue = 0,
    className,
  } = props;

  return (
    <div className={cn('contents', className)}>
      <Label className='text-[11px] text-gray-300'>{label}</Label>
      <div className='flex items-center gap-2'>
        <Input
          size='sm'
          type='range'
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : fallbackValue);
          }}
          disabled={disabled}
          className='h-8'
        />
        <span className='w-10 text-right text-[11px] text-gray-400'>{value}</span>
      </div>
    </div>
  );
}
