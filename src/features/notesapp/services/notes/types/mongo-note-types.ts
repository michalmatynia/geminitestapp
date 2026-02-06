import type { 
  TagRecord, 
  CategoryRecord, 
  NotebookRecord, 
  NoteFileRecord, 
  ThemeRecord, 
  NoteWithRelations,
  NoteTagRecord,
  NoteCategoryRecord,
  NoteRelationWithTarget,
  NoteRelationWithSource,
  NoteRecord
} from '@/shared/types/notes';
import { MongoDocument } from '@/shared/types/base-types';

export type TagDocument = MongoDocument<TagRecord>;
export type CategoryDocument = MongoDocument<CategoryRecord>;
export type NotebookDocument = MongoDocument<NotebookRecord>;
export type NoteFileDocument = MongoDocument<NoteFileRecord>;
export type ThemeDocument = MongoDocument<ThemeRecord>;

export type NoteTagEmbedded = NoteTagRecord & { tag: TagRecord };
export type NoteCategoryEmbedded = NoteCategoryRecord & { category: CategoryRecord };
export type NoteRelationFromEmbedded = NoteRelationWithTarget;
export type NoteRelationToEmbedded = NoteRelationWithSource;

export type NoteDocument = MongoDocument<NoteRecord> & {
  tags?: NoteTagEmbedded[];
  categories?: NoteCategoryEmbedded[];
  relationsFrom?: NoteRelationFromEmbedded[];
  relationsTo?: NoteRelationToEmbedded[];
};

export type { NoteWithRelations };
