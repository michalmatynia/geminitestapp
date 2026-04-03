import { describe, expect, it } from 'vitest';

import {
  createKangurLessonCalloutBlock,
  createKangurLessonGridItem,
  createKangurLessonImageBlock,
  createKangurLessonTextBlock,
} from '@/features/kangur/lesson-documents';
import { type KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';

import {
  buildLessonDocumentSnippetCards,
  extractLessonDocumentSnippetCards,
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
});
