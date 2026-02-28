import { describe, expect, it } from 'vitest';

import { buildRootsV2, flattenVisibleNodesV2 } from '@/features/foldertree/v2/core/engine';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const nodes: MasterTreeNode[] = [
  {
    id: 'folder:a',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'A',
    path: 'A',
    sortOrder: 0,
  },
  {
    id: 'file:a1',
    type: 'file',
    kind: 'file',
    parentId: 'folder:a',
    name: 'A1',
    path: 'A/A1',
    sortOrder: 0,
  },
  {
    id: 'folder:b',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'B',
    path: 'B',
    sortOrder: 1,
  },
];

describe('flattenVisibleNodesV2', () => {
  it('only includes children for expanded folders', () => {
    const roots = buildRootsV2(nodes);
    const collapsedRows = flattenVisibleNodesV2(roots, new Set());
    expect(collapsedRows.map((row) => row.nodeId)).toEqual(['folder:a', 'folder:b']);

    const expandedRows = flattenVisibleNodesV2(roots, new Set(['folder:a']));
    expect(expandedRows.map((row) => row.nodeId)).toEqual(['folder:a', 'file:a1', 'folder:b']);
  });
});
