import type { TagRecord, CategoryRecord, NotebookRecord, NoteFileRecord, ThemeRecord, NoteWithRelations } from '@/shared/types/notes';

export type NoteTagEmbedded = {
  noteId: string;
  tagId: string;
  assignedAt: Date;
  tag: TagRecord;
};

export type NoteCategoryEmbedded = {
  noteId: string;
  categoryId: string;
  assignedAt: Date;
  category: CategoryRecord;
};

export type RelatedNoteEmbedded = {
  id: string;
  title: string;
  color: string | null;
};

export type NoteRelationFromEmbedded = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: Date;
  targetNote: RelatedNoteEmbedded;
};

export type NoteRelationToEmbedded = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: Date;
  sourceNote: RelatedNoteEmbedded;
};

export type NoteDocument = Omit<NoteWithRelations, 'tags' | 'categories' | 'relationsFrom' | 'relationsTo'> & {
  _id: string;
  tags: NoteTagEmbedded[];
  categories: NoteCategoryEmbedded[];
  relationsFrom?: NoteRelationFromEmbedded[];
  relationsTo?: NoteRelationToEmbedded[];
};

import { MongoDocument } from '@/shared/types/base-types';

export type TagDocument = MongoDocument<TagRecord>;
export type CategoryDocument = MongoDocument<CategoryRecord>;
export type NotebookDocument = MongoDocument<NotebookRecord>;
export type NoteFileDocument = MongoDocument<NoteFileRecord>;
export type ThemeDocument = MongoDocument<ThemeRecord>;
