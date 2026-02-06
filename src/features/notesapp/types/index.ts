// Re-export DTOs as types for backward compatibility
export type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto
} from '@/shared/dtos';

export * from '@/shared/types/notes';
export * from './notes-hooks';
export * from './notes-ui';
export * from './notes-settings';
