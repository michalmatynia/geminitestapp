import {
  type KangurLessonDocument,
  type KangurLessonDocumentStore,
} from '@/features/kangur/shared/contracts/kangur';
import { parseJsonSetting } from '@/features/kangur/shared/utils';
import { normalizeKangurLessonDocument } from '../normalization';
import { isRecord } from '../utils';

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
