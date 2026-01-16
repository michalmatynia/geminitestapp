import type { Note, Tag, Category, NoteTag, NoteCategory, NoteRelation } from "@prisma/client";

export type NotebookRecord = {
  id: string;
  name: string;
  color: string | null;
  defaultThemeId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ThemeRecord = {
  id: string;
  name: string;
  notebookId?: string | null;
  textColor: string;
  backgroundColor: string;
  markdownHeadingColor: string;
  markdownLinkColor: string;
  markdownCodeBackground: string;
  markdownCodeText: string;
  relatedNoteBorderWidth: number;
  relatedNoteBorderColor: string;
  relatedNoteBackgroundColor: string;
  relatedNoteTextColor: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TagRecord = Tag & { notebookId?: string | null };
export type CategoryRecord = Category & { notebookId?: string | null; themeId?: string | null };

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
  relations?: RelatedNote[];
  notebookId?: string | null;
  files?: NoteFileRecord[];
};

export type CategoryWithChildren = Category & {
  children: CategoryWithChildren[];
  notes: Note[];
  themeId?: string | null;
};

export type NoteCreateInput = {
  title: string;
  content: string;
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  relatedNoteIds?: string[];
  notebookId?: string | null;
};

export type NoteUpdateInput = Partial<NoteCreateInput>;

export type NotebookCreateInput = {
  name: string;
  color?: string | null;
  defaultThemeId?: string | null;
};

export type NotebookUpdateInput = {
  name?: string;
  color?: string | null;
  defaultThemeId?: string | null;
};

export type ThemeCreateInput = {
  name: string;
  notebookId?: string | null;
  textColor?: string;
  backgroundColor?: string;
  markdownHeadingColor?: string;
  markdownLinkColor?: string;
  markdownCodeBackground?: string;
  markdownCodeText?: string;
  relatedNoteBorderWidth?: number;
  relatedNoteBorderColor?: string;
  relatedNoteBackgroundColor?: string;
  relatedNoteTextColor?: string;
};

export type ThemeUpdateInput = Partial<ThemeCreateInput>;

export type CategoryCreateInput = {
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  notebookId?: string | null;
  themeId?: string | null;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export type TagCreateInput = {
  name: string;
  color?: string | null;
  notebookId?: string | null;
};

export type TagUpdateInput = Partial<TagCreateInput>;

export type NoteFilters = {
  search?: string;
  searchScope?: "both" | "title" | "content";
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  notebookId?: string | null;
};

export type NoteFileRecord = {
  id: string;
  noteId: string;
  slotIndex: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteFileCreateInput = {
  noteId: string;
  slotIndex: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width?: number | null;
  height?: number | null;
};
