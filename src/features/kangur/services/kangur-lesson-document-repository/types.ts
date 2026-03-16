import type {
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurLessonDocumentRepository = {
  listLessonDocuments: () => Promise<KangurLessonDocumentStore>;
  replaceLessonDocuments: (store: KangurLessonDocumentStore) => Promise<KangurLessonDocumentStore>;
  saveLessonDocument: (lessonId: string, document: KangurLessonDocument) => Promise<void>;
  removeLessonDocument: (lessonId: string) => Promise<void>;
};
