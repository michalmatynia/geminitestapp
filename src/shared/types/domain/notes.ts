import { Entity } from '../core/base-types';

import type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  NoteThemeDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto,
  CreateNoteCategoryDto,
  UpdateNoteCategoryDto,
  CreateNoteTagDto,
  UpdateNoteTagDto,
  CreateNoteThemeDto,
  UpdateNoteThemeDto,
  NoteEditorType
} from '../dtos';

export type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  NoteThemeDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto,
  CreateNoteCategoryDto,
  UpdateNoteCategoryDto,
  CreateNoteTagDto,
  UpdateNoteTagDto,
  CreateNoteThemeDto,
  UpdateNoteThemeDto,
  NoteEditorType
};

export type NotebookRecord = NotebookDto;

export type ThemeRecord = NoteThemeDto;

export type NoteRecord = NoteDto;

export type TagRecord = NoteTagDto;

export type CategoryRecord = NoteCategoryDto;

export type NoteTagRecord = {
  noteId: string;
  tagId: string;
  assignedAt: string;
};

export type NoteCategoryRecord = {
  noteId: string;
  categoryId: string;
  assignedAt: string;
};

export type NoteRelationRecord = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: string;
};

// Simple note type for related notes (without nested relations to avoid circular references)
export type RelatedNote = {
  id: string;
  title: string;
  color: string | null;
  content?: string | undefined;
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

export type NoteCreateInput = CreateNoteDto;
export type NoteUpdateInput = UpdateNoteDto;
export type NotebookCreateInput = CreateNotebookDto;
export type NotebookUpdateInput = UpdateNotebookDto;
export type ThemeCreateInput = CreateNoteThemeDto;
export type ThemeUpdateInput = UpdateNoteThemeDto;
export type CategoryCreateInput = CreateNoteCategoryDto;
export type CategoryUpdateInput = UpdateNoteCategoryDto;
export type TagCreateInput = CreateNoteTagDto;
export type TagUpdateInput = UpdateNoteTagDto;

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
  createdAt: string;
  updatedAt: string;
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