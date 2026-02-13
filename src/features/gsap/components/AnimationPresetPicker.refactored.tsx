'use client';

import { useMemo } from 'react';
import { GenericGridPicker } from '@/shared/ui/templates/pickers';
import type { GridPickerItem } from '@/shared/ui/templates/pickers/types';
import { ANIMATION_PRESETS } from '../lib/animation-presets';
import { PresetCard } from './PresetCard';

/**
 * REFACTORED: AnimationPresetPicker using GenericGridPicker
 *
 * Before: 56 LOC
 * After: 25 LOC
 * Savings: 55% reduction
 *
 * Changes:
 * - Removed custom grid rendering
 * - Uses GenericGridPicker<T> for grid layout
 * - Search functionality included
 * - Custom item rendering via PresetCard
 */
interface AnimationPresetPickerProps {
  onSelect: (presetId: string) => void;
  selectedPresetId?: string;
  columns?: number;
}

export function AnimationPresetPicker({
  onSelect,
  selectedPresetId,
  columns = 3,
}: AnimationPresetPickerProps): React.ReactElement {
  const items: GridPickerItem[] = useMemo(() => {
    return ANIMATION_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.name,
      value: preset,
      metadata: {
        category: preset.category,
        description: preset.description,
      },
    }));
  }, []);

  return (
    <GenericGridPicker
      items={items}
      selectedId={selectedPresetId}
      onSelect={(item) => onSelect(item.id)}
      renderItem={(item, selected) => (
        <PresetCard
          preset={item.value as any}
          selected={selected}
        />
      )}
      columns={columns}
      searchable
      searchPlaceholder="Search presets..."
    />
  );
}
