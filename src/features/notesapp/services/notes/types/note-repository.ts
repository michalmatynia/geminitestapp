import type { 
  NoteWithRelationsDto as NoteWithRelations, 
  UpdateNoteDto as NoteUpdateInput, 
  CreateNoteDto as NoteCreateInput, 
  NoteFiltersDto as NoteFilters, 
  NoteTagDto as TagRecord, 
  CreateNoteTagDto as TagCreateInput, 
  UpdateNoteTagDto as TagUpdateInput, 
  NoteCategoryDto as CategoryRecord, 
  CreateNoteCategoryDto as CategoryCreateInput, 
  UpdateNoteCategoryDto as CategoryUpdateInput, 
  NoteCategoryRecordWithChildrenDto as CategoryWithChildren, 
  NotebookDto as NotebookRecord, 
  CreateNotebookDto as NotebookCreateInput, 
  UpdateNotebookDto as NotebookUpdateInput, 
  NoteThemeDto as ThemeRecord, 
  CreateNoteThemeDto as ThemeCreateInput, 
  UpdateNoteThemeDto as ThemeUpdateInput, 
  NoteFileDto as NoteFileRecord, 
  CreateNoteFileDto as NoteFileCreateInput
} from '@/shared/contracts/notes';

export interface NoteRepository {
  // Notes
  getAll(filters: NoteFilters): Promise<NoteWithRelations[]>;
  getById(id: string): Promise<NoteWithRelations | null>;
  create(data: NoteCreateInput): Promise<NoteWithRelations>;
  update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null>;
  syncRelatedNotesBatch(noteId: string, addedIds: string[], removedIds: string[]): Promise<void>;
  delete(id: string): Promise<boolean>;

  // Tags
  getAllTags(notebookId?: string | null): Promise<TagRecord[]>;
  getTagById(id: string): Promise<TagRecord | null>;
  createTag(data: TagCreateInput): Promise<TagRecord>;
  updateTag(id: string, data: TagUpdateInput): Promise<TagRecord | null>;
  deleteTag(id: string): Promise<boolean>;

  // Categories
  getAllCategories(notebookId?: string | null): Promise<CategoryRecord[]>;
  getCategoryById(id: string): Promise<CategoryRecord | null>;
  getCategoryTree(notebookId?: string | null): Promise<CategoryWithChildren[]>;
  createCategory(data: CategoryCreateInput): Promise<CategoryRecord>;
  updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null>;
  deleteCategory(id: string, recursive?: boolean): Promise<boolean>;

  // Notebooks
  getAllNotebooks(): Promise<NotebookRecord[]>;
  getNotebookById(id: string): Promise<NotebookRecord | null>;
  createNotebook(data: NotebookCreateInput): Promise<NotebookRecord>;
  updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null>;
  deleteNotebook(id: string): Promise<boolean>;
  getOrCreateDefaultNotebook(): Promise<NotebookRecord>;

  // Themes
  getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]>;
  getThemeById(id: string): Promise<ThemeRecord | null>;
  createTheme(data: ThemeCreateInput): Promise<ThemeRecord>;
  updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null>;
  deleteTheme(id: string): Promise<boolean>;

  // Files
  createNoteFile(data: NoteFileCreateInput): Promise<NoteFileRecord>;
  getNoteFiles(noteId: string): Promise<NoteFileRecord[]>;
  deleteNoteFile(noteId: string, slotIndex: number): Promise<boolean>;
}
