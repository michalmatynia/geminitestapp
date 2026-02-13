import { describe, expect, it } from 'vitest';

import {
  createDefaultFolderTreeUiStateV1,
  parseFolderTreeUiStateV1,
  serializeFolderTreeUiStateV1,
} from '@/shared/utils/folder-tree-ui-state-v1';

describe('folder-tree-ui-state-v1', () => {
  it('returns defaults for invalid json payloads', () => {
    const parsed = parseFolderTreeUiStateV1('{"notes": ');
    expect(parsed).toEqual(createDefaultFolderTreeUiStateV1());
  });

  it('normalizes expanded node ids and fills missing instances', () => {
    const parsed = parseFolderTreeUiStateV1(
      JSON.stringify({
        notes: {
          expandedNodeIds: [' folder:a ', 'folder:a', '', 'folder:b'],
          panelCollapsed: true,
        },
      })
    );

    expect(parsed.notes).toEqual({
      expandedNodeIds: ['folder:a', 'folder:b'],
      panelCollapsed: true,
    });
    expect(parsed.image_studio).toEqual({
      expandedNodeIds: [],
      panelCollapsed: false,
    });
    expect(parsed.product_categories).toEqual({
      expandedNodeIds: [],
      panelCollapsed: false,
    });
    expect(parsed.cms_page_builder).toEqual({
      expandedNodeIds: [],
      panelCollapsed: false,
    });
  });

  it('serializes valid maps without mutation', () => {
    const state = createDefaultFolderTreeUiStateV1();
    state.notes.expandedNodeIds = ['folder:a'];
    state.notes.panelCollapsed = true;

    const serialized = serializeFolderTreeUiStateV1(state);
    const roundtrip = parseFolderTreeUiStateV1(serialized);

    expect(roundtrip.notes).toEqual({
      expandedNodeIds: ['folder:a'],
      panelCollapsed: true,
    });
  });
});

