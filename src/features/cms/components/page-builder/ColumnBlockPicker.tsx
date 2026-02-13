'use client';

import React, { useMemo } from 'react';

import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import type { PickerOption } from '@/shared/ui/templates/pickers/types';
import { parseJsonSetting } from '@/shared/utils/settings-json';

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
  const enabledEmbedsSetting = typeof enabledEmbedsRaw === 'string' ? enabledEmbedsRaw : null;
  const enabledEmbeds = useMemo<AppEmbedId[]>(
    () => parseJsonSetting<AppEmbedId[]>(enabledEmbedsSetting, []),
    [enabledEmbedsSetting]
  );
  const hasAppEmbeds = enabledEmbeds.length > 0;

  const resolvedTypes = useMemo(() => {
    const defs = allowedBlockTypes
      ? allowedBlockTypes
        .map((type: string) => getBlockDefinition(type))
        .filter((def: BlockDefinition | undefined): def is BlockDefinition => Boolean(def))
      : getColumnAllowedBlockTypes();
    return defs.filter((def: BlockDefinition) => def.type !== 'AppEmbed' || hasAppEmbeds);
  }, [allowedBlockTypes, hasAppEmbeds]);

  const groups = useMemo(() => {
    const elementTypes = resolvedTypes.filter((d) => !SECTION_BLOCK_TYPES.includes(d.type));
    const sectionTypes = resolvedTypes.filter((d) => SECTION_BLOCK_TYPES.includes(d.type));
    return [
      {
        label: 'Elements',
        options: elementTypes.map((def): PickerOption => ({ key: def.type, label: def.label })),
      },
      {
        label: 'Sections',
        options: sectionTypes.map((def): PickerOption => ({ key: def.type, label: def.label })),
      },
    ].filter((g) => g.options.length > 0);
  }, [resolvedTypes]);

  if (resolvedTypes.length === 0) return null;
  return (
    <GenericPickerDropdown
      groups={groups}
      onSelect={(option: PickerOption) => onSelect(option.key)}
      ariaLabel='Add block to column'
      searchable
      searchPlaceholder='Search blocks...'
    />
  );
}
