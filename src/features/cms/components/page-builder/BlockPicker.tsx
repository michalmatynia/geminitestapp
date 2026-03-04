'use client';

import React, { useMemo } from 'react';

import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { PickerOption } from '@/shared/contracts/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getAllowedBlockTypes } from './section-registry';

import type { BlockDefinition } from '../../types/page-builder';

interface BlockPickerProps {
  sectionType: string;
  onSelect: (blockType: string) => void;
}

type BlockPickerSelectRuntimeValue = {
  onSelect: (blockType: string) => void;
};

const {
  Context: BlockPickerSelectRuntimeContext,
  useStrictContext: useBlockPickerSelectRuntime,
} = createStrictContext<BlockPickerSelectRuntimeValue>({
  hookName: 'useBlockPickerSelectRuntime',
  providerName: 'BlockPickerSelectRuntimeProvider',
  displayName: 'BlockPickerSelectRuntimeContext',
});

function BlockPickerDropdown({
  groups,
}: {
  groups: Array<{ label: string; options: PickerOption[] }>;
}): React.JSX.Element {
  const runtime = useBlockPickerSelectRuntime();
  return (
    <GenericPickerDropdown
      groups={groups}
      onSelect={(option: PickerOption) => runtime.onSelect(option.key)}
      ariaLabel='Add block'
    />
  );
}

export function BlockPicker({ sectionType, onSelect }: BlockPickerProps): React.ReactNode {
  const settingsStore = useSettingsStore();
  const enabledEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    return parseJsonSetting<AppEmbedId[]>(enabledEmbedsRaw, []);
  }, [enabledEmbedsRaw]);
  const hasAppEmbeds = enabledEmbeds.length > 0;
  const blockTypes = getAllowedBlockTypes(sectionType).filter((def: BlockDefinition) => {
    if (def.type !== 'AppEmbed') return true;
    return hasAppEmbeds;
  });

  const groups = useMemo(
    () => [
      {
        label: 'Blocks',
        options: blockTypes.map(
          (def: BlockDefinition): PickerOption => ({
            key: def.type,
            label: def.label,
          })
        ),
      },
    ],
    [blockTypes]
  );
  const selectRuntimeValue = useMemo<BlockPickerSelectRuntimeValue>(
    () => ({ onSelect }),
    [onSelect]
  );

  if (blockTypes.length === 0) return null;

  return (
    <BlockPickerSelectRuntimeContext.Provider value={selectRuntimeValue}>
      <BlockPickerDropdown groups={groups} />
    </BlockPickerSelectRuntimeContext.Provider>
  );
}
