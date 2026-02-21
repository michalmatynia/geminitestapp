import { describe, expect, it } from 'vitest';

import {
  promptExploderInsertSegmentRelative,
  promptExploderMergeSegment,
  promptExploderRemoveSegmentById,
  promptExploderSplitSegmentByRange,
} from '@/features/prompt-exploder/helpers/segment-transforms';
import type { PromptExploderSegment } from '@/shared/contracts/prompt-exploder';

const buildSegment = (id: string, text: string, title = 'Segment'): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title,
  includeInOutput: true,
  text,
  raw: text,
  code: null,
  condition: null,
  items: [],
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
  confidence: 0.6,
  validationResults: [],
  segments: [],
});

describe('prompt exploder segment transforms', () => {
  it('inserts a new segment relative to a target segment', () => {
    const first = buildSegment('a', 'alpha');
    const second = buildSegment('b', 'beta');
    const result = promptExploderInsertSegmentRelative({
      segments: [first, second],
      targetSegmentId: 'a',
      position: 'after',
    });

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]?.id).toBe('a');
    expect(result.segments[2]?.id).toBe('b');
    expect(result.selectedSegmentId).toBe(result.segments[1]?.id);
    expect(result.segments[1]?.title).toBe('');
  });

  it('removes a segment and keeps at least one placeholder segment', () => {
    const only = buildSegment('a', 'alpha');
    const result = promptExploderRemoveSegmentById({
      segments: [only],
      segmentId: 'a',
    });

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]?.id).not.toBe('a');
    expect(result.segments[0]?.text).toBe('');
    expect(result.selectedSegmentId).toBe(result.segments[0]?.id);
  });

  it('splits selected range into a new segment and keeps surrounding text in source', () => {
    const source = buildSegment('a', 'Hello Amazing World', 'Greeting');
    const result = promptExploderSplitSegmentByRange({
      segments: [source],
      segmentId: 'a',
      selectionStart: 6,
      selectionEnd: 13,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.id).toBe('a');
    expect(result.segments[0]?.text).toBe('Hello  World');
    expect(result.segments[1]?.text).toBe('Amazing');
    expect(result.segments[1]?.title).toContain('Split');
    expect(result.selectedSegmentId).toBe(result.segments[1]?.id);
  });

  it('keeps split title empty when source title is empty', () => {
    const source = buildSegment('a', 'Hello Amazing World', '');
    const result = promptExploderSplitSegmentByRange({
      segments: [source],
      segmentId: 'a',
      selectionStart: 6,
      selectionEnd: 13,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments[1]?.text).toBe('Amazing');
    expect(result.segments[1]?.title).toBe('');
  });

  it('merges current segment with previous segment', () => {
    const first = buildSegment('a', 'Top');
    const second = buildSegment('b', 'Bottom');
    const result = promptExploderMergeSegment({
      segments: [first, second],
      segmentId: 'b',
      direction: 'previous',
    });

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]?.id).toBe('a');
    expect(result.segments[0]?.text).toBe('Top\n\nBottom');
    expect(result.selectedSegmentId).toBe('a');
  });
});
