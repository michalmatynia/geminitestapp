import { describe, expect, it } from 'vitest';

import { resolveLocalizedRecommendationActivityLabel } from '@/features/kangur/ui/services/recommendation-i18n';

const createTranslator =
  (messages: Record<string, string>) =>
  (key: string): string =>
    messages[key] ?? key;

describe('resolveLocalizedRecommendationActivityLabel', () => {
  const translate = createTranslator({
    'activityLabels.english_articles': 'Articles',
    'activityLabels.english_adjectives': 'Adjectives',
    'activityLabels.english_adverbs_frequency': 'Adverbs of frequency',
    'activityLabels.english_prepositions_time_place': 'Time and place prepositions',
  });

  it('maps bare article drag-drop activity keys to the articles label', () => {
    expect(
      resolveLocalizedRecommendationActivityLabel({
        activityKey: 'english_articles_drag_drop',
        fallbackLabel: 'Article drag drop',
        translate,
      })
    ).toBe('Articles');
  });

  it('maps bare adjective scene activity keys to the adjectives label', () => {
    expect(
      resolveLocalizedRecommendationActivityLabel({
        activityKey: 'english_adjectives_scene_studio',
        fallbackLabel: 'Adjective studio',
        translate,
      })
    ).toBe('Adjectives');
  });

  it('maps the prepositions order activity to the shared prepositions label', () => {
    expect(
      resolveLocalizedRecommendationActivityLabel({
        activityKey: 'english_prepositions_order',
        fallbackLabel: 'Prepositions order',
        translate,
      })
    ).toBe('Time and place prepositions');
  });

  it('maps bare adverbs-of-frequency activity keys to the shared lesson label', () => {
    expect(
      resolveLocalizedRecommendationActivityLabel({
        activityKey: 'english_adverbs_frequency_routine_studio',
        fallbackLabel: 'Frequency studio',
        translate,
      })
    ).toBe('Adverbs of frequency');
  });
});
