import { describe, expect, it } from 'vitest';

import { ENGLISH_ADJECTIVES_SCENE_ROUNDS } from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame.data';

describe('EnglishAdjectivesSceneGame.data', () => {
  it('keeps at least three rounds with three target objects each', () => {
    expect(ENGLISH_ADJECTIVES_SCENE_ROUNDS.length).toBeGreaterThanOrEqual(3);

    for (const round of ENGLISH_ADJECTIVES_SCENE_ROUNDS) {
      expect(round.objects).toHaveLength(3);
      expect(round.tokens.length).toBeGreaterThanOrEqual(round.objects.length);

      for (const object of round.objects) {
        expect(round.tokens).toContain(object.answer);
      }
    }
  });
});
