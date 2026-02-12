import { DtoBase, NamedDto, CreateDto, UpdateDto } from '../types/base';

// Notes App DTOs
export type NoteEditorType = 'markdown' | 'wysiwyg' | 'code';

export interface NoteDto extends DtoBase {
  title: string;
  content: string;
  notebookId: string | null;
  editorType: NoteEditorType;
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

export type CreateNoteDto = CreateDto<NoteDto>;
export type UpdateNoteDto = UpdateDto<NoteDto>;

export type CreateNotebookDto = CreateDto<NotebookDto>;
export type UpdateNotebookDto = UpdateDto<NotebookDto>;

export type CreateNoteCategoryDto = CreateDto<NoteCategoryDto>;
export type UpdateNoteCategoryDto = UpdateDto<NoteCategoryDto>;

export type CreateNoteTagDto = CreateDto<NoteTagDto>;
export type UpdateNoteTagDto = UpdateDto<NoteTagDto>;

export type CreateNoteThemeDto = CreateDto<NoteThemeDto>;
export type UpdateNoteThemeDto = UpdateDto<NoteThemeDto>;
