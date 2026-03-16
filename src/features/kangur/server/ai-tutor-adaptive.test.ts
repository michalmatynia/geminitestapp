import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurProgressState,
  type KangurAssignment,
  type KangurScore,
} from '@/features/kangur/shared/contracts/kangur';
import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

const {
  getKangurProgressRepositoryMock,
  getKangurScoreRepositoryMock,
  getKangurAssignmentRepositoryMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  getKangurProgressRepositoryMock: vi.fn(),
  getKangurScoreRepositoryMock: vi.fn(),
  getKangurAssignmentRepositoryMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  getKangurScoreRepository: getKangurScoreRepositoryMock,
  getKangurAssignmentRepository: getKangurAssignmentRepositoryMock,
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { buildKangurAiTutorAdaptiveGuidance } from './ai-tutor-adaptive';

const createRegistryBundle = (): ContextRegistryResolutionBundle => ({
  refs: [
    {
      id: 'runtime:kangur:learner:learner-1',
      kind: 'runtime_document',
      providerId: 'kangur',
      entityType: 'kangur_learner_snapshot',
    },
    {
      id: 'runtime:kangur:login-activity:learner-1',
      kind: 'runtime_document',
      providerId: 'kangur',
      entityType: 'kangur_login_activity',
    },
  ],
  nodes: [],
  documents: [
    {
      id: 'runtime:kangur:learner:learner-1',
      kind: 'runtime_document',
      entityType: 'kangur_learner_snapshot',
      title: 'Learner snapshot',
      summary:
        'Average accuracy 81%. Daily goal 2/3. XP today +42. XP last 7 days +126. 1 active assignment.',
      status: 'active',
      tags: ['kangur', 'learner', 'ai-tutor'],
      relatedNodeIds: [],
      facts: {
        learnerSummary:
          'Average accuracy 81%. Daily goal 2/3. XP today +42. XP last 7 days +126. 1 active assignment.',
        averageAccuracy: 81,
        todayGames: 2,
        todayXpEarned: 42,
        weeklyXpEarned: 126,
        dailyGoalGames: 3,
        currentStreakDays: 4,
      },
      sections: [
        {
          id: 'recent_sessions',
          kind: 'items',
          title: 'Recent practice',
          items: [
            {
              id: 'session-1',
              operation: 'addition',
              operationLabel: 'Dodawanie',
              accuracyPercent: 88,
              xpEarned: 18,
            },
          ],
        },
      ],
      provenance: {
        providerId: 'kangur',
        source: 'test',
      },
    },
    {
      id: 'runtime:kangur:login-activity:learner-1',
      kind: 'runtime_document',
      entityType: 'kangur_login_activity',
      title: 'Login activity',
      summary: 'Recent Kangur login activity',
      status: 'active',
      tags: ['kangur', 'login', 'ai-tutor'],
      relatedNodeIds: [],
      facts: {
        learnerSignInCount7d: 1,
        parentLoginCount7d: 0,
      },
      sections: [],
      provenance: {
        providerId: 'kangur',
        source: 'test',
      },
    },
  ],
  truncated: false,
  engineVersion: 'test-engine',
});

describe('buildKangurAiTutorAdaptiveGuidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds adaptive learner guidance from progress, scores, and active assignments', async () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      totalXp: 180,
      gamesPlayed: 5,
      lessonMastery: {
        adding: {
          attempts: 3,
          completions: 1,
          masteryPercent: 45,
          bestScorePercent: 55,
          lastScorePercent: 45,
          lastCompletedAt: '2026-03-07T08:00:00.000Z',
        },
      },
    };
    const scores: KangurScore[] = [
      {
        id: 'score-1',
        player_name: 'Ada',
        score: 4,
        operation: 'addition',
        total_questions: 8,
        correct_answers: 4,
        time_taken: 80,
        xp_earned: 12,
        created_date: '2026-03-07T09:00:00.000Z',
        learner_id: 'learner-1',
        created_by: 'owner-1',
        owner_user_id: 'owner-1',
      },
      {
        id: 'score-2',
        player_name: 'Ada',
        score: 8,
        operation: 'division',
        total_questions: 8,
        correct_answers: 8,
        time_taken: 95,
        xp_earned: 20,
        created_date: '2026-03-06T09:00:00.000Z',
        learner_id: 'learner-1',
        created_by: 'owner-1',
        owner_user_id: 'owner-1',
      },
    ];
    const assignments: KangurAssignment[] = [
      {
        id: 'assignment-1',
        learnerKey: 'learner-1',
        title: 'Powtórka dodawania',
        description: 'Wróć do dodawania i zrób jeszcze jedną próbę.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'adding',
          requiredCompletions: 2,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-07T07:00:00.000Z',
        updatedAt: '2026-03-07T07:00:00.000Z',
      },
    ];

    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: vi.fn().mockResolvedValue(progress),
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: vi.fn().mockResolvedValue(scores),
    });
    getKangurAssignmentRepositoryMock.mockResolvedValue({
      listAssignments: vi.fn().mockResolvedValue(assignments),
    });

    const guidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId: 'learner-1',
      context: {
        surface: 'lesson',
        contentId: 'lesson-adding',
        title: 'Dodawanie',
        interactionIntent: 'next_step',
      },
    });

    expect(guidance.instructions).toContain(
      'Adaptive learner snapshot: average accuracy 75%, daily goal 1/3, +12 XP today, +32 XP in the last 7 days, streak 2 days.'
    );
    expect(guidance.instructions).toContain(
      'Current lesson is a weaker area: Dodawanie at 45% mastery.'
    );
    expect(guidance.instructions).toContain(
      'Most recent practice: Dodawanie at 50% accuracy for +12 XP.'
    );
    expect(guidance.instructions).toContain('Top adaptive recommendation: Skup się na: Dodawanie');
    expect(guidance.instructions).toContain('Relevant active assignment: Powtórka dodawania');
    expect(guidance.instructions).toContain('Progress: Powtórki po przydziale: 1/2.');
    expect(guidance.instructions).toContain(
      'Adaptive tutoring stance: use smaller reasoning steps, ask one checkpoint question at a time, and confirm understanding before moving on.'
    );
    expect(guidance.instructions).toContain(
      'Structured coaching mode: next_best_action. Recommend exactly one concrete Kangur action that best matches the learner context.'
    );
    expect(guidance.instructions).toContain(
      'When suggesting the next step, anchor it to this assignment and give exactly one concrete Kangur action: Powtórka dodawania.'
    );
    expect(guidance.coachingFrame).toEqual({
      mode: 'next_best_action',
      label: 'Następny krok',
      description: 'Wskaż jedną konkretną aktywność Kangur jako najlepszy dalszy ruch.',
      rationale: 'Najwięcej wartości da teraz jedna jasna aktywność, a nie kilka opcji naraz.',
    });
    expect(guidance.followUpActions).toEqual([
      {
        id: 'assignment:assignment-1',
        label: 'Otwórz lekcje',
        page: 'Lessons',
        query: {
          focus: 'adding',
        },
        reason: 'Powtórka dodawania',
      },
    ]);
  });

  it('avoids repeating a completed tutor follow-up and falls back to a fresh recommendation', async () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      totalXp: 180,
      gamesPlayed: 5,
      lessonMastery: {
        adding: {
          attempts: 3,
          completions: 1,
          masteryPercent: 45,
          bestScorePercent: 55,
          lastScorePercent: 45,
          lastCompletedAt: '2026-03-07T08:00:00.000Z',
        },
      },
    };
    const scores: KangurScore[] = [
      {
        id: 'score-1',
        player_name: 'Ada',
        score: 4,
        operation: 'addition',
        total_questions: 8,
        correct_answers: 4,
        time_taken: 80,
        created_date: '2026-03-07T09:00:00.000Z',
        learner_id: 'learner-1',
        created_by: 'owner-1',
        owner_user_id: 'owner-1',
      },
      {
        id: 'score-2',
        player_name: 'Ada',
        score: 8,
        operation: 'division',
        total_questions: 8,
        correct_answers: 8,
        time_taken: 95,
        created_date: '2026-03-06T09:00:00.000Z',
        learner_id: 'learner-1',
        created_by: 'owner-1',
        owner_user_id: 'owner-1',
      },
    ];
    const assignments: KangurAssignment[] = [
      {
        id: 'assignment-1',
        learnerKey: 'learner-1',
        title: 'Powtórka dodawania',
        description: 'Wróć do dodawania i zrób jeszcze jedną próbę.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'adding',
          requiredCompletions: 2,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-07T07:00:00.000Z',
        updatedAt: '2026-03-07T07:00:00.000Z',
      },
    ];

    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: vi.fn().mockResolvedValue(progress),
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: vi.fn().mockResolvedValue(scores),
    });
    getKangurAssignmentRepositoryMock.mockResolvedValue({
      listAssignments: vi.fn().mockResolvedValue(assignments),
    });

    const guidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId: 'learner-1',
      context: {
        surface: 'lesson',
        contentId: 'lesson-adding',
        title: 'Dodawanie',
        interactionIntent: 'next_step',
      },
      memory: {
        lastRecommendedAction: 'Completed follow-up: Otwórz lekcje: Powtórka dodawania',
        lastSuccessfulIntervention:
          'The learner completed the tutor follow-up Otwórz lekcje for Powtórka dodawania on Lessons.',
        lastCoachingMode: 'next_best_action',
      },
    });

    expect(guidance.instructions).toContain(
      'Completed tutor follow-up in this thread: the learner already carried out the previous recommended action, so avoid repeating the same next step unless there is a clear new reason.'
    );
    expect(guidance.instructions).toContain(
      'Successful follow-up signal: build on that completion with one adjacent next move: Uruchom trening (Po lekcji: Dodawanie).'
    );
    expect(guidance.instructions).not.toContain('Relevant active assignment: Powtórka dodawania');
    expect(guidance.instructions).toContain(
      'When suggesting the next step, build on the completed tutor follow-up and give exactly one adjacent Kangur action.'
    );
    expect(guidance.followUpActions).toEqual([
      {
        id: 'bridge:lesson-to-game:adding',
        label: 'Uruchom trening',
        page: 'Game',
        query: {
          quickStart: 'operation',
          operation: 'addition',
          difficulty: 'medium',
        },
        reason: 'Po lekcji: Dodawanie',
      },
    ]);
  });

  it('turns a completed game follow-up into a lesson bridge for the same weak area', async () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      totalXp: 160,
      gamesPlayed: 6,
      lessonMastery: {
        adding: {
          attempts: 3,
          completions: 1,
          masteryPercent: 42,
          bestScorePercent: 58,
          lastScorePercent: 42,
          lastCompletedAt: '2026-03-07T08:00:00.000Z',
        },
      },
    };
    const scores: KangurScore[] = [
      {
        id: 'score-1',
        player_name: 'Ada',
        score: 4,
        operation: 'addition',
        total_questions: 8,
        correct_answers: 4,
        time_taken: 80,
        created_date: '2026-03-07T09:00:00.000Z',
        learner_id: 'learner-1',
        created_by: 'owner-1',
        owner_user_id: 'owner-1',
      },
    ];

    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: vi.fn().mockResolvedValue(progress),
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: vi.fn().mockResolvedValue(scores),
    });
    getKangurAssignmentRepositoryMock.mockResolvedValue({
      listAssignments: vi.fn().mockResolvedValue([]),
    });

    const guidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId: 'learner-1',
      context: {
        surface: 'game',
        contentId: 'game-training-addition',
        interactionIntent: 'next_step',
      },
      memory: {
        lastRecommendedAction: 'Completed follow-up: Uruchom trening',
        lastSuccessfulIntervention:
          'The learner completed the tutor follow-up Uruchom trening on Game.',
        lastCoachingMode: 'next_best_action',
      },
    });

    expect(guidance.instructions).toContain(
      'Successful follow-up signal: build on that completion with one adjacent next move: Otwórz lekcje (Po treningu: Dodawanie).'
    );
    expect(guidance.followUpActions).toEqual([
      {
        id: 'bridge:game-to-lesson:adding',
        label: 'Otwórz lekcje',
        page: 'Lessons',
        query: {
          focus: 'adding',
        },
        reason: 'Po treningu: Dodawanie',
      },
    ]);
  });

  it('escalates repeated hint requests into misconception checks instead of repeating the same ladder', async () => {
    const guidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId: 'learner-1',
      context: {
        surface: 'game',
        contentId: 'calendar-quiz',
        currentQuestion: 'Która godzina jest pokazana na zegarze?',
        questionProgressLabel: 'Pytanie 2/10',
        promptMode: 'hint',
        interactionIntent: 'hint',
        repeatedQuestionCount: 1,
        previousCoachingMode: 'hint_ladder',
      },
      registryBundle: createRegistryBundle(),
    });

    expect(guidance.instructions).toContain(
      'Repeat signal: the learner has repeated essentially the same question 2 times in this tutor thread, so change strategy instead of repeating the same hint.'
    );
    expect(guidance.instructions).toContain(
      'Previous coaching mode was hint_ladder, so do not reuse it unchanged while the learner is still stuck.'
    );
    expect(guidance.coachingFrame).toEqual({
      mode: 'misconception_check',
      label: 'Zmień podejście',
      description:
        'Sprawdź, gdzie uczeń blokuje się w rozumowaniu, zamiast dawać kolejny taki sam trop.',
      rationale:
        'Uczeń powtórzył to samo pytanie po wskazówce, więc trzeba przejść z kolejnego tropu do diagnozy rozumienia.',
    });
    expect(guidance.followUpActions).toEqual([]);
  });

  it('uses synthesized game surface context when registry docs omit a game runtime document', async () => {
    const guidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId: 'learner-1',
      context: {
        surface: 'game',
        contentId: 'game',
        assignmentId: 'assignment-1',
        assignmentSummary: 'Trening: dodawanie do 20.',
        currentQuestion: 'Ile to 7 + 5?',
        questionProgressLabel: 'Pytanie 2/10',
        interactionIntent: 'review',
      },
      registryBundle: createRegistryBundle(),
    });

    expect(guidance.instructions).toContain(
      'Adaptive learner snapshot: Average accuracy 81%. Daily goal 2/3. XP today +42. XP last 7 days +126. 1 active assignment.'
    );
    expect(guidance.instructions).toContain(
      'Engagement signal: the learner has signed into Kangur at most once in the last 7 days, so prefer a very small restart step.'
    );
    expect(guidance.instructions).toContain(
      'Support signal: the parent has not logged into Kangur in the last 7 days, so avoid depending on immediate parent follow-up.'
    );
    expect(guidance.instructions).toContain(
      'Most recent practice: Dodawanie at 88% accuracy for +18 XP.'
    );
    expect(guidance.instructions).toContain(
      'Relevant active assignment: Trening: dodawanie do 20.'
    );
    expect(guidance.instructions).toContain(
      'Structured coaching mode: review_reflection. Use review reflection: explain what happened, name one improvement, and finish with one retry idea.'
    );
    expect(guidance.coachingFrame).toEqual({
      mode: 'review_reflection',
      label: 'Omów po próbie',
      description:
        'Podsumuj próbę, nazwij jedną poprawkę i zakończ sugestią ponownej próby.',
      rationale: 'To dobry moment na refleksję po próbie i jedną konkretną poprawkę.',
    });
    expect(guidance.followUpActions).toEqual([]);
    expect(getKangurProgressRepositoryMock).not.toHaveBeenCalled();
    expect(getKangurScoreRepositoryMock).not.toHaveBeenCalled();
    expect(getKangurAssignmentRepositoryMock).not.toHaveBeenCalled();
  });

  it('returns an empty guidance payload and captures the error when adaptive lookup fails', async () => {
    getKangurProgressRepositoryMock.mockRejectedValue(new Error('progress failed'));

    await expect(
      buildKangurAiTutorAdaptiveGuidance({
        learnerId: 'learner-1',
        context: {
          surface: 'test',
          contentId: 'suite-1',
          interactionIntent: 'review',
        },
      })
    ).resolves.toEqual({
      instructions: '',
      followUpActions: [],
      coachingFrame: null,
    });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'progress failed',
      }),
      expect.objectContaining({
        service: 'kangur.ai-tutor',
        action: 'buildAdaptiveGuidance',
        learnerId: 'learner-1',
        surface: 'test',
        contentId: 'suite-1',
        interactionIntent: 'review',
      })
    );
  });
});
