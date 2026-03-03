import 'server-only';

import type { NoteRepository } from '@/features/notesapp/services/notes/types/note-repository';
import type {
  NoteWithRelationsDto as NoteWithRelations,
  NoteFiltersDto as NoteFilters,
  CreateNoteDto as NoteCreateInput,
  UpdateNoteDto as NoteUpdateInput,
  CreateNoteTagDto as TagCreateInput,
  UpdateNoteTagDto as TagUpdateInput,
  CreateNoteCategoryDto as CategoryCreateInput,
  UpdateNoteCategoryDto as CategoryUpdateInput,
  NoteTagDto as TagRecord,
  NoteCategoryDto as CategoryRecord,
  NoteCategoryRecordWithChildrenDto as CategoryWithChildren,
  NotebookDto as NotebookRecord,
  CreateNotebookDto as NotebookCreateInput,
  UpdateNotebookDto as NotebookUpdateInput,
} from '@/shared/contracts/notes';

import { mongoThemeImpl } from './mongo/themes';
import { mongoFileImpl } from './mongo/files';
import { mongoNotebookImpl } from './mongo/notebooks';
import { mongoTagImpl } from './mongo/tags';
import { mongoCategoryImpl } from './mongo/categories';
import { mongoNoteCrudImpl } from './mongo/notes';

export const mongoNoteRepository: NoteRepository = {
  ...mongoThemeImpl,
  ...mongoFileImpl,
  ...mongoNotebookImpl,
  ...mongoTagImpl,
  ...mongoCategoryImpl,

  async invalidateDefaultNotebookCache(): Promise<void> {
    // No cache in mongo repository
  },

  async getAll(filters: NoteFilters = {}): Promise<NoteWithRelations[]> {
    return mongoNoteCrudImpl.getAll(filters, mongoNoteRepository.getOrCreateDefaultNotebook);
  },

  async getById(id: string): Promise<NoteWithRelations | null> {
    return mongoNoteCrudImpl.getById(id);
  },

  async create(data: NoteCreateInput): Promise<NoteWithRelations> {
    return mongoNoteCrudImpl.create(data, mongoNoteRepository.getOrCreateDefaultNotebook);
  },

  async update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> {
    return mongoNoteCrudImpl.update(id, data, mongoNoteRepository.getOrCreateDefaultNotebook);
  },

  async syncRelatedNotesBatch(noteId: string, addedIds: string[], removedIds: string[]): Promise<void> {
    return mongoNoteCrudImpl.syncRelatedNotesBatch(noteId, addedIds, removedIds);
  },

  async delete(id: string): Promise<boolean> {
    return mongoNoteCrudImpl.delete(id);
  },

  async getAllTags(notebookId?: string | null): Promise<TagRecord[]> {
    const resolvedNotebookId = notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    return mongoTagImpl.getAllTags(resolvedNotebookId);
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    return mongoTagImpl.getTagById(id);
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
    return mongoTagImpl.createTag(data);
  },

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord | null> {
    return mongoTagImpl.updateTag(id, data);
  },

  async deleteTag(id: string): Promise<boolean> {
    await mongoTagImpl.deleteTag(id);
    return true;
  },

  async getAllCategories(notebookId?: string | null): Promise<CategoryRecord[]> {
    const resolvedNotebookId = notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    return mongoCategoryImpl.getAllCategories(resolvedNotebookId);
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    return mongoCategoryImpl.getCategoryById(id);
  },

  async getCategoryTree(notebookId?: string | null): Promise<CategoryWithChildren[]> {
    const resolvedNotebookId = notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    return mongoCategoryImpl.getCategoryTree(resolvedNotebookId);
  },

  async createCategory(data: CategoryCreateInput): Promise<CategoryRecord> {
    return mongoCategoryImpl.createCategory(data);
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> {
    return mongoCategoryImpl.updateCategory(id, data);
  },

  async deleteCategory(id: string, recursive?: boolean): Promise<boolean> {
    await mongoCategoryImpl.deleteCategory(id);
    return true;
  },

  async getAllNotebooks(): Promise<NotebookRecord[]> {
    return mongoNotebookImpl.getAllNotebooks();
  },

  async getNotebookById(id: string): Promise<NotebookRecord | null> {
    return mongoNotebookImpl.getNotebookById(id);
  },

  async createNotebook(data: NotebookCreateInput): Promise<NotebookRecord> {
    return mongoNotebookImpl.createNotebook(data);
  },

  async updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> {
    return mongoNotebookImpl.updateNotebook(id, data);
  },

  async deleteNotebook(id: string): Promise<boolean> {
    await mongoNotebookImpl.deleteNotebook(id);
    return true;
  },
};
