import { describe, expect, it } from 'vitest';

import {
  buildFolderTreeV2MigrationPayload,
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeProfileV2Key,
  getFolderTreeUiStateV2Key,
  parseFolderTreeUiStateV2Entry,
} from '@/shared/lib/foldertree/v2/settings';
import { folderTreeInstanceValues } from '@/shared/utils/folder-tree-profiles-v2';

describe('folder tree v2 settings', () => {
  it('parses ui entry safely', () => {
    expect(parseFolderTreeUiStateV2Entry('bad-json')).toEqual({
      expandedNodeIds: [],
      panelCollapsed: false,
    });
    expect(
      parseFolderTreeUiStateV2Entry(
        JSON.stringify({ expandedNodeIds: [' a ', '', 'a'], panelCollapsed: true })
      )
    ).toEqual({
      expandedNodeIds: ['a'],
      panelCollapsed: true,
    });
  });

  it('builds one-time migration payload for all instances', () => {
    const payload = buildFolderTreeV2MigrationPayload({
      rawProfilesV2: undefined,
      rawUiStateV1: undefined,
    });

    const profileKeys = payload
      .map((entry) => entry.key)
      .filter((key) => key.startsWith(FOLDER_TREE_PROFILE_V2_KEY_PREFIX));
    const uiKeys = payload
      .map((entry) => entry.key)
      .filter((key) => key.startsWith(FOLDER_TREE_UI_STATE_V2_KEY_PREFIX));

    expect(profileKeys).toHaveLength(folderTreeInstanceValues.length);
    expect(uiKeys).toHaveLength(folderTreeInstanceValues.length);
    expect(payload.some((entry) => entry.key === FOLDER_TREE_V2_MIGRATION_MARKER_KEY)).toBe(
      true
    );

    folderTreeInstanceValues.forEach((instance) => {
      expect(payload.some((entry) => entry.key === getFolderTreeProfileV2Key(instance))).toBe(
        true
      );
      expect(payload.some((entry) => entry.key === getFolderTreeUiStateV2Key(instance))).toBe(
        true
      );
    });
  });
});
