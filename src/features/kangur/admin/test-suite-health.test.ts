import { describe, expect, it } from 'vitest';

import {
  buildKangurTestSuiteHealthMap,
  getKangurTestLibraryHealthSummary,
  getKangurTestSuiteHealth,
} from '@/features/kangur/admin/test-suite-health';
import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';

const suites: KangurTestSuite[] = [
  {
    id: 'suite-ready',
    title: 'Ready suite',
    description: '',
    year: 2026,
    gradeLevel: 'III-IV',
    category: 'math',
    enabled: true,
    sortOrder: 1000,
  },
  {
    id: 'suite-review',
    title: 'Review suite',
    description: '',
    year: 2026,
    gradeLevel: 'III-IV',
    category: 'math',
    enabled: true,
    sortOrder: 2000,
  },
  {
    id: 'suite-fix',
    title: 'Fix suite',
    description: '',
    year: 2026,
    gradeLevel: 'III-IV',
    category: 'math',
    enabled: true,
    sortOrder: 3000,
  },
];

const makeQuestion = (overrides: Partial<KangurTestQuestion> = {}): KangurTestQuestion => ({
  id: 'question-1',
  suiteId: 'suite-ready',
  sortOrder: 1000,
  prompt: 'What is 2 + 2?',
  choices: [
    { label: 'A', text: '3', svgContent: '' },
    { label: 'B', text: '4', svgContent: '' },
  ],
  correctChoiceLabel: 'B',
  pointValue: 3,
  explanation: 'Because 2 + 2 = 4.',
  illustration: { type: 'none' },
  presentation: { layout: 'classic', choiceStyle: 'list' },
  editorial: { source: 'manual', reviewStatus: 'ready', auditFlags: [] },
  ...overrides,
});

describe('test suite health', () => {
  it('aggregates suite question status into suite health', () => {
    const health = getKangurTestSuiteHealth(suites[2]!, [
      makeQuestion({
        id: 'fix-question',
        suiteId: 'suite-fix',
        prompt: 'Broken import',
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-fix',
          auditFlags: ['explanation_answer_mismatch'],
        },
      }),
    ]);

    expect(health.status).toBe('needs-fix');
    expect(health.questionCount).toBe(1);
    expect(health.needsFixQuestionCount).toBe(1);
  });

  it('builds a library summary from suite health', () => {
    const questions = [
      makeQuestion({ id: 'ready-question', suiteId: 'suite-ready' }),
      makeQuestion({
        id: 'review-question',
        suiteId: 'suite-review',
        explanation: '',
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-review',
          auditFlags: ['legacy_choice_descriptions'],
        },
      }),
      makeQuestion({
        id: 'fix-question',
        suiteId: 'suite-fix',
        prompt: 'Need repair',
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-fix',
          auditFlags: ['explanation_answer_mismatch'],
        },
      }),
    ];

    const suiteHealthById = buildKangurTestSuiteHealthMap(suites, questions);
    const summary = getKangurTestLibraryHealthSummary(suites, suiteHealthById);

    expect(summary.suiteCount).toBe(3);
    expect(summary.readySuiteCount).toBe(1);
    expect(summary.suitesNeedingReviewCount).toBe(1);
    expect(summary.suitesNeedingFixCount).toBe(1);
    expect(summary.totalQuestionCount).toBe(3);
    expect(summary.reviewQueueQuestionCount).toBe(2);
  });
});
