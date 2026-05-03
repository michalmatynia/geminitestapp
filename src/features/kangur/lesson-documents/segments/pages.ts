import {
  type KangurLessonDocument,
  type KangurLessonPage,
} from '@/features/kangur/shared/contracts/kangur';
import { flattenKangurLessonDocumentPages } from '../creators';

export const resolveKangurLessonDocumentPages = (
  document: Pick<KangurLessonDocument, 'pages' | 'blocks'> | null | undefined
): KangurLessonPage[] => {
  if (document?.pages && document.pages.length > 0) {
    return document.pages;
  }

  if (document?.blocks && document.blocks.length > 0) {
    return [
      {
        id: 'lesson-page-legacy',
        sectionKey: '',
        sectionTitle: '',
        sectionDescription: '',
        title: '',
        description: '',
        blocks: document.blocks,
      },
    ];
  }

  return [
    {
      id: 'lesson-page-legacy',
      sectionKey: '',
      sectionTitle: '',
      sectionDescription: '',
      title: '',
      description: '',
      blocks: [],
    },
  ];
};

export const updateKangurLessonDocumentPages = (
  document: KangurLessonDocument,
  pages: KangurLessonPage[]
): KangurLessonDocument => {
  const normalizedPages =
    pages.length > 0
      ? pages
      : [
        {
          id: 'lesson-page-legacy',
          sectionKey: '',
          sectionTitle: '',
          sectionDescription: '',
          title: '',
          description: '',
          blocks: [],
        },
      ];

  return {
    ...document,
    pages: normalizedPages,
    blocks: flattenKangurLessonDocumentPages(normalizedPages),
  };
};
