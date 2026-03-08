import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurProgressState,
  type KangurAssignment,
  type KangurScore,
} from '@/shared/contracts/kangur';
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

vi.mock('@/shared/utils/observability/error-system', () => ({
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
      summary: 'Average accuracy 81%. 1 active assignment.',
      status: 'active',
      tags: ['kangur', 'learner', 'ai-tutor'],
      relatedNodeIds: [],
      facts: {
        learnerSummary: 'Average accuracy 81%. 1 active assignment.',
        averageAccuracy: 81,
        todayGames: 2,
        dailyGoalGames: 3,
        currentStreakDays: 4,
      },
      sections: [],
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
    });

    expect(guidance.instructions).toContain('Adaptive learner snapshot: average accuracy 75%');
    expect(guidance.instructions).toContain(
      'Current lesson is a weaker area: Dodawanie at 45% mastery.'
    );
    expect(guidance.instructions).toContain('Most recent practice: Dodawanie at 50% accuracy.');
    expect(guidance.instructions).toContain('Top adaptive recommendation: Skup sie na: Dodawanie');
    expect(guidance.instructions).toContain('Relevant active assignment: Powtórka dodawania');
    expect(guidance.instructions).toContain('Progress: Powtorki po przydziale: 1/2.');
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
      label: 'Nastepny krok',
      description: 'Wskaz jedna konkretna aktywnosc Kangur jako najlepszy dalszy ruch.',
      rationale: 'Najwiecej wartosci da teraz jedna jasna aktywnosc, a nie kilka opcji naraz.',
    });
    expect(guidance.followUpActions).toEqual([
      {
        id: 'assignment:assignment-1',
        label: 'Otworz lekcje',
        page: 'Lessons',
        query: {
          focus: 'adding',
        },
        reason: 'Powtórka dodawania',
      },
      {
        id: 'recommendation:focus_weakest_operation',
        label: 'Otworz lekcje',
        page: 'Lessons',
        query: {
          focus: 'addition',
        },
        reason: 'Skup sie na: Dodawanie',
      },
    ]);
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
      'Adaptive learner snapshot: Average accuracy 81%. 1 active assignment.'
    );
    expect(guidance.instructions).toContain(
      'Engagement signal: the learner has signed into Kangur at most once in the last 7 days, so prefer a very small restart step.'
    );
    expect(guidance.instructions).toContain(
      'Support signal: the parent has not logged into Kangur in the last 7 days, so avoid depending on immediate parent follow-up.'
    );
    expect(guidance.instructions).toContain(
      'Relevant active assignment: Trening: dodawanie do 20.'
    );
    expect(guidance.instructions).toContain(
      'Structured coaching mode: review_reflection. Use review reflection: explain what happened, name one improvement, and finish with one retry idea.'
    );
    expect(guidance.coachingFrame).toEqual({
      mode: 'review_reflection',
      label: 'Omow po probie',
      description:
        'Podsumuj probe, nazwij jedna poprawke i zakoncz sugestia ponownej proby.',
      rationale: 'To dobry moment na refleksje po probie i jedna konkretna poprawke.',
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
