import type {
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@kangur/contracts';

export type KangurLessonDocumentRepository = {
  getLessonDocument: (lessonId: string) => Promise<KangurLessonDocument | null>;
  listLessonDocuments: () => Promise<KangurLessonDocumentStore>;
  replaceLessonDocuments: (store: KangurLessonDocumentStore) => Promise<KangurLessonDocumentStore>;
  saveLessonDocument: (lessonId: string, document: KangurLessonDocument) => Promise<void>;
  removeLessonDocument: (lessonId: string) => Promise<void>;
};
