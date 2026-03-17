import {
  KANGUR_TTS_DEFAULT_LOCALE,
  KANGUR_TTS_DEFAULT_VOICE,
  type KangurLessonActivityBlock,
  type KangurLessonCalloutBlock,
  type KangurLessonCalloutVariant,
  type KangurLessonComponentId,
  type KangurLessonDocument,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonImageBlock,
  type KangurLessonInlineBlock,
  type KangurLessonPage,
  type KangurLessonQuizBlock,
  type KangurLessonRootBlock,
  type KangurLessonSvgBlock,
  type KangurLessonTextBlock,
} from '@/features/kangur/shared/contracts/kangur';

import { applyKangurLessonActivityDefaults } from '../lesson-activities';
import {
  createRandomId,
  DEFAULT_IMAGE_SRC,
  type KangurLessonGridTemplateId,
  type KangurLessonDocumentTemplateId,
} from './utils';

export const createKangurLessonBlockId = (prefix: string): string => createRandomId(prefix);

export const createKangurLessonTextBlock = (): KangurLessonTextBlock => ({
  id: createKangurLessonBlockId('lesson-text'),
  type: 'text',
  html: '<p>Start writing your lesson content here.</p>',
  ttsText: '',
  align: 'left',
});

export const createKangurLessonSvgBlock = (): KangurLessonSvgBlock => ({
  id: createKangurLessonBlockId('lesson-svg'),
  type: 'svg',
  title: 'Vector illustration',
  ttsDescription: '',
  markup:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect x="16" y="16" width="168" height="88" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="6"/><circle cx="64" cy="60" r="18" fill="#60a5fa"/><path d="M98 76 L126 44 L154 76" fill="none" stroke="#1d4ed8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  viewBox: '0 0 200 120',
  align: 'center',
  fit: 'contain',
  maxWidth: 420,
});

export const createKangurLessonImageBlock = (): KangurLessonImageBlock => ({
  id: createKangurLessonBlockId('lesson-image'),
  type: 'image',
  title: 'SVG illustration',
  altText: '',
  caption: '',
  ttsDescription: '',
  src: DEFAULT_IMAGE_SRC,
  align: 'center',
  fit: 'contain',
  maxWidth: 480,
});

export const createKangurLessonActivityBlock = (
  activityId: KangurLessonActivityBlock['activityId'] = 'clock-training'
): KangurLessonActivityBlock => ({
  id: createKangurLessonBlockId('lesson-activity'),
  type: 'activity',
  ...applyKangurLessonActivityDefaults(activityId),
  ttsDescription: '',
});

export const createKangurLessonCalloutBlock = (
  variant: KangurLessonCalloutVariant = 'info'
): KangurLessonCalloutBlock => ({
  id: createKangurLessonBlockId('lesson-callout'),
  type: 'callout',
  variant,
  title: '',
  html: '<p>Add your callout content here.</p>',
  ttsText: '',
});

export const createKangurLessonQuizBlock = (): KangurLessonQuizBlock => {
  const choiceA = createKangurLessonBlockId('quiz-choice');
  const choiceB = createKangurLessonBlockId('quiz-choice');
  return {
    id: createKangurLessonBlockId('lesson-quiz'),
    type: 'quiz',
    question: '<p>Enter your question here.</p>',
    choices: [
      { id: choiceA, text: 'Choice A' },
      { id: choiceB, text: 'Choice B' },
    ],
    correctChoiceId: '',
    explanation: '',
    ttsText: '',
  };
};

export const createKangurLessonGridItem = (
  block: KangurLessonInlineBlock = createKangurLessonTextBlock()
): KangurLessonGridItem => ({
  id: createKangurLessonBlockId('lesson-grid-item'),
  colSpan: 1,
  rowSpan: 1,
  columnStart: null,
  rowStart: null,
  block,
});

export const createKangurLessonPage = (
  title: string = '',
  blocks: KangurLessonRootBlock[] = [createKangurLessonTextBlock()],
  options?: {
    sectionKey?: string;
    sectionTitle?: string;
    sectionDescription?: string;
    description?: string;
  }
): KangurLessonPage => ({
  id: createKangurLessonBlockId('lesson-page'),
  sectionKey: options?.sectionKey?.trim() || '',
  sectionTitle: options?.sectionTitle?.trim() || '',
  sectionDescription: options?.sectionDescription?.trim() || '',
  title,
  description: options?.description?.trim() || '',
  blocks,
});

export const flattenKangurLessonDocumentPages = (
  pages: readonly KangurLessonPage[]
): KangurLessonRootBlock[] => pages.flatMap((page) => page.blocks).slice(0, 256);

export const createLessonDocument = (pages: KangurLessonPage[]): KangurLessonDocument => ({
  version: 1,
  narration: {
    voice: KANGUR_TTS_DEFAULT_VOICE,
    locale: KANGUR_TTS_DEFAULT_LOCALE,
  },
  updatedAt: new Date().toISOString(),
  pages,
  blocks: flattenKangurLessonDocumentPages(pages),
});

export const createKangurLessonGridBlockFromTemplate = (
  templateId: KangurLessonGridTemplateId = 'two-column'
): KangurLessonGridBlock => {
  switch (templateId) {
    case 'three-column':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonTextBlock()),
        ],
      };
    case 'hero-left':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'hero-right':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
        ],
      };
    case 'image-gallery':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 18,
        rowHeight: 240,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
        ],
      };
    case 'image-mosaic':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 18,
        rowHeight: 200,
        denseFill: true,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            colSpan: 2,
            rowSpan: 2,
            columnStart: 1,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 3,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 3,
            rowStart: 2,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 1,
            rowStart: 3,
          },
        ],
      };
    case 'svg-duo':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-trio':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-gallery':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 18,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-mosaic':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 18,
        rowHeight: 180,
        denseFill: true,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            colSpan: 2,
            rowSpan: 2,
            columnStart: 1,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 2,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 1,
            rowStart: 3,
          },
        ],
      };
    case 'two-column':
    default:
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
  }
};

export const createKangurLessonGridBlock = (): KangurLessonGridBlock =>
  createKangurLessonGridBlockFromTemplate('two-column');

export const createDefaultKangurLessonDocument = (): KangurLessonDocument =>
  createLessonDocument([createKangurLessonPage('', [createKangurLessonTextBlock()])]);

export const createKangurLessonDocumentFromTemplate = (
  templateId: KangurLessonDocumentTemplateId = 'article'
): KangurLessonDocument => {
  switch (templateId) {
    case 'text-with-figure':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('hero-right'),
        ]),
      ]);
    case 'image-gallery-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('image-gallery'),
        ]),
      ]);
    case 'svg-gallery-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-gallery'),
        ]),
      ]);
    case 'svg-mosaic-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-mosaic'),
        ]),
      ]);
    case 'article':
    default:
      return createDefaultKangurLessonDocument();
  }
};

const STARTER_TEMPLATE_BY_COMPONENT_ID: Record<
  KangurLessonComponentId,
  KangurLessonDocumentTemplateId
> = {
  clock: 'text-with-figure',
  calendar: 'text-with-figure',
  adding: 'text-with-figure',
  subtracting: 'text-with-figure',
  multiplication: 'text-with-figure',
  division: 'text-with-figure',
  geometry_basics: 'svg-mosaic-page',
  geometry_shapes: 'svg-mosaic-page',
  geometry_symmetry: 'svg-mosaic-page',
  geometry_perimeter: 'svg-mosaic-page',
  logical_thinking: 'article',
  logical_patterns: 'article',
  logical_classification: 'article',
  logical_reasoning: 'article',
  logical_analogies: 'article',
  alphabet_basics: 'article',
  alphabet_copy: 'article',
  alphabet_syllables: 'article',
  alphabet_words: 'article',
  alphabet_matching: 'article',
  alphabet_sequence: 'article',
  english_basics: 'article',
  english_parts_of_speech: 'article',
  english_sentence_structure: 'article',
  english_subject_verb_agreement: 'article',
  english_articles: 'article',
  english_prepositions_time_place: 'article',
  webdev_react_components: 'article',
};

export const resolveStarterKangurLessonDocumentTemplate = (
  componentId: KangurLessonComponentId
): KangurLessonDocumentTemplateId => STARTER_TEMPLATE_BY_COMPONENT_ID[componentId];

export const createStarterKangurLessonDocument = (
  componentId: KangurLessonComponentId
): KangurLessonDocument =>
  createKangurLessonDocumentFromTemplate(resolveStarterKangurLessonDocumentTemplate(componentId));
