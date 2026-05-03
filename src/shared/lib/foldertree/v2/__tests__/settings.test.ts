import { describe, expect, it } from 'vitest';

import { canNestTreeNodeV2 } from '@/shared/utils/folder-tree-profiles-v2';
import {
  parseFolderTreeProfileV2Entry,
  parseFolderTreeUiStateV2Entry,
} from '@/shared/lib/foldertree/v2/settings';

describe('folder tree v2 settings', () => {
  it('rejects invalid ui entries', () => {
    expect(() => parseFolderTreeUiStateV2Entry('bad-json')).toThrow();
    expect(() => parseFolderTreeUiStateV2Entry(JSON.stringify({ legacy: true }))).toThrow();
    expect(() =>
      parseFolderTreeUiStateV2Entry(JSON.stringify({ expandedNodeIds: 'folder-a' }))
    ).toThrow();
  });

  it('parses canonical ui entries', () => {
    expect(
      parseFolderTreeUiStateV2Entry(
        JSON.stringify({ expandedNodeIds: [' a ', '', 'a'], panelCollapsed: true })
      )
    ).toEqual({
      expandedNodeIds: ['a'],
      panelCollapsed: true,
    });
  });

  it('rejects invalid profile entries', () => {
    expect(() => parseFolderTreeProfileV2Entry('notes', 'bad-json')).toThrow();
    expect(() =>
      parseFolderTreeProfileV2Entry('notes', JSON.stringify({ legacy: true }))
    ).toThrow();
    expect(() =>
      parseFolderTreeProfileV2Entry(
        'notes',
        JSON.stringify({
          icons: {
            slots: {
              folderClosed: 'Folder',
              legacySlot: 'Legacy',
            },
          },
        })
      )
    ).toThrow();
  });

  it('parses canonical profile entries', () => {
    expect(
      parseFolderTreeProfileV2Entry(
        'notes',
        JSON.stringify({
          placeholders: { preset: 'classic' },
          interactions: { selectionBehavior: 'click_away' },
        })
      ).placeholders.preset
    ).toBe('classic');
  });

  it('preserves required category nesting for persisted product category profiles', () => {
    const profile = parseFolderTreeProfileV2Entry(
      'product_categories',
      JSON.stringify({
        nesting: {
          defaultAllow: false,
          blockedTargetKinds: ['category'],
          rules: [
            {
              childType: 'folder',
              childKinds: ['*'],
              targetType: 'folder',
              targetKinds: ['*'],
              allow: false,
            },
            {
              childType: 'folder',
              childKinds: ['*'],
              targetType: 'root',
              targetKinds: ['root'],
              allow: false,
            },
          ],
        },
      })
    );

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'folder',
        nodeKind: 'category',
        targetType: 'folder',
        targetFolderKind: 'category',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'folder',
        nodeKind: 'category',
        targetType: 'root',
        targetFolderKind: null,
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'product',
        targetType: 'folder',
        targetFolderKind: 'category',
      })
    ).toBe(false);
  });
});
