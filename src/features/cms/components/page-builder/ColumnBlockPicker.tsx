"use client";

import React, { useMemo } from "react";
import type { BlockDefinition } from "../../types/page-builder";
import { getColumnAllowedBlockTypes } from "./section-registry";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { APP_EMBED_SETTING_KEY, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { PickerDropdown, type PickerGroup } from "./PickerDropdown";

const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero", "RichText", "Block"];

interface ColumnBlockPickerProps {
  onSelect: (blockType: string) => void;
}

export function ColumnBlockPicker({ onSelect }: ColumnBlockPickerProps): React.ReactNode {
  const settingsQuery = useSettingsMap();
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    if (!settingsQuery.data) return [];
    return parseJsonSetting<AppEmbedId[]>(
      settingsQuery.data.get(APP_EMBED_SETTING_KEY),
      []
    );
  }, [settingsQuery.data]);
  const hasAppEmbeds = enabledEmbeds.length > 0;
  const allTypes = getColumnAllowedBlockTypes().filter((def: BlockDefinition) => {
    if (def.type !== "AppEmbed") return true;
    return hasAppEmbeds;
  });
  const elementTypes = allTypes.filter((d: BlockDefinition) => !SECTION_BLOCK_TYPES.includes(d.type));
  const sectionTypes = allTypes.filter((d: BlockDefinition) => SECTION_BLOCK_TYPES.includes(d.type));

  const groups = useMemo(() => [
    {
      label: "Elements",
      options: elementTypes.map((def: BlockDefinition) => ({
        type: def.type,
        label: def.label,
      })),
    },
    {
      label: "Sections",
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
      ariaLabel="Add block to column"
    />
  );
}
