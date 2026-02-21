export interface NoteTagEmbedded {
  tagId: string;
}

export interface NoteCategoryEmbedded {
  categoryId: string;
}

export interface NoteRelationFromEmbedded {
  id: string;
  targetNoteId: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface NoteRelationToEmbedded {
  id: string;
  sourceNoteId: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface NoteDocument {
  _id: string;
  id?: string;
  title: string;
  content: string;
  editorType?: 'markdown' | 'rich-text' | 'plain-text';
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
  notebookId?: string | null;
  textColor?: string;
  backgroundColor?: string;
  markdownHeadingColor?: string;
  markdownLinkColor?: string;
  markdownCodeBackground?: string;
  markdownCodeText?: string;
  relatedNoteBorderWidth?: string;
  relatedNoteBorderColor?: string;
  relatedNoteBackgroundColor?: string;
  relatedNoteTextColor?: string;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}
