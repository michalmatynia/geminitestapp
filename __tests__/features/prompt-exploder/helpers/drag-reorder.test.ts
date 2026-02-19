import { describe, expect, it } from 'vitest';

import {
  reorderListItemsForDrop,
  reorderSegmentsForDrop,
  resolveDropPosition,
} from '@/features/prompt-exploder/helpers/drag-reorder';
import type { PromptExploderListItem, PromptExploderSegment } from '@/features/prompt-exploder/types';

const makeItem = (id: string): PromptExploderListItem => ({
  id,
  text: id,
  logicalOperator: null,
  logicalConditions: [],
  referencedParamPath: null,
  referencedComparator: null,
  referencedValue: null,
  children: [],
});

const makeSegment = (id: string): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title: id,
  includeInOutput: true,
  text: '',
  raw: '',
  code: null,
  condition: null,
  listItems: [],
  subsections: [],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 1,
});

describe('reorderListItemsForDrop', () => {
  const items = [makeItem('a'), makeItem('b'), makeItem('c')];

  it('returns same array for same index', () => {
    expect(reorderListItemsForDrop(items, 0, 0, 'before')).toBe(items);
  });

  it('moves item forward with after position', () => {
    const result = reorderListItemsForDrop(items, 0, 2, 'after');
    expect(result.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves item backward with before position', () => {
    const result = reorderListItemsForDrop(items, 2, 0, 'before');
    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns same array for out-of-bounds indices', () => {
    expect(reorderListItemsForDrop(items, -1, 0, 'before')).toBe(items);
    expect(reorderListItemsForDrop(items, 0, 5, 'before')).toBe(items);
  });
});

describe('reorderSegmentsForDrop', () => {
  const segments = [makeSegment('s1'), makeSegment('s2'), makeSegment('s3')];

  it('returns same array for same id', () => {
    expect(reorderSegmentsForDrop(segments, 's1', 's1', 'before')).toBe(segments);
  });

  it('moves segment after target', () => {
    const result = reorderSegmentsForDrop(segments, 's1', 's3', 'after');
    expect(result.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
  });

  it('moves segment before target', () => {
    const result = reorderSegmentsForDrop(segments, 's3', 's1', 'before');
    expect(result.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  it('returns same array for non-existent id', () => {
    expect(reorderSegmentsForDrop(segments, 'missing', 's1', 'before')).toBe(segments);
  });

  it('returns same array for empty draggedId', () => {
    expect(reorderSegmentsForDrop(segments, '', 's1', 'before')).toBe(segments);
  });
});

describe('resolveDropPosition', () => {
  it('returns before when above midpoint', () => {
    expect(resolveDropPosition(10, 0, 40)).toBe('before');
  });

  it('returns after when below midpoint', () => {
    expect(resolveDropPosition(30, 0, 40)).toBe('after');
  });

  it('returns after at exact midpoint', () => {
    expect(resolveDropPosition(20, 0, 40)).toBe('after');
  });
});
