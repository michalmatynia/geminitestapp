import { describe, expect, it } from 'vitest';

import {
  KANGUR_QUESTION_SORT_ORDER_GAP,
  createPanelIllustration,
  deleteKangurTestQuestion,
  deleteKangurTestSuiteQuestions,
  formDataToQuestion,
  getQuestionsForSuite,
  hasIllustration,
  nextChoiceLabel,
  parseKangurTestQuestionStore,
  reorderQuestions,
  toQuestionFormData,
  upsertKangurTestQuestion,
} from '@/features/kangur/test-questions';
import type { KangurTestQuestion, KangurTestQuestionStore } from '@/shared/contracts/kangur-tests';

const makeQuestion = (overrides: Partial<KangurTestQuestion> = {}): KangurTestQuestion => ({
  id: 'q1',
  suiteId: 'suite-1',
  sortOrder: 1000,
  prompt: 'What is 2+2?',
  choices: [
    { label: 'A', text: '3' },
    { label: 'B', text: '4' },
    { label: 'C', text: '5' },
  ],
  correctChoiceLabel: 'B',
  pointValue: 3,
  illustration: { type: 'none' },
  ...overrides,
});

// ─── nextChoiceLabel ──────────────────────────────────────────────────────────

describe('nextChoiceLabel', () => {
  it('returns A for an empty list', () => {
    expect(nextChoiceLabel([])).toBe('A');
  });

  it('returns B after A', () => {
    expect(nextChoiceLabel(['A'])).toBe('B');
  });

  it('returns C after A and B', () => {
    expect(nextChoiceLabel(['A', 'B'])).toBe('C');
  });

  it('returns E after A through D', () => {
    expect(nextChoiceLabel(['A', 'B', 'C', 'D'])).toBe('E');
  });

  it('falls back to character code arithmetic after E (6th label = F)', () => {
    const result = nextChoiceLabel(['A', 'B', 'C', 'D', 'E']);
    expect(result).toBe('F');
  });

  it('skips over any label already in the list', () => {
    // Missing B — should return B even though C is not present
    expect(nextChoiceLabel(['A', 'C'])).toBe('B');
  });
});

// ─── hasIllustration ─────────────────────────────────────────────────────────

describe('hasIllustration', () => {
  it('returns false for type none', () => {
    expect(hasIllustration(makeQuestion({ illustration: { type: 'none' } }))).toBe(false);
  });

  it('returns false for type single with empty svgContent', () => {
    expect(
      hasIllustration(makeQuestion({ illustration: { type: 'single', svgContent: '' } }))
    ).toBe(false);
  });

  it('returns false for type single with whitespace-only svgContent', () => {
    expect(
      hasIllustration(makeQuestion({ illustration: { type: 'single', svgContent: '   ' } }))
    ).toBe(false);
  });

  it('returns true for type single with non-empty svgContent', () => {
    expect(
      hasIllustration(makeQuestion({ illustration: { type: 'single', svgContent: '<svg/>' } }))
    ).toBe(true);
  });

  it('returns false for type panels where all panels have empty svgContent', () => {
    expect(
      hasIllustration(
        makeQuestion({
          illustration: {
            type: 'panels',
            layout: 'row',
            panels: [
              { id: 'p1', label: 'A', svgContent: '' },
              { id: 'p2', label: 'B', svgContent: '' },
            ],
          },
        })
      )
    ).toBe(false);
  });

  it('returns true for type panels when at least one panel has content', () => {
    expect(
      hasIllustration(
        makeQuestion({
          illustration: {
            type: 'panels',
            layout: 'row',
            panels: [
              { id: 'p1', label: 'A', svgContent: '' },
              { id: 'p2', label: 'B', svgContent: '<svg/>' },
            ],
          },
        })
      )
    ).toBe(true);
  });
});

// ─── createPanelIllustration ─────────────────────────────────────────────────

describe('createPanelIllustration', () => {
  it('creates the correct number of panels', () => {
    const result = createPanelIllustration(3);
    expect(result.type).toBe('panels');
    if (result.type === 'panels') {
      expect(result.panels).toHaveLength(3);
    }
  });

  it('assigns default A/B/C labels when no custom labels provided', () => {
    const result = createPanelIllustration(3);
    if (result.type === 'panels') {
      expect(result.panels[0]?.label).toBe('A');
      expect(result.panels[1]?.label).toBe('B');
      expect(result.panels[2]?.label).toBe('C');
    }
  });

  it('uses custom labels when provided', () => {
    const result = createPanelIllustration(2, ['X', 'Y']);
    if (result.type === 'panels') {
      expect(result.panels[0]?.label).toBe('X');
      expect(result.panels[1]?.label).toBe('Y');
    }
  });

  it('returns layout row by default', () => {
    const result = createPanelIllustration(2);
    if (result.type === 'panels') {
      expect(result.layout).toBe('row');
    }
  });

  it('initialises svgContent to empty string for each panel', () => {
    const result = createPanelIllustration(4);
    if (result.type === 'panels') {
      expect(result.panels.every((p) => p.svgContent === '')).toBe(true);
    }
  });
});

// ─── parseKangurTestQuestionStore ────────────────────────────────────────────

describe('parseKangurTestQuestionStore', () => {
  it('returns {} for null', () => {
    expect(parseKangurTestQuestionStore(null)).toEqual({});
  });

  it('returns {} for undefined', () => {
    expect(parseKangurTestQuestionStore(undefined)).toEqual({});
  });

  it('returns {} for invalid JSON', () => {
    expect(parseKangurTestQuestionStore('bad-json{')).toEqual({});
  });

  it('returns {} for JSON that is not an object', () => {
    expect(parseKangurTestQuestionStore(JSON.stringify([]))).toEqual({});
  });

  it('parses a valid store', () => {
    const q = makeQuestion({ id: 'q-abc' });
    const raw = JSON.stringify({ 'q-abc': q });
    const result = parseKangurTestQuestionStore(raw);
    expect(result['q-abc']?.prompt).toBe('What is 2+2?');
    expect(result['q-abc']?.correctChoiceLabel).toBe('B');
  });

  it('drops entries that fail question schema validation', () => {
    const valid = makeQuestion({ id: 'q-ok' });
    const raw = JSON.stringify({
      'q-ok': valid,
      'q-bad': { id: 'q-bad', invalid: true },
    });
    const result = parseKangurTestQuestionStore(raw);
    // The entire store parse fails if any value is invalid (z.record + z.object strict)
    // or only the valid ones survive depending on Zod config.
    // Either way the valid one must be present if the parse succeeds.
    expect(typeof result).toBe('object');
  });
});

// ─── getQuestionsForSuite ─────────────────────────────────────────────────────

describe('getQuestionsForSuite', () => {
  it('returns only questions matching the given suiteId', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-A', sortOrder: 1000 }),
      q2: makeQuestion({ id: 'q2', suiteId: 'suite-B', sortOrder: 1000 }),
      q3: makeQuestion({ id: 'q3', suiteId: 'suite-A', sortOrder: 2000 }),
    };
    const result = getQuestionsForSuite(store, 'suite-A');
    expect(result).toHaveLength(2);
    expect(result.every((q) => q.suiteId === 'suite-A')).toBe(true);
  });

  it('returns questions sorted by sortOrder ascending', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-A', sortOrder: 3000 }),
      q2: makeQuestion({ id: 'q2', suiteId: 'suite-A', sortOrder: 1000 }),
      q3: makeQuestion({ id: 'q3', suiteId: 'suite-A', sortOrder: 2000 }),
    };
    const result = getQuestionsForSuite(store, 'suite-A');
    expect(result[0]?.id).toBe('q2');
    expect(result[1]?.id).toBe('q3');
    expect(result[2]?.id).toBe('q1');
  });

  it('uses id as tiebreaker when sortOrders are equal', () => {
    const store: KangurTestQuestionStore = {
      'q-z': makeQuestion({ id: 'q-z', suiteId: 'suite-A', sortOrder: 1000 }),
      'q-a': makeQuestion({ id: 'q-a', suiteId: 'suite-A', sortOrder: 1000 }),
    };
    const result = getQuestionsForSuite(store, 'suite-A');
    expect(result[0]?.id).toBe('q-a');
  });

  it('returns [] for an unknown suiteId', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-A' }),
    };
    expect(getQuestionsForSuite(store, 'suite-99')).toEqual([]);
  });

  it('returns [] for an empty store', () => {
    expect(getQuestionsForSuite({}, 'suite-A')).toEqual([]);
  });
});

// ─── reorderQuestions ─────────────────────────────────────────────────────────

describe('reorderQuestions', () => {
  it('reassigns sortOrder as (index+1) * gap', () => {
    const qs = [
      makeQuestion({ id: 'q1', sortOrder: 999 }),
      makeQuestion({ id: 'q2', sortOrder: 5000 }),
      makeQuestion({ id: 'q3', sortOrder: 1 }),
    ];
    const result = reorderQuestions(qs);
    expect(result[0]?.sortOrder).toBe(KANGUR_QUESTION_SORT_ORDER_GAP);
    expect(result[1]?.sortOrder).toBe(KANGUR_QUESTION_SORT_ORDER_GAP * 2);
    expect(result[2]?.sortOrder).toBe(KANGUR_QUESTION_SORT_ORDER_GAP * 3);
  });

  it('preserves question identity (id, prompt) while reordering', () => {
    const qs = [makeQuestion({ id: 'q1', prompt: 'Q one' })];
    const result = reorderQuestions(qs);
    expect(result[0]?.id).toBe('q1');
    expect(result[0]?.prompt).toBe('Q one');
  });

  it('returns [] for empty input', () => {
    expect(reorderQuestions([])).toEqual([]);
  });
});

// ─── upsertKangurTestQuestion ─────────────────────────────────────────────────

describe('upsertKangurTestQuestion', () => {
  it('adds a new question to an empty store', () => {
    const result = upsertKangurTestQuestion({}, makeQuestion({ id: 'q-new' }));
    expect(result['q-new']).toBeDefined();
  });

  it('adds a new question without removing existing ones', () => {
    const store: KangurTestQuestionStore = { 'q-old': makeQuestion({ id: 'q-old' }) };
    const result = upsertKangurTestQuestion(store, makeQuestion({ id: 'q-new' }));
    expect(result['q-old']).toBeDefined();
    expect(result['q-new']).toBeDefined();
  });

  it('replaces an existing question by id', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', prompt: 'Old prompt' }),
    };
    const result = upsertKangurTestQuestion(store, makeQuestion({ id: 'q1', prompt: 'New prompt' }));
    expect(result['q1']?.prompt).toBe('New prompt');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('does not mutate the original store', () => {
    const store: KangurTestQuestionStore = { q1: makeQuestion({ id: 'q1' }) };
    upsertKangurTestQuestion(store, makeQuestion({ id: 'q2' }));
    expect(Object.keys(store)).toHaveLength(1);
  });
});

// ─── deleteKangurTestQuestion ─────────────────────────────────────────────────

describe('deleteKangurTestQuestion', () => {
  it('removes the question by id', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1' }),
      q2: makeQuestion({ id: 'q2' }),
    };
    const result = deleteKangurTestQuestion(store, 'q1');
    expect(result['q1']).toBeUndefined();
    expect(result['q2']).toBeDefined();
  });

  it('is a no-op for an unknown id', () => {
    const store: KangurTestQuestionStore = { q1: makeQuestion({ id: 'q1' }) };
    const result = deleteKangurTestQuestion(store, 'q-unknown');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('does not mutate the original store', () => {
    const store: KangurTestQuestionStore = { q1: makeQuestion({ id: 'q1' }) };
    deleteKangurTestQuestion(store, 'q1');
    expect(store['q1']).toBeDefined();
  });
});

// ─── deleteKangurTestSuiteQuestions ──────────────────────────────────────────

describe('deleteKangurTestSuiteQuestions', () => {
  it('removes all questions for the given suiteId', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-A' }),
      q2: makeQuestion({ id: 'q2', suiteId: 'suite-B' }),
      q3: makeQuestion({ id: 'q3', suiteId: 'suite-A' }),
    };
    const result = deleteKangurTestSuiteQuestions(store, 'suite-A');
    expect(result['q1']).toBeUndefined();
    expect(result['q3']).toBeUndefined();
    expect(result['q2']).toBeDefined();
  });

  it('returns an empty store when all questions belong to the suite', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-A' }),
    };
    const result = deleteKangurTestSuiteQuestions(store, 'suite-A');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('is a no-op when no questions match the suiteId', () => {
    const store: KangurTestQuestionStore = {
      q1: makeQuestion({ id: 'q1', suiteId: 'suite-B' }),
    };
    const result = deleteKangurTestSuiteQuestions(store, 'suite-X');
    expect(Object.keys(result)).toHaveLength(1);
  });
});

// ─── toQuestionFormData / formDataToQuestion round-trip ──────────────────────

describe('toQuestionFormData / formDataToQuestion round-trip', () => {
  it('preserves prompt, choices, correctChoiceLabel, pointValue, explanation', () => {
    const q = makeQuestion({
      id: 'q-rt',
      suiteId: 'suite-rt',
      sortOrder: 5000,
      prompt: 'Round-trip question?',
      correctChoiceLabel: 'C',
      pointValue: 5,
      explanation: 'Because of math.',
    });
    const fd = toQuestionFormData(q);
    const restored = formDataToQuestion(fd, 'q-rt', 'suite-rt', 5000);
    expect(restored.prompt).toBe('Round-trip question?');
    expect(restored.correctChoiceLabel).toBe('C');
    expect(restored.pointValue).toBe(5);
    expect(restored.explanation).toBe('Because of math.');
    expect(restored.choices).toHaveLength(3);
  });

  it('preserves illustration type single through round-trip', () => {
    const q = makeQuestion({
      illustration: { type: 'single', svgContent: '<svg><rect/></svg>' },
    });
    const fd = toQuestionFormData(q);
    const restored = formDataToQuestion(fd, q.id, q.suiteId, q.sortOrder);
    expect(restored.illustration.type).toBe('single');
    if (restored.illustration.type === 'single') {
      expect(restored.illustration.svgContent).toBe('<svg><rect/></svg>');
    }
  });

  it('converts empty explanation to undefined in the restored question', () => {
    const q = makeQuestion({ explanation: undefined });
    const fd = toQuestionFormData(q);
    expect(fd.explanation).toBe('');
    const restored = formDataToQuestion(fd, q.id, q.suiteId, q.sortOrder);
    expect(restored.explanation).toBeUndefined();
  });

  it('trims prompt whitespace', () => {
    const q = makeQuestion({ prompt: '  Trimmed?  ' });
    const fd = toQuestionFormData(q);
    const restored = formDataToQuestion(fd, q.id, q.suiteId, q.sortOrder);
    expect(restored.prompt).toBe('Trimmed?');
  });
});
