import {
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfileV2Strict,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
} from '@/shared/utils/folder-tree-profiles-v2';
import { validationError } from '@/shared/errors/app-error';

import {
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';

export { FOLDER_TREE_UI_STATE_V2_KEY_PREFIX, FOLDER_TREE_PROFILE_V2_KEY_PREFIX };

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw validationError('Invalid folder tree V2 UI state payload.', {
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid folder tree V2 UI state payload.', {
      reason: 'invalid_shape',
    });
  }
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  const allowedKeys = new Set(['expandedNodeIds', 'panelCollapsed']);
  if (keys.some((key: string) => !allowedKeys.has(key))) {
    throw validationError('Folder tree V2 UI state contains unsupported keys.', {
      reason: 'unsupported_keys',
      keys,
    });
  }
  const rawExpandedNodeIds = record['expandedNodeIds'];
  if (rawExpandedNodeIds !== undefined && !Array.isArray(rawExpandedNodeIds)) {
    throw validationError('Folder tree V2 expandedNodeIds must be an array.', {
      reason: 'invalid_expanded_node_ids',
    });
  }
  const expandedNodeIds = Array.isArray(rawExpandedNodeIds)
    ? Array.from(
      new Set(
        rawExpandedNodeIds
          .map((value: unknown): string => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean)
      )
    )
    : [];
  const panelCollapsed = record['panelCollapsed'];
  if (panelCollapsed !== undefined && typeof panelCollapsed !== 'boolean') {
    throw validationError('Folder tree V2 panelCollapsed must be a boolean.', {
      reason: 'invalid_panel_collapsed',
    });
  }
  return {
    expandedNodeIds,
    panelCollapsed: panelCollapsed ?? false,
  };
};

export const parseFolderTreeProfileV2Entry = (
  instance: FolderTreeInstance,
  raw: string | null | undefined
): FolderTreeProfileV2 => {
  if (!raw) return defaultFolderTreeProfilesV2[instance];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw validationError('Invalid folder tree V2 profile payload.', {
      instance,
      reason: 'invalid_json',
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid folder tree V2 profile payload.', {
      instance,
      reason: 'invalid_shape',
    });
  }
  return parseFolderTreeProfileV2Strict(parsed, defaultFolderTreeProfilesV2[instance]);
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
