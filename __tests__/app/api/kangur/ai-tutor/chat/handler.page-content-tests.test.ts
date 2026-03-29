import { describe, expect, it } from 'vitest';

import {
  contextRegistryResolveRefsMock,
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
  postKangurAiTutorChatHandler,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
} from './handler.test-support';

describe('kangur ai tutor chat handler page-content test overlays', () => {
  registerKangurAiTutorChatHandlerTestHooks();

  it('adds active test question overlays to direct page-content question answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          questionPointValue: 3,
          questionChoicesSummary: 'Opcje odpowiedzi: A - 3; B - 4.',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '4',
          answerRevealed: false,
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-question',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'question',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Pytanie testowe',
        summary: 'Przeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
        body: 'Ta sekcja pokazuje aktywne pytanie wraz z możliwymi odpowiedziami.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'question',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-question'],
        triggerPhrases: ['pytanie testowe'],
        tags: ['page-content', 'test'],
        notes: 'Aktywne pytanie testowe.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-question',
          collectionId: 'kangur_page_content',
          text: 'Pytanie testowe\nPrzeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-question',
            title: 'Pytanie testowe',
            description:
              'Przeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje to pytanie testowe?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Ile to jest 2 + 2?',
            promptMode: 'explain',
            focusKind: 'question',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: false,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-question',
              sourcePath: 'entry:test-question',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Pytanie testowe: Pytanie 1.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('To pytanie jest warte 3 pkt.');
    expect(body.message).toContain('Opcje odpowiedzi: A - 3; B - 4.');
    expect(body.message).toContain('Aktualnie zaznaczona odpowiedź: B - 4.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:'),
    );
    expect(testSource?.text).toContain('Question value: 3 pts.');
    expect(testSource?.text).toContain('Opcje odpowiedzi: A - 3; B - 4.');
    expect(testSource?.text).toContain('Selected choice: B - 4.');
  });

  it('adds selected-answer overlays to direct page-content selection answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '4',
          answerRevealed: false,
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'tests-selection',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'selected-choice',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx',
        title: 'Twój zaznaczony wybór',
        summary:
          'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
        body: 'Ta sekcja odnosi się do jednej, aktualnie zaznaczonej odpowiedzi w teście.',
        anchorIdPrefix: 'kangur-test-selection:',
        focusKind: 'selection',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-selection'],
        triggerPhrases: ['wybrana odpowiedź'],
        tags: ['page-content', 'test'],
        notes: 'Wybrana odpowiedź testowa.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'tests-selection',
          collectionId: 'kangur_page_content',
          text: 'Twój zaznaczony wybór\nTo jest odpowiedź wybrana przed sprawdzeniem wyniku.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'tests-selection',
            title: 'Twój zaznaczony wybór',
            description:
              'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje mój zaznaczony wybór?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Ile to jest 2 + 2?',
            promptMode: 'explain',
            focusKind: 'selection',
            focusId: 'kangur-test-selection:suite-1:question-1:B',
            focusLabel: 'Odpowiedź B: 4',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            selectedChoiceLabel: 'B',
            selectedChoiceText: '4',
            answerRevealed: false,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'tests-selection',
              sourcePath: 'entry:tests-selection',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Twój zaznaczony wybór: Odpowiedź B: 4.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('Aktualnie zaznaczona odpowiedź: B - 4.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:'),
    );
    expect(testSource?.text).toContain('Selected choice: B - 4.');
  });

  it('adds finished test result overlays to direct page-content summary answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          questionProgressLabel: 'Ukończono 10/10',
          resultSummary: 'Wynik końcowy: 24/30 pkt (80%).',
          answerRevealed: true,
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-summary',
        pageKey: 'Tests',
        screenKey: 'summary',
        surface: 'test',
        route: '/tests',
        componentId: 'summary',
        widget: 'KangurSummaryPanel',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Podsumowanie testu',
        summary: 'Sprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
        body: 'Ta sekcja zamyka cały test i pokazuje wynik po ukończeniu zestawu.',
        anchorIdPrefix: 'kangur-test-summary',
        focusKind: 'summary',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-summary'],
        triggerPhrases: ['podsumowanie testu'],
        tags: ['page-content', 'test'],
        notes: 'Podsumowanie testu.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-summary',
          collectionId: 'kangur_page_content',
          text: 'Podsumowanie testu\nSprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-summary',
            title: 'Podsumowanie testu',
            description: 'Sprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co oznacza to podsumowanie testu?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Wynik końcowy: 24/30 pkt (80%).',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-test-summary:suite-1',
            focusLabel: 'Kangur Mini',
            questionProgressLabel: 'Ukończono 10/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-summary',
              sourcePath: 'entry:test-summary',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Podsumowanie testu: Kangur Mini.');
    expect(body.message).toContain('Wynik końcowy: 24/30 pkt (80%).');
    expect(body.message).toContain('Aktualny stan tej sekcji: Ukończono 10/10.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:'),
    );
    expect(testSource?.text).toContain('Wynik końcowy: 24/30 pkt (80%).');
  });

  it('adds revealed answer overlays to direct page-content review answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          reviewSummary: 'Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.',
          revealedExplanation: '2 + 2 daje 4, bo łączymy dwie pary.',
          answerRevealed: true,
          correctChoiceLabel: 'A',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-review',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'review',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Omówienie odpowiedzi',
        summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
        body: 'Ta sekcja pokazuje wynik Twojej odpowiedzi po odsłonięciu rozwiązania.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'review',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-review'],
        triggerPhrases: ['omówienie odpowiedzi'],
        tags: ['page-content', 'test'],
        notes: 'Review pytania testowego.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-review',
          collectionId: 'kangur_page_content',
          text: 'Omówienie odpowiedzi\nPorównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-review',
            title: 'Omówienie odpowiedzi',
            description: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi to omówienie odpowiedzi.' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.',
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-review',
              sourcePath: 'entry:test-review',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Omówienie odpowiedzi: Pytanie 1.');
    expect(body.message).toContain('Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('Po pokazaniu odpowiedzi: 2 + 2 daje 4, bo łączymy dwie pary.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:'),
    );
    expect(testSource?.text).toContain('Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.');
  });

  it('falls back to canonical correct-answer facts for review answers when no review summary is present', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          revealedExplanation: '2 + 2 daje 4, bo łączymy dwie pary.',
          answerRevealed: true,
          selectedChoiceLabel: 'B',
          selectedChoiceText: '5',
          correctChoiceLabel: 'A',
          correctChoiceText: '4',
        },
      }),
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-review',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'review',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Omówienie odpowiedzi',
        summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
        body: 'Ta sekcja pokazuje wynik Twojej odpowiedzi po odsłonięciu rozwiązania.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'review',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-review'],
        triggerPhrases: ['omówienie odpowiedzi'],
        tags: ['page-content', 'test'],
        notes: 'Review pytania testowego.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-review',
          collectionId: 'kangur_page_content',
          text: 'Omówienie odpowiedzi\nPorównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-review',
            title: 'Omówienie odpowiedzi',
            description: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co oznacza to omówienie odpowiedzi?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-review',
              sourcePath: 'entry:test-review',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Poprawna odpowiedź: A - 4.');
    expect(body.message).toContain('Wybrana odpowiedź: B - 5.');
    expect(body.message).toContain('Po pokazaniu odpowiedzi: 2 + 2 daje 4, bo łączymy dwie pary.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:'),
    );
    expect(testSource?.text).toContain('Selected choice: B - 5.');
    expect(testSource?.text).toContain('Correct choice: A - 4.');
  });
});
