import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runNeo4jStatementsMock = vi.fn();
const getKangurAiTutorContentMock = vi.fn();
const getKangurAiTutorNativeGuideStoreMock = vi.fn();
const getKangurPageContentStoreMock = vi.fn();
const cmsGetPagesMock = vi.fn();
const generateKangurKnowledgeGraphQueryEmbeddingMock = vi.fn();

vi.mock('@/shared/lib/neo4j/client', () => ({
  runNeo4jStatements: runNeo4jStatementsMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  getKangurPageContentStore: getKangurPageContentStoreMock,
}));

vi.mock('@/features/cms/services/cms-service', () => ({
  cmsService: {
    getPages: (...args: unknown[]) => cmsGetPagesMock(...args),
  },
}));

vi.mock('@/features/kangur/server/knowledge-graph/semantic', () => ({
  generateKangurKnowledgeGraphQueryEmbedding: generateKangurKnowledgeGraphQueryEmbeddingMock,
  cosineSimilarity: (left: number[], right: number[]) => {
    const len = Math.min(left.length, right.length);
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < len; index += 1) {
      const leftValue = left[index] ?? 0;
      const rightValue = right[index] ?? 0;
      dot += leftValue * rightValue;
      leftNorm += leftValue * leftValue;
      rightNorm += rightValue * rightValue;
    }
    const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
    return denominator === 0 ? 0 : dot / denominator;
  },
}));

const ORIGINAL_ENV = { ...process.env };

describe('resolveKangurWebsiteHelpGraphContext', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    vi.clearAllMocks();
    generateKangurKnowledgeGraphQueryEmbeddingMock.mockResolvedValue(null);
    cmsGetPagesMock.mockResolvedValue([]);
    getKangurAiTutorContentMock.mockResolvedValue({
      common: {
        signInLabel: 'Zaloguj się',
        createAccountLabel: 'Utworz konto',
      },
      guidedCallout: {
        authTitles: {
          signInNav: 'Zaloguj się w menu',
          createAccountNav: 'Utworz konto w menu',
        },
        authDetails: {
          signInNav: 'Kliknij Zaloguj się w gornej nawigacji.',
          createAccountNav: 'Kliknij Utworz konto w gornej nawigacji.',
        },
      },
      guestIntro: {
        initial: {
          headline: 'Potrzebujesz pomocy?',
          description: 'Tutor pomoże Ci odnaleźć logowanie lub konto.',
        },
        help: {
          headline: 'Pomoc przy logowaniu',
          description: 'Tutor pokaże, gdzie znajduje się logowanie.',
        },
        acceptLabel: 'Tak',
        dismissLabel: 'Nie',
        showLoginLabel: 'Pokaż logowanie',
        showCreateAccountLabel: 'Pokaż tworzenie konta',
      },
    });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 4,
      entries: [
        {
          id: 'lesson-overview',
          title: 'Ekran lekcji',
          shortDescription: 'To tutaj uczeń przechodzi przez temat krok po kroku.',
          fullDescription: 'Pełny opis ekranu lekcji z Mongo.',
          hints: ['Najpierw przeczytaj nagłówek.'],
          followUpActions: [{ id: 'open-lessons', label: 'Otwórz lekcje', page: 'Lessons' }],
          surface: 'lesson',
          focusKind: null,
          focusIdPrefixes: [],
          contentIdPrefixes: [],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: [],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });
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
          summary: 'Sekcja z szybkimi akcjami na stronie głównej gry.',
          body: 'Szybkie akcje kierują do najważniejszych aktywności w Kangurze.',
          anchorIdPrefix: 'kangur-game-home-actions',
          focusKind: 'home_actions',
          contentIdPrefixes: ['game:home'],
          nativeGuideIds: ['shared-home-actions'],
          triggerPhrases: ['szybkie akcje'],
          tags: ['page-content', 'game'],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('resolves section-aware semantic graph hits from Tutor-AI context metadata', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 6,
      entries: [
        {
          id: 'game-leaderboard',
          title: 'Ranking wyników',
          shortDescription: 'Tutaj widać porównanie ostatnich wyników i pozycję ucznia.',
          fullDescription: 'Sekcja rankingu pokazuje wyniki i pomaga ocenić, czy liczy się bardziej dokładność czy tempo.',
          hints: ['Porównuj wynik z własnym ostatnim podejściem, nie tylko z innymi osobami.'],
          followUpActions: [{ id: 'open-game', label: 'Wróć do gry', page: 'Game' }],
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-result-leaderboard'],
          contentIdPrefixes: ['game:practice:'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['ranking', 'tablica wyników', 'leaderboard'],
          enabled: true,
          sortOrder: 20,
        },
      ],
    });

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'guide:native:game-leaderboard',
            kind: 'guide',
            title: 'Fallback leaderboard',
            summary: 'Fallback leaderboard summary',
            surface: 'game',
            focusKind: 'leaderboard',
            route: '/game',
            anchorId: 'kangur-game-result-leaderboard',
            focusIdPrefixes: ['kangur-game-result-leaderboard'],
            contentIdPrefixes: ['game:practice:'],
            triggerPhrases: ['ranking'],
            sourceCollection: 'kangur_ai_tutor_native_guides',
            sourceRecordId: 'game-leaderboard',
            sourcePath: 'entry:game-leaderboard',
            tags: ['game', 'leaderboard', 'native-guide'],
            semanticScore: 196,
            tokenHits: 2,
            relations: [],
          },
        ],
      },
    ]);

    const { resolveKangurAiTutorSemanticGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurAiTutorSemanticGraphContext({
      latestUserMessage: 'Wyjaśnij ten panel',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-result-leaderboard',
        focusLabel: 'Ranking wyników',
        contentId: 'game:practice:addition',
        title: 'Podsumowanie gry',
      } as never,
      locale: 'pl',
    });

    expect(runNeo4jStatementsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        parameters: expect.objectContaining({
          surface: 'game',
          focusKind: 'leaderboard',
          focusId: 'kangur-game-result-leaderboard',
          contentId: 'game:practice:addition',
          focusLabel: 'ranking wynikow',
          title: 'podsumowanie gry',
        }),
      }),
    ]);
    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected semantic graph context hit.');
    }
    expect(result.queryMode).toBe('semantic');
    expect(result.websiteHelpTarget).toEqual({
      nodeId: 'guide:native:game-leaderboard',
      label: 'Ranking wyników',
      route: '/game',
      anchorId: 'kangur-game-result-leaderboard',
    });
    expect(result.instructions).toContain('Kangur semantic graph context:');
    expect(result.instructions).toContain('Ranking wyników');
    expect(result.sourceCollections).toEqual(['kangur_ai_tutor_native_guides']);
    expect(result.hydrationSources).toEqual(['kangur_ai_tutor_native_guides']);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_ai_tutor_native_guides',
          text: expect.stringContaining('Sekcja rankingu pokazuje wyniki'),
        }),
      ])
    );
  });

  it('includes selected excerpts in semantic graph lookup seeds for selected-text tutoring', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    generateKangurKnowledgeGraphQueryEmbeddingMock.mockResolvedValue([1, 0]);
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 6,
      entries: [
        {
          id: 'game-leaderboard',
          title: 'Ranking wyników',
          shortDescription: 'Tutaj widać porównanie ostatnich wyników i pozycję ucznia.',
          fullDescription:
            'Sekcja rankingu pokazuje wyniki i pomaga ocenić, czy liczy się bardziej dokładność czy tempo.',
          hints: ['Porównuj wynik z własnym ostatnim podejściem, nie tylko z innymi osobami.'],
          followUpActions: [{ id: 'open-game', label: 'Wróć do gry', page: 'Game' }],
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-result-leaderboard'],
          contentIdPrefixes: ['game:practice:'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['ranking', 'tablica wyników', 'leaderboard'],
          enabled: true,
          sortOrder: 20,
        },
      ],
    });
    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'guide:native:game-leaderboard',
            kind: 'guide',
            title: 'Fallback leaderboard',
            summary: 'Fallback leaderboard summary',
            surface: 'game',
            focusKind: 'leaderboard',
            route: '/game',
            anchorId: 'kangur-game-result-leaderboard',
            focusIdPrefixes: ['kangur-game-result-leaderboard'],
            contentIdPrefixes: ['game:practice:'],
            triggerPhrases: ['ranking'],
            sourceCollection: 'kangur_ai_tutor_native_guides',
            sourceRecordId: 'game-leaderboard',
            sourcePath: 'entry:game-leaderboard',
            tags: ['game', 'leaderboard', 'native-guide'],
            semanticScore: 196,
            tokenHits: 1,
            relations: [],
          },
        ],
      },
    ]);

    const { previewKangurAiTutorSemanticGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await previewKangurAiTutorSemanticGraphContext({
      latestUserMessage: 'Wyjaśnij ten fragment',
      context: {
        surface: 'game',
        promptMode: 'selected_text',
        selectedText: 'Ranking wyników',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-result-leaderboard',
        contentId: 'game:practice:addition',
      } as never,
      locale: 'pl',
    });

    expect(result.querySeed).toBe('Wyjaśnij ten fragment Ranking wyników');
    expect(result.normalizedQuerySeed).toBe('wyjasnij ten fragment ranking wynikow');
    expect(generateKangurKnowledgeGraphQueryEmbeddingMock).toHaveBeenCalledWith(
      expect.stringContaining('ranking wynikow')
    );
    expect(runNeo4jStatementsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        parameters: expect.objectContaining({
          tokens: expect.arrayContaining(['ranking', 'wynikow']),
          focusKind: 'leaderboard',
          focusId: 'kangur-game-result-leaderboard',
          contentId: 'game:practice:addition',
        }),
      }),
    ]);
    expect(result.status).toBe('hit');
  });

  it('reranks semantic hits with stored Neo4j node embeddings when available', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    generateKangurKnowledgeGraphQueryEmbeddingMock.mockResolvedValue([1, 0]);
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 6,
      entries: [
        {
          id: 'game-progress',
          title: 'Postęp gry',
          shortDescription: 'Pokażuje aktualny postęp ucznia.',
          fullDescription: 'Ta sekcja pokazuje postęp i ostatnie wyniki.',
          hints: [],
          followUpActions: [],
          surface: 'game',
          focusKind: 'progress',
          focusIdPrefixes: ['kangur-game-home-progress'],
          contentIdPrefixes: ['game:home'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['postęp'],
          enabled: true,
          sortOrder: 10,
        },
        {
          id: 'game-leaderboard',
          title: 'Ranking wyników',
          shortDescription: 'Pokażuje porównanie wyników.',
          fullDescription: 'Ta sekcja pokazuje ranking i pozycję ucznia względem innych wyników.',
          hints: [],
          followUpActions: [],
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-result-leaderboard'],
          contentIdPrefixes: ['game:practice:'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['ranking'],
          enabled: true,
          sortOrder: 20,
        },
      ],
    });

    runNeo4jStatementsMock
      .mockResolvedValueOnce([
        {
          records: [
            {
              id: 'guide:native:game-progress',
              kind: 'guide',
              title: 'Fallback progress',
              summary: 'Fallback progress summary',
              surface: 'game',
              focusKind: 'progress',
              route: '/game',
              anchorId: 'kangur-game-home-progress',
              sourceCollection: 'kangur_ai_tutor_native_guides',
              sourceRecordId: 'game-progress',
              sourcePath: 'entry:game-progress',
              tags: ['game', 'progress'],
              semanticScore: 170,
              tokenHits: 2,
              embedding: [0, 1],
              embeddingDimensions: 2,
              relations: [],
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          records: [
            {
              id: 'guide:native:game-leaderboard',
              kind: 'guide',
              title: 'Fallback leaderboard',
              summary: 'Fallback leaderboard summary',
              surface: 'game',
              focusKind: 'leaderboard',
              route: '/game',
              anchorId: 'kangur-game-result-leaderboard',
              sourceCollection: 'kangur_ai_tutor_native_guides',
              sourceRecordId: 'game-leaderboard',
              sourcePath: 'entry:game-leaderboard',
              tags: ['game', 'leaderboard'],
              semanticScore: 900,
              tokenHits: 0,
              embedding: [1, 0],
              embeddingDimensions: 2,
              relations: [],
            },
          ],
        },
      ]);

    const { resolveKangurAiTutorSemanticGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurAiTutorSemanticGraphContext({
      latestUserMessage: 'Wyjaśnij ten panel',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-result-leaderboard',
        focusLabel: 'Ranking wyników',
        contentId: 'game:practice:addition',
      } as never,
      locale: 'pl',
    });

    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected semantic graph context hit.');
    }
    expect(runNeo4jStatementsMock).toHaveBeenCalledTimes(2);
    expect(runNeo4jStatementsMock.mock.calls[1]?.[0]?.[0]).toEqual(
      expect.objectContaining({
        statement: expect.stringContaining('db.index.vector.queryNodes'),
      })
    );
    expect(result.nodeIds[0]).toBe('guide:native:game-leaderboard');
    expect(result.sources[0]).toEqual(
      expect.objectContaining({
        documentId: 'guide:native:game-leaderboard',
      })
    );
  });

  it('hydrates CMS page graph hits from the CMS pages MongoDB collection', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    cmsGetPagesMock.mockResolvedValue([
      {
        id: 'cms-about',
        name: 'O nas',
        status: 'published',
        seoTitle: 'O Kangurze — Nauka matematyki',
        seoDescription: 'Poznaj platformę Kangur do nauki matematyki.',
        themeId: null,
        showMenu: true,
        components: [
          {
            type: 'section',
            order: 1,
            content: {
              zone: 'template',
              settings: {},
              blocks: [
                { id: 'b1', type: 'Heading', settings: { headingText: 'Witaj w Kangurze' } },
                { id: 'b2', type: 'Text', settings: { textContent: 'Ucz się matematyki z radością.' } },
              ],
              sectionId: 'sec-1',
              parentSectionId: null,
            },
          },
        ],
        slugs: [{ id: 's1', slug: 'o-nas', isDefault: true, createdAt: '', updatedAt: '' }],
        createdAt: '',
        updatedAt: '',
      },
    ]);

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'cms-page:cms-about',
            kind: 'page',
            title: 'O Kangurze — Nauka matematyki',
            summary: 'Poznaj platformę Kangur do nauki matematyki.',
            route: '/o-nas',
            anchorId: null,
            sourceCollection: 'cms_pages',
            sourceRecordId: 'cms-about',
            sourcePath: 'cms-page:cms-about',
            tags: ['cms', 'cms-page', 'website'],
            tokenHits: 2,
            relations: [],
          },
        ],
      },
    ]);

    const { resolveKangurAiTutorSemanticGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurAiTutorSemanticGraphContext({
      latestUserMessage: 'Powiedz o stronie o nas',
      context: undefined as never,
      locale: 'pl',
    });

    expect(cmsGetPagesMock).toHaveBeenCalled();
    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected semantic graph context hit.');
    }
    expect(result.sourceCollections).toEqual(['cms_pages']);
    expect(result.hydrationSources).toEqual(['cms_pages']);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'cms_pages',
          text: expect.stringContaining('Witaj w Kangurze'),
        }),
      ])
    );
    expect(result.instructions).toContain('CMS website pages');
  });
});
