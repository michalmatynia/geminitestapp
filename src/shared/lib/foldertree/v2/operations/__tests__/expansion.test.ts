import { describe, expect, it } from 'vitest';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { getAncestorIds } from '../expansion';

const node = (
  id: string,
  parentId: string | null = null,
  type: 'folder' | 'file' = 'folder'
): MasterTreeNode => ({
  id,
  type,
  kind: type,
  parentId,
  name: id,
  path: id,
  sortOrder: 0,
});

describe('getAncestorIds', () => {
  it('returns empty array for root node', () => {
    const nodes = [node('root')];
    expect(getAncestorIds(nodes, 'root')).toEqual([]);
  });

  it('returns immediate parent for shallow node', () => {
    const nodes = [node('root'), node('child', 'root')];
    expect(getAncestorIds(nodes, 'child')).toEqual(['root']);
  });

  it('returns ancestor chain ordered from parent to root', () => {
    const nodes = [
      node('root'),
      node('folder-a', 'root'),
      node('folder-b', 'folder-a'),
      node('deep-file', 'folder-b', 'file'),
    ];
    expect(getAncestorIds(nodes, 'deep-file')).toEqual(['folder-b', 'folder-a', 'root']);
  });

  it('returns empty array for unknown node', () => {
    const nodes = [node('root')];
    expect(getAncestorIds(nodes, 'nonexistent')).toEqual([]);
  });

  it('is cycle-safe and does not infinite loop', () => {
    // Manually construct a malformed tree with a cycle
    const nodes: MasterTreeNode[] = [
      { ...node('a'), parentId: 'b' },
      { ...node('b'), parentId: 'a' },
    ];
    // Should not throw or loop infinitely; returns partial chain
    const result = getAncestorIds(nodes, 'a');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('handles empty nodes array', () => {
    expect(getAncestorIds([], 'any-id')).toEqual([]);
  });
});
