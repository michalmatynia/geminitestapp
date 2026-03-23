import { describe, expect, it } from 'vitest';

import { ENGLISH_ARTICLES_DRAG_DROP_ROUNDS } from '@/features/kangur/ui/components/EnglishArticlesDragDropGame.data';

describe('ENGLISH_ARTICLES_DRAG_DROP_ROUNDS', () => {
  it('keeps a broader set of article rounds with one a/an/the answer per round', () => {
    expect(ENGLISH_ARTICLES_DRAG_DROP_ROUNDS.length).toBeGreaterThanOrEqual(6);

    for (const round of ENGLISH_ARTICLES_DRAG_DROP_ROUNDS) {
      expect(round.sentences).toHaveLength(3);
      expect(new Set(round.sentences.map((sentence) => sentence.answer))).toEqual(
        new Set(['a', 'an', 'the'])
      );
    }
  });
});
