'use client';

import React, { useMemo } from 'react';

import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { PickerDropdown } from './PickerDropdown';
import { getAllowedBlockTypes } from './section-registry';

import type { BlockDefinition } from '../../types/page-builder';

interface BlockPickerProps {
  sectionType: string;
  onSelect: (blockType: string) => void;
}

export function BlockPicker({ sectionType, onSelect }: BlockPickerProps): React.ReactNode {
  const settingsStore = useSettingsStore();
  const enabledEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    return parseJsonSetting<AppEmbedId[]>(
      enabledEmbedsRaw,
      []
    );
  }, [enabledEmbedsRaw]);
  const hasAppEmbeds = enabledEmbeds.length > 0;
  const blockTypes = getAllowedBlockTypes(sectionType).filter((def: BlockDefinition) => {
    if (def.type !== 'AppEmbed') return true;
    return hasAppEmbeds;
  });

  const groups = useMemo(() => [
    {
      label: 'Blocks',
      options: blockTypes.map((def: BlockDefinition) => ({
        type: def.type,
        label: def.label,
      })),
    },
  ], [blockTypes]);

  if (blockTypes.length === 0) return null;

  return (
    <PickerDropdown
      groups={groups}
      onSelect={onSelect}
      ariaLabel='Add block'
    />
  );
}
