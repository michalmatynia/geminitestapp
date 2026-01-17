import type { TagRecord, CategoryRecord, NotebookRecord, NoteFileRecord, ThemeRecord, NoteWithRelations } from "@/types/notes";

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

export type NoteDocument = Omit<NoteWithRelations, "tags" | "categories" | "relationsFrom" | "relationsTo"> & {
  _id: string;
  tags: NoteTagEmbedded[];
  categories: NoteCategoryEmbedded[];
  relationsFrom?: NoteRelationFromEmbedded[];
  relationsTo?: NoteRelationToEmbedded[];
};

export type TagDocument = TagRecord & { _id: string };
export type CategoryDocument = CategoryRecord & { _id: string };
export type NotebookDocument = NotebookRecord & { _id: string };
export type NoteFileDocument = NoteFileRecord & { _id: string };
export type ThemeDocument = ThemeRecord & { _id: string };
