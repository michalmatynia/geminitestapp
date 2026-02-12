import { describe, expect, it } from 'vitest';

import {
  canMoveTreePath,
  collectTreeNodeIds,
  findTreeNodeById,
  findTreeNodeParentId,
  getTreePathLeaf,
  isTreeNodeIdInSubtree,
  isTreePathWithin,
  normalizeTreePath,
  rebaseTreePath,
} from '@/shared/utils/tree-operations';

type Node = {
  id: string;
  children: Node[];
};

const tree: Node[] = [
  {
    id: 'a',
    children: [
      { id: 'a-1', children: [] },
      {
        id: 'a-2',
        children: [{ id: 'a-2-1', children: [] }],
      },
    ],
  },
  { id: 'b', children: [] },
];

describe('tree-operations', () => {
  it('finds nodes and parent ids in nested trees', () => {
    expect(findTreeNodeById(tree, 'a-2')?.id).toBe('a-2');
    expect(findTreeNodeById(tree, 'missing')).toBeNull();
    expect(findTreeNodeParentId(tree, 'a')).toBeNull();
    expect(findTreeNodeParentId(tree, 'a-2-1')).toBe('a-2');
  });

  it('collects tree ids and validates subtree membership', () => {
    expect(collectTreeNodeIds(tree)).toEqual(['a', 'a-1', 'a-2', 'a-2-1', 'b']);
    expect(isTreeNodeIdInSubtree(tree, 'a', 'a-2-1')).toBe(true);
    expect(isTreeNodeIdInSubtree(tree, 'a-2', 'b')).toBe(false);
  });

  it('normalizes paths and checks path relationships', () => {
    expect(normalizeTreePath('/cards\\\\hero/')).toBe('cards/hero');
    expect(getTreePathLeaf('/cards/hero/')).toBe('hero');
    expect(isTreePathWithin('cards/hero/masks', 'cards/hero')).toBe(true);
    expect(isTreePathWithin('cards/other', 'cards/hero')).toBe(false);
  });

  it('prevents invalid moves and rebases nested paths', () => {
    expect(canMoveTreePath('cards/hero', 'cards')).toBe(true);
    expect(canMoveTreePath('cards/hero', 'cards/hero')).toBe(false);
    expect(canMoveTreePath('cards/hero', 'cards/hero/child')).toBe(false);

    expect(rebaseTreePath('cards/hero', 'cards/hero', 'archive/hero')).toBe('archive/hero');
    expect(rebaseTreePath('cards/hero/masks/base', 'cards/hero', 'archive/hero')).toBe(
      'archive/hero/masks/base'
    );
    expect(rebaseTreePath('cards/other', 'cards/hero', 'archive/hero')).toBe('cards/other');
  });
});
