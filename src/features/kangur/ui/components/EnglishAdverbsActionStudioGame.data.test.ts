import { describe, expect, it } from 'vitest';

import {
  ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS,
  type EnglishAdverbId,
} from '@/features/kangur/ui/components/EnglishAdverbsActionStudioGame.data';

describe('EnglishAdverbsActionStudioGame.data', () => {
  it('keeps at least five rounds with three unique target actions each', () => {
    expect(ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS.length).toBeGreaterThanOrEqual(5);

    const seenAdverbs = new Set<EnglishAdverbId>();

    for (const round of ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS) {
      expect(round.actions).toHaveLength(3);

      const actionIds = new Set(round.actions.map((action) => action.id));
      const answers = new Set(round.actions.map((action) => action.answer));

      expect(actionIds.size).toBe(round.actions.length);
      expect(answers.size).toBe(round.actions.length);

      for (const action of round.actions) {
        seenAdverbs.add(action.answer);
      }
    }

    expect(seenAdverbs).toEqual(
      new Set(['fast', 'carefully', 'beautifully', 'happily', 'well', 'badly'])
    );
  });
});
