import { describe, expect, it } from 'vitest';

import {
  appendPromptExploderSegmentationRecord,
  buildPromptExploderSegmentationAnalysisContext,
  buildPromptExploderSegmentationRecord,
  parsePromptExploderSegmentationLibrary,
  prunePromptExploderSegmentationRecords,
  type PromptExploderSegmentationRecord,
} from '@/features/prompt-exploder/segmentation-library';
import {
  promptExploderDocumentSchema,
  type PromptExploderDocument,
  type PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';

const buildSegment = (
  id: string,
  patch: Partial<PromptExploderSegment> = {}
): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title: `Segment ${id}`,
  includeInOutput: true,
  text: `Text ${id}`,
  raw: `Text ${id}`,
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
  ...patch,
});

const buildDocument = (segments: PromptExploderSegment[]): PromptExploderDocument =>
  promptExploderDocumentSchema.parse({
    id: 'doc_test',
    version: 1,
    sourcePrompt: 'Original source',
    reassembledPrompt: segments.map((segment) => segment.text || '').join('\n\n'),
    segments,
  });

describe('prompt exploder segmentation library', () => {
  it('returns default state for invalid JSON', () => {
    const parsed = parsePromptExploderSegmentationLibrary('{invalid-json');

    expect(parsed.version).toBe(1);
    expect(parsed.records).toEqual([]);
  });

  it('hydrates legacy records missing prompt and segments via adapter', () => {
    const payload = {
      version: 1,
      records: [
        {
          id: 'legacy_record',
          sourcePrompt: 'Legacy source prompt',
          sourcePromptLength: 20,
          reassembledPrompt: 'Legacy output',
          reassembledPromptLength: 13,
          documentSnapshot: buildDocument([buildSegment('legacy_segment')]),
          segmentCount: 1,
          returnTarget: 'image-studio',
          validationScope: 'prompt_exploder',
          validationRuleStack: 'prompt-exploder',
          capturedAt: '2026-03-01T09:00:00.000Z',
          createdAt: '2026-03-01T09:00:00.000Z',
          updatedAt: '2026-03-01T09:00:00.000Z',
        },
      ],
    };

    const parsed = parsePromptExploderSegmentationLibrary(JSON.stringify(payload));

    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]?.prompt).toBe('Legacy source prompt');
    expect(parsed.records[0]?.segments.map((segment) => segment.id)).toEqual(['legacy_segment']);
  });

  it('builds a segmentation record from prompt and document snapshot', () => {
    const document = buildDocument([buildSegment('a')]);
    const record = buildPromptExploderSegmentationRecord({
      promptText: 'Before segmentation text',
      documentState: document,
      now: '2026-03-01T10:00:00.000Z',
      returnTarget: 'image-studio',
      validationScope: 'prompt_exploder',
      validationRuleStack: 'prompt-exploder',
      createRecordId: () => 'segctx_1',
    });

    expect(record).not.toBeNull();
    expect(record?.id).toBe('segctx_1');
    expect(record?.sourcePrompt).toBe('Before segmentation text');
    expect(record?.segmentCount).toBe(1);
    expect(record?.documentSnapshot.segments[0]?.id).toBe('a');
  });

  it('appends records without overwriting previous segmentation attempts', () => {
    const document = buildDocument([buildSegment('a')]);
    const now = '2026-03-01T10:00:00.000Z';
    const first = buildPromptExploderSegmentationRecord({
      promptText: 'Same prompt',
      documentState: document,
      now,
      returnTarget: 'image-studio',
      validationScope: 'prompt_exploder',
      validationRuleStack: 'prompt-exploder',
      createRecordId: () => 'segctx_first',
    });
    const second = buildPromptExploderSegmentationRecord({
      promptText: 'Same prompt',
      documentState: document,
      now: '2026-03-01T10:05:00.000Z',
      returnTarget: 'image-studio',
      validationScope: 'prompt_exploder',
      validationRuleStack: 'prompt-exploder',
      createRecordId: () => 'segctx_second',
    });

    const records = appendPromptExploderSegmentationRecord({
      records: [first!],
      nextRecord: second!,
      maxRecords: 200,
    });

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.id)).toEqual(['segctx_second', 'segctx_first']);
  });

  it('prunes records to max retention count', () => {
    const records: PromptExploderSegmentationRecord[] = Array.from({ length: 205 }).map(
      (_, index) =>
        ({
          id: `segctx_${index}`,
          sourcePrompt: `Source ${index}`,
          sourcePromptLength: 8,
          reassembledPrompt: `Output ${index}`,
          reassembledPromptLength: 8,
          documentSnapshot: buildDocument([buildSegment(`s_${index}`)]),
          segmentCount: 1,
          returnTarget: 'image-studio',
          validationScope: 'prompt_exploder',
          validationRuleStack: 'prompt-exploder',
          capturedAt: new Date(Date.UTC(2026, 2, 1, 10, index, 0)).toISOString(),
          createdAt: new Date(Date.UTC(2026, 2, 1, 10, index, 0)).toISOString(),
          updatedAt: new Date(Date.UTC(2026, 2, 1, 10, index, 0)).toISOString(),
          prompt: `Source ${index}`,
          segments: [buildSegment(`s_${index}`)],
        }) satisfies PromptExploderSegmentationRecord
    );

    const pruned = prunePromptExploderSegmentationRecords(records, 200);

    expect(pruned).toHaveLength(200);
    expect(pruned[0]?.id).toBe('segctx_204');
    expect(pruned[199]?.id).toBe('segctx_5');
  });

  it('builds analysis context with stats and section outlines', () => {
    const document = buildDocument([
      buildSegment('a', {
        type: 'sequence',
        confidence: 0.9,
        matchedPatternIds: ['segment.boundary.pipeline'],
        matchedPatternLabels: ['Pipeline'],
        subsections: [
          {
            id: 'sub_1',
            title: 'Preparation',
            code: 'A',
            condition: null,
            guidance: 'Do this first',
            items: [{ id: 'item_1', text: 'Line 1', children: [], logicalConditions: [] }],
          },
        ],
      }),
    ]);

    const record = buildPromptExploderSegmentationRecord({
      promptText: 'Analyze this prompt',
      documentState: document,
      now: '2026-03-01T12:00:00.000Z',
      returnTarget: 'case-resolver',
      validationScope: 'case_resolver_prompt_exploder',
      validationRuleStack: 'case-resolver-prompt-exploder',
      createRecordId: () => 'segctx_outline',
    });

    const context = buildPromptExploderSegmentationAnalysisContext({
      records: [record!],
      now: '2026-03-01T12:10:00.000Z',
    });

    expect(context.schemaVersion).toBe(1);
    expect(context.recordCount).toBe(1);
    expect(context.records[0]?.stats.segmentCount).toBe(1);
    expect(context.records[0]?.stats.typeCounts['sequence']).toBe(1);
    expect(context.records[0]?.segments[0]?.subsections[0]?.title).toBe('Preparation');
    expect(context.records[0]?.segments[0]?.matchedPatternLabels).toEqual(['Pipeline']);
  });
});
