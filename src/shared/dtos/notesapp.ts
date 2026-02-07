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
  editorType?: NoteEditorType | undefined;
  color?: string | null | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  relatedNoteIds?: string[] | undefined;
  notebookId?: string | null | undefined;
}

export interface UpdateNoteDto {
  title?: string | undefined;
  content?: string | undefined;
  editorType?: NoteEditorType | undefined;
  color?: string | null | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  relatedNoteIds?: string[] | undefined;
  notebookId?: string | null | undefined;
}

export interface CreateNotebookDto {
  name: string;
  color?: string | null | undefined;
  defaultThemeId?: string | null | undefined;
}

export interface UpdateNotebookDto {
  name?: string | undefined;
  color?: string | null | undefined;
  defaultThemeId?: string | null | undefined;
}

export interface CreateNoteCategoryDto {
  name: string;
  description?: string | null | undefined;
  color?: string | null | undefined;
  parentId?: string | null | undefined;
  notebookId?: string | null | undefined;
  themeId?: string | null | undefined;
  sortIndex?: number | undefined;
}

export interface UpdateNoteCategoryDto {
  name?: string | undefined;
  description?: string | null | undefined;
  color?: string | null | undefined;
  parentId?: string | null | undefined;
  notebookId?: string | null | undefined;
  themeId?: string | null | undefined;
  sortIndex?: number | undefined;
}

export interface CreateNoteTagDto {
  name: string;
  color?: string | null | undefined;
  notebookId?: string | null | undefined;
}

export interface UpdateNoteTagDto {
  name?: string | undefined;
  color?: string | null | undefined;
  notebookId?: string | null | undefined;
}

export interface CreateNoteThemeDto {
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
}

export interface UpdateNoteThemeDto {
  name?: string | undefined;
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
}
