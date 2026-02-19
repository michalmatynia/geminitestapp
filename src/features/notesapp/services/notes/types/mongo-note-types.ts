import type { 
  NoteTagDto as TagRecord, 
  NoteCategoryDto as CategoryRecord, 
  NotebookDto as NotebookRecord, 
  NoteFileDto as NoteFileRecord, 
  NoteThemeDto as ThemeRecord, 
  NoteWithRelationsDto as NoteWithRelations,
  NoteTagRelationDto as NoteTagRecord,
  NoteCategoryRelationDto as NoteCategoryRecord,
  NoteRelationDto,
  RelatedNoteDto as RelatedNote,
  NoteDto as NoteRecord
} from '@/shared/contracts/notes';
import { MongoDocument } from '@/shared/types/core/base-types';

type NoteRelationWithTarget = NoteRelationDto & {
  targetNote?: RelatedNote | undefined;
};

type NoteRelationWithSource = NoteRelationDto & {
  sourceNote?: RelatedNote | undefined;
};

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
