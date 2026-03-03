import type {
  TagRecord,
  CategoryRecord,
} from '@/shared/contracts/notes';

export interface NoteTagEmbedded {
  tagId: string;
  noteId?: string;
  assignedAt?: string | Date;
  tag: TagRecord;
}

export interface NoteCategoryEmbedded {
  categoryId: string;
  noteId?: string;
  assignedAt?: string | Date;
  category: CategoryRecord;
}

export interface NoteRelationFromEmbedded {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: string;
  assignedAt?: string | Date;
  metadata?: Record<string, unknown>;
  targetNote?: {
    id: string;
    title: string;
    color?: string | null;
  };
}

export interface NoteRelationToEmbedded {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: string;
  assignedAt?: string | Date;
  metadata?: Record<string, unknown>;
  sourceNote?: {
    id: string;
    title: string;
    color?: string | null;
  };
}

export interface NoteDocument {
  _id: string;
  id?: string;
  title: string;
  content: string;
  editorType?: 'markdown' | 'rich-text' | 'plain-text' | 'code' | 'wysiwyg';
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  notebookId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  tags?: NoteTagEmbedded[];
  categories?: NoteCategoryEmbedded[];
  relationsFrom?: NoteRelationFromEmbedded[];
  relationsTo?: NoteRelationToEmbedded[];
  tagIds?: string[];
  categoryIds?: string[];
  relatedNoteIds?: string[];
}

export interface TagDocument {
  _id: string;
  id?: string;
  name: string;
  color?: string | null;
  notebookId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

export interface CategoryDocument {
  _id: string;
  id?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  notebookId?: string | null;
  themeId?: string | null;
  sortIndex?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

export interface NotebookDocument {
  _id: string;
  id?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  defaultThemeId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

export interface NoteFileDocument {
  _id: string;
  id?: string;
  noteId: string;
  filepath: string;
  filename: string;
  size: number;
  mimetype: string;
  slotIndex: number;
  width?: number | null;
  height?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

export interface ThemeDocument {
  _id: string;
  id?: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
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
  themeData?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}
