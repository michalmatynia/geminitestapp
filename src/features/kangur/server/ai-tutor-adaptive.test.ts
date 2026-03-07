import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState, type KangurAssignment, type KangurScore } from '@/shared/contracts/kangur';

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
      'When suggesting the next step, anchor it to this assignment and give exactly one concrete Kangur action: Powtórka dodawania.'
    );
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
