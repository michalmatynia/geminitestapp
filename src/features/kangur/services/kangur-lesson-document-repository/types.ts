import type {
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@kangur/contracts';

export type KangurLessonDocumentRepository = {
  listLessonDocuments: () => Promise<KangurLessonDocumentStore>;
  replaceLessonDocuments: (store: KangurLessonDocumentStore) => Promise<KangurLessonDocumentStore>;
  saveLessonDocument: (lessonId: string, document: KangurLessonDocument) => Promise<void>;
  removeLessonDocument: (lessonId: string) => Promise<void>;
};
