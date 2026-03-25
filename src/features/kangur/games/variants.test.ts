import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';

describe('kangur game variants', () => {
  it('flattens game variants with catalog metadata', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'clock_training.game-screen'
    );

    expect(entry?.game.id).toBe('clock_training');
    expect(entry?.engine?.id).toBe('clock-dial-engine');
    expect(entry?.isGameScreenVariant).toBe(true);
    expect(entry?.launchableScreen).toBe('clock_quiz');
  });

  it('filters variants by variant-specific and shared catalog attributes', () => {
    const filtered = filterKangurGameVariantCatalogEntries(
      createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()),
      {
        subject: 'english',
        variantSurface: 'game_screen',
        launchableOnly: true,
      }
    );

    expect(filtered.map((entry) => entry.variant.id)).toEqual([
      'english_sentence_builder.game-screen',
      'english_parts_of_speech_sort.game-screen',
    ]);
  });

  it('filters variants by engine category', () => {
    const filtered = filterKangurGameVariantCatalogEntries(
      createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()),
      {
        engineCategory: 'foundational',
        variantSurface: 'game_screen',
      }
    );

    expect(filtered.every((entry) => entry.engine?.category === 'foundational')).toBe(true);
    expect(filtered.every((entry) => entry.variant.surface === 'game_screen')).toBe(true);
    expect(filtered.map((entry) => entry.variant.id)).toEqual(
      expect.arrayContaining([
        'geometry_shape_workshop.game-screen',
        'geometry_symmetry_studio.game-screen',
        'geometry_perimeter_trainer.game-screen',
        'clock_training.game-screen',
        'english_sentence_builder.game-screen',
      ])
    );
    expect(filtered.length).toBeGreaterThanOrEqual(5);
  });
});
