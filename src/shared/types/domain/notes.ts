import { Entity } from '../base-types';

import type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto
} from '../dtos';

export type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto
};

export type NotebookRecord = Entity & {
  name: string;
  color: string | null;
  defaultThemeId?: string | null;
};

export type ThemeRecord = Entity & {
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
};

export type NoteRecord = Entity & {
  title: string;
  content: string;
  editorType: string;
  color: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  notebookId: string | null;
};

export type TagRecord = Entity & {
  name: string;
  color: string | null;
  notebookId: string | null;
};

export type CategoryRecord = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  notebookId?: string | null;
  themeId?: string | null;
  sortIndex?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type NoteTagRecord = {
  noteId: string;
  tagId: string;
  assignedAt: Date;
};

export type NoteCategoryRecord = {
  noteId: string;
  categoryId: string;
  assignedAt: Date;
};

export type NoteRelationRecord = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: Date;
};

// Simple note type for related notes (without nested relations to avoid circular references)
export type RelatedNote = {
  id: string;
  title: string;
  color: string | null;
};

export type NoteRelationWithTarget = NoteRelationRecord & {
  targetNote: RelatedNote;
};

export type NoteRelationWithSource = NoteRelationRecord & {
  sourceNote: RelatedNote;
};

export type NoteWithRelations = NoteRecord & {
  tags: (NoteTagRecord & { tag: TagRecord })[];
  categories: (NoteCategoryRecord & { category: CategoryRecord })[];
  relationsFrom?: NoteRelationWithTarget[];
  relationsTo?: NoteRelationWithSource[];
  relations?: RelatedNote[];
  files?: NoteFileRecord[];
};

export type CategoryWithChildren = CategoryRecord & {
  children: CategoryWithChildren[];
  notes: NoteRecord[];
  _count?: {
    notes: number;
  };
};

export type NoteEditorType = 'markdown' | 'wysiwyg' | 'code';

export type NoteCreateInput = {
  title: string;
  content: string;
  editorType?: NoteEditorType | undefined;
  color?: string | null | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  relatedNoteIds?: string[] | undefined;
  notebookId?: string | null | undefined;
};

export type NoteUpdateInput = Partial<NoteCreateInput>;

export type NotebookCreateInput = {
  name: string;
  color?: string | null | undefined;
  defaultThemeId?: string | null | undefined;
};

export type NotebookUpdateInput = {
  name?: string | undefined;
  color?: string | null | undefined;
  defaultThemeId?: string | null | undefined;
};

export type ThemeCreateInput = {
  name: string;
  notebookId?: string | null | undefined;
  textColor?: string | undefined;
  backgroundColor?: string | undefined;
  markdownHeadingColor?: string | undefined;
  markdownLinkColor?: string | undefined;
  markdownCodeBackground?: string | undefined;
  markdownCodeText?: string | undefined;
  relatedNoteBorderWidth?: number | undefined;
  relatedNoteBorderColor?: string | undefined;
  relatedNoteBackgroundColor?: string | undefined;
  relatedNoteTextColor?: string | undefined;
};

export type ThemeUpdateInput = Partial<ThemeCreateInput>;

export type CategoryCreateInput = {
  name: string;
  description?: string | null | undefined;
  color?: string | null | undefined;
  parentId?: string | null | undefined;
  notebookId?: string | null | undefined;
  themeId?: string | null | undefined;
  sortIndex?: number | null | undefined;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export type TagCreateInput = {
  name: string;
  color?: string | null | undefined;
  notebookId?: string | null | undefined;
};

export type TagUpdateInput = Partial<TagCreateInput>;

export type NoteFilters = {
  search?: string;
  searchScope?: 'both' | 'title' | 'content';
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  notebookId?: string | null;
  truncateContent?: boolean;
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
  width?: number | null | undefined;
  height?: number | null | undefined;
};