import { describe, expect, it } from 'vitest';

import { resolvePracticePlayerName } from './practice-utils';

describe('resolvePracticePlayerName', () => {
  it('prefers the active learner display name', () => {
    expect(
      resolvePracticePlayerName(
        {
          user: {
            activeLearner: { displayName: '  Ada Learner  ' },
            full_name: 'Parent Name',
          },
        },
        'en',
      ),
    ).toBe('Ada Learner');
  });

  it('falls back to the account full name when there is no active learner name', () => {
    expect(
      resolvePracticePlayerName(
        {
          user: {
            activeLearner: { displayName: '   ' },
            full_name: '  Ada Parent  ',
          },
        },
        'en',
      ),
    ).toBe('Ada Parent');
  });

  it('uses the localized generic learner label when no profile name is available', () => {
    expect(resolvePracticePlayerName(null, 'de')).toBe('Lernender');
    expect(resolvePracticePlayerName(undefined, 'en')).toBe('Learner');
    expect(resolvePracticePlayerName({ user: { full_name: ' ' } }, 'pl')).toBe('Uczeń');
  });
});
