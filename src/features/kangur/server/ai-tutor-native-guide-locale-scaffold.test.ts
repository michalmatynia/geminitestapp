import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';

import {
  buildKangurAiTutorNativeGuideLocaleScaffold,
  buildKangurAiTutorNativeGuideTranslationStatusByEntryId,
  getKangurAiTutorNativeGuideLocaleOverlay,
  summarizeKangurAiTutorNativeGuideTranslationStatuses,
} from './ai-tutor-native-guide-locale-scaffold';

const getEntry = (store: KangurAiTutorNativeGuideStore, id: string) => {
  const entry = store.entries.find((candidate) => candidate.id === id);
  expect(entry).toBeDefined();
  return entry!;
};

describe('ai tutor native guide locale scaffold', () => {
  it('builds an English scaffold with localized core guide copy', () => {
    const store = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
    });

    expect(store.locale).toBe('en');
    expect(getEntry(store, 'auth-overview').title).toBe('Sign-in and account setup screen');
    expect(getEntry(store, 'lesson-library').title).toBe('Lesson library');
    expect(getEntry(store, 'game-review').title).toBe('Game result review');
    expect(getEntry(store, 'test-summary').shortDescription).toContain('next step');
    expect(getEntry(store, 'parent-dashboard-ai-tutor').title).toBe('AI Tutor tab for the parent');
    expect(getEntry(store, 'profile-recommendations').title).toBe(
      'Recommendations for the learner'
    );
  });

  it('builds a German scaffold with localized core guide copy', () => {
    const store = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'de',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
    });

    expect(store.locale).toBe('de');
    expect(getEntry(store, 'auth-overview').title).toBe('Anmelde- und Kontoerstellungsseite');
    expect(getEntry(store, 'lesson-library').title).toBe('Lektionsbibliothek');
    expect(getEntry(store, 'game-review').title).toBe('Auswertung nach dem Spiel');
    expect(getEntry(store, 'test-summary').shortDescription).toContain('naechsten Schritt');
    expect(getEntry(store, 'parent-dashboard-ai-tutor').title).toBe('KI-Tutor-Tab fuer Eltern');
    expect(getEntry(store, 'profile-recommendations').title).toBe(
      'Empfehlungen fuer den Lernenden'
    );
  });

  it('preserves manual target translations when they differ from the source locale', () => {
    const existingStore = {
      locale: 'en',
      entries: [
        {
          ...getEntry(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE, 'auth-overview'),
          title: 'Custom auth overview',
        },
      ],
    } satisfies Partial<KangurAiTutorNativeGuideStore>;

    const store = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      existingStore,
    });

    expect(getEntry(store, 'auth-overview').title).toBe('Custom auth overview');
  });

  it('replaces source-locale entry copy with localized overlay values', () => {
    const existingStore = {
      locale: 'en',
      entries: [
        {
          ...getEntry(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE, 'lesson-library'),
          title: getEntry(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE, 'lesson-library').title,
        },
      ],
    } satisfies Partial<KangurAiTutorNativeGuideStore>;

    const store = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      existingStore,
    });

    expect(getEntry(store, 'lesson-library').title).toBe('Lesson library');
    expect(getEntry(store, 'lesson-library').title).toBe(
      getKangurAiTutorNativeGuideLocaleOverlay('en').entries['lesson-library']?.title
    );
  });

  it('classifies scaffolded, manual, and source-copy native guide entries for localized stores', () => {
    const scaffoldedStore = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
    });
    const manualStore = {
      ...scaffoldedStore,
      entries: scaffoldedStore.entries.map((entry) =>
        entry.id === 'auth-overview'
          ? {
              ...entry,
              title: 'Custom auth overview',
            }
          : entry
      ),
    } satisfies KangurAiTutorNativeGuideStore;

    const statuses = buildKangurAiTutorNativeGuideTranslationStatusByEntryId({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      localizedStore: manualStore,
    });

    expect(statuses.get('auth-overview')).toBe('manual');
    expect(statuses.get('lesson-library')).toBe('scaffolded');
    expect(statuses.get('lesson-topic-adding')).toBe('source-copy');

    const summary = summarizeKangurAiTutorNativeGuideTranslationStatuses(statuses.values());
    expect(summary.manual).toBeGreaterThan(0);
    expect(summary.scaffolded).toBeGreaterThan(0);
    expect(summary['source-copy']).toBeGreaterThan(0);
  });
});
