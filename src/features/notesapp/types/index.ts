// DTO type exports
export type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  NoteThemeDto,
  NoteWithRelationsDto,
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
  NoteFiltersDto,
  NoteFileDto,
  NoteSettingsDto,
  NoteCategoryRecordWithChildrenDto
} from '@/shared/contracts/notes';

// Compatibility aliases
export type {
  NoteDto as NoteRecord,
  NotebookDto as NotebookRecord,
  NoteCategoryDto as CategoryRecord,
  NoteTagDto as TagRecord,
  NoteThemeDto as ThemeRecord,
  NoteWithRelationsDto as NoteWithRelations,
  NoteFiltersDto as NoteFilters,
  NoteFileDto as NoteFileRecord
} from '@/shared/contracts/notes';

export * from './notes-hooks';
export * from './notes-ui';
export * from './notes-settings';
