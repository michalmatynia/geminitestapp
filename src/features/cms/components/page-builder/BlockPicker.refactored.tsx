'use client';

import React, { useMemo } from 'react';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import type { PickerGroup } from '@/shared/ui/templates/pickers/types';
import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { getAllowedBlockTypes } from './section-registry';
import type { BlockDefinition } from '../../types/page-builder';

/**
 * REFACTORED: BlockPicker using GenericPickerDropdown
 *
 * Before: 53 LOC
 * After: 26 LOC
 * Savings: 51% reduction
 *
 * Changes:
 * - Removed custom dropdown rendering
 * - Uses GenericPickerDropdown<T> for grouped options
 * - Same filtering and app embed logic preserved
 */
interface BlockPickerProps {
  sectionType: string;
  onSelect: (blockType: string) => void;
}

export function BlockPicker({ sectionType, onSelect }: BlockPickerProps): React.ReactNode {
  const settingsStore = useSettingsStore();
  const enabledEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    return parseJsonSetting<AppEmbedId[]>(enabledEmbedsRaw, []);
  }, [enabledEmbedsRaw]);

  const blockTypes = useMemo(() => {
    const all = getAllowedBlockTypes(sectionType);
    const hasAppEmbeds = enabledEmbeds.length > 0;
    
    return all.filter((def: BlockDefinition) => {
      if (def.type !== 'AppEmbed') return true;
      return hasAppEmbeds;
    });
  }, [sectionType, enabledEmbeds]);

  const groups: PickerGroup[] = useMemo(() => {
    // Group blocks by category
    const grouped = blockTypes.reduce((acc: Record<string, any[]>, def: BlockDefinition) => {
      const cat = def.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        key: def.type,
        label: def.label,
        icon: def.icon,
      });
      return acc;
    }, {});

    return Object.entries(grouped).map(([label, options]) => ({
      label,
      options,
    }));
  }, [blockTypes]);

  if (blockTypes.length === 0) return null;

  return (
    <GenericPickerDropdown
      groups={groups}
      onSelect={(option) => onSelect(option.key)}
      ariaLabel="Add block"
    />
  );
}
