import { describe, expect, it } from 'vitest';

import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from './homeDebugProof';

describe('resolveKangurHomeDebugProofOperation', () => {
  it('returns the first non-empty debug proof operation value', () => {
    expect(resolveKangurHomeDebugProofOperation('clock')).toBe('clock');
    expect(resolveKangurHomeDebugProofOperation(['calendar'])).toBe('calendar');
  });

  it('returns null for missing debug proof operation values', () => {
    expect(resolveKangurHomeDebugProofOperation('')).toBeNull();
    expect(resolveKangurHomeDebugProofOperation(undefined)).toBeNull();
    expect(resolveKangurHomeDebugProofOperation(null)).toBeNull();
  });
});

describe('buildKangurHomeDebugProofViewModel', () => {
  it('returns a ready home proof when recent results and training focus both match', () => {
    const model = buildKangurHomeDebugProofViewModel({
      isEnabled: true,
      isLoading: false,
      operation: 'clock',
      recentResults: [
        {
          id: 'score-1',
          player_name: 'Super Admin',
          score: 8,
          operation: 'clock',
          subject: 'maths',
          total_questions: 8,
          correct_answers: 8,
          time_taken: 0,
          created_date: '2026-03-20T19:55:23.677Z',
          created_by: 'e2e.admin@example.com',
          learner_id: 'learner-1',
          owner_user_id: 'user-1',
        },
      ],
      strongestOperation: {
        averageAccuracyPercent: 100,
        operation: 'clock',
        sessions: 4,
      },
      weakestOperation: {
        averageAccuracyPercent: 78,
        operation: 'logical_patterns',
        sessions: 9,
      },
    });

    expect(model).toEqual({
      checks: [
        {
          detail: '8/8 in recent synced results.',
          label: 'Recent results',
          status: 'ready',
        },
        {
          detail: 'Strongest mode on home at 100% across 4 sessions.',
          label: 'Training focus',
          status: 'ready',
        },
      ],
      operation: 'clock',
      operationLabel: 'Zegar',
    });
  });

  it('returns a loading proof model while home auth-backed score hooks are restoring', () => {
    expect(
      buildKangurHomeDebugProofViewModel({
        isEnabled: false,
        isLoading: true,
        operation: 'clock',
        recentResults: [],
        strongestOperation: null,
        weakestOperation: null,
      }),
    ).toEqual({
      checks: [
        {
          detail: 'Restoring learner session and synced score data.',
          label: 'Home score loop',
          status: 'info',
        },
      ],
      operation: 'clock',
      operationLabel: 'Zegar',
    });
  });
});
