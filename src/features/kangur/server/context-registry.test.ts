import { describe, expect, it } from 'vitest';

import {
  buildKangurLessonContextRuntimeDocument,
  buildKangurLearnerSnapshotRuntimeDocument,
  buildKangurTestContextRuntimeDocument,
  resolveKangurAiTutorRuntimeDocuments,
} from '@/features/kangur/server/context-registry';
import type { KangurLesson } from '@/shared/contracts/kangur';
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

const makeLesson = (overrides: Partial<KangurLesson> = {}): KangurLesson => ({
  id: 'lesson-1',
  componentId: 'adding',
  contentMode: 'document',
  title: 'Dodawanie',
  description: 'Licz dwa zbiory razem.',
  emoji: '➕',
  color: 'from-amber-300 to-orange-400',
  activeBg: 'bg-amber-100',
  sortOrder: 10,
  enabled: true,
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

  it('includes active-question value and choice facts for direct tutor answers', async () => {
    const suite = makeSuite({ publicationStatus: 'live' });
    const result = await buildKangurTestContextRuntimeDocument({
      learnerId: 'learner-1',
      suiteId: suite.id,
      questionId: 'question-1',
      data: {
        testSuitesById: new Map([[suite.id, suite]]),
        questionStore: {
          [makeQuestion().id]: makeQuestion({
            choices: [
              { label: 'A', text: '3', description: 'Za malo', svgContent: '' },
              { label: 'B', text: '4', description: 'Poprawny wynik', svgContent: '' },
            ],
          }),
        },
      } as any,
    });

    expect(result?.facts).toEqual(
      expect.objectContaining({
        currentQuestion: 'What is 2 + 2?',
        questionProgressLabel: 'Pytanie 1/1',
        questionPointValue: 3,
        questionChoicesSummary:
          'Opcje odpowiedzi: A - 3: Za malo; B - 4: Poprawny wynik.',
      })
    );
  });

  it('includes revealed correct-answer facts for review states', async () => {
    const suite = makeSuite({ publicationStatus: 'live' });
    const result = await buildKangurTestContextRuntimeDocument({
      learnerId: 'learner-1',
      suiteId: suite.id,
      questionId: 'question-1',
      answerRevealed: true,
      data: {
        testSuitesById: new Map([[suite.id, suite]]),
        questionStore: {
          [makeQuestion().id]: makeQuestion(),
        },
      } as any,
    });

    expect(result?.facts).toEqual(
      expect.objectContaining({
        correctChoiceLabel: 'B',
        correctChoiceText: '4',
        revealedExplanation: 'Because 2 + 2 = 4.',
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

describe('resolveKangurAiTutorRuntimeDocuments', () => {
  it('augments test runtime documents with selected-choice facts from the tutor session context', () => {
    const result = resolveKangurAiTutorRuntimeDocuments(
      {
        refs: [],
        nodes: [],
        documents: [
          {
            id: 'runtime:kangur:test:learner-1:suite-1:question-1:revealed',
            kind: 'runtime_document',
            entityType: 'kangur_test_context',
            title: 'Kangur Mini',
            summary: 'Active test question 1/1.',
            status: 'summary',
            tags: ['kangur', 'test', 'ai-tutor'],
            relatedNodeIds: [],
            facts: {
              title: 'Kangur Mini',
              questionId: 'question-1',
              currentQuestion: 'What is 2 + 2?',
              questionProgressLabel: 'Pytanie 1/1',
              answerRevealed: true,
              correctChoiceLabel: 'B',
              correctChoiceText: '4',
            },
            sections: [],
            provenance: {
              providerId: 'kangur',
              source: 'kangur-runtime-context',
            },
          },
        ],
        truncated: false,
        engineVersion: 'test-engine',
      },
      {
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        questionId: 'question-1',
        currentQuestion: 'What is 2 + 2?',
        questionProgressLabel: 'Pytanie 1/1',
        selectedChoiceLabel: 'A',
        selectedChoiceText: '3',
        answerRevealed: true,
      }
    );

    expect(result.surfaceContext?.facts).toEqual(
      expect.objectContaining({
        selectedChoiceLabel: 'A',
        selectedChoiceText: '3',
        selectedChoiceSummary: 'Wybrana odpowiedź: A - 3.',
      })
    );
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
          operationPerformance: [
            {
              operation: 'addition',
              label: 'Dodawanie',
              emoji: '➕',
              attempts: 3,
              averageAccuracy: 91,
              averageScore: 8.7,
              bestScore: 100,
              totalXpEarned: 44,
              averageXpPerSession: 15,
            },
            {
              operation: 'clock',
              label: 'Zegar',
              emoji: '🕐',
              attempts: 2,
              averageAccuracy: 68,
              averageScore: 6.5,
              bestScore: 83,
              totalXpEarned: 28,
              averageXpPerSession: 14,
            },
          ],
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
    expect(result.sections.find((section) => section.id === 'operation_performance')).toMatchObject({
      items: [
        expect.objectContaining({
          label: 'Dodawanie',
          averageAccuracy: 91,
        }),
        expect.objectContaining({
          label: 'Zegar',
          averageAccuracy: 68,
        }),
      ],
    });
  });
});

describe('buildKangurLessonContextRuntimeDocument', () => {
  it('includes previous and next lesson navigation facts in the lesson runtime document', async () => {
    const previousLesson = makeLesson({
      id: 'lesson-1',
      componentId: 'adding',
      title: 'Dodawanie',
      sortOrder: 10,
    });
    const activeLesson = makeLesson({
      id: 'lesson-2',
      componentId: 'calendar',
      title: 'Kalendarz',
      sortOrder: 20,
    });
    const nextLesson = makeLesson({
      id: 'lesson-3',
      componentId: 'subtracting',
      title: 'Odejmowanie',
      sortOrder: 30,
    });

    const result = await buildKangurLessonContextRuntimeDocument({
      learnerId: 'learner-1',
      lessonId: activeLesson.id,
      data: {
        lessons: [previousLesson, activeLesson, nextLesson],
        lessonsById: new Map([
          [previousLesson.id, previousLesson],
          [activeLesson.id, activeLesson],
          [nextLesson.id, nextLesson],
        ]),
        progress: {
          lessonMastery: {
            [activeLesson.componentId]: {
              masteryPercent: 72,
              attempts: 3,
              completions: 1,
              lastCompletedAt: '2026-03-10T08:00:00.000Z',
            },
          },
        },
        evaluatedAssignments: [],
        lessonDocuments: {},
        snapshot: {
          averageAccuracy: 78,
        },
      } as any,
    });

    expect(result?.facts).toEqual(
      expect.objectContaining({
        previousLessonId: 'lesson-1',
        previousLessonTitle: 'Dodawanie',
        nextLessonId: 'lesson-3',
        nextLessonTitle: 'Odejmowanie',
      })
    );
    expect(result?.facts['navigationSummary']).toBe(
      'Bez wracania do listy możesz cofnąć się do Dodawanie albo przejść dalej do Odejmowanie.'
    );
    expect(result?.sections.find((section) => section.id === 'lesson_navigation')).toMatchObject({
      items: [
        expect.objectContaining({
          direction: 'previous',
          title: 'Dodawanie',
        }),
        expect.objectContaining({
          direction: 'next',
          title: 'Odejmowanie',
        }),
      ],
    });
  });

  it('exposes structured lesson-document snippet cards for selected-text tutor explains', async () => {
    const lesson = makeLesson({
      id: 'lesson-clock',
      componentId: 'clock',
      title: 'Zegar',
      description: 'Nauka odczytywania godzin.',
    });

    const result = await buildKangurLessonContextRuntimeDocument({
      learnerId: 'learner-1',
      lessonId: lesson.id,
      data: {
        lessons: [lesson],
        lessonsById: new Map([[lesson.id, lesson]]),
        progress: {
          lessonMastery: {},
        },
        evaluatedAssignments: [],
        lessonDocuments: {
          [lesson.id]: {
            version: 1,
            updatedAt: '2026-03-12T10:00:00.000Z',
            narration: {
              locale: 'pl-PL',
              voice: 'alloy',
            },
            pages: [
              {
                id: 'page-1',
                sectionKey: 'hours',
                sectionTitle: '',
                sectionDescription: '',
                title: 'Co pokazuje krótka wskazówka?',
                description: 'Krótka wskazówka pokazuje godzinę.',
                blocks: [
                  {
                    id: 'block-1',
                    type: 'text',
                    html: '<p>Krótka wskazówka pokazuje godzinę na tarczy.</p>',
                    ttsText: 'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
                    align: 'left',
                  },
                ],
              },
            ],
            blocks: [
              {
                id: 'block-1',
                type: 'text',
                html: '<p>Krótka wskazówka pokazuje godzinę na tarczy.</p>',
                ttsText: 'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
                align: 'left',
              },
            ],
          },
        },
        snapshot: {
          averageAccuracy: 78,
        },
      } as any,
    });

    expect(result?.facts).toEqual(
      expect.objectContaining({
        documentSnippetCards: expect.arrayContaining([
          expect.objectContaining({
            text: 'Co pokazuje krótka wskazówka?',
            explanation: 'Krótka wskazówka pokazuje godzinę.',
          }),
          expect.objectContaining({
            text: 'Krótka wskazówka pokazuje godzinę na tarczy.',
            explanation: 'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
          }),
        ]),
      })
    );
  });
});
