import type { KangurLessonDocument, KangurLessonDocumentStore } from '@kangur/contracts/kangur';

export type KangurLessonDocumentRepository = {
  getLessonDocument: (
    lessonId: string,
    locale?: string
  ) => Promise<KangurLessonDocument | null>;
  listLessonDocuments: (locale?: string) => Promise<KangurLessonDocumentStore>;
  replaceLessonDocuments: (
    store: KangurLessonDocumentStore,
    locale?: string
  ) => Promise<KangurLessonDocumentStore>;
  saveLessonDocument: (
    lessonId: string,
    document: KangurLessonDocument,
    locale?: string
  ) => Promise<void>;
  removeLessonDocument: (lessonId: string, locale?: string) => Promise<void>;
};
