import { describe, expect, it } from 'vitest';

import {
  buildKangurLearnerSnapshotRuntimeDocument,
  buildKangurTestContextRuntimeDocument,
} from '@/features/kangur/server/context-registry';
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

describe('buildKangurLearnerSnapshotRuntimeDocument', () => {
  it('includes xp momentum facts and recent-session xp in the learner runtime document', async () => {
    const result = await buildKangurLearnerSnapshotRuntimeDocument({
      learnerId: 'learner-1',
      data: {
        learnerId: 'learner-1',
        learnerDisplayName: 'Ada',
        activeAssignments: [],
        masteryInsights: {
          weakest: [],
          strongest: [],
          trackedLessons: 2,
          masteredLessons: 1,
          lessonsNeedingPractice: 1,
        },
        snapshot: {
          totalXp: 620,
          gamesPlayed: 12,
          lessonsCompleted: 4,
          perfectGames: 3,
          totalBadges: 11,
          unlockedBadges: 4,
          unlockedBadgeIds: ['first_game'],
          level: { level: 4, minXp: 250, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
          nextLevel: { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
          levelProgressPercent: 57,
          averageAccuracy: 84,
          bestAccuracy: 100,
          currentStreakDays: 3,
          longestStreakDays: 5,
          lastPlayedAt: '2026-03-09T10:00:00.000Z',
          dailyGoalGames: 3,
          todayGames: 2,
          dailyGoalPercent: 67,
          todayXpEarned: 28,
          weeklyXpEarned: 132,
          averageXpPerSession: 52,
          operationPerformance: [],
          recentSessions: [
            {
              id: 'session-1',
              operation: 'clock',
              operationLabel: 'Zegar',
              operationEmoji: '🕐',
              createdAt: '2026-03-09T10:00:00.000Z',
              score: 5,
              totalQuestions: 6,
              accuracyPercent: 83,
              timeTakenSeconds: 41,
              xpEarned: 28,
            },
          ],
          weeklyActivity: [],
          recommendations: [],
        },
      } as any,
    });

    expect(result.summary).toContain('XP today +28.');
    expect(result.summary).toContain('XP last 7 days +132.');
    expect(result.facts).toEqual(
      expect.objectContaining({
        todayXpEarned: 28,
        weeklyXpEarned: 132,
        averageXpPerSession: 52,
      })
    );
    expect(result.sections.find((section) => section.id === 'recent_sessions')).toMatchObject({
      items: [
        expect.objectContaining({
          operationLabel: 'Zegar',
          xpEarned: 28,
        }),
      ],
    });
  });
});
