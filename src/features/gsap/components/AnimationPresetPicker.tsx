'use client';

import React, { useState } from 'react';

import { cn } from '@/shared/utils';

import { AnimationPreviewIcon } from './AnimationPreviewIcon';
import { ANIMATION_PRESETS } from '../types/animation';

import type { AnimationPreset } from '../types/animation';

interface AnimationPresetPickerProps {
  value: AnimationPreset;
  onChange: (preset: AnimationPreset) => void;
  className?: string;
}

export function AnimationPresetPicker({
  value,
  onChange,
  className,
}: AnimationPresetPickerProps): React.ReactNode {
  const [hoveredPreset, setHoveredPreset] = useState<AnimationPreset | null>(null);

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4', className)} role='radiogroup'>
      {ANIMATION_PRESETS.map((preset: { value: AnimationPreset; label: string }) => {
        const isActive = value === preset.value;
        const isPreviewing = isActive || hoveredPreset === preset.value;

        return (
          <button
            key={preset.value}
            type='button'
            role='radio'
            aria-checked={isActive}
            onClick={(): void => onChange(preset.value)}
            onMouseEnter={(): void => setHoveredPreset(preset.value)}
            onMouseLeave={(): void => setHoveredPreset(null)}
            onFocus={(): void => setHoveredPreset(preset.value)}
            onBlur={(): void => setHoveredPreset(null)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition',
              isActive
                ? 'border-blue-500/80 bg-blue-500/10 text-blue-100'
                : 'border-border/40 bg-gray-900/40 text-gray-300 hover:border-border/60'
            )}
          >
            <AnimationPreviewIcon preset={preset.value} active={isPreviewing} />
            <span className='text-xs font-medium leading-tight'>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
