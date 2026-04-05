'use client';

import React, { useCallback, useMemo } from 'react';

import type { PickerOption } from '@/shared/contracts/ui/pickers';
import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/shared/lib/app-embeds';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { usePageBuilderPolicy } from './PageBuilderPolicyContext';
import { getBlockDefinition, getColumnAllowedBlockTypes } from './section-registry';

import type { BlockDefinition } from '../../types/page-builder';

const SECTION_BLOCK_TYPES = [
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
  'Repeater',
];

interface ColumnBlockPickerProps {
  onSelect: (blockType: string) => void;
  allowedBlockTypes?: string[] | undefined;
}

export function ColumnBlockPicker({
  onSelect,
  allowedBlockTypes,
}: ColumnBlockPickerProps): React.ReactNode {
  const settingsStore = useSettingsStore();
  const policy = usePageBuilderPolicy();
  const enabledEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  const enabledEmbedsSetting = typeof enabledEmbedsRaw === 'string' ? enabledEmbedsRaw : null;
  const enabledEmbeds = useMemo<AppEmbedId[]>(
    () => parseJsonSetting<AppEmbedId[]>(enabledEmbedsSetting, []),
    [enabledEmbedsSetting]
  );
  const hasAppEmbeds = enabledEmbeds.length > 0;

  const resolvedTypes = useMemo(() => {
    const defs = allowedBlockTypes
      ? policy
          .filterBlockTypes(allowedBlockTypes)
          .map((type: string) => getBlockDefinition(type))
          .filter((def: BlockDefinition | undefined): def is BlockDefinition => Boolean(def))
      : policy.filterBlockDefinitions(getColumnAllowedBlockTypes());
    return defs.filter((def: BlockDefinition) => def.type !== 'AppEmbed' || hasAppEmbeds);
  }, [allowedBlockTypes, hasAppEmbeds, policy]);

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
  const handleOptionSelect = useCallback(
    (option: PickerOption): void => onSelect(option.key),
    [onSelect]
  );

  if (resolvedTypes.length === 0) return null;
  return (
    <GenericPickerDropdown
      groups={groups}
      onSelect={handleOptionSelect}
      ariaLabel='Add block to column'
      searchable
      searchPlaceholder='Search blocks...'
    />
  );
}
