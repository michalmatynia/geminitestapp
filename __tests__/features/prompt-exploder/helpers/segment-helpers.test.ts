import { describe, expect, it } from 'vitest';

import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import {
  promptExploderCreateListItem as createListItem,
  promptExploderAddBlankListItem as addBlankListItem,
  promptExploderCreateSubsection as createSubsection,
  promptExploderCreateManualBindingId as createManualBindingId,
  promptExploderFormatSubsectionLabel as formatSubsectionLabel,
  promptExploderBuildSegmentSampleText as buildSegmentSampleText,
  promptExploderCreateApprovalDraftFromSegment as createApprovalDraftFromSegment,
  promptExploderIsPromptExploderManagedRule as isPromptExploderManagedRule,
} from '@/features/prompt-exploder/helpers/segment-helpers';
import type { PromptExploderSegment } from '@/shared/contracts/prompt-exploder';

const makeSegment = (overrides: Partial<PromptExploderSegment> & { id: string }): PromptExploderSegment => ({
  type: 'assigned_text',
  title: overrides.id,
  includeInOutput: true,
  text: '',
  raw: '',
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
  confidence: 1,
  validationResults: [],
  segments: [],
  ...overrides,
}) as any;

describe('createListItem', () => {
  it('creates item with default text', () => {
    const item = createListItem();
    expect(item.text).toBe('New item');
    expect(item.id).toBeTruthy();
    expect(item.children).toEqual([]);
    expect(item.logicalOperator).toBeNull();
  });

  it('creates item with custom text', () => {
    const item = createListItem('Custom text');
    expect(item.text).toBe('Custom text');
  });

  it('generates unique IDs', () => {
    const item1 = createListItem();
    const item2 = createListItem();
    expect(item1.id).not.toBe(item2.id);
  });
});

describe('addBlankListItem', () => {
  it('appends a new item to empty array', () => {
    const result = addBlankListItem([]);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe('New item');
  });

  it('appends to existing items', () => {
    const existing = [createListItem('First')];
    const result = addBlankListItem(existing);
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe('First');
    expect(result[1]!.text).toBe('New item');
  });
});

describe('createSubsection', () => {
  it('creates subsection with defaults', () => {
    const subsection = createSubsection();
    expect(subsection.title).toBe('New subsection');
    expect(subsection.code).toBeNull();
    expect(subsection.condition).toBeNull();
    expect(subsection.items).toHaveLength(1);
  });
});

describe('createManualBindingId', () => {
  it('generates ID starting with manual_', () => {
    expect(createManualBindingId()).toMatch(/^manual_/);
  });

  it('generates unique IDs', () => {
    const id1 = createManualBindingId();
    const id2 = createManualBindingId();
    expect(id1).not.toBe(id2);
  });
});

describe('formatSubsectionLabel', () => {
  it('returns title for subsection without code', () => {
    expect(formatSubsectionLabel({ id: '1', title: 'My Section', code: null, items: [], condition: null })).toBe(
      'My Section'
    );
  });

  it('includes code prefix when present', () => {
    expect(formatSubsectionLabel({ id: '1', title: 'My Section', code: 'A1', items: [], condition: null })).toBe(
      '[A1] My Section'
    );
  });

  it('uses fallback for empty title', () => {
    expect(formatSubsectionLabel({ id: '1', title: '', code: null, items: [], condition: null })).toBe(
      'Untitled subsection'
    );
  });
});

describe('buildSegmentSampleText', () => {
  it('uses list item text when available', () => {
    const segment = makeSegment({
      id: 'test',
      listItems: [createListItem('item1'), createListItem('item2')],
    });
    expect(buildSegmentSampleText(segment)).toBe('item1 item2');
  });

  it('uses subsection titles when no list items', () => {
    const segment = makeSegment({
      id: 'test',
      subsections: [
        { id: '1', title: 'Sub A', code: null, items: [], condition: null },
        { id: '2', title: 'Sub B', code: null, items: [], condition: null },
      ],
    });
    expect(buildSegmentSampleText(segment)).toBe('Sub A Sub B');
  });

  it('falls back to text slice', () => {
    const segment = makeSegment({ id: 'test', text: 'Hello world' });
    expect(buildSegmentSampleText(segment)).toBe('Hello world');
  });
});

describe('createApprovalDraftFromSegment', () => {
  it('returns defaults for null segment', () => {
    const draft = createApprovalDraftFromSegment(null);
    expect(draft.ruleTitle).toBe('Learned segment pattern');
    expect(draft.ruleSegmentType).toBe('assigned_text');
    expect(draft.templateMergeMode).toBe('auto');
  });

  it('derives values from segment', () => {
    const segment = makeSegment({
      id: 'test',
      type: 'list',
      title: 'My List Segment',
      text: 'sample content here',
    });
    const draft = createApprovalDraftFromSegment(segment);
    expect(draft.ruleTitle).toBe('Learned list pattern');
    expect(draft.ruleSegmentType).toBe('list');
    expect(draft.rulePattern.length).toBeGreaterThan(0);
  });
});

describe('isPromptExploderManagedRule', () => {
  it('returns true for rules scoped to prompt_exploder', () => {
    const rule = { id: 'test', appliesToScopes: ['prompt_exploder'] } as unknown as PromptValidationRule;
    expect(isPromptExploderManagedRule(rule)).toBe(true);
  });

  it('returns true for rules scoped to case_resolver_prompt_exploder', () => {
    const rule = {
      id: 'test',
      appliesToScopes: ['case_resolver_prompt_exploder'],
    } as unknown as PromptValidationRule;
    expect(isPromptExploderManagedRule(rule)).toBe(true);
  });

  it('returns true for rules with exploder in ID', () => {
    const rule = { id: 'segment.prompt_exploder.test' } as unknown as PromptValidationRule;
    expect(isPromptExploderManagedRule(rule)).toBe(true);
  });

  it('returns true for rules starting with segment.', () => {
    const rule = { id: 'segment.custom' } as unknown as PromptValidationRule;
    expect(isPromptExploderManagedRule(rule)).toBe(true);
  });

  it('returns false for unrelated rules', () => {
    const rule = { id: 'some.other.rule' } as unknown as PromptValidationRule;
    expect(isPromptExploderManagedRule(rule)).toBe(false);
  });
});
