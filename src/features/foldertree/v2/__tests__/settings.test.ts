import { describe, expect, it } from 'vitest';

import {
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
});
