import {
  defaultFolderTreeProfilesV2,
  folderTreeInstanceValues,
  parseFolderTreeProfilesV2,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
} from '@/shared/utils/folder-tree-profiles-v2';
import {
  parseFolderTreeUiStateV1,
  type FolderTreeUiStateV1Entry,
} from '@/shared/utils/folder-tree-ui-state-v1';

import {
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
} from '@/shared/contracts/master-folder-tree';

export {
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
};

export const getFolderTreeUiStateV2Key = (instance: FolderTreeInstance): string =>
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}${instance}`;

export const getFolderTreeProfileV2Key = (instance: FolderTreeInstance): string =>
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}${instance}`;

export type FolderTreeUiStateV2Entry = {
  expandedNodeIds: string[];
  panelCollapsed: boolean;
};

export const createDefaultFolderTreeUiStateV2Entry = (): FolderTreeUiStateV2Entry => ({
  expandedNodeIds: [],
  panelCollapsed: false,
});

export const parseFolderTreeUiStateV2Entry = (
  raw: string | null | undefined
): FolderTreeUiStateV2Entry => {
  if (!raw) return createDefaultFolderTreeUiStateV2Entry();
  try {
    const parsed = JSON.parse(raw) as Partial<FolderTreeUiStateV2Entry>;
    const expandedNodeIds = Array.isArray(parsed.expandedNodeIds)
      ? Array.from(
          new Set(parsed.expandedNodeIds.map((value: string) => value.trim()).filter(Boolean))
        )
      : [];
    return {
      expandedNodeIds,
      panelCollapsed: Boolean(parsed.panelCollapsed),
    };
  } catch {
    return createDefaultFolderTreeUiStateV2Entry();
  }
};

export const parseFolderTreeProfileV2Entry = (
  instance: FolderTreeInstance,
  raw: string | null | undefined
): FolderTreeProfileV2 => {
  if (!raw) return defaultFolderTreeProfilesV2[instance];
  try {
    const parsed: unknown = JSON.parse(raw);
    const reconstructed = parseFolderTreeProfilesV2(
      JSON.stringify({
        [instance]: parsed,
      })
    );
    return reconstructed[instance];
  } catch {
    return defaultFolderTreeProfilesV2[instance];
  }
};

export const serializeFolderTreeUiStateV2Entry = (value: FolderTreeUiStateV2Entry): string =>
  JSON.stringify({
    expandedNodeIds: Array.from(
      new Set(value.expandedNodeIds.map((id: string) => id.trim()).filter(Boolean))
    ),
    panelCollapsed: Boolean(value.panelCollapsed),
  });

export const serializeFolderTreeProfileV2Entry = (profile: FolderTreeProfileV2): string =>
  JSON.stringify(profile);

export const buildFolderTreeV2MigrationPayload = ({
  rawProfilesV2,
  rawUiStateV1,
}: {
  rawProfilesV2: string | null | undefined;
  rawUiStateV1: string | null | undefined;
}): Array<{ key: string; value: string }> => {
  const profiles = parseFolderTreeProfilesV2(rawProfilesV2);
  const uiStateMap = parseFolderTreeUiStateV1(rawUiStateV1);

  const updates: Array<{ key: string; value: string }> = [];

  folderTreeInstanceValues.forEach((instance: FolderTreeInstance): void => {
    const profile = profiles[instance];
    const uiState: FolderTreeUiStateV1Entry = uiStateMap[instance];

    updates.push({
      key: getFolderTreeProfileV2Key(instance),
      value: serializeFolderTreeProfileV2Entry(profile),
    });

    updates.push({
      key: getFolderTreeUiStateV2Key(instance),
      value: serializeFolderTreeUiStateV2Entry({
        expandedNodeIds: uiState.expandedNodeIds,
        panelCollapsed: uiState.panelCollapsed,
      }),
    });
  });

  updates.push({
    key: FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
    value: new Date().toISOString(),
  });

  return updates;
};
