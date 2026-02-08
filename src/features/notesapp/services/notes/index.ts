import 'server-only';

import type { NoteRepository } from '@/features/notesapp/services/notes/types/note-repository';
import { ErrorSystem } from '@/features/observability/server';
import { configurationError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import type { NoteWithRelations, RelatedNote, NoteUpdateInput, NoteCreateInput, NoteFilters, TagRecord, TagCreateInput, TagUpdateInput, CategoryRecord, CategoryCreateInput, CategoryUpdateInput, CategoryWithChildren, NotebookRecord, NotebookCreateInput, NotebookUpdateInput, ThemeRecord, ThemeCreateInput, ThemeUpdateInput, NoteFileRecord, NoteFileCreateInput } from '@/shared/types/notes';

import { cleanupNoteFile } from './file-cleanup';

// Lazy load to avoid initializing Prisma when using MongoDB
let _repository: NoteRepository | null = null;

const resolveNoteProvider = async (): Promise<'mongodb' | 'prisma'> =>
  getAppDbProvider() as Promise<'mongodb' | 'prisma'>;

async function getRepository(): Promise<NoteRepository> {
  if (!_repository) {
    const provider = await resolveNoteProvider();
    if (provider === 'mongodb') {
      const { mongoNoteRepository } = await import('./note-repository/mongo-note-repository');
      _repository = mongoNoteRepository;
    } else {
      const { prismaNoteRepository } = await import('./note-repository/prisma-note-repository');
      _repository = prismaNoteRepository;
    }
  }
  
  if (!_repository) {
    throw configurationError('Failed to initialize note repository');
  }

  return _repository;
}

// Helper to access repository methods
const repoCall = async <K extends keyof NoteRepository>(
  key: K,
  ...args: Parameters<NoteRepository[K]>
): Promise<Awaited<ReturnType<NoteRepository[K]>>> => {
  try {
    const repo = await getRepository();
    const fn = repo[key] as (
      ...args: Parameters<NoteRepository[K]>
    ) => ReturnType<NoteRepository[K]>;
    return await fn(...args) as Promise<Awaited<ReturnType<NoteRepository[K]>>>;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'note-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
};

// Helper: Build Relations
const buildRelations = (note: NoteWithRelations): RelatedNote[] => {
  const relations: RelatedNote[] = [
    ...(note.relationsFrom ?? []).map((rel: { targetNote: RelatedNote }) => rel.targetNote),
    ...(note.relationsTo ?? []).map((rel: { sourceNote: RelatedNote }) => rel.sourceNote),
  ];
  const seen = new Set<string>();
  return relations.filter((rel: RelatedNote) => {
    if (!rel?.id || seen.has(rel.id)) return false;
    seen.add(rel.id);
    return true;
  });
};

// Helper: Populate relations on a note or list of notes
function populateRelations(data: NoteWithRelations[]): NoteWithRelations[];
function populateRelations(data: NoteWithRelations): NoteWithRelations;
function populateRelations(data: null): null;
function populateRelations(data: NoteWithRelations | null): NoteWithRelations | null;
function populateRelations(data: NoteWithRelations | NoteWithRelations[] | null): NoteWithRelations | NoteWithRelations[] | null {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((note: NoteWithRelations) => ({
      ...note,
      relations: buildRelations(note)
    }));
  }
  return {
    ...data,
    relations: buildRelations(data)
  };
}

export const noteService: NoteRepository = {
  // Enhanced Methods with Business Logic

  getAll: async (filters: NoteFilters): Promise<NoteWithRelations[]> => {
    const notes = await repoCall('getAll', filters);
    return populateRelations(notes);
  },

  getById: async (id: string): Promise<NoteWithRelations | null> => {
    const note = await repoCall('getById', id);
    return populateRelations(note);
  },

  create: async (data: NoteCreateInput): Promise<NoteWithRelations> => {
    const note = await repoCall('create', data);
    return populateRelations(note);
  },

  update: async (id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> => {
    const previousNote = await repoCall('getById', id);
    const note = await repoCall('update', id, data);

    if (!note) return null;

    // Sync Relations
    if (Array.isArray(data.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom?.map((rel: { targetNote: RelatedNote }) => rel.targetNote.id) || [];
      const nextRelatedIds = data.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId: string) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId: string) => !nextRelatedIds.includes(relId) && relId !== id
      );

      const syncRelatedNote = async (relatedId: string, shouldAdd: boolean): Promise<void> => {
        try {
          const relatedNote = await repoCall('getById', relatedId);
          if (!relatedNote) return;
          
          const currentIds =
            relatedNote.relationsFrom?.map((rel: { targetNote: RelatedNote }) => rel.targetNote.id) || [];
          
          let nextIds: string[];
          if (shouldAdd) {
            nextIds = Array.from(new Set([...currentIds, id]));
          } else {
            nextIds = currentIds.filter((relId: string) => relId !== id);
          }
          
          await repoCall('update', relatedId, { relatedNoteIds: nextIds });
        } catch (syncError) {
          try {
            await ErrorSystem.captureException(syncError, { 
              service: 'note-service',
              action: 'syncRelatedNote',
              noteId: id,
              relatedId
            });
          } catch (logError) {
            console.error('[noteService][update] Failed to sync relation (and logging failed)', {
              noteId: id,
              relatedId,
              syncError,
              logError
            });
          }
        }
      };

      await Promise.all([
        ...addedRelations.map((relId: string) => syncRelatedNote(relId, true)),
        ...removedRelations.map((relId: string) => syncRelatedNote(relId, false)),
      ]);
    }

    return populateRelations(note);
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const files = await repoCall('getNoteFiles', id);
      await Promise.all(
        files.map((file: NoteFileRecord) => cleanupNoteFile(id, file.filepath))
      );
    } catch (error) {
      try {
        await ErrorSystem.captureException(error, { 
          service: 'note-service',
          action: 'deleteNoteFiles',
          noteId: id
        });
      } catch (logError) {
        console.error('[noteService][delete] Failed to cleanup files (and logging failed)', error, logError);
      }
    }
    return repoCall('delete', id);
  },

  // Pass-through methods
  getAllTags: (notebookId?: string | null): Promise<TagRecord[]> => repoCall('getAllTags', notebookId),
  getTagById: (id: string): Promise<TagRecord | null> => repoCall('getTagById', id),
  createTag: (data: TagCreateInput): Promise<TagRecord> => repoCall('createTag', data),
  updateTag: (id: string, data: TagUpdateInput): Promise<TagRecord | null> => repoCall('updateTag', id, data),
  deleteTag: (id: string): Promise<boolean> => repoCall('deleteTag', id),
  getAllCategories: (notebookId?: string | null): Promise<CategoryRecord[]> => repoCall('getAllCategories', notebookId),
  getCategoryById: (id: string): Promise<CategoryRecord | null> => repoCall('getCategoryById', id),
  getCategoryTree: (notebookId?: string | null): Promise<CategoryWithChildren[]> => repoCall('getCategoryTree', notebookId),
  createCategory: (data: CategoryCreateInput): Promise<CategoryRecord> => repoCall('createCategory', data),
  updateCategory: (id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> => repoCall('updateCategory', id, data),
  deleteCategory: (id: string, recursive?: boolean): Promise<boolean> => repoCall('deleteCategory', id, recursive),
  getAllNotebooks: (): Promise<NotebookRecord[]> => repoCall('getAllNotebooks'),
  getNotebookById: (id: string): Promise<NotebookRecord | null> => repoCall('getNotebookById', id),
  createNotebook: (data: NotebookCreateInput): Promise<NotebookRecord> => repoCall('createNotebook', data),
  updateNotebook: (id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> => repoCall('updateNotebook', id, data),
  deleteNotebook: (id: string): Promise<boolean> => repoCall('deleteNotebook', id),
  getOrCreateDefaultNotebook: (): Promise<NotebookRecord> => repoCall('getOrCreateDefaultNotebook'),
  getAllThemes: (notebookId?: string | null): Promise<ThemeRecord[]> => repoCall('getAllThemes', notebookId),
  getThemeById: (id: string): Promise<ThemeRecord | null> => repoCall('getThemeById', id),
  createTheme: (data: ThemeCreateInput): Promise<ThemeRecord> => repoCall('createTheme', data),
  updateTheme: (id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> => repoCall('updateTheme', id, data),
  deleteTheme: (id: string): Promise<boolean> => repoCall('deleteTheme', id),
  createNoteFile: (data: NoteFileCreateInput): Promise<NoteFileRecord> => repoCall('createNoteFile', data),
  getNoteFiles: (noteId: string): Promise<NoteFileRecord[]> => repoCall('getNoteFiles', noteId),
  deleteNoteFile: (noteId: string, slotIndex: number): Promise<boolean> => repoCall('deleteNoteFile', noteId, slotIndex),
};