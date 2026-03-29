import { describe, expect, it } from 'vitest';

import {
  contextRegistryResolveRefsMock,
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
  logKangurServerEventMock,
  postKangurAiTutorChatHandler,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
  resolveKangurWebsiteHelpGraphContextMock,
  runBrainChatCompletionMock,
} from './handler.test-support';

describe('kangur ai tutor chat handler page-content general overlays', () => {
  registerKangurAiTutorChatHandlerTestHooks();

  it('answers section explain requests directly from page-content knowledge when Zapytaj o to resolves a page-content reference', async () => {
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'game-home-actions',
        pageKey: 'Game',
        screenKey: 'home',
        surface: 'game',
        route: '/game',
        componentId: 'home-actions',
        widget: 'KangurGameHomeActionsWidget',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Szybkie akcje',
        summary: 'Tutaj wybierasz, do której aktywności chcesz przejść dalej.',
        body: 'Sekcja prowadzi bezposrednio do lekcji, szybkiej gry, treningu mieszanego i Kangura Matematycznego.',
        anchorIdPrefix: 'kangur-game-home-actions',
        focusKind: 'home_actions',
        contentIdPrefixes: ['game:home'],
        nativeGuideIds: ['shared-home-actions'],
        triggerPhrases: ['szybkie akcje'],
        tags: ['page-content', 'game'],
        notes: 'Sekcja startowa gry.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [
        {
          id: 'shared-home-actions',
          surface: 'game',
          focusKind: 'home_actions',
          focusIdPrefixes: ['kangur-game-home-actions'],
          contentIdPrefixes: ['game:home'],
          title: 'Szybkie akcje',
          shortDescription: 'Pomagaja wejść od razu do wlasciwego trybu pracy.',
          fullDescription: 'Ta karta zbiera najkrótsze przejścia do głównych aktywności Kangura.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [
            { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
          ],
          triggerPhrases: ['szybkie akcje'],
          enabled: true,
          sortOrder: 10,
        },
      ],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-home-actions',
          collectionId: 'kangur_page_content',
          text: 'Szybkie akcje\nTutaj wybierasz, do której aktywności chcesz przejść dalej.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-home-actions',
            title: 'Szybkie akcje',
            description: 'Tutaj wybierasz, do której aktywności chcesz przejść dalej.',
            tags: ['kangur', 'page-content', 'game'],
          },
        },
      ],
      followUpActions: [
        { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Powiedz mi o tej sekcji.' }],
          context: {
            surface: 'game',
            contentId: 'game:home',
            promptMode: 'explain',
            focusKind: 'home_actions',
            focusId: 'kangur-game-home-actions',
            focusLabel: 'Szybkie akcje',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'game-home-actions',
              sourcePath: 'entry:game-home-actions',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorSectionKnowledgeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Powiedz mi o tej sekcji.',
        context: expect.objectContaining({
          knowledgeReference: {
            sourceCollection: 'kangur_page_content',
            sourceRecordId: 'game-home-actions',
            sourcePath: 'entry:game-home-actions',
          },
        }),
      }),
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();
    expect(resolveKangurWebsiteHelpGraphContextMock).not.toHaveBeenCalled();
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Szybkie akcje.');
    expect(body.message).toContain('Tutaj wybierasz, do której aktywności chcesz przejść dalej.');
    expect(body.message).toContain(
      'Sekcja prowadzi bezposrednio do lekcji, szybkiej gry, treningu mieszanego i Kangura Matematycznego.',
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'game-home-actions',
        }),
      ]),
    );
    expect(body.followUpActions).toEqual([
      { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
    ]);
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.knowledgeGraph).toEqual({
      applied: false,
      queryMode: null,
      queryStatus: 'skipped',
      recallStrategy: null,
      lexicalHitCount: 0,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: false,
      websiteHelpTargetNodeId: null,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        context: expect.objectContaining({
          pageContentEntryId: 'game-home-actions',
          linkedNativeGuideIds: ['shared-home-actions'],
          knowledgeGraphApplied: false,
        }),
      }),
    );
  });

  it('answers selected-text explain requests directly from a matched page-content fragment', async () => {
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      fragment: {
        id: 'leaderboard-points',
        text: 'Liczba punktów',
        aliases: ['punkty'],
        explanation:
          'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
        nativeGuideIds: ['shared-leaderboard-points'],
        triggerPhrases: ['punkty'],
        enabled: true,
        sortOrder: 10,
      },
      section: {
        id: 'game-home-leaderboard',
        pageKey: 'Game',
        screenKey: 'home',
        surface: 'game',
        route: '/game',
        componentId: 'leaderboard',
        widget: 'Leaderboard',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Ranking',
        summary: 'Porównaj wynik z innymi graczami.',
        body: 'Sekcja pokazuje najlepsze wyniki na tej planszy.',
        anchorIdPrefix: 'kangur-game-leaderboard',
        focusKind: 'leaderboard',
        contentIdPrefixes: ['game:home'],
        nativeGuideIds: ['shared-leaderboard'],
        triggerPhrases: ['ranking'],
        tags: ['page-content', 'game'],
        fragments: [],
        notes: 'Ranking głównej planszy.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [
        {
          id: 'shared-leaderboard-points',
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-leaderboard'],
          contentIdPrefixes: ['game:home'],
          title: 'Punkty w rankingu',
          shortDescription: 'Wyjaśnia, jak czytać liczbę punktów na liście wyników.',
          fullDescription: 'Liczba punktów wpływa na pozycję ucznia w rankingu.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [],
          triggerPhrases: ['punkty'],
          enabled: true,
          sortOrder: 20,
        },
      ],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-home-leaderboard#fragment:leaderboard-points',
          collectionId: 'kangur_page_content',
          text: 'Ranking\nLiczba punktów\nTen tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-home-leaderboard#fragment:leaderboard-points',
            title: 'Ranking -> Liczba punktów',
            description:
              'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
            tags: ['kangur', 'page-content', 'page-content-fragment', 'game'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten fragment.' }],
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
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorSectionKnowledgeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Wyjaśnij ten fragment.',
        context: expect.objectContaining({
          promptMode: 'selected_text',
          selectedText: 'Liczba punktów',
        }),
      }),
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Ranking.');
    expect(body.message).toContain('Zaznaczony fragment: "Liczba punktów".');
    expect(body.message).toContain(
      'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
    );
    expect(body.message).not.toContain('Sekcja pokazuje najlepsze wyniki na tej planszy.');
    expect(body.answerResolutionMode).toBe('page_content');
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        context: expect.objectContaining({
          pageContentEntryId: 'game-home-leaderboard',
          pageContentFragmentId: 'leaderboard-points',
        }),
      }),
    );
  });

  it('adds live runtime overlays to direct page-content section answers for dynamic widgets', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 81%. 1 active assignment.',
        assignmentFacts: {
          title: 'Priorytet tygodnia',
          assignmentSummary: 'Powtorz lekcje: Dodawanie przed piątkiem.',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'learner-profile-assignments',
        pageKey: 'LearnerProfile',
        screenKey: 'overview',
        surface: 'profile',
        route: '/profile',
        componentId: 'assignments',
        widget: 'LearnerAssignmentsWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Przebieg przydzielonych zadań',
        summary: 'Sprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
        body: 'Ta sekcja pokazuje aktualne zadania ucznia i pomaga wybrać najbliższy krok.',
        anchorIdPrefix: 'kangur-learner-profile-assignments',
        focusKind: 'assignment',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['learner-profile-assignments'],
        triggerPhrases: ['zadania ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Dynamiczna sekcja zadań ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'learner-profile-assignments',
          collectionId: 'kangur_page_content',
          text: 'Przebieg przydzielonych zadań\nSprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'learner-profile-assignments',
            title: 'Przebieg przydzielonych zadań',
            description: 'Sprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi te zadania.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'assignment',
            focusId: 'kangur-learner-profile-assignments',
            focusLabel: 'Zadania ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'learner-profile-assignments',
              sourcePath: 'entry:learner-profile-assignments',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Przebieg przydzielonych zadań');
    expect(body.message).toContain(
      'Na żywo dla tego ucznia: Average accuracy 81%. 1 active assignment.',
    );
    expect(body.message).toContain(
      'Aktywny priorytet: Powtorz lekcje: Dodawanie przed piątkiem.',
    );
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'learner-profile-assignments',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:assignment:learner-1:assignment-1',
        }),
      ]),
    );
  });

  it('adds live recommendation overlays to direct page-content answers for learner overview sections', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 88%. 0 active assignments.',
        learnerFacts: {
          topRecommendationTitle: 'Powtorz lekcje: Dodawanie',
          topRecommendationDescription:
            'Jedna krótka powtórka domknie kolejny próg mistrzostwa.',
          topRecommendationActionLabel: 'Otwórz lekcję',
          topRecommendationActionPage: 'Lessons',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'profile-hero',
        pageKey: 'LearnerProfile',
        screenKey: 'profile',
        surface: 'profile',
        route: '/profile',
        componentId: 'hero',
        widget: 'KangurLearnerProfileHeroWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Hero profilu ucznia',
        summary: 'To główna sekcja profilu z szybkim obrazem postępu.',
        body: 'Pomaga szybko ocenić rytm nauki ucznia i najważniejsze dalsze kroki.',
        anchorIdPrefix: 'kangur-profile-hero',
        focusKind: 'hero',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['profile-hero'],
        triggerPhrases: ['profil ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Główny hero profilu ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'profile-hero',
          collectionId: 'kangur_page_content',
          text: 'Hero profilu ucznia\nTo główna sekcja profilu z szybkim obrazem postępu.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'profile-hero',
            title: 'Hero profilu ucznia',
            description: 'To główna sekcja profilu z szybkim obrazem postępu.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten hero.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'hero',
            focusId: 'kangur-profile-hero',
            focusLabel: 'Hero profilu ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'profile-hero',
              sourcePath: 'entry:profile-hero',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Hero profilu ucznia');
    expect(body.message).toContain('Najlepszy następny krok: Powtorz lekcje: Dodawanie.');
    expect(body.message).toContain(
      'Najprostsza akcja teraz: Otwórz lekcję w widoku Lessons.',
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'profile-hero',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:learner:learner-1',
        }),
      ]),
    );
    const learnerSnapshotSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:learner:learner-1',
    );
    expect(learnerSnapshotSource?.text).toContain('Powtorz lekcje: Dodawanie');
  });

  it('adds live completion overlays to direct page-content answers for finished review sections', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(createContextRegistryBundle());
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'game-review',
        pageKey: 'Game',
        screenKey: 'result',
        surface: 'game',
        route: '/game',
        componentId: 'result-summary',
        widget: 'KangurGameResultWidget',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Podsumowanie wyniku gry',
        summary: 'Ta sekcja zbiera wynik rundy i najważniejsze nagrody.',
        body: 'Pomaga zrozumieć rezultat i zdecydować, czy wracać do treningu, czy przejść dalej.',
        anchorIdPrefix: 'kangur-game-result-summary',
        focusKind: 'review',
        contentIdPrefixes: ['game:result'],
        nativeGuideIds: ['game-review'],
        triggerPhrases: ['wynik rundy'],
        tags: ['page-content', 'game'],
        notes: 'Podsumowanie po zakonczeniu gry.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-review',
          collectionId: 'kangur_page_content',
          text: 'Podsumowanie wyniku gry\nTa sekcja zbiera wynik rundy i najważniejsze nagrody.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-review',
            title: 'Podsumowanie wyniku gry',
            description: 'Ta sekcja zbiera wynik rundy i najważniejsze nagrody.',
            tags: ['kangur', 'page-content', 'game'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten wynik.' }],
          context: {
            surface: 'game',
            contentId: 'game:result',
            title: 'Podsumowanie wyniku',
            description: 'Final tej rundy z wynikiem i nagrodami.',
            assignmentSummary: 'Misja dnia - 2/3 wykonane.',
            questionProgressLabel: 'Wynik 7/10',
            answerRevealed: true,
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-game-result-summary',
            focusLabel: 'Podsumowanie wyniku gry',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'game-review',
              sourcePath: 'entry:game-review',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Podsumowanie wyniku gry');
    expect(body.message).toContain('Aktualny stan tej sekcji: Wynik 7/10.');
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'game-review',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:game:game:result:summary:revealed',
        }),
      ]),
    );
    const gameSummarySource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:game:game:result:summary:revealed',
    );
    expect(gameSummarySource?.text).toContain('Wynik 7/10');
  });
});
