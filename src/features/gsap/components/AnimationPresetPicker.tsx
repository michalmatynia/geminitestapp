'use client';

import { useMemo } from 'react';

import type { GridPickerItem } from '@/shared/contracts/ui';
import {
  ANIMATION_PRESETS,
  type AnimationPreset,
} from '@/shared/contracts/gsap';
import { GenericGridPicker } from '@/shared/ui/templates/pickers';

import { AnimationPreviewIcon } from './AnimationPreviewIcon';

interface AnimationPresetPickerProps {
  value: AnimationPreset;
  onChange: (preset: AnimationPreset) => void;
  columns?: number;
}

type AnimationPresetGridItem = GridPickerItem<AnimationPreset> & {
  value: AnimationPreset;
};

export function AnimationPresetPicker({
  value,
  onChange,
  columns = 3,
}: AnimationPresetPickerProps): React.ReactElement {
  const items = useMemo<AnimationPresetGridItem[]>(
    () =>
      ANIMATION_PRESETS.map((preset) => ({
        id: preset.value,
        label: preset.label,
        value: preset.value,
      })),
    []
  );

  return (
    <GenericGridPicker<AnimationPresetGridItem>
      items={items}
      selectedId={value}
      onSelect={(item): void => onChange(item.value)}
      columns={columns}
      searchable
      searchPlaceholder='Search presets...'
      renderItem={(item, selected) => (
        <div className='flex h-full min-h-[64px] flex-col items-center justify-center gap-1 rounded bg-card/40 p-2 text-center'>
          <AnimationPreviewIcon preset={item.value} active={selected} />
          <span className='line-clamp-2 text-[10px] leading-tight text-gray-200'>{item.label}</span>
        </div>
      )}
    />
  );
}
