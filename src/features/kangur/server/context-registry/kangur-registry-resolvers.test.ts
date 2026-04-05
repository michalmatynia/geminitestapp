import { describe, expect, it } from 'vitest';

import {
  createKangurLessonCalloutBlock,
  createKangurLessonGridItem,
  createKangurLessonImageBlock,
  createKangurLessonQuizBlock,
  createKangurLessonTextBlock,
} from '@/features/kangur/lesson-documents';
import { type KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';

import {
  augmentKangurTestSurfaceRuntimeDocument,
  buildLoginActivitySummary,
  buildLessonDocumentSnippetCards,
  buildLessonDocumentSnippets,
  extractBlockSnippets,
  extractLessonDocumentSnippetCards,
  findRelevantLessonAssignment,
} from './kangur-registry-resolvers';

describe('kangur-registry-resolvers snippet cards', () => {
  it('extracts a text snippet card with stripped html and tts explanation', () => {
    const block = {
      ...createKangurLessonTextBlock(),
      id: 'text-1',
      html: '<p>Hello <strong>world</strong></p>',
      ttsText: 'Read hello world aloud.',
    };

    expect(extractLessonDocumentSnippetCards(block)).toEqual([
      {
        id: 'text-1:text',
        text: 'Hello world',
        explanation: 'Read hello world aloud.',
      },
    ]);
  });

  it('falls back to callout body text when the title is blank', () => {
    const block = {
      ...createKangurLessonCalloutBlock(),
      id: 'callout-1',
      title: '   ',
      html: '<p>Remember the shortcut.</p>',
      ttsText: '',
    };

    expect(extractLessonDocumentSnippetCards(block)).toEqual([
      {
        id: 'callout-1:callout',
        text: 'Remember the shortcut.',
        explanation: null,
      },
    ]);
  });

  it('recursively extracts nested grid cards and skips blank child snippets', () => {
    const imageBlock = {
      ...createKangurLessonImageBlock(),
      id: 'image-1',
      title: '   ',
      caption: 'Picture caption',
      ttsDescription: 'Alt picture narration',
    };
    const blankTextBlock = {
      ...createKangurLessonTextBlock(),
      id: 'text-blank',
      html: '<p>   </p>',
      ttsText: '',
    };
    const gridBlock: KangurLessonDocument['blocks'][number] = {
      id: 'grid-1',
      type: 'grid',
      columns: 2,
      gap: 16,
      rowHeight: 180,
      denseFill: false,
      stackOnMobile: true,
      items: [createKangurLessonGridItem(imageBlock), createKangurLessonGridItem(blankTextBlock)],
    };

    expect(extractLessonDocumentSnippetCards(gridBlock)).toEqual([
      {
        id: 'image-1:image',
        text: 'Picture caption',
        explanation: 'Alt picture narration',
      },
    ]);
  });

  it('deduplicates page and block snippet cards by normalized text', () => {
    const document: KangurLessonDocument = {
      version: 1,
      narration: {
        voice: 'alloy',
        locale: 'pl-PL',
      },
      updatedAt: '2026-04-03T00:00:00.000Z',
      pages: [
        {
          id: 'page-1',
          sectionKey: 'intro',
          sectionTitle: '',
          sectionDescription: '',
          title: 'Repeated Title',
          description: 'Repeated Title',
          blocks: [
            {
              ...createKangurLessonTextBlock(),
              id: 'text-2',
              html: '<p>Repeated Title</p>',
              ttsText: '',
            },
          ],
        },
      ],
      blocks: [],
    };

    expect(buildLessonDocumentSnippetCards(document)).toEqual([
      {
        id: 'page-1:page-title',
        text: 'Repeated Title',
        explanation: null,
      },
    ]);
  });

  it('extracts trimmed snippets from nested grids and quiz choices', () => {
    const gridBlock: KangurLessonDocument['blocks'][number] = {
      id: 'grid-2',
      type: 'grid',
      columns: 2,
      gap: 16,
      rowHeight: 180,
      denseFill: false,
      stackOnMobile: true,
      items: [
        createKangurLessonGridItem({
          ...createKangurLessonTextBlock(),
          id: 'text-3',
          html: '<p>Grid text</p>',
          ttsText: '',
        }),
        createKangurLessonGridItem({
          ...createKangurLessonQuizBlock(),
          id: 'quiz-1',
          question: ' Question text ',
          choices: [
            { id: 'a', text: 'First choice' },
            { id: 'b', text: ' ' },
          ],
          explanation: ' Quiz explanation ',
        }),
      ],
    };

    expect(extractBlockSnippets(gridBlock)).toEqual([
      'Grid text',
      ' Question text ',
      'First choice',
      ' Quiz explanation ',
    ]);
  });

  it('builds deduplicated page snippets and keeps the first eight entries', () => {
    const document: KangurLessonDocument = {
      version: 1,
      narration: {
        voice: 'alloy',
        locale: 'pl-PL',
      },
      updatedAt: '2026-04-03T00:00:00.000Z',
      pages: [
        {
          id: 'page-2',
          sectionKey: 'intro',
          sectionTitle: 'Section',
          sectionDescription: 'Section details',
          title: 'Page title',
          description: 'Page description',
          blocks: [
            {
              ...createKangurLessonTextBlock(),
              id: 'text-4',
              html: '<p>Page title</p>',
              ttsText: '',
            },
            {
              ...createKangurLessonImageBlock(),
              id: 'image-2',
              title: 'Image title',
              caption: 'Image caption',
              ttsDescription: 'Image narration',
            },
          ],
        },
      ],
      blocks: [],
    };

    expect(buildLessonDocumentSnippets(document)).toEqual([
      'Section',
      'Section details',
      'Page title',
      'Page description',
      'Image title',
      'Image caption',
      'Image narration',
    ]);
  });

  it('upserts test result and review sections while merging revealed facts', () => {
    const document = {
      id: 'doc-1',
      entityType: 'kangur_test',
      title: 'Test doc',
      summary: null,
      facts: {
        revealedExplanation: 'Because 2 + 2 = 4.',
        correctChoiceLabel: 'B',
      },
      sections: [
        {
          id: 'test_result',
          kind: 'text',
          title: 'Old result',
          text: 'Previous result text',
        },
      ],
    };

    expect(
      augmentKangurTestSurfaceRuntimeDocument(document, {
        resultSummary: 'Score: 8/10.',
        reviewSummary: 'You missed one arithmetic question.',
        selectedChoiceFacts: { selectedChoiceSummary: 'Selected choice: A.' },
        testContextType: 'kangur_test',
      })
    ).toEqual(
      expect.objectContaining({
        facts: expect.objectContaining({
          resultSummary: 'Score: 8/10.',
          reviewSummary: 'You missed one arithmetic question.',
          selectedChoiceSummary: 'Selected choice: A.',
        }),
        sections: [
          {
            id: 'test_result',
            kind: 'text',
            title: 'Test result summary',
            text: 'Score: 8/10.',
          },
          {
            id: 'question_review',
            kind: 'text',
            title: 'Question review',
            text:
              'You missed one arithmetic question. Selected choice: A. Because 2 + 2 = 4. Correct choice: B.',
          },
        ],
      })
    );
  });
});

describe('kangur-registry-resolvers assignment and activity helpers', () => {
  it('prefers the assignment explicitly selected in conversation context', () => {
    const lesson = { componentId: 'clock' } as any;
    const assignments = [
      {
        id: 'assignment-completed',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'completed' },
      },
      {
        id: 'assignment-active',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'in_progress' },
      },
    ] as any;

    expect(
      findRelevantLessonAssignment(lesson, assignments, { assignmentId: 'assignment-completed' })
    ).toMatchObject({ id: 'assignment-completed' });
  });

  it('falls back to the active lesson assignment before completed matches', () => {
    const lesson = { componentId: 'clock' } as any;
    const assignments = [
      {
        id: 'assignment-completed',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'completed' },
      },
      {
        id: 'assignment-active',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'assigned' },
      },
    ] as any;

    expect(findRelevantLessonAssignment(lesson, assignments)).toMatchObject({
      id: 'assignment-active',
    });
  });

  it('builds login activity summaries for both recent and missing activity states', () => {
    expect(
      buildLoginActivitySummary({
        learnerDisplayName: 'Ada',
        parentLoginCount7d: 2,
        learnerSignInCount7d: 5,
        lastParentLoginAt: '2026-04-02T12:00:00.000Z',
        lastLearnerSignInAt: '2026-04-03T08:30:00.000Z',
      })
    ).toBe(
      'Ada last signed into Kangur at 2026-04-03T08:30:00.000Z. The parent last logged into Kangur at 2026-04-02T12:00:00.000Z. In the last 7 days there were 5 learner sign-ins and 2 parent Kangur logins.'
    );

    expect(
      buildLoginActivitySummary({
        learnerDisplayName: null,
        parentLoginCount7d: 0,
        learnerSignInCount7d: 0,
        lastParentLoginAt: null,
        lastLearnerSignInAt: null,
      })
    ).toBe(
      'No recent Kangur learner sign-in was recorded for This learner. No recent Kangur parent login was recorded. In the last 7 days there were 0 learner sign-ins and 0 parent Kangur logins.'
    );
  });
});
