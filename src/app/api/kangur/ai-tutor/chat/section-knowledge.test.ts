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
            { id: 'open-game', label: 'Przejdź do gry', page: 'Game', reason: 'Aby utrwalić temat.' },
          ],
          triggerPhrases: ['biblioteka', 'którą lekcję wybrać'],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });

    const bundle = await resolveKangurAiTutorSectionKnowledgeBundle({
      latestUserMessage: 'Gdzie mam przejść dalej po tej sekcji?',
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
      { id: 'open-game', label: 'Przejdź do gry', page: 'Game', reason: 'Aby utrwalić temat.' },
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
    expect(bundle?.instructions).toContain('Przejdź do gry -> Game');
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
          summary: 'Tutaj uczeń wybiera dalszy tryb aktywności.',
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

  it('resolves highlighted selected text to a fragment explanation inside the matched page-content section', async () => {
    getKangurPageContentStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 1,
      entries: [
        {
          id: 'game-home-leaderboard',
          pageKey: 'Game',
          screenKey: 'home',
          surface: 'game',
          route: '/game',
          componentId: 'leaderboard',
          widget: 'Leaderboard',
          sourcePath: 'src/features/kangur/ui/components/Leaderboard.tsx',
          title: 'Ranking',
          summary: 'Porównaj wynik z innymi graczami.',
          body: 'To sekcja z najlepszymi wynikami i miejscem ucznia.',
          anchorIdPrefix: 'kangur-game-leaderboard',
          focusKind: 'leaderboard',
          contentIdPrefixes: ['game:home'],
          nativeGuideIds: ['shared-leaderboard'],
          triggerPhrases: ['ranking'],
          fragments: [
            {
              id: 'leaderboard-points',
              text: 'Liczba punktów',
              aliases: ['punkty w rankingu', 'punkty'],
              explanation:
                'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
              nativeGuideIds: ['shared-leaderboard-points'],
              triggerPhrases: ['liczba punktów', 'punkty'],
              enabled: true,
              sortOrder: 10,
            },
          ],
          tags: ['page-content', 'leaderboard'],
          notes: 'Ranking głównej planszy.',
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
          id: 'shared-leaderboard',
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-leaderboard'],
          contentIdPrefixes: ['game:home'],
          title: 'Ranking',
          shortDescription: 'Ranking porównuje ostatnie wyniki graczy.',
          fullDescription: 'Sekcja pokazuje miejsce ucznia i najlepsze rezultaty na tej planszy.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [],
          triggerPhrases: ['ranking'],
          enabled: true,
          sortOrder: 10,
        },
        {
          id: 'shared-leaderboard-points',
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-leaderboard'],
          contentIdPrefixes: ['game:home'],
          title: 'Punkty w rankingu',
          shortDescription: 'Wyjaśnia, jak czytać liczbę punktów na liście wyników.',
          fullDescription: 'Liczba punktów pokazuje siłę wyniku, która wpływa na pozycję ucznia.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [],
          triggerPhrases: ['punkty'],
          enabled: true,
          sortOrder: 20,
        },
      ],
    });

    const bundle = await resolveKangurAiTutorSectionKnowledgeBundle({
      latestUserMessage: 'Wyjaśnij ten fragment.',
      context: {
        surface: 'game',
        contentId: 'game:home',
        promptMode: 'selected_text',
        selectedText: 'Liczba punktów',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-leaderboard',
        focusLabel: 'Ranking',
        interactionIntent: 'explain',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-leaderboard',
          sourcePath: 'entry:game-home-leaderboard',
        },
      },
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.section.id).toBe('game-home-leaderboard');
    expect(bundle?.fragment).toEqual({
      id: 'leaderboard-points',
      text: 'Liczba punktów',
      aliases: ['punkty w rankingu', 'punkty'],
      explanation:
        'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
      nativeGuideIds: ['shared-leaderboard-points'],
      triggerPhrases: ['liczba punktów', 'punkty'],
      enabled: true,
      sortOrder: 10,
    });
    expect(bundle?.linkedNativeGuides.map((entry) => entry.id)).toEqual([
      'shared-leaderboard',
      'shared-leaderboard-points',
    ]);
    expect(bundle?.sources[0]).toMatchObject({
      collectionId: 'kangur_page_content',
      documentId: 'game-home-leaderboard#fragment:leaderboard-points',
      metadata: expect.objectContaining({
        title: 'Ranking -> Liczba punktów',
      }),
    });
    expect(bundle?.instructions).toContain(
      'Highlighted website fragment resolved from canonical page-content'
    );
  });
});
