import type { Note, Tag, Category, NoteTag, NoteCategory, NoteRelation } from "@prisma/client";

export type TagRecord = Tag;
export type CategoryRecord = Category;

// Simple note type for related notes (without nested relations to avoid circular references)
export type RelatedNote = {
  id: string;
  title: string;
  color: string | null;
};

export type NoteRelationWithTarget = NoteRelation & {
  targetNote: RelatedNote;
};

export type NoteRelationWithSource = NoteRelation & {
  sourceNote: RelatedNote;
};

export type NoteWithRelations = Note & {
  tags: (NoteTag & { tag: Tag })[];
  categories: (NoteCategory & { category: Category })[];
  relationsFrom?: NoteRelationWithTarget[];
  relationsTo?: NoteRelationWithSource[];
};

export type CategoryWithChildren = Category & {
  children: CategoryWithChildren[];
  notes: Note[];
};

export type NoteCreateInput = {
  title: string;
  content: string;
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  relatedNoteIds?: string[];
};

export type NoteUpdateInput = Partial<NoteCreateInput>;

export type CategoryCreateInput = {
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export type TagCreateInput = {
  name: string;
  color?: string | null;
};

export type TagUpdateInput = Partial<TagCreateInput>;

export type NoteFilters = {
  search?: string;
  searchScope?: "both" | "title" | "content";
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
};