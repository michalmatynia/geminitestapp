import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  type KangurLessonDocument,
  type KangurLessonDocumentStore,
  type KangurLessonPage,
} from '@/features/kangur/shared/contracts/kangur';
import { parseJsonSetting } from '@/features/kangur/shared/utils';

import { flattenKangurLessonDocumentPages } from './creators';
import { normalizeKangurLessonDocument } from './normalization';
import { isRecord, isSvgImageSource } from './utils';

export * from './utils';
export * from './creators';
export * from './converters';
export * from './normalization';

export { KANGUR_LESSON_DOCUMENTS_SETTING_KEY };

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

export const canonicalizeKangurLessonDocument = (
  document: KangurLessonDocument
): KangurLessonDocument => normalizeKangurLessonDocument(document);

export const parseKangurLessonDocument = (
  raw: string | null | undefined
): KangurLessonDocument | null => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  return parsed ? normalizeKangurLessonDocument(parsed) : null;
};

export const normalizeKangurLessonDocumentStore = (value: unknown): KangurLessonDocumentStore => {
  if (!isRecord(value)) return {};

  const normalized: KangurLessonDocumentStore = {};
  for (const [lessonId, rawDocument] of Object.entries(value)) {
    const normalizedLessonId = lessonId.trim();
    if (!normalizedLessonId) continue;
    normalized[normalizedLessonId] = normalizeKangurLessonDocument(rawDocument);
  }

  return normalized;
};

export const canonicalizeKangurLessonDocumentStore = (
  store: KangurLessonDocumentStore
): KangurLessonDocumentStore => normalizeKangurLessonDocumentStore(store);

export const parseKangurLessonDocumentStore = (
  raw: string | null | undefined
): KangurLessonDocumentStore =>
  normalizeKangurLessonDocumentStore(parseJsonSetting<unknown>(raw, {}));

export const hasKangurLessonDocumentContent = (
  document: KangurLessonDocument | null | undefined
): boolean => {
  if (!document) return false;

  return resolveKangurLessonDocumentPages(document).some((page) =>
    page.blocks.some((block) => {
      if (block.type === 'text') {
        return block.html.replace(/<[^>]+>/g, '').trim().length > 0;
      }

      if (block.type === 'svg') {
        return block.markup.trim().length > 0;
      }

      if (block.type === 'image') {
        return (
          isSvgImageSource(block.src) ||
          (block.caption?.trim().length ?? 0) > 0 ||
          block.title.trim().length > 0
        );
      }

      if (block.type === 'activity') {
        return (
          block.title.trim().length > 0 ||
          (block.description?.trim().length ?? 0) > 0 ||
          (block.ttsDescription?.trim().length ?? 0) > 0
        );
      }

      if (block.type === 'grid') {
        return block.items.some((item) => {
          if (item.block.type === 'text') {
            return item.block.html.replace(/<[^>]+>/g, '').trim().length > 0;
          }
          if (item.block.type === 'svg') {
            return item.block.markup.trim().length > 0;
          }
          return (
            isSvgImageSource(item.block.src) ||
            (item.block.caption?.trim().length ?? 0) > 0 ||
            item.block.title.trim().length > 0
          );
        });
      }

      return false;
    })
  );
};

export const updateKangurLessonDocumentTimestamp = (
  document: KangurLessonDocument
): KangurLessonDocument => ({
  ...canonicalizeKangurLessonDocument(document),
  updatedAt: new Date().toISOString(),
});

export const removeKangurLessonDocument = (
  store: KangurLessonDocumentStore,
  lessonId: string
): KangurLessonDocumentStore => {
  if (!(lessonId in store)) {
    return store;
  }

  const nextStore = { ...store };
  delete nextStore[lessonId];
  return nextStore;
};
