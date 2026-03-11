import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runNeo4jStatementsMock = vi.fn();
const getKangurAiTutorContentMock = vi.fn();
const getKangurAiTutorNativeGuideStoreMock = vi.fn();
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
    getKangurAiTutorContentMock.mockResolvedValue({
      common: {
        signInLabel: 'Zaloguj sie',
        createAccountLabel: 'Utworz konto',
      },
      guidedCallout: {
        authTitles: {
          signInNav: 'Zaloguj sie w menu',
          createAccountNav: 'Utworz konto w menu',
        },
        authDetails: {
          signInNav: 'Kliknij Zaloguj sie w gornej nawigacji.',
          createAccountNav: 'Kliknij Utworz konto w gornej nawigacji.',
        },
      },
      guestIntro: {
        initial: {
          headline: 'Potrzebujesz pomocy?',
          description: 'Tutor pomoze Ci odnalezc logowanie lub konto.',
        },
        help: {
          headline: 'Pomoc przy logowaniu',
          description: 'Tutor pokaze, gdzie znajduje sie logowanie.',
        },
        acceptLabel: 'Tak',
        dismissLabel: 'Nie',
        showLoginLabel: 'Pokaz logowanie',
        showCreateAccountLabel: 'Pokaz tworzenie konta',
      },
    });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({
      locale: 'pl',
      version: 4,
      entries: [
        {
          id: 'lesson-overview',
          title: 'Ekran lekcji',
          shortDescription: 'To tutaj uczen przechodzi przez temat krok po kroku.',
          fullDescription: 'Pelny opis ekranu lekcji z Mongo.',
          hints: ['Najpierw przeczytaj naglowek.'],
          followUpActions: [{ id: 'open-lessons', label: 'Otworz lekcje', page: 'Lessons' }],
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
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns graph instructions and sources for website-help queries when Neo4j is enabled', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'flow:kangur:sign-in',
            kind: 'flow',
            title: 'Sign in flow',
            summary: 'How anonymous learners sign in from the Kangur website shell.',
            route: '/',
            anchorId: 'kangur-primary-nav-login',
            tags: ['auth', 'login'],
            tokenHits: 3,
            relations: [
              {
                kind: 'USES_ANCHOR',
                targetId: 'anchor:kangur:login',
                targetTitle: 'Zaloguj się',
                targetKind: 'anchor',
                targetAnchorId: 'kangur-primary-nav-login',
                targetRoute: '/',
              },
            ],
          },
        ],
      },
    ]);

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Jak się zalogować do Kangura?',
      context: undefined,
    });

    expect(runNeo4jStatementsMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: 'hit',
      queryMode: 'website_help',
      nodeIds: ['flow:kangur:sign-in'],
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Sign in flow',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
    });
    if (result.status !== 'hit') {
      throw new Error('Expected graph context hit.');
    }
    expect(result.instructions).toContain('Kangur website-help graph context:');
    expect(result.instructions).toContain('kangur-primary-nav-login');
    expect(result.sourceCollections).toEqual(['kangur-knowledge-graph']);
    expect(result.hydrationSources).toEqual(['graph_fallback']);
    expect(result.sources[0]).toEqual(
      expect.objectContaining({
        documentId: 'flow:kangur:sign-in',
        collectionId: 'kangur-knowledge-graph',
      })
    );
  });

  it('skips graph retrieval when Neo4j is disabled', async () => {
    delete process.env['NEO4J_ENABLED'];
    delete process.env['NEO4J_URI'];
    delete process.env['NEO4J_HTTP_URL'];

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Jak się zalogować do Kangura?',
      context: undefined,
    });

    expect(result).toEqual({
      status: 'disabled',
      queryMode: null,
      instructions: null,
      sources: [],
      nodeIds: [],
    });
    expect(runNeo4jStatementsMock).not.toHaveBeenCalled();
  });

  it('falls back to a related route and anchor when the matched node has no direct target', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'faq:kangur:login-help',
            kind: 'faq',
            title: 'Login help',
            summary: 'How to sign in.',
            route: null,
            anchorId: null,
            tags: ['auth', 'login'],
            tokenHits: 2,
            relations: [
              {
                kind: 'LEADS_TO',
                targetId: 'action:kangur:sign-in',
                targetTitle: 'Zaloguj się',
                targetKind: 'action',
                targetAnchorId: 'kangur-primary-nav-login',
                targetRoute: '/',
              },
            ],
          },
        ],
      },
    ]);

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Gdzie kliknac, zeby sie zalogowac?',
      context: undefined,
    });

    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected graph context hit.');
    }
    expect(result.websiteHelpTarget).toEqual({
      nodeId: 'action:kangur:sign-in',
      label: 'Zaloguj się',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
  });

  it('hydrates graph hits from Mongo-backed tutor content and native guides', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'guide:native:lesson-overview',
            kind: 'guide',
            title: 'Fallback title',
            summary: 'Fallback summary',
            route: '/lessons',
            anchorId: null,
            sourceCollection: 'kangur_ai_tutor_native_guides',
            sourceRecordId: 'lesson-overview',
            sourcePath: 'entry:lesson-overview',
            tags: ['lesson'],
            tokenHits: 4,
            relations: [],
          },
          {
            id: 'guide:kangur:sign-in-nav',
            kind: 'guide',
            title: 'Fallback sign in',
            summary: 'Fallback sign in summary',
            route: '/',
            anchorId: 'kangur-primary-nav-login',
            sourceCollection: 'kangur_ai_tutor_content',
            sourceRecordId: 'pl',
            sourcePath: 'guidedCallout.auth.signInNav',
            tags: ['auth', 'login'],
            tokenHits: 3,
            relations: [],
          },
        ],
      },
    ]);

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Gdzie znajde logowanie i lekcje?',
      context: { focusKind: 'navigation' } as never,
      locale: 'pl',
    });

    expect(getKangurAiTutorContentMock).toHaveBeenCalledWith('pl');
    expect(getKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith('pl');
    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected graph context hit.');
    }
    expect(result.queryMode).toBe('website_help');
    expect(result.websiteHelpTarget).toEqual({
      nodeId: 'guide:native:lesson-overview',
      label: 'Ekran lekcji',
      route: '/lessons',
      anchorId: null,
    });
    expect(result.instructions).toContain('Mongo-backed Kangur tutor knowledge');
    expect(result.sourceCollections).toEqual(
      expect.arrayContaining(['kangur_ai_tutor_content', 'kangur_ai_tutor_native_guides'])
    );
    expect(result.hydrationSources).toEqual(
      expect.arrayContaining(['kangur_ai_tutor_content', 'kangur_ai_tutor_native_guides'])
    );
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_ai_tutor_native_guides',
          text: expect.stringContaining('Pelny opis ekranu lekcji z Mongo.'),
        }),
        expect.objectContaining({
          collectionId: 'kangur_ai_tutor_content',
          text: expect.stringContaining('Kliknij Zaloguj sie w gornej nawigacji.'),
        }),
      ])
    );
  });

  it('hydrates context-registry graph hits from live runtime documents when available', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'page:kangur-lessons',
            kind: 'page',
            title: 'Lessons page',
            summary: 'Fallback lessons summary',
            route: '/lessons',
            anchorId: null,
            sourceCollection: 'kangur_context_registry',
            sourceRecordId: 'page:kangur-lessons',
            sourcePath: 'page:kangur-lessons',
            tags: ['lessons'],
            tokenHits: 3,
            relations: [
              {
                kind: 'RELATED_TO',
                targetId: 'root:kangur:lessonContext',
                targetTitle: 'Lessons help',
                targetKind: 'context_root',
                targetAnchorId: null,
                targetRoute: null,
              },
            ],
          },
        ],
      },
    ]);

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Gdzie znajde lekcje?',
      context: { focusKind: 'navigation' } as never,
      locale: 'pl',
      runtimeDocuments: [
        {
          id: 'runtime:kangur:lesson:learner-1:lesson-1',
          kind: 'runtime_document',
          entityType: 'kangur_lesson_context',
          title: 'Dodawanie do 20',
          summary: 'Lesson runtime summary from Mongo-backed context.',
          status: 'active',
          tags: ['kangur', 'lesson', 'ai-tutor'],
          relatedNodeIds: ['page:kangur-lessons', 'root:kangur:lessonContext'],
          facts: {
            description: 'Biezaca lekcja o dodawaniu.',
            masterySummary: 'Uczen opanowal 74% materialu.',
          },
          sections: [
            {
              id: 'lesson_overview',
              kind: 'text',
              title: 'Lesson overview',
              text: 'To jest aktywna lekcja w Kangurze.',
            },
          ],
          provenance: {
            providerId: 'kangur',
            source: 'kangur-runtime-context',
          },
        },
      ],
    });

    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected graph context hit.');
    }
    expect(result.queryMode).toBe('website_help');
    expect(result.websiteHelpTarget).toEqual({
      nodeId: 'page:kangur-lessons',
      label: 'Dodawanie do 20',
      route: '/lessons',
      anchorId: null,
    });
    expect(result.sourceCollections).toEqual(['kangur-runtime-context']);
    expect(result.hydrationSources).toEqual(['kangur-runtime-context']);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          text: expect.stringContaining('Lesson runtime summary from Mongo-backed context.'),
          metadata: expect.objectContaining({
            title: 'Dodawanie do 20',
          }),
        }),
      ])
    );
  });

  it('exposes node-level hydration debug data in preview mode', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'guide:kangur:sign-in-nav',
            kind: 'guide',
            title: 'Fallback sign in',
            summary: 'Fallback summary',
            route: '/',
            anchorId: 'kangur-primary-nav-login',
            sourceCollection: 'kangur_ai_tutor_content',
            sourceRecordId: 'pl',
            sourcePath: 'guidedCallout.auth.signInNav',
            tags: ['auth', 'login'],
            tokenHits: 2,
            relations: [],
          },
        ],
      },
    ]);

    const { previewKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await previewKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Jak sie zalogowac do Kangura?',
      context: undefined,
      locale: 'pl',
    });

    expect(result.status).toBe('hit');
    if (result.status !== 'hit') {
      throw new Error('Expected graph context preview hit.');
    }
    expect(result.queryMode).toBe('website_help');
    expect(result.websiteHelpTarget).toEqual({
      nodeId: 'guide:kangur:sign-in-nav',
      label: 'Zaloguj sie w menu',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
    expect(result.sourceCollections).toEqual(['kangur_ai_tutor_content']);
    expect(result.hydrationSources).toEqual(['kangur_ai_tutor_content']);
    expect(result.tokens).toEqual(expect.arrayContaining(['jak', 'sie', 'zalogowac', 'kangura'].filter((token) => token.length >= 3)));
    expect(result.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'guide:kangur:sign-in-nav',
          sourceCollection: 'kangur_ai_tutor_content',
          sourcePath: 'guidedCallout.auth.signInNav',
          canonicalSourceCollection: 'kangur_ai_tutor_content',
          hydrationSource: 'kangur_ai_tutor_content',
        }),
      ])
    );
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
          title: 'Ranking wynikow',
          shortDescription: 'Tutaj widac porownanie ostatnich wynikow i pozycje ucznia.',
          fullDescription: 'Sekcja rankingu pokazuje wyniki i pomaga ocenic, czy liczy sie bardziej dokladnosc czy tempo.',
          hints: ['Porownuj wynik z wlasnym ostatnim podejsciem, nie tylko z innymi osobami.'],
          followUpActions: [{ id: 'open-game', label: 'Wroc do gry', page: 'Game' }],
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-result-leaderboard'],
          contentIdPrefixes: ['game:practice:'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['ranking', 'tablica wynikow', 'leaderboard'],
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
      latestUserMessage: 'Wyjasnij ten panel',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-result-leaderboard',
        focusLabel: 'Ranking wynikow',
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
      label: 'Ranking wynikow',
      route: '/game',
      anchorId: 'kangur-game-result-leaderboard',
    });
    expect(result.instructions).toContain('Kangur semantic graph context:');
    expect(result.instructions).toContain('Ranking wynikow');
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
          title: 'Postep gry',
          shortDescription: 'Pokazuje aktualny postep ucznia.',
          fullDescription: 'Ta sekcja pokazuje postep i ostatnie wyniki.',
          hints: [],
          followUpActions: [],
          surface: 'game',
          focusKind: 'progress',
          focusIdPrefixes: ['kangur-game-home-progress'],
          contentIdPrefixes: ['game:home'],
          relatedGames: [],
          relatedTests: [],
          triggerPhrases: ['postep'],
          enabled: true,
          sortOrder: 10,
        },
        {
          id: 'game-leaderboard',
          title: 'Ranking wynikow',
          shortDescription: 'Pokazuje porownanie wynikow.',
          fullDescription: 'Ta sekcja pokazuje ranking i pozycje ucznia wzgledem innych wynikow.',
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
      latestUserMessage: 'Wyjasnij ten panel',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-result-leaderboard',
        focusLabel: 'Ranking wynikow',
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
});
