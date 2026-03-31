import { describe, expect, it } from 'vitest';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { filterMasterTreeToMatches, searchMasterTreeNodes } from '../search';

const node = (id: string, name: string, parentId: string | null = null): MasterTreeNode => ({
  id,
  type: 'file',
  kind: 'file',
  parentId,
  name,
  path: `/${name}`,
  sortOrder: 0,
});

describe('searchMasterTreeNodes', () => {
  const nodes = [
    node('1', 'Apple'),
    node('2', 'Banana'),
    node('3', 'Apricot'),
    node('4', 'Cherry'),
  ];

  it('returns empty array for empty query', () => {
    expect(searchMasterTreeNodes(nodes, '')).toEqual([]);
    expect(searchMasterTreeNodes(nodes, '  ')).toEqual([]);
  });

  it('finds nodes by name (contains mode by default)', () => {
    const results = searchMasterTreeNodes(nodes, 'ap');
    const ids = results.map((r) => r.nodeId);
    expect(ids).toContain('1'); // Apple
    expect(ids).toContain('3'); // Apricot
    expect(ids).not.toContain('2');
  });

  it('respects starts_with mode', () => {
    const results = searchMasterTreeNodes(nodes, 'ap', { matchMode: 'starts_with' });
    const ids = results.map((r) => r.nodeId);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
  });

  it('respects exact mode', () => {
    const results = searchMasterTreeNodes(nodes, 'Apple', { matchMode: 'exact' });
    expect(results).toHaveLength(1);
    expect(results[0]?.nodeId).toBe('1');
  });

  it('respects maxResults', () => {
    const results = searchMasterTreeNodes(nodes, 'a', { maxResults: 1 });
    expect(results).toHaveLength(1);
  });

  it('returns match scores sorted descending', () => {
    const results = searchMasterTreeNodes(nodes, 'Apple', { matchMode: 'contains' });
    expect(results[0]?.nodeId).toBe('1');
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it('supports metadata field matching when configured', () => {
    const nodesWithMetadata: MasterTreeNode[] = [
      {
        id: 'meta-a',
        type: 'file',
        kind: 'file',
        parentId: null,
        name: 'Document A',
        path: '/docs/a',
        sortOrder: 0,
        metadata: {
          tags: ['classified', 'urgent'],
        },
      },
      {
        id: 'meta-b',
        type: 'file',
        kind: 'file',
        parentId: null,
        name: 'Document B',
        path: '/docs/b',
        sortOrder: 1,
      },
    ];

    const results = searchMasterTreeNodes(nodesWithMetadata, 'urgent', {
      fields: ['metadata'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.nodeId).toBe('meta-a');
    expect(results[0]?.matchField).toBe('metadata');
  });

  it('applies deterministic tiebreak ordering for equal-score matches', () => {
    const nodesForTieBreak: MasterTreeNode[] = [node('b-id', 'Beta'), node('a-id', 'Alpha')];

    const results = searchMasterTreeNodes(nodesForTieBreak, 'a');
    expect(results.map((result) => result.nodeId)).toEqual(['a-id', 'b-id']);
  });
});

describe('filterMasterTreeToMatches', () => {
  const nodes: MasterTreeNode[] = [
    {
      id: 'root',
      type: 'folder',
      kind: 'folder',
      parentId: null,
      name: 'root',
      path: '/root',
      sortOrder: 0,
    },
    {
      id: 'child',
      type: 'folder',
      kind: 'folder',
      parentId: 'root',
      name: 'child',
      path: '/root/child',
      sortOrder: 0,
    },
    {
      id: 'leaf',
      type: 'file',
      kind: 'file',
      parentId: 'child',
      name: 'leaf',
      path: '/root/child/leaf',
      sortOrder: 0,
    },
    {
      id: 'other',
      type: 'file',
      kind: 'file',
      parentId: 'root',
      name: 'other',
      path: '/root/other',
      sortOrder: 0,
    },
  ];

  it('returns empty arrays when matches is empty', () => {
    const result = filterMasterTreeToMatches(nodes, []);
    expect(result.filteredNodes).toHaveLength(0);
    expect(result.expandedNodeIds).toHaveLength(0);
  });

  it('includes matched node and all its ancestors in filteredNodes', () => {
    const matches = [{ nodeId: 'leaf', matchField: 'name' as const, score: 50 }];
    const result = filterMasterTreeToMatches(nodes, matches);
    const ids = result.filteredNodes.map((n) => n.id);
    expect(ids).toContain('leaf');
    expect(ids).toContain('child');
    expect(ids).toContain('root');
    expect(ids).not.toContain('other');
  });

  it('includes ancestor IDs in expandedNodeIds', () => {
    const matches = [{ nodeId: 'leaf', matchField: 'name' as const, score: 50 }];
    const result = filterMasterTreeToMatches(nodes, matches);
    expect(result.expandedNodeIds).toContain('child');
    expect(result.expandedNodeIds).toContain('root');
  });
});
