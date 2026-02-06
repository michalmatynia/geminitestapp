import { DtoBase, NamedDto } from '../types/base';

// Notes App DTOs
export interface NoteDto extends DtoBase {
  title: string;
  content: string;
  notebookId: string | null;
  categoryId: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
}

export interface NotebookDto extends NamedDto {
  color: string | null;
}

export interface NoteCategoryDto extends NamedDto {
  color: string | null;
  parentId: string | null;
}

export interface NoteTagDto extends NamedDto {
  color: string | null;
}

export interface CreateNoteDto {
  title: string;
  content?: string;
  notebookId?: string;
  categoryId?: string;
  tags?: string[];
  pinned?: boolean;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  notebookId?: string;
  categoryId?: string;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
}

export interface CreateNotebookDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateNotebookDto {
  name?: string;
  description?: string;
  color?: string;
}
