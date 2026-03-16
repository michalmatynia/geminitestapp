'use client';

import {
  Grid2x2,
  Image,
  Plus,
  Sparkles,
  Type,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  createKangurLessonActivityBlock,
  createKangurLessonCalloutBlock,
  createKangurLessonGridBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonImageBlock,
  createKangurLessonQuizBlock,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
} from '@/features/kangur/lesson-documents';
import type { KangurLessonPage, KangurLessonRootBlock } from '@/features/kangur/shared/contracts/kangur';

export function useQuickInsertActions(
  activePage: KangurLessonPage | null,
  updateDocument: (nextBlocks: KangurLessonRootBlock[]) => void
) {
  return useMemo(
    () => [
      {
        id: 'text',
        group: 'Writing & explanation',
        label: 'Add text block',
        description: 'Paragraphs, explanations, and learner instructions.',
        keywords: ['text', 'writing', 'paragraph', 'copy', 'intro'],
        Icon: Type,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonTextBlock()]),
      },
      {
        id: 'callout',
        group: 'Writing & explanation',
        label: 'Add callout',
        description: 'Tips, hints, warnings, and highlighted teaching moments.',
        keywords: ['callout', 'tip', 'hint', 'warning'],
        Icon: Sparkles,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonCalloutBlock()]),
      },
      {
        id: 'svg',
        group: 'Visuals & layouts',
        label: 'Add SVG block',
        description: 'Inline vector illustration with optional narration.',
        keywords: ['svg', 'vector', 'illustration', 'diagram'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonSvgBlock()]),
      },
      {
        id: 'image',
        group: 'Visuals & layouts',
        label: 'Add SVG image block',
        description: 'Referenced SVG asset with title, caption, and alt text.',
        keywords: ['image', 'svg image', 'asset', 'media'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonImageBlock()]),
      },
      {
        id: 'grid',
        group: 'Visuals & layouts',
        label: 'Add grid block',
        description: 'Flexible layout container with starter items.',
        keywords: ['grid', 'layout', 'columns'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonGridBlock()]),
      },
      {
        id: 'hero-left',
        group: 'Visuals & layouts',
        label: 'Add hero layout',
        description: 'Headline + supporting visual in a ready-made layout.',
        keywords: ['hero', 'layout', 'featured'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('hero-left'),
          ]),
      },
      {
        id: 'image-gallery',
        group: 'Visuals & layouts',
        label: 'Add SVG image gallery',
        description: 'Referenced SVG images in a neat gallery layout.',
        keywords: ['gallery', 'images', 'svg image'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('image-gallery'),
          ]),
      },
      {
        id: 'image-mosaic',
        group: 'Visuals & layouts',
        label: 'Add SVG image mosaic',
        description: 'Dense image-led layout for richer explanation pages.',
        keywords: ['mosaic', 'images', 'svg image'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('image-mosaic'),
          ]),
      },
      {
        id: 'svg-gallery',
        group: 'Visuals & layouts',
        label: 'Add SVG gallery',
        description: 'Multiple inline SVG examples on one page.',
        keywords: ['gallery', 'svg', 'examples'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('svg-gallery'),
          ]),
      },
      {
        id: 'svg-mosaic',
        group: 'Visuals & layouts',
        label: 'Add SVG mosaic',
        description: 'Dense SVG showcase with featured tiles.',
        keywords: ['mosaic', 'svg', 'featured'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('svg-mosaic'),
          ]),
      },
      {
        id: 'activity',
        group: 'Practice & assessment',
        label: 'Add activity block',
        description: 'Interactive learner task such as clock or arithmetic practice.',
        keywords: ['activity', 'interactive', 'game', 'practice'],
        Icon: Plus,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
      },
      {
        id: 'quiz',
        group: 'Practice & assessment',
        label: 'Add quiz',
        description: 'Quick comprehension check with choices and explanation.',
        keywords: ['quiz', 'assessment', 'choices', 'question'],
        Icon: Plus,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
      },
    ],
    [activePage?.blocks, updateDocument]
  );
}
