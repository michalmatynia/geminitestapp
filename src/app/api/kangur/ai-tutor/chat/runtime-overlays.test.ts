import { describe, expect, it } from 'vitest';

import { buildSectionExplainMessage } from './runtime-overlays';

const lessonDocumentSection = {
  id: 'lessons-active-document',
  pageKey: 'Lessons',
  screenKey: 'active',
  surface: 'lesson',
  route: '/lessons',
  componentId: 'active-document',
  widget: 'KangurLessonDocumentRenderer',
  sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
  title: 'Materiał lekcji',
  summary: 'Czytaj zapisany dokument krok po kroku.',
  body: 'Główna treść lekcji.',
  anchorIdPrefix: 'kangur-lesson-document',
  focusKind: 'document' as const,
  contentIdPrefixes: [],
  nativeGuideIds: ['lesson-document'],
  triggerPhrases: [],
  tags: ['lesson', 'document'],
  fragments: [],
  notes: 'Dokument aktywnej lekcji.',
  enabled: true,
  sortOrder: 10,
};

const buildLessonSelectionMessage = (input: {
  selectedText: string;
  documentSnippetCards: Array<{ id: string; text: string; explanation: string | null }>;
}): string =>
  buildSectionExplainMessage({
    sectionKnowledgeBundle: {
      fragment: null,
      followUpActions: [],
      instructions: '',
      linkedNativeGuides: [],
      section: lessonDocumentSection,
      sources: [],
    },
    context: {
      surface: 'lesson',
      contentId: 'lesson-adding',
      promptMode: 'selected_text',
      selectedText: input.selectedText,
      interactionIntent: 'explain',
      focusKind: 'document',
      focusId: 'kangur-lesson-document',
    },
    runtimeDocuments: {
      learnerSnapshot: null,
      loginActivity: null,
      assignmentContext: null,
      surfaceContext: {
        id: 'runtime:kangur:lesson:learner-1:lesson-adding',
        kind: 'runtime_document',
        entityType: 'kangur_lesson_context',
        title: 'Dodawanie',
        summary: 'Rozkładamy liczbę na wygodne części.',
        status: 'active',
        tags: ['kangur', 'lesson'],
        relatedNodeIds: [],
        timestamps: undefined,
        facts: {
          documentSnippetCards: input.documentSnippetCards,
        },
        sections: [],
        provenance: {
          providerId: 'kangur',
          source: 'kangur-runtime-context',
        },
      },
    },
  });

describe('buildSectionExplainMessage', () => {
  it('matches short multi-token lesson selections against runtime snippet cards', () => {
    const message = buildLessonSelectionMessage({
      selectedText: '10 + 4',
      documentSnippetCards: [
        {
          id: 'block-1:text',
          text:
            'Najpierw policz dziesiątki, potem jedności. Przykład: 10 + 4 = 14. Gdy zatrzymasz się na chwilę, łatwiej zobaczysz kolejny krok.',
          explanation: null,
        },
      ],
    });

    expect(message).toContain('Zaznaczony fragment: "10 + 4".');
    expect(message).toContain(
      'W aktualnej treści lekcji ten fragment dotyczy: Najpierw policz dziesiątki, potem jedności. Przykład: 10 + 4 = 14.'
    );
  });

  it('matches a single lesson token when the runtime snippet card contains it exactly', () => {
    const message = buildLessonSelectionMessage({
      selectedText: 'godzinę',
      documentSnippetCards: [
        {
          id: 'block-2:text',
          text: 'Krótka wskazówka pokazuje godzinę na tarczy.',
          explanation: 'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
        },
      ],
    });

    expect(message).toContain('Zaznaczony fragment: "godzinę".');
    expect(message).toContain(
      'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.'
    );
  });
});
