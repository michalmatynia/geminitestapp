import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  mergeKangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';

describe('kangur ai tutor native guide contract', () => {
  it('backfills new matcher metadata and missing seeded entries when merging older mongo documents', () => {
    const merged = mergeKangurAiTutorNativeGuideStore(
      DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      {
        locale: 'pl',
        version: 1,
        entries: [
          {
            id: 'game-question',
            surface: 'game',
            focusKind: 'question',
            title: 'Pytanie w grze',
            shortDescription: 'Własny skrot opisu pytania.',
            fullDescription: 'Własny, dłuższy opis pytania w grze zapisany w MongoDB.',
            hints: ['Czytaj spokojnie i nie zgaduj.'],
            relatedGames: [],
            relatedTests: [],
            followUpActions: [],
            triggerPhrases: ['co to za pytanie'],
            enabled: true,
            sortOrder: 420,
          },
          {
            id: 'custom-extra',
            surface: 'game',
            focusKind: null,
            title: 'Dodatkowa sekcja',
            shortDescription: 'Opis dodatkowej sekcji zapisanej poza seedem.',
            fullDescription: 'Pełny opis dodatkowej sekcji, która została dopisana recznie.',
            hints: [],
            relatedGames: [],
            relatedTests: [],
            followUpActions: [],
            triggerPhrases: ['dodatkowa sekcja'],
            enabled: true,
            sortOrder: 990,
          },
        ],
      }
    );

    const mergedGameQuestion = merged.entries.find((entry) => entry.id === 'game-question');
    const defaultGameQuestion = DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.find(
      (entry) => entry.id === 'game-question'
    );

    expect(merged.version).toBe(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.version);
    expect(mergedGameQuestion?.shortDescription).toBe('Własny skrot opisu pytania.');
    expect(mergedGameQuestion?.fullDescription).toBe(
      'Własny, dłuższy opis pytania w grze zapisany w MongoDB.'
    );
    expect(mergedGameQuestion?.focusIdPrefixes).toEqual(defaultGameQuestion?.focusIdPrefixes);
    expect(mergedGameQuestion?.contentIdPrefixes).toEqual(defaultGameQuestion?.contentIdPrefixes);
    expect(merged.entries.some((entry) => entry.id === 'shared-home-actions')).toBe(true);
    expect(merged.entries.some((entry) => entry.id === 'custom-extra')).toBe(true);
  });
});
