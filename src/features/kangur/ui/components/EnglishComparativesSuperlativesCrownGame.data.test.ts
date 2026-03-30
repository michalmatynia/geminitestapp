import { describe, expect, it } from 'vitest';

import {
  ENGLISH_COMPARE_AND_CROWN_ROUNDS,
  type EnglishComparisonFormId,
} from '@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame.data';

describe('EnglishComparativesSuperlativesCrownGame.data', () => {
  it('keeps at least five rounds with three unique target actions each', () => {
    expect(ENGLISH_COMPARE_AND_CROWN_ROUNDS.length).toBeGreaterThanOrEqual(5);

    const seenForms = new Set<EnglishComparisonFormId>();

    for (const round of ENGLISH_COMPARE_AND_CROWN_ROUNDS) {
      expect(round.actions).toHaveLength(3);

      const actionIds = new Set(round.actions.map((action) => action.id));
      const answers = new Set(round.actions.map((action) => action.answer));

      expect(actionIds.size).toBe(round.actions.length);
      expect(answers.size).toBe(round.actions.length);

      for (const action of round.actions) {
        seenForms.add(action.answer);
      }
    }

    expect(seenForms).toEqual(
      new Set([
        'taller',
        'the_tallest',
        'faster',
        'the_fastest',
        'bigger',
        'the_biggest',
        'funnier',
        'the_funniest',
        'more_beautiful',
        'the_most_beautiful',
        'better',
        'the_best',
      ])
    );
  });
});
