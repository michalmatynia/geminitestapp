import { describe, expect, it } from 'vitest';

import {
  ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS,
  type EnglishAdverbFrequencyId,
} from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.data';

describe('EnglishAdverbsFrequencyRoutineGame.data', () => {
  it('keeps at least five rounds with three unique target actions each', () => {
    expect(ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS.length).toBeGreaterThanOrEqual(5);

    const seenFrequencies = new Set<EnglishAdverbFrequencyId>();

    for (const round of ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS) {
      expect(round.actions).toHaveLength(3);

      const actionIds = new Set(round.actions.map((action) => action.id));
      const answers = new Set(round.actions.map((action) => action.answer));

      expect(actionIds.size).toBe(round.actions.length);
      expect(answers.size).toBe(round.actions.length);

      for (const action of round.actions) {
        seenFrequencies.add(action.answer);
      }
    }

    expect(seenFrequencies).toEqual(new Set(['always', 'usually', 'sometimes', 'never']));
  });
});
