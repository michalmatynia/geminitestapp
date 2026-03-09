import { describe, expect, it } from 'vitest';

import { buildKangurTestContextRuntimeDocument } from '@/features/kangur/server/context-registry';
import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';

const makeSuite = (overrides: Partial<KangurTestSuite> = {}): KangurTestSuite => ({
  id: 'suite-1',
  title: 'Suite 1',
  description: 'Suite description',
  year: 2026,
  gradeLevel: 'III-IV',
  category: 'math',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
  ...overrides,
});

const makeQuestion = (overrides: Partial<KangurTestQuestion> = {}): KangurTestQuestion => ({
  id: 'question-1',
  suiteId: 'suite-1',
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
  editorial: {
    source: 'manual',
    reviewStatus: 'ready',
    workflowStatus: 'published',
    auditFlags: [],
    publishedAt: '2026-03-09T12:00:00.000Z',
  },
  ...overrides,
});

describe('buildKangurTestContextRuntimeDocument', () => {
  it('returns null when the suite is not explicitly live', async () => {
    const suite = makeSuite({ publicationStatus: 'draft' });
    const result = await buildKangurTestContextRuntimeDocument({
      learnerId: 'learner-1',
      suiteId: suite.id,
      data: {
        testSuitesById: new Map([[suite.id, suite]]),
        questionStore: {
          [makeQuestion().id]: makeQuestion(),
        },
      } as any,
    });

    expect(result).toBeNull();
  });

  it('returns a runtime document for explicitly live suites with published questions', async () => {
    const suite = makeSuite({ publicationStatus: 'live' });
    const result = await buildKangurTestContextRuntimeDocument({
      learnerId: 'learner-1',
      suiteId: suite.id,
      data: {
        testSuitesById: new Map([[suite.id, suite]]),
        questionStore: {
          [makeQuestion().id]: makeQuestion(),
        },
      } as any,
    });

    expect(result?.entityType).toBe('kangur_test_context');
    expect(result?.facts).toEqual(
      expect.objectContaining({
        learnerId: 'learner-1',
        suiteId: 'suite-1',
        title: 'Suite 1',
      })
    );
  });

  it('returns null when a live suite no longer has a fully published question set', async () => {
    const suite = makeSuite({ publicationStatus: 'live' });
    const result = await buildKangurTestContextRuntimeDocument({
      learnerId: 'learner-1',
      suiteId: suite.id,
      data: {
        testSuitesById: new Map([[suite.id, suite]]),
        questionStore: {
          [makeQuestion().id]: makeQuestion(),
          draft: makeQuestion({
            id: 'draft',
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'draft',
              auditFlags: [],
            },
          }),
        },
      } as any,
    });

    expect(result).toBeNull();
  });
});
