"use client";

import React, { useMemo } from "react";
import type { BlockDefinition } from "../../types/page-builder";
import { getAllowedBlockTypes } from "./section-registry";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { APP_EMBED_SETTING_KEY, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { PickerDropdown } from "./PickerDropdown";

interface BlockPickerProps {
  sectionType: string;
  onSelect: (blockType: string) => void;
}

export function BlockPicker({ sectionType, onSelect }: BlockPickerProps): React.ReactNode {
  const settingsQuery = useSettingsMap();
  const enabledEmbeds = useMemo<AppEmbedId[]>(() => {
    if (!settingsQuery.data) return [];
    return parseJsonSetting<AppEmbedId[]>(
      settingsQuery.data.get(APP_EMBED_SETTING_KEY),
      []
    );
  }, [settingsQuery.data]);
  const hasAppEmbeds = enabledEmbeds.length > 0;
  const blockTypes = getAllowedBlockTypes(sectionType).filter((def: BlockDefinition) => {
    if (def.type !== "AppEmbed") return true;
    return hasAppEmbeds;
  });

  const groups = useMemo(() => [
    {
      label: "Blocks",
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
      ariaLabel="Add block"
    />
  );
}
