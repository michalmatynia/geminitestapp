import type { Note, Tag, Category, NoteTag, NoteCategory } from "@prisma/client";

export type TagRecord = Tag;
export type CategoryRecord = Category;

export type NoteWithRelations = Note & {
  tags: (NoteTag & { tag: Tag })[];
  categories: (NoteCategory & { category: Category })[];
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
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
};