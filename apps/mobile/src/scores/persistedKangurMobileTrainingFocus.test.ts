import { createMemoryKangurClientStorage } from '@kangur/platform';
import { describe, expect, it } from 'vitest';

import {
  persistKangurMobileTrainingFocus,
  resolvePersistedKangurMobileTrainingFocus,
} from './persistedKangurMobileTrainingFocus';

const createFocus = (overrides: {
  strongestOperation?: {
    averageAccuracyPercent: number;
    bestAccuracyPercent: number;
    family: 'arithmetic' | 'logic' | 'time';
    operation: string;
    sessions: number;
  } | null;
  weakestOperation?: {
    averageAccuracyPercent: number;
    bestAccuracyPercent: number;
    family: 'arithmetic' | 'logic' | 'time';
    operation: string;
    sessions: number;
  } | null;
} = {}) => ({
  strongestOperation:
    'strongestOperation' in overrides
      ? overrides.strongestOperation ?? null
      : {
          averageAccuracyPercent: 95,
          bestAccuracyPercent: 100,
          family: 'logic' as const,
          operation: 'logical_patterns',
          sessions: 4,
        },
  weakestOperation:
    'weakestOperation' in overrides
      ? overrides.weakestOperation ?? null
      : {
          averageAccuracyPercent: 52,
          bestAccuracyPercent: 63,
          family: 'arithmetic' as const,
          operation: 'addition',
          sessions: 3,
        },
});

describe('persistedKangurMobileTrainingFocus', () => {
  it('persists and resolves training focus by learner scope', () => {
    const storage = createMemoryKangurClientStorage();

    persistKangurMobileTrainingFocus({
      focus: createFocus(),
      identityKey: 'learner:learner-1',
      storage,
    });

    expect(
      resolvePersistedKangurMobileTrainingFocus({
        identityKey: 'learner:learner-1',
        storage,
      }),
    ).toEqual(createFocus());
  });

  it('preserves empty focus snapshots', () => {
    const storage = createMemoryKangurClientStorage();

    persistKangurMobileTrainingFocus({
      focus: createFocus({
        strongestOperation: null,
        weakestOperation: null,
      }),
      identityKey: 'learner:learner-1',
      storage,
    });

    expect(
      resolvePersistedKangurMobileTrainingFocus({
        identityKey: 'learner:learner-1',
        storage,
      }),
    ).toEqual({
      strongestOperation: null,
      weakestOperation: null,
    });
  });

  it('ignores invalid persisted focus payloads', () => {
    const storage = createMemoryKangurClientStorage();
    storage.setItem(
      'kangur.mobile.scores.trainingFocus',
      JSON.stringify({
        'learner:learner-1': {
          strongestOperation: {
            operation: 'addition',
          },
          weakestOperation: null,
        },
      }),
    );

    expect(
      resolvePersistedKangurMobileTrainingFocus({
        identityKey: 'learner:learner-1',
        storage,
      }),
    ).toBeNull();
  });
});
