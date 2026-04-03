import { describe, expect, it } from 'vitest';

import {
  collectCascadeSlotIds,
  getSourceSlotIdsFromMetadata,
  resolveSlotIdAliases,
} from '@/features/ai/image-studio/server/slot-repository';

describe('slot-repository utility helpers', () => {
  it('expands slot id aliases from prefixed identifiers', () => {
    expect(resolveSlotIdAliases(' slot:child-1 ')).toEqual([
      'slot:child-1',
      'child-1',
      'card:child-1',
    ]);
  });

  it('collects source slot ids from primary and nested metadata fields', () => {
    expect(
      getSourceSlotIdsFromMetadata({
        sourceSlotId: ' slot:root-1 ',
        sourceSlotIds: ['card:root-2', 'root-2', ' ', null],
      })
    ).toEqual([
      'slot:root-1',
      'root-1',
      'card:root-1',
      'card:root-2',
      'root-2',
      'slot:root-2',
    ]);
  });

  it('collects metadata-derived and linked cascade descendants from root aliases', () => {
    const docs = [
      { _id: 'root-1', metadata: null, imageFileId: null, screenshotFileId: null },
      {
        _id: 'child-1',
        metadata: { sourceSlotId: 'slot:root-1' },
        imageFileId: null,
        screenshotFileId: null,
      },
      {
        _id: 'grandchild-1',
        metadata: { sourceSlotIds: ['child-1'] },
        imageFileId: null,
        screenshotFileId: null,
      },
      { _id: 'linked-1', metadata: null, imageFileId: null, screenshotFileId: null },
      { _id: 'outside-1', metadata: { sourceSlotId: 'missing' }, imageFileId: null, screenshotFileId: null },
    ];

    expect(
      collectCascadeSlotIds('card:root-1', docs, {
        linkedChildIdsBySource: new Map([
          ['root-1', new Set(['linked-1', 'ghost-child'])],
          ['ghost-source', new Set(['child-1'])],
        ]),
      })
    ).toEqual(['root-1', 'child-1', 'linked-1', 'grandchild-1']);
  });

  it('returns an empty cascade when the root slot cannot be resolved in the doc set', () => {
    expect(
      collectCascadeSlotIds('missing-root', [
        { _id: 'child-1', metadata: { sourceSlotId: 'root-1' }, imageFileId: null, screenshotFileId: null },
      ])
    ).toEqual([]);
  });
});
