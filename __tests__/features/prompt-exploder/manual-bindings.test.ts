import {
  buildManualBindingFromDraft,
  resolveManualBindingSegmentIds,
  resolveManualBindingSubsectionIds,
} from '@/features/prompt-exploder/manual-bindings';
import type {
  PromptExploderSegment,
  PromptExploderSubsection,
} from '@/shared/contracts/prompt-exploder';

const buildSubsection = (id: string, title: string): PromptExploderSubsection => ({
  id,
  title,
  code: null,
  items: [],
  condition: null,
});

const buildSegment = (
  id: string,
  title: string,
  subsections: PromptExploderSubsection[] = []
): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title,
  includeInOutput: true,
  text: title,
  raw: title,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections,
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 0.5,
  validationResults: [],
  segments: [],
});

describe('prompt exploder manual bindings', () => {
  it('resolves segment ids with first/second defaults when missing', () => {
    const segments = [buildSegment('a', 'A'), buildSegment('b', 'B')];
    const resolved = resolveManualBindingSegmentIds({
      segments,
      fromSegmentId: 'missing',
      toSegmentId: '',
    });
    expect(resolved).toEqual({
      fromSegmentId: 'a',
      toSegmentId: 'b',
    });
  });

  it('resolves subsection ids by clearing invalid references', () => {
    const segmentById = new Map([
      [
        'a',
        buildSegment('a', 'A', [buildSubsection('sub_a_1', 'A1')]),
      ],
      ['b', buildSegment('b', 'B')],
    ]);
    const resolved = resolveManualBindingSubsectionIds({
      segmentById,
      fromSegmentId: 'a',
      toSegmentId: 'b',
      fromSubsectionId: 'sub_a_1',
      toSubsectionId: 'missing',
    });
    expect(resolved).toEqual({
      fromSubsectionId: 'sub_a_1',
      toSubsectionId: '',
    });
  });

  it('returns info error when depends_on binding targets the same endpoint', () => {
    const section = buildSubsection('sub_1', 'Sub 1');
    const result = buildManualBindingFromDraft({
      segments: [buildSegment('seg', 'Segment', [section])],
      draft: {
        type: 'depends_on',
        fromSegmentId: 'seg',
        toSegmentId: 'seg',
        fromSubsectionId: 'sub_1',
        toSubsectionId: 'sub_1',
        sourceLabel: '',
        targetLabel: '',
      },
      createManualBindingId: () => 'manual_id',
      formatSubsectionLabel: (subsection) => subsection.title,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.variant).toBe('info');
    expect(result.message).toContain('exact same endpoint');
  });

  it('builds valid binding with default labels and manual origin', () => {
    const section = buildSubsection('sub_1', 'Sub 1');
    const result = buildManualBindingFromDraft({
      segments: [
        buildSegment('from', 'From Segment', [section]),
        buildSegment('to', 'To Segment'),
      ],
      draft: {
        type: 'references',
        fromSegmentId: 'from',
        toSegmentId: 'to',
        fromSubsectionId: 'sub_1',
        toSubsectionId: '',
        sourceLabel: '  ',
        targetLabel: 'Custom Target',
      },
      createManualBindingId: () => 'manual_id',
      formatSubsectionLabel: (subsection) => `Formatted ${subsection.title}`,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding).toEqual({
      id: 'manual_id',
      type: 'references',
      fromSegmentId: 'from',
      toSegmentId: 'to',
      fromSubsectionId: 'sub_1',
      toSubsectionId: null,
      sourceLabel: 'Formatted Sub 1',
      targetLabel: 'Custom Target',
      origin: 'manual',
    });
  });
});
