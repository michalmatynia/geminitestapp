'use client';

import React, { useMemo } from 'react';

import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { PickerDropdown, type PickerGroup } from './PickerDropdown';
import { getBlockDefinition, getColumnAllowedBlockTypes } from './section-registry';

import type { BlockDefinition } from '../../types/page-builder';

const SECTION_BLOCK_TYPES = ['ImageWithText', 'Hero', 'RichText', 'Block', 'TextAtom', 'Carousel', 'Slideshow'];

interface ColumnBlockPickerProps {
  onSelect: (blockType: string) => void;
  allowedBlockTypes?: string[] | undefined;
}

export function ColumnBlockPicker({ onSelect, allowedBlockTypes }: ColumnBlockPickerProps): React.ReactNode {
  const settingsStore = useSettingsStore();
  const enabledEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    return parseJsonSetting<AppEmbedId[]>(
      enabledEmbedsRaw,
      []
    );
  }, [enabledEmbedsRaw]);
  const hasAppEmbeds = enabledEmbeds.length > 0;
  const resolvedTypes = allowedBlockTypes
    ? allowedBlockTypes
      .map((type: string) => getBlockDefinition(type))
      .filter((def: BlockDefinition | undefined): def is BlockDefinition => Boolean(def))
    : getColumnAllowedBlockTypes();
  const allTypes = resolvedTypes.filter((def: BlockDefinition) => {
    if (def.type !== 'AppEmbed') return true;
    return hasAppEmbeds;
  });
  const elementTypes = allTypes.filter((d: BlockDefinition) => !SECTION_BLOCK_TYPES.includes(d.type));
  const sectionTypes = allTypes.filter((d: BlockDefinition) => SECTION_BLOCK_TYPES.includes(d.type));

  const groups = useMemo(() => [
    {
      label: 'Elements',
      options: elementTypes.map((def: BlockDefinition) => ({
        type: def.type,
        label: def.label,
      })),
    },
    {
      label: 'Sections',
      options: sectionTypes.map((def: BlockDefinition) => ({
        type: def.type,
        label: def.label,
      })),
    },
  ].filter((g: PickerGroup) => g.options.length > 0), [elementTypes, sectionTypes]);

  if (allTypes.length === 0) return null;

  return (
    <PickerDropdown
      groups={groups}
      onSelect={onSelect}
      ariaLabel='Add block to column'
    />
  );
}
