import { DtoBase, NamedDto } from '../types/base';

// Notes App DTOs
export type NoteEditorType = 'markdown' | 'wysiwyg' | 'code';

export interface NoteDto extends DtoBase {
  title: string;
  content: string;
  notebookId: string | null;
  editorType: string;
  color: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  tagIds: string[];
  categoryIds: string[];
  relatedNoteIds: string[];
}

export interface NotebookDto extends NamedDto {
  color: string | null;
  defaultThemeId: string | null;
}

export interface NoteCategoryDto extends NamedDto {
  color: string | null;
  parentId: string | null;
  notebookId: string | null;
  themeId: string | null;
  sortIndex: number | null;
}

export interface NoteTagDto extends NamedDto {
  color: string | null;
  notebookId: string | null;
}

export interface NoteThemeDto extends NamedDto {
  notebookId: string | null;
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
}

export interface CreateNoteDto {
  title: string;
  content: string;
  editorType?: NoteEditorType;
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  relatedNoteIds?: string[];
  notebookId?: string | null;
}

export interface UpdateNoteDto extends Partial<CreateNoteDto> {}

export interface CreateNotebookDto {
  name: string;
  color?: string | null;
  defaultThemeId?: string | null;
}

export interface UpdateNotebookDto extends Partial<CreateNotebookDto> {}

export interface CreateNoteCategoryDto {
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  notebookId?: string | null;
  themeId?: string | null;
  sortIndex?: number;
}

export interface UpdateNoteCategoryDto extends Partial<CreateNoteCategoryDto> {}

export interface CreateNoteTagDto {
  name: string;
  color?: string | null;
  notebookId?: string | null;
}

export interface UpdateNoteTagDto extends Partial<CreateNoteTagDto> {}

export interface CreateNoteThemeDto {
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
}

export interface UpdateNoteThemeDto extends Partial<CreateNoteThemeDto> {}
