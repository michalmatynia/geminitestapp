import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKangurPageContentStoreMock,
  getKangurAiTutorNativeGuideStoreMock,
} = vi.hoisted(() => ({
  getKangurPageContentStoreMock: vi.fn(),
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  getKangurPageContentStore: getKangurPageContentStoreMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

import { resolveKangurAiTutorSectionKnowledgeBundle } from './section-knowledge';

describe('resolveKangurAiTutorSectionKnowledgeBundle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getKangurPageContentStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 1,
      entries: [],
    });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 6,
      entries: [],
    });
  });

  it('joins an explicit page-content knowledge reference with linked native guide entries and location follow-up actions', async () => {
    getKangurPageContentStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 1,
      entries: [
        {
          id: 'lessons-library',
          pageKey: 'Lessons',
          screenKey: 'library',
          surface: 'lesson',
          route: '/lessons',
          componentId: 'library',
          widget: 'KangurLessonsCatalogWidget',
          sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
          title: 'Biblioteka lekcji',
          summary: 'Lista wszystkich tematów i kart do wybrania.',
          body: 'Tutaj uczeń wybiera temat, sprawdza priorytet i otwiera dalszą praktykę.',
          anchorIdPrefix: 'kangur-lessons-library',
          focusKind: 'library',
          contentIdPrefixes: ['lesson:list'],
          nativeGuideIds: ['lesson-library'],
          triggerPhrases: ['biblioteka lekcji'],
          tags: ['page-content', 'library'],
          notes: 'Sekcja biblioteki lekcji.',
          enabled: true,
          sortOrder: 10,
        },
      ],
    });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 6,
      entries: [
        {
          id: 'lesson-library',
          surface: 'lesson',
          focusKind: 'library',
          focusIdPrefixes: ['kangur-lessons-library'],
          contentIdPrefixes: ['lesson:list'],
          title: 'Biblioteka lekcji',
          shortDescription: 'Pomaga wybrac najlepszy temat do dalszej nauki.',
          fullDescription: 'To miejsce pokazuje aktywne tematy, priorytety i dalsze kroki dla ucznia.',
          hints: ['Zacznij od tematu z najwyzszym priorytetem.'],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [
            { id: 'open-game', label: 'Przejdz do gry', page: 'Game', reason: 'Aby utrwalic temat.' },
          ],
          triggerPhrases: ['biblioteka', 'ktora lekcje wybrac'],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });

    const bundle = await resolveKangurAiTutorSectionKnowledgeBundle({
      latestUserMessage: 'Gdzie mam przejsc dalej po tej sekcji?',
      context: {
        surface: 'lesson',
        contentId: 'lesson:list',
        focusKind: 'library',
        focusId: 'kangur-lessons-library',
        focusLabel: 'Biblioteka lekcji',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'lessons-library',
          sourcePath: 'entry:lessons-library',
        },
      },
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.section.id).toBe('lessons-library');
    expect(bundle?.linkedNativeGuides.map((entry) => entry.id)).toEqual(['lesson-library']);
    expect(bundle?.followUpActions).toEqual([
      { id: 'open-game', label: 'Przejdz do gry', page: 'Game', reason: 'Aby utrwalic temat.' },
    ]);
    expect(bundle?.sources).toHaveLength(2);
    expect(bundle?.sources[0]).toMatchObject({
      collectionId: 'kangur_page_content',
      documentId: 'lessons-library',
      metadata: expect.objectContaining({
        title: 'Biblioteka lekcji',
      }),
    });
    expect(bundle?.sources[1]).toMatchObject({
      collectionId: 'kangur_ai_tutor_native_guides',
      documentId: 'lesson-library',
      metadata: expect.objectContaining({
        title: 'Biblioteka lekcji',
      }),
    });
    expect(bundle?.instructions).toContain('Current visible Kangur website section');
    expect(bundle?.instructions).toContain('Linked Kangur knowledge-base guidance for this section');
    expect(bundle?.instructions).toContain('Przejdz do gry -> Game');
  });

  it('falls back to anchor/content matching when the context does not already carry a page-content knowledge reference', async () => {
    getKangurPageContentStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 1,
      entries: [
        {
          id: 'game-home-actions',
          pageKey: 'Game',
          screenKey: 'home',
          surface: 'game',
          route: '/game',
          componentId: 'home-actions',
          widget: 'KangurGameHomeActionsWidget',
          sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
          title: 'Szybkie akcje',
          summary: 'Tutaj uczen wybiera dalszy tryb aktywnosci.',
          body: 'Sekcja prowadzi do lekcji, gry, treningu mieszanego i Kangura Matematycznego.',
          anchorIdPrefix: 'kangur-game-home-actions',
          focusKind: 'home_actions',
          contentIdPrefixes: ['game:home'],
          nativeGuideIds: [],
          triggerPhrases: ['szybkie akcje'],
          tags: ['page-content', 'home-actions'],
          notes: 'Karta startowa gry.',
          enabled: true,
          sortOrder: 10,
        },
      ],
    });

    const bundle = await resolveKangurAiTutorSectionKnowledgeBundle({
      latestUserMessage: 'Wyjaśnij mi te szybkie akcje.',
      context: {
        surface: 'game',
        contentId: 'game:home',
        focusKind: 'home_actions',
        focusId: 'kangur-game-home-actions',
        focusLabel: 'Szybkie akcje',
      },
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.section.id).toBe('game-home-actions');
    expect(bundle?.linkedNativeGuides).toEqual([]);
    expect(bundle?.followUpActions).toEqual([]);
    expect(bundle?.sources).toHaveLength(1);
    expect(bundle?.sources[0]).toMatchObject({
      collectionId: 'kangur_page_content',
      documentId: 'game-home-actions',
    });
  });
});
