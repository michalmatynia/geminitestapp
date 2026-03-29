import { describe, expect, it } from 'vitest';

import {
  contextRegistryResolveRefsMock,
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
  postKangurAiTutorChatHandler,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
  runBrainChatCompletionMock,
} from './handler.test-support';

describe('kangur ai tutor chat handler profile and lesson page-content overlays', () => {
  registerKangurAiTutorChatHandlerTestHooks();

  it('adds recent-session and operation overlays to profile performance section answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 84%. 2 active days this week.',
        learnerSections: [
          {
            id: 'recent_sessions',
            kind: 'items',
            title: 'Recent practice',
            items: [
              {
                id: 'session-1',
                operationLabel: 'Zegar',
                accuracyPercent: 83,
                score: 5,
                totalQuestions: 6,
                xpEarned: 28,
              },
            ],
          },
          {
            id: 'operation_performance',
            kind: 'items',
            title: 'Performance by operation',
            items: [
              {
                operation: 'addition',
                label: 'Dodawanie',
                averageAccuracy: 91,
                attempts: 3,
              },
              {
                operation: 'clock',
                label: 'Zegar',
                averageAccuracy: 68,
                attempts: 2,
              },
            ],
          },
        ],
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'profile-performance',
        pageKey: 'LearnerProfile',
        screenKey: 'profile',
        surface: 'profile',
        route: '/profile',
        componentId: 'performance',
        widget: 'KangurLearnerProfilePerformanceWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Skuteczność ucznia',
        summary: 'Ta sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
        body: 'Pomaga sprawdzić rytm gry oraz to, które operacje idą najlepiej, a które wymagają powtórki.',
        anchorIdPrefix: 'kangur-profile-performance',
        focusKind: 'summary',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['profile-performance'],
        triggerPhrases: ['skuteczność ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Sekcja skuteczności ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'profile-performance',
          collectionId: 'kangur_page_content',
          text: 'Skuteczność ucznia\nTa sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'profile-performance',
            title: 'Skuteczność ucznia',
            description: 'Ta sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi te statystyki.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-profile-performance',
            focusLabel: 'Skuteczność ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'profile-performance',
              sourcePath: 'entry:profile-performance',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Ostatnia sesja: Zegar (83% skutecznosci, 5/6, +28 XP).');
    expect(body.message).toContain(
      'Najmocniejsza operacja teraz: Dodawanie ze srednia skutecznoscia 91%.',
    );
    expect(body.message).toContain(
      'Najwiecej pracy wymaga: Zegar ze srednia skutecznoscia 68% po 2 probach.',
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'profile-performance',
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
    expect(learnerSnapshotSource?.text).toContain('Latest session: Zegar.');
    expect(learnerSnapshotSource?.text).toContain('Strongest operation: Dodawanie at 91%.');
  });

  it('adds recent-session overlays to parent dashboard score answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 82%. 6 sessions in the last week.',
        learnerSections: [
          {
            id: 'recent_sessions',
            kind: 'items',
            title: 'Recent practice',
            items: [
              {
                id: 'session-2',
                operationLabel: 'Dodawanie',
                accuracyPercent: 90,
                score: 9,
                totalQuestions: 10,
                xpEarned: 18,
              },
            ],
          },
        ],
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'parent-dashboard-scores',
        pageKey: 'ParentDashboard',
        screenKey: 'dashboard',
        surface: 'parent_dashboard',
        route: '/parent',
        componentId: 'scores-tab',
        widget: 'KangurParentDashboardScoresWidget',
        sourcePath: 'src/features/kangur/ui/pages/ParentDashboard.tsx',
        title: 'Wyniki ucznia w dashboardzie rodzica',
        summary: 'Ta sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
        body: 'Pomaga rodzicowi zobaczyć ostatnie podejścia i stabilnosc gry dziecka.',
        anchorIdPrefix: 'kangur-parent-dashboard-scores',
        focusKind: 'summary',
        contentIdPrefixes: ['parent-dashboard:learner-1:scores'],
        nativeGuideIds: ['parent-dashboard-scores'],
        triggerPhrases: ['wyniki ucznia'],
        tags: ['page-content', 'parent-dashboard'],
        notes: 'Zakładka wyników w panelu rodzica.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'parent-dashboard-scores',
          collectionId: 'kangur_page_content',
          text: 'Wyniki ucznia w dashboardzie rodzica\nTa sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'parent-dashboard-scores',
            title: 'Wyniki ucznia w dashboardzie rodzica',
            description: 'Ta sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
            tags: ['kangur', 'page-content', 'parent-dashboard'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje ta zakładka wyników?' }],
          context: {
            surface: 'parent_dashboard',
            contentId: 'parent-dashboard:learner-1:scores',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-parent-dashboard-scores',
            focusLabel: 'Wyniki ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'parent-dashboard-scores',
              sourcePath: 'entry:parent-dashboard-scores',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain(
      'Ostatnia sesja: Dodawanie (90% skutecznosci, 9/10, +18 XP).',
    );
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'parent-dashboard-scores',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:learner:learner-1',
        }),
      ]),
    );
  });

  it('adds lesson document overlays to direct page-content lesson document answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          documentSummary:
            'Dodawanie to łączenie dwóch liczb. Policz elementy po kolei i porównaj wynik z ilustracją.',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-document',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-document',
        widget: 'KangurLessonDocumentRenderer',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Materiał lekcji',
        summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
        body: 'Ta sekcja trzyma główną treść aktywnej lekcji i jej przykłady.',
        anchorIdPrefix: 'kangur-lesson-document',
        focusKind: 'document',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-document'],
        triggerPhrases: ['materiał lekcji'],
        tags: ['page-content', 'lesson'],
        notes: 'Główny dokument lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-document',
          collectionId: 'kangur_page_content',
          text: 'Materiał lekcji\nCzytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-document',
            title: 'Materiał lekcji',
            description:
              'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten materiał.' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'document',
            focusId: 'kangur-lesson-document:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-document',
              sourcePath: 'entry:lesson-document',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Materiał lekcji: Dodawanie.');
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Dodawanie to łączenie dwóch liczb. Policz elementy po kolei i porównaj wynik z ilustracją.',
    );
    expect(body.message).toContain(
      'Aktualny obraz opanowania: Dodawanie mastery 68% after 3 attempts.',
    );
    const lessonSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:lesson:learner-1:lesson-1',
    );
    expect(lessonSource?.text).toContain('Dodawanie to łączenie dwóch liczb.');
  });

  it('answers selected-text lesson document explains from runtime lesson snippet cards when no page-content fragment exists', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Zegar',
          description: 'Nauka odczytywania godzin.',
          masterySummary: 'Zegar mastery 68% after 3 attempts.',
          documentSummary:
            'Co pokazuje krótka wskazówka? Krótka wskazówka pokazuje godzinę na tarczy.',
          documentSnippetCards: [
            {
              id: 'page-1:title',
              text: 'Co pokazuje krótka wskazówka?',
              explanation: 'Krótka wskazówka pokazuje godzinę.',
            },
            {
              id: 'block-1:text',
              text: 'Krótka wskazówka pokazuje godzinę na tarczy.',
              explanation:
                'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
            },
          ],
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lessons-active-document',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-document',
        widget: 'KangurLessonDocumentRenderer',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Materiał lekcji',
        summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
        body: 'Ta sekcja trzyma główną treść aktywnej lekcji i jej przykłady.',
        anchorIdPrefix: 'kangur-lesson-document',
        focusKind: 'document',
        contentIdPrefixes: ['clock'],
        nativeGuideIds: ['lesson-document'],
        triggerPhrases: ['materiał lekcji'],
        tags: ['page-content', 'lesson'],
        fragments: [],
        notes: 'Główny dokument lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lessons-active-document',
          collectionId: 'kangur_page_content',
          text: 'Materiał lekcji\nCzytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lessons-active-document',
            title: 'Materiał lekcji',
            description:
              'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten fragment.' }],
          context: {
            surface: 'lesson',
            contentId: 'clock',
            promptMode: 'selected_text',
            selectedText: 'Co pokazuje krótka wskazówka?',
            focusKind: 'document',
            focusId: 'kangur-lesson-document:clock',
            focusLabel: 'Zegar',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lessons-active-document',
              sourcePath: 'entry:lessons-active-document',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Materiał lekcji: Zegar.');
    expect(body.message).toContain('Zaznaczony fragment: "Co pokazuje krótka wskazówka?".');
    expect(body.message).toContain('Krótka wskazówka pokazuje godzinę.');
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Co pokazuje krótka wskazówka? Krótka wskazówka pokazuje godzinę na tarczy.',
    );
    expect(body.answerResolutionMode).toBe('page_content');
  });

  it('adds active assignment overlays to lesson header answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          assignmentSummary:
            'Powtorz lekcje Dodawanie. Progress: 1 z 2 kroków. Suggested action: Otwórz lekcję on Lessons.',
          documentSummary:
            'Dodawanie to łączenie dwóch liczb. Zacznij od małych grup i sprawdź wynik głośno.',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-header',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-header',
        widget: 'KangurActiveLessonHeader',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Aktywna lekcja',
        summary:
          'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
        body: 'To nagłówek aktywnej lekcji z najważniejszym stanem i szybkim wejściem do treści.',
        anchorIdPrefix: 'kangur-lesson-header',
        focusKind: 'lesson_header',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-header'],
        triggerPhrases: ['aktywna lekcja'],
        tags: ['page-content', 'lesson'],
        notes: 'Nagłówek aktywnej lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-header',
          collectionId: 'kangur_page_content',
          text: 'Aktywna lekcja\nPrzejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-header',
            title: 'Aktywna lekcja',
            description:
              'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje ten nagłówek lekcji?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'lesson_header',
            focusId: 'kangur-lesson-header:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-header',
              sourcePath: 'entry:lesson-header',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Aktywna lekcja: Dodawanie.');
    expect(body.message).toContain(
      'Aktywny priorytet: Powtorz lekcje Dodawanie. Progress: 1 z 2 kroków. Suggested action: Otwórz lekcję on Lessons.',
    );
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Dodawanie to łączenie dwóch liczb. Zacznij od małych grup i sprawdź wynik głośno.',
    );
  });

  it('adds lesson navigation overlays to direct page-content navigation answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          navigationSummary:
            'Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-navigation',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'lesson-navigation',
        widget: 'KangurLessonNavigationWidget',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Nawigacja lekcji',
        summary:
          'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy tematów.',
        body: 'Ta sekcja daje szybkie przejście między sąsiednimi lekcjami.',
        anchorIdPrefix: 'kangur-lesson-navigation',
        focusKind: 'navigation',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-navigation'],
        triggerPhrases: ['nawigacja lekcji'],
        tags: ['page-content', 'lesson'],
        notes: 'Nawigacja aktywnej lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-navigation',
          collectionId: 'kangur_page_content',
          text: `Nawigacja lekcji
Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy tematów.`,
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-navigation',
            title: 'Nawigacja lekcji',
            description:
              'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy tematów.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Do czego służy ta nawigacja lekcji?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'navigation',
            focusId: 'kangur-lesson-navigation:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-navigation',
              sourcePath: 'entry:lesson-navigation',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Nawigacja lekcji: Dodawanie.');
    expect(body.message).toContain(
      'Nawigacja tej lekcji: Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.',
    );
    expect(body.message).toContain(
      'Aktualny obraz opanowania: Dodawanie mastery 68% after 3 attempts.',
    );
    const lessonSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:lesson:learner-1:lesson-1',
    );
    expect(lessonSource?.text).toContain(
      'Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.',
    );
  });
});
