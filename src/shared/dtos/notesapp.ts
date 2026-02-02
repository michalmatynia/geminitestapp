// Notes App DTOs
export interface NoteDto {
  id: string;
  title: string;
  content: string;
  notebookId: string | null;
  categoryId: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookDto {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCategoryDto {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteTagDto {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
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
