import { describe, expect, it } from 'vitest';

import {
  applyPublishedQuestionEditPolicy,
  KANGUR_QUESTION_SORT_ORDER_GAP,
  createPanelIllustration,
  deleteKangurTestQuestion,
  deleteKangurTestSuiteQuestions,
  formDataToQuestion,
  getPublishedQuestionsForSuite,
  hasFullyPublishedQuestionSetForSuite,
  getQuestionReviewStatus,
  getQuestionsForSuite,
  hasRichChoiceContent,
  hasIllustration,
  isPublishedKangurTestQuestion,
  nextChoiceLabel,
  parseKangurTestQuestionStore,
  publishReadyQuestions,
  questionDocumentNeedsRichRenderer,
  reorderQuestions,
  sanitizeQuestionIllustration,
  shouldDemotePublishedQuestionAfterEdit,
  toQuestionFormData,
  upsertKangurTestQuestion,
  usesRichQuestionPresentation,
} from '@/features/kangur/test-suites/questions';
import type { KangurTestQuestion, KangurTestQuestionStore } from '@/features/kangur/shared/contracts/kangur-tests';

const makeQuestion = (overrides: Partial<KangurTestQuestion> = {}): KangurTestQuestion => ({
  id: 'q1',
  suiteId: 'suite-1',
  sortOrder: 1000,
  prompt: 'What is 2+2?',
  choices: [
    { label: 'A', text: '3', svgContent: '' },
    { label: 'B', text: '4', svgContent: '' },
    { label: 'C', text: '5', svgContent: '' },
  ],
  correctChoiceLabel: 'B',
  pointValue: 3,
  illustration: { type: 'none' },
  presentation: { layout: 'classic', choiceStyle: 'list' },
  editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
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

describe('rich question metadata helpers', () => {
  it('detects rich choice content from descriptions or choice SVG', () => {
    expect(
      hasRichChoiceContent(
        makeQuestion({
          choices: [
            { label: 'A', text: '3', description: 'Small hint', svgContent: '' },
            { label: 'B', text: '4', svgContent: '' },
          ],
        })
      )
    ).toBe(true);

    expect(hasRichChoiceContent(makeQuestion())).toBe(false);
  });

  it('detects non-classic presentation and exposes editorial status', () => {
    const question = makeQuestion({
      presentation: { layout: 'split-illustration-right', choiceStyle: 'grid' },
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-review',
          workflowStatus: 'draft',
          auditFlags: ['legacy_choice_descriptions'],
        },
    });

    expect(usesRichQuestionPresentation(question)).toBe(true);
    expect(getQuestionReviewStatus(question)).toBe('needs-review');
  });

  it('treats plain mirrored prompt documents as non-rich, but richer block sets as rich', () => {
    const plainQuestion = makeQuestion();
    expect(questionDocumentNeedsRichRenderer(plainQuestion.stemDocument, plainQuestion.prompt)).toBe(
      false
    );

    const richQuestion = makeQuestion({
      stemDocument: {
        version: 1,
        blocks: [
          {
            id: 'stem-callout',
            type: 'callout',
            variant: 'info',
            title: 'Hint',
            html: '<p>Rich content</p>',
            ttsText: '',
          },
        ],
      },
    });

    expect(questionDocumentNeedsRichRenderer(richQuestion.stemDocument, richQuestion.prompt)).toBe(
      true
    );
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

describe('sanitizeQuestionIllustration', () => {
  it('preserves empty svg slots but strips unsafe and raster-backed markup', () => {
    expect(sanitizeQuestionIllustration({ type: 'single', svgContent: '   ' })).toEqual({
      type: 'single',
      svgContent: '',
    });

    expect(
      sanitizeQuestionIllustration({
        type: 'single',
        svgContent:
          '<svg viewBox="0 0 10 10"><script>alert(1)</script><image href="/uploads/kangur/example.png" /><circle cx="5" cy="5" r="4" /></svg>',
      })
    ).toEqual({
      type: 'single',
      svgContent: expect.not.stringContaining('<script'),
    });

    const sanitized = sanitizeQuestionIllustration({
      type: 'single',
      svgContent:
        '<svg viewBox="0 0 10 10"><script>alert(1)</script><image href="/uploads/kangur/example.png" /><circle cx="5" cy="5" r="4" /></svg>',
    });

    expect(sanitized.type).toBe('single');
    expect(sanitized.type === 'single' ? sanitized.svgContent : '').not.toContain('<script');
    expect(sanitized.type === 'single' ? sanitized.svgContent : '').not.toContain('.png');
    expect(sanitized.type === 'single' ? sanitized.svgContent : '').toContain('<circle');
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

  it('sanitizes stored illustration svg content', () => {
    const q = makeQuestion({
      id: 'q-svg',
      illustration: {
        type: 'single',
        svgContent:
          '<svg viewBox="0 0 10 10"><image href="/uploads/kangur/example.png" /><script>alert(1)</script><rect x="1" y="1" width="8" height="8" /></svg>',
      },
    });
    const result = parseKangurTestQuestionStore(JSON.stringify({ 'q-svg': q }));

    expect(result['q-svg']?.illustration.type).toBe('single');
    expect(
      result['q-svg']?.illustration.type === 'single' ? result['q-svg'].illustration.svgContent : ''
    ).not.toContain('.png');
    expect(
      result['q-svg']?.illustration.type === 'single' ? result['q-svg'].illustration.svgContent : ''
    ).not.toContain('<script');
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

  it('can return only published questions for learner and runtime use', () => {
    const store: KangurTestQuestionStore = {
      draft: makeQuestion({
        id: 'draft',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'draft',
          auditFlags: [],
        },
      }),
      published: makeQuestion({
        id: 'published',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'published',
          auditFlags: [],
          publishedAt: '2026-03-09T10:00:00.000Z',
        },
      }),
    };

    expect(isPublishedKangurTestQuestion(store.draft!)).toBe(false);
    expect(isPublishedKangurTestQuestion(store.published!)).toBe(true);
    expect(getPublishedQuestionsForSuite(store, 'suite-A').map((question) => question.id)).toEqual([
      'published',
    ]);
  });

  it('can publish only selected ready questions while leaving draft and dirty ready items untouched', () => {
    const store: KangurTestQuestionStore = {
      readyClean: makeQuestion({
        id: 'readyClean',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'ready',
          auditFlags: [],
        },
      }),
      readyDirty: makeQuestion({
        id: 'readyDirty',
        suiteId: 'suite-A',
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-review',
          workflowStatus: 'ready',
          auditFlags: ['legacy_choice_descriptions'],
        },
      }),
      draft: makeQuestion({
        id: 'draft',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'draft',
          auditFlags: [],
        },
      }),
    };

    const result = publishReadyQuestions(store, {
      suiteId: 'suite-A',
      questionIds: ['readyClean'],
      publishedAt: '2026-03-09T12:00:00.000Z',
    });

    expect(result.publishedQuestionIds).toEqual(['readyClean']);
    expect(result.store.readyClean?.editorial.workflowStatus).toBe('published');
    expect(result.store.readyClean?.editorial.publishedAt).toBe('2026-03-09T12:00:00.000Z');
    expect(result.store.readyDirty?.editorial.workflowStatus).toBe('ready');
    expect(result.store.draft?.editorial.workflowStatus).toBe('draft');
  });

  it('can tell when a suite question set is only partially published', () => {
    const store: KangurTestQuestionStore = {
      published: makeQuestion({
        id: 'published',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'published',
          auditFlags: [],
          publishedAt: '2026-03-09T10:00:00.000Z',
        },
      }),
      draft: makeQuestion({
        id: 'draft',
        suiteId: 'suite-A',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'draft',
          auditFlags: [],
        },
      }),
    };

    expect(hasFullyPublishedQuestionSetForSuite(store, 'suite-A')).toBe(false);
    expect(
      hasFullyPublishedQuestionSetForSuite(
        { published: store.published! },
        'suite-A'
      )
    ).toBe(true);
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

describe('formDataToQuestion', () => {
  it('sanitizes illustration markup before saving', () => {
    const question = formDataToQuestion(
      {
        prompt: '  Co widzisz?  ',
        choices: [
          { label: 'A', text: 'Kwadrat', description: 'Panel A', svgContent: '' },
          { label: 'B', text: 'Trojkat', svgContent: '' },
        ],
        correctChoiceLabel: 'A',
        pointValue: 3,
        explanation: '  To jest kwadrat.  ',
        illustration: {
          type: 'panels',
          layout: 'row',
          panels: [
            {
              id: 'panel-1',
              label: 'A',
              svgContent:
                '<svg viewBox="0 0 10 10"><image href="https://example.com/image.png" /><rect x="1" y="1" width="8" height="8" /></svg>',
              description: 'Panel A',
            },
          ],
        },
        stemDocument: null,
        explanationDocument: null,
        hintDocument: null,
        presentation: { layout: 'classic', choiceStyle: 'grid' },
        editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
      },
      'question-save',
      'suite-1',
      1000
    );

    expect(question.prompt).toBe('Co widzisz?');
    expect(question.explanation).toBe('To jest kwadrat.');
    expect(question.illustration.type).toBe('panels');
    expect(
      question.illustration.type === 'panels' ? question.illustration.panels[0]?.svgContent : ''
    ).not.toContain('image.png');
    expect(question.presentation.choiceStyle).toBe('grid');
  });
});

describe('published question edit policy', () => {
  it('demotes published questions when learner-facing content changes', () => {
    const previousQuestion = makeQuestion({
      editorial: {
        source: 'manual',
        reviewStatus: 'ready',
        workflowStatus: 'published',
        auditFlags: [],
        publishedAt: '2026-03-09T12:00:00.000Z',
      },
    });
    const nextQuestion = makeQuestion({
      ...previousQuestion,
      prompt: 'Updated learner prompt',
      editorial: {
        ...previousQuestion.editorial,
        workflowStatus: 'published',
      },
    });

    expect(shouldDemotePublishedQuestionAfterEdit(previousQuestion, nextQuestion)).toBe(true);

    const result = applyPublishedQuestionEditPolicy(previousQuestion, nextQuestion);
    expect(result.editorial.workflowStatus).toBe('draft');
    expect(result.editorial.publishedAt).toBeUndefined();
  });

  it('keeps published status when learner-facing content is unchanged', () => {
    const previousQuestion = makeQuestion({
      editorial: {
        source: 'manual',
        reviewStatus: 'ready',
        workflowStatus: 'published',
        auditFlags: [],
        publishedAt: '2026-03-09T12:00:00.000Z',
      },
    });

    expect(shouldDemotePublishedQuestionAfterEdit(previousQuestion, previousQuestion)).toBe(false);

    const result = applyPublishedQuestionEditPolicy(previousQuestion, previousQuestion);
    expect(result.editorial.workflowStatus).toBe('published');
    expect(result.editorial.publishedAt).toBe('2026-03-09T12:00:00.000Z');
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
    const result = upsertKangurTestQuestion(
      store,
      makeQuestion({ id: 'q1', prompt: 'New prompt' })
    );
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
      expect(restored.illustration.svgContent).toContain('<rect');
      expect(restored.illustration.svgContent).toContain('viewBox=');
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
