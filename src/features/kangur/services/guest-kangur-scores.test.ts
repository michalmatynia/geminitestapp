/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGuestKangurScore,
  getGuestKangurScoreSessionKey,
  hasGuestKangurScores,
  listGuestKangurScores,
  loadGuestKangurScores,
  resetGuestKangurScoreSession,
  syncGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';

describe('guest Kangur scores', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores anonymous scores locally and exposes them through the local score list', () => {
    const created = createGuestKangurScore({
      player_name: 'Gracz',
      score: 8,
      operation: 'addition',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 28,
    });

    expect(created.created_by).toBeNull();
    expect(created.client_mutation_id).toMatch(/^guest-score:/);
    expect(hasGuestKangurScores()).toBe(true);
    expect(loadGuestKangurScores()).toHaveLength(1);
    expect(listGuestKangurScores()).toEqual([created]);
  });

  it('syncs local guest scores through the provided persistence callback and clears them on success', async () => {
    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 9,
      operation: 'mixed',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 31,
    });
    const persistScoreMock = vi.fn().mockResolvedValue({
      ...localScore,
      id: 'db-score-1',
      created_by: 'parent@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    });

    const result = await syncGuestKangurScores({
      persistScore: persistScoreMock,
    });

    expect(persistScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        player_name: 'Gracz',
        operation: 'mixed',
        client_mutation_id: localScore.client_mutation_id,
      })
    );
    expect(result).toEqual({
      syncedCount: 1,
      remainingCount: 0,
    });
    expect(loadGuestKangurScores()).toEqual([]);
  });

  it('keeps unsynced rows locally when persistence fails', async () => {
    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 6,
      operation: 'division',
      total_questions: 10,
      correct_answers: 6,
      time_taken: 45,
    });

    await expect(
      syncGuestKangurScores({
        persistScore: vi.fn().mockRejectedValue(new Error('sync failed')),
      })
    ).rejects.toThrow('sync failed');

    expect(loadGuestKangurScores()).toEqual([localScore]);
  });

  it('starts a fresh guest score session without exposing the previous session rows', () => {
    createGuestKangurScore({
      player_name: 'Gracz',
      score: 5,
      operation: 'subtraction',
      total_questions: 10,
      correct_answers: 5,
      time_taken: 40,
    });
    const previousSessionKey = getGuestKangurScoreSessionKey();

    const nextSessionKey = resetGuestKangurScoreSession();

    expect(nextSessionKey).toMatch(/^guest-session:/);
    expect(nextSessionKey).not.toBe(previousSessionKey);
    expect(hasGuestKangurScores()).toBe(false);
    expect(loadGuestKangurScores()).toEqual([]);
    expect(listGuestKangurScores()).toEqual([]);
  });
});
