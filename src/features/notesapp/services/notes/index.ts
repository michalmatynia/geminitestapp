import 'server-only';

import type { NoteRepository } from '@/features/notesapp/services/notes/types/note-repository';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ActivityTypes } from '@/shared/constants/observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type {
  NoteWithRelationsDto as NoteWithRelations,
  RelatedNoteDto as RelatedNote,
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
  CreateNoteFileDto as NoteFileCreateInput,
  NoteRelationWithSource,
  NoteRelationWithTarget,
} from '@/shared/contracts/notes';
import { configurationError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

import { cleanupNoteFile } from './file-cleanup';

// Lazy load to avoid initializing Prisma when using MongoDB
let _repository: NoteRepository | null = null;

export const invalidateNoteRepositoryCache = (): void => {
  _repository = null;
};

const resolveNoteProvider = async (): Promise<'mongodb' | 'prisma'> => {
  const provider = (await getAppDbProvider()) as 'mongodb' | 'prisma';
  if (process.env['NODE_ENV'] === 'test') {
    void logSystemEvent({
      level: 'info',
      message: `[note-service] Resolved provider: ${provider}`,
      source: 'note-service',
      context: { appDbProvider: process.env['APP_DB_PROVIDER'] },
    });
  }
  return provider;
};

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
    return (await fn(...args)) as Promise<Awaited<ReturnType<NoteRepository[K]>>>;
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
  const fromRelations = (note.relationsFrom ?? [])
    .map((rel: NoteRelationWithTarget) => rel.targetNote)
    .filter((rel: RelatedNote | undefined): rel is RelatedNote => !!rel);

  const toRelations = (note.relationsTo ?? [])
    .map((rel: NoteRelationWithSource) => rel.sourceNote)
    .filter((rel: RelatedNote | undefined): rel is RelatedNote => !!rel);

  const relations: RelatedNote[] = [...fromRelations, ...toRelations];
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
function populateRelations(
  data: NoteWithRelations | NoteWithRelations[] | null
): NoteWithRelations | NoteWithRelations[] | null {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((note: NoteWithRelations) => ({
      ...note,
      relations: buildRelations(note),
    }));
  }
  return {
    ...data,
    relations: buildRelations(data),
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
    const populated = populateRelations(note);
    void logActivity({
      type: ActivityTypes.NOTE.CREATED,
      description: `Created note ${populated.title}`,
      entityId: populated.id,
      entityType: 'note',
      metadata: { title: populated.title, notebookId: populated.notebookId },
    }).catch(() => {});
    return populated;
  },

  update: async (id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> => {
    const previousNote = await repoCall('getById', id);
    const note = await repoCall('update', id, data);

    if (!note) return null;

    // Sync Relations
    if (Array.isArray(data.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom
          ?.map((rel: NoteRelationWithTarget) => rel.targetNote?.id)
          .filter((rid: string | undefined): rid is string => !!rid) || [];
      const nextRelatedIds = data.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId: string) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId: string) => !nextRelatedIds.includes(relId) && relId !== id
      );

      if (addedRelations.length > 0 || removedRelations.length > 0) {
        await repoCall('syncRelatedNotesBatch', id, addedRelations, removedRelations);
      }
    }

    const populated = populateRelations(note);
    void logActivity({
      type: ActivityTypes.NOTE.UPDATED,
      description: `Updated note ${populated.title}`,
      entityId: populated.id,
      entityType: 'note',
      metadata: { changes: Object.keys(data) },
    }).catch(() => {});
    return populated;
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const files = await repoCall('getNoteFiles', id);
      await Promise.all(files.map((file: NoteFileRecord) => cleanupNoteFile(id, file.filepath)));
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'note-service',
        action: 'deleteNoteFiles',
        noteId: id,
      });
    }
    const success = await repoCall('delete', id);
    if (success) {
      void logActivity({
        type: ActivityTypes.NOTE.DELETED,
        description: `Deleted note ${id}`,
        entityId: id,
        entityType: 'note',
      }).catch(() => {});
    }
    return success;
  },

  syncRelatedNotesBatch: (
    noteId: string,
    addedIds: string[],
    removedIds: string[]
  ): Promise<void> => repoCall('syncRelatedNotesBatch', noteId, addedIds, removedIds),

  // Pass-through methods
  getAllTags: (notebookId?: string | null): Promise<TagRecord[]> =>
    repoCall('getAllTags', notebookId),
  getTagById: (id: string): Promise<TagRecord | null> => repoCall('getTagById', id),
  createTag: (data: TagCreateInput): Promise<TagRecord> => repoCall('createTag', data),
  updateTag: (id: string, data: TagUpdateInput): Promise<TagRecord | null> =>
    repoCall('updateTag', id, data),
  deleteTag: (id: string): Promise<boolean> => repoCall('deleteTag', id),
  getAllCategories: (notebookId?: string | null): Promise<CategoryRecord[]> =>
    repoCall('getAllCategories', notebookId),
  getCategoryById: (id: string): Promise<CategoryRecord | null> => repoCall('getCategoryById', id),
  getCategoryTree: (notebookId?: string | null): Promise<CategoryWithChildren[]> =>
    repoCall('getCategoryTree', notebookId),
  createCategory: (data: CategoryCreateInput): Promise<CategoryRecord> =>
    repoCall('createCategory', data),
  updateCategory: (id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> =>
    repoCall('updateCategory', id, data),
  deleteCategory: (id: string, recursive?: boolean): Promise<boolean> =>
    repoCall('deleteCategory', id, recursive),
  getAllNotebooks: (): Promise<NotebookRecord[]> => repoCall('getAllNotebooks'),
  getNotebookById: (id: string): Promise<NotebookRecord | null> => repoCall('getNotebookById', id),
  createNotebook: (data: NotebookCreateInput): Promise<NotebookRecord> =>
    repoCall('createNotebook', data),
  updateNotebook: (id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> =>
    repoCall('updateNotebook', id, data),
  deleteNotebook: (id: string): Promise<boolean> => repoCall('deleteNotebook', id),
  getOrCreateDefaultNotebook: (): Promise<NotebookRecord> => repoCall('getOrCreateDefaultNotebook'),
  invalidateDefaultNotebookCache: async (): Promise<void> => {
    await repoCall('invalidateDefaultNotebookCache');
  },
  getAllThemes: (notebookId?: string | null): Promise<ThemeRecord[]> =>
    repoCall('getAllThemes', notebookId),
  getThemeById: (id: string): Promise<ThemeRecord | null> => repoCall('getThemeById', id),
  createTheme: (data: ThemeCreateInput): Promise<ThemeRecord> => repoCall('createTheme', data),
  updateTheme: (id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> =>
    repoCall('updateTheme', id, data),
  deleteTheme: (id: string): Promise<boolean> => repoCall('deleteTheme', id),
  createNoteFile: (data: NoteFileCreateInput): Promise<NoteFileRecord> =>
    repoCall('createNoteFile', data),
  getNoteFiles: (noteId: string): Promise<NoteFileRecord[]> => repoCall('getNoteFiles', noteId),
  deleteNoteFile: (noteId: string, slotIndex: number): Promise<boolean> =>
    repoCall('deleteNoteFile', noteId, slotIndex),
};
