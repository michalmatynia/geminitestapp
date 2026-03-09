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
    publicationStatus: 'draft',
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
    publicationStatus: 'draft',
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
    publicationStatus: 'draft',
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
  editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
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
          workflowStatus: 'draft',
          auditFlags: ['explanation_answer_mismatch'],
        },
      }),
    ]);

    expect(health.status).toBe('needs-fix');
    expect(health.questionCount).toBe(1);
    expect(health.needsFixQuestionCount).toBe(1);
    expect(health.draftQuestionCount).toBe(1);
    expect(health.publishableQuestionCount).toBe(0);
    expect(health.publishedQuestionCount).toBe(0);
    expect(health.publishStatus).toBe('unpublished');
    expect(health.isLive).toBe(false);
    expect(health.canGoLive).toBe(false);
  });

  it('builds a library summary from suite health', () => {
    const questions = [
      makeQuestion({
        id: 'ready-question',
        suiteId: 'suite-ready',
        editorial: {
          source: 'manual',
          reviewStatus: 'ready',
          workflowStatus: 'ready',
          auditFlags: [],
        },
      }),
      makeQuestion({
        id: 'review-question',
        suiteId: 'suite-review',
        explanation: '',
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-review',
          workflowStatus: 'draft',
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
          workflowStatus: 'draft',
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
    expect(summary.draftQuestionCount).toBe(2);
    expect(summary.readyToPublishQuestionCount).toBe(1);
    expect(summary.publishableQuestionCount).toBe(1);
    expect(summary.publishedQuestionCount).toBe(0);
    expect(summary.liveSuiteCount).toBe(0);
    expect(summary.liveReadySuiteCount).toBe(0);
    expect(summary.unstableLiveSuiteCount).toBe(0);
    expect(summary.partiallyPublishedSuiteCount).toBe(0);
    expect(summary.unpublishedSuiteCount).toBe(3);
  });

  it('marks enabled fully published clean suites as ready to go live', () => {
    const suite = suites[0]!;
    const health = getKangurTestSuiteHealth(
      { ...suite, publicationStatus: 'draft', enabled: true },
      [
        makeQuestion({
          id: 'published-question',
          suiteId: suite.id,
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'published',
            auditFlags: [],
            publishedAt: '2026-03-09T12:00:00.000Z',
          },
        }),
      ]
    );

    expect(health.publishStatus).toBe('published');
    expect(health.canGoLive).toBe(true);
    expect(health.isLive).toBe(false);
  });

  it('flags live suites that no longer have a fully published question set', () => {
    const suite = suites[0]!;
    const health = getKangurTestSuiteHealth(
      { ...suite, publicationStatus: 'live', enabled: true },
      [
        makeQuestion({
          id: 'published-question',
          suiteId: suite.id,
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'published',
            auditFlags: [],
            publishedAt: '2026-03-09T12:00:00.000Z',
          },
        }),
        makeQuestion({
          id: 'draft-question',
          suiteId: suite.id,
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'draft',
            auditFlags: [],
          },
        }),
      ]
    );

    expect(health.isLive).toBe(true);
    expect(health.publishStatus).toBe('partial');
    expect(health.liveNeedsAttention).toBe(true);
  });
});
