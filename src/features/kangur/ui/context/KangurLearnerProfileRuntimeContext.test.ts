import { describe, expect, it } from 'vitest';

import { hasScopedMessage } from './KangurLearnerProfileRuntimeContext.utils';

describe('hasScopedMessage', () => {
  const messages = {
    KangurLearnerProfileRuntime: {
      localMode: 'Tryb lokalny',
    },
    KangurProgressRuntime: {
      levels: {
        1: 'Raczkujący 🐣',
      },
      badges: {
        first_game: {
          name: 'Pierwsza gra',
        },
      },
    },
  } as const;

  it('finds keys nested inside a namespace', () => {
    expect(hasScopedMessage(messages, 'KangurProgressRuntime', 'levels.1')).toBe(true);
    expect(hasScopedMessage(messages, 'KangurProgressRuntime', 'badges.first_game.name')).toBe(true);
  });

  it('does not report keys from a different namespace', () => {
    expect(hasScopedMessage(messages, 'KangurLearnerProfileRuntime', 'levels.1')).toBe(false);
    expect(hasScopedMessage(messages, 'KangurLearnerProfileRuntime', 'badges.first_game.name')).toBe(
      false
    );
  });
});
