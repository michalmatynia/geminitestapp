import type {
  NoteRecord,
  NoteWithRelations,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  CreateTagInput,
  UpdateTagInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../notes";

export interface NoteRepository {
  // Note CRUD operations
  getAll(filters?: NoteFilters): Promise<NoteWithRelations[]>;
  getById(id: string): Promise<NoteWithRelations | null>;
  create(data: CreateNoteInput): Promise<NoteWithRelations>;
  update(id: string, data: UpdateNoteInput): Promise<NoteWithRelations>;
  delete(id: string): Promise<void>;

  // Tag operations
  getAllTags(): Promise<TagRecord[]>;
  getTagById(id: string): Promise<TagRecord | null>;
  createTag(data: CreateTagInput): Promise<TagRecord>;
  updateTag(id: string, data: UpdateTagInput): Promise<TagRecord>;
  deleteTag(id: string): Promise<void>;

  // Category operations
  getAllCategories(): Promise<CategoryRecord[]>;
  getCategoryById(id: string): Promise<CategoryRecord | null>;
  createCategory(data: CreateCategoryInput): Promise<CategoryRecord>;
  updateCategory(id: string, data: UpdateCategoryInput): Promise<CategoryRecord>;
  deleteCategory(id: string): Promise<void>;

  // Tag/Category assignment
  assignTags(noteId: string, tagIds: string[]): Promise<void>;
  removeTags(noteId: string, tagIds: string[]): Promise<void>;
  assignCategories(noteId: string, categoryIds: string[]): Promise<void>;
  removeCategories(noteId: string, categoryIds: string[]): Promise<void>;
}
