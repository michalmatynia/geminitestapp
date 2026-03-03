import { describe, expect, it } from 'vitest';

import {
  parseFolderTreeProfileV2Entry,
  parseFolderTreeUiStateV2Entry,
} from '@/features/foldertree/v2/settings';

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
});
