import { describe, expect, it } from 'vitest';

import type { FolderTreeNodeView } from '../../types';
import {
  getSelectionBoundary,
  isNodeInSelection,
  resolveNextSelectedNodeIds,
} from '../selection';

const row = (nodeId: string): FolderTreeNodeView => ({
  nodeId,
  depth: 0,
  parentId: null,
  hasChildren: false,
  isExpanded: false,
});

const rows = [row('a'), row('b'), row('c'), row('d'), row('e')];

describe('resolveNextSelectedNodeIds', () => {
  it('single mode replaces selection with one node', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'single',
      nodeId: 'c',
      currentSelectedIds: ['a', 'b'],
      visibleRows: rows,
    });
    expect(result).toEqual(['c']);
  });

  it('toggle mode adds node when not selected', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'toggle',
      nodeId: 'c',
      currentSelectedIds: ['a'],
      visibleRows: rows,
    });
    expect(result).toContain('c');
    expect(result).toContain('a');
  });

  it('toggle mode removes node when already selected', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'toggle',
      nodeId: 'a',
      currentSelectedIds: ['a', 'b'],
      visibleRows: rows,
    });
    expect(result).not.toContain('a');
    expect(result).toContain('b');
  });

  it('range mode selects contiguous slice from anchor to target', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'range',
      nodeId: 'd',
      anchorId: 'b',
      currentSelectedIds: [],
      visibleRows: rows,
    });
    expect(result).toEqual(['b', 'c', 'd']);
  });

  it('range mode works when target is before anchor', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'range',
      nodeId: 'a',
      anchorId: 'c',
      currentSelectedIds: [],
      visibleRows: rows,
    });
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('all mode selects every visible row', () => {
    const result = resolveNextSelectedNodeIds({
      mode: 'all',
      nodeId: 'a',
      currentSelectedIds: [],
      visibleRows: rows,
    });
    expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('isNodeInSelection', () => {
  it('returns true when node is in selection', () => {
    expect(isNodeInSelection(['a', 'b'], 'a')).toBe(true);
  });

  it('returns false when node is not in selection', () => {
    expect(isNodeInSelection(['a', 'b'], 'z')).toBe(false);
  });
});

describe('getSelectionBoundary', () => {
  it('returns first and last selected visible node', () => {
    const result = getSelectionBoundary(['b', 'd'], rows);
    expect(result).toEqual({ firstId: 'b', lastId: 'd' });
  });

  it('returns nulls when no overlap with visible rows', () => {
    const result = getSelectionBoundary(['x', 'y'], rows);
    expect(result).toEqual({ firstId: null, lastId: null });
  });
});
