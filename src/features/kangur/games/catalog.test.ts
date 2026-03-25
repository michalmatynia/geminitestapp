import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  getKangurGameCatalogEntriesForEngine,
  getKangurGameCatalogEntryForLessonActivity,
} from '@/features/kangur/games';

describe('kangur game catalog', () => {
  it('joins games with engine metadata and preferred variants', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'clock_training'
    );

    expect(entry?.engine?.id).toBe('clock-dial-engine');
    expect(entry?.lessonVariant?.id).toBe('clock_training.lesson-inline');
    expect(entry?.gameScreenVariant?.id).toBe('clock_training.game-screen');
    expect(entry?.launchableScreen).toBe('clock_quiz');
  });

  it('resolves lesson activities and engine families through the catalog', () => {
    expect(getKangurGameCatalogEntryForLessonActivity('clock-training')?.game.id).toBe(
      'clock_training'
    );
    expect(
      getKangurGameCatalogEntriesForEngine('classification-engine').map((entry) => entry.game.id)
    ).toEqual(['logical_classification_lab', 'english_parts_of_speech_sort']);
  });

  it('filters catalog entries by shared domain attributes', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      subject: 'english',
      launchableOnly: true,
    });

    expect(filtered.map((entry) => entry.game.id)).toEqual([
      'english_sentence_builder',
      'english_parts_of_speech_sort',
    ]);
  });
});
